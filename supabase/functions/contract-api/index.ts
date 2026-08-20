// Supabase Edge Function: contract-api
// Verify HMAC token (do contract-login phát) rồi dispatch theo `action`.
// Payload chuẩn: { action, token, payload }
//
// Deploy:
//   supabase functions deploy contract-api --no-verify-jwt --project-ref nrfxymnfmjhbsgpipvkb

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const enc = new TextEncoder();

function b64urlDecode(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64url(bytes: Uint8Array) {
  const s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return new Uint8Array(sig);
}

type Session = {
  username: string;
  ho_ten: string;
  role: string;
  mien: string;
  bu: string;
  scope: string;
  exp: number;
};

async function verifyToken(token: string, secret: string): Promise<Session | null> {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [p, sig] = token.split(".");
  const expected = b64url(await hmac(secret, p));
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(p))) as Session;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

// ─── Permission ──────────────────────────────────────────────────────────
const MIEN_NORM: Record<string, string> = {
  MB: "Miền Bắc", MN: "Miền Nam", MT: "Miền Trung",
  "Miền Bắc": "Miền Bắc", "Miền Nam": "Miền Nam", "Miền Trung": "Miền Trung",
};

type Permission = {
  canWrite: boolean;
  filterMien: string | null;
  role: string;
};

function getPermission(session: Session): Permission {
  switch (session.role) {
    case "admin":
      return { canWrite: true, filterMien: null, role: "admin" };
    case "manager":
    case "product_manager":
      return { canWrite: false, filterMien: null, role: session.role };
    default: {
      const m = MIEN_NORM[session.mien] ?? session.mien ?? null;
      return { canWrite: false, filterMien: m, role: session.role };
    }
  }
}

function sanitizeSearch(s: string): string {
  return String(s ?? "").replace(/[,()\\%]/g, " ").trim();
}

// ─── Action dispatch ─────────────────────────────────────────────────────
async function handleAction(
  action: string,
  payload: any,
  session: Session,
  perm: Permission,
  admin: SupabaseClient,
) {
  switch (action) {

    // ── whoami ────────────────────────────────────────────────────────────
    case "whoami": {
      return {
        ok: true,
        username: session.username,
        ho_ten: session.ho_ten,
        role: perm.role,
        mien: session.mien,
        bu: session.bu,
        scope: session.scope,
        permission: perm,
      };
    }

    // ── change-password ──────────────────────────────────────────────────
    case "change-password": {
      const { old_password, new_password } = payload || {};
      if (!old_password || !new_password) return { ok: false, error: "missing_fields" };

      const sha256Hex = async (text: string) => {
        const buf = await crypto.subtle.digest("SHA-256", enc.encode(text));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
      };

      const { data: user } = await admin
        .schema("shared").from("users")
        .select("password_hash, salt")
        .eq("username", session.username)
        .maybeSingle();
      if (!user) return { ok: false, error: "not_found" };

      const toHash = user.salt ? (user.salt + ":" + old_password) : old_password;
      const inputHash = await sha256Hex(toHash);
      if (inputHash.toLowerCase() !== String(user.password_hash).toLowerCase()) {
        return { ok: false, error: "invalid" };
      }

      if (String(new_password).length < 6) return { ok: false, error: "weak_password" };
      const newHash = await sha256Hex(user.salt ? (user.salt + ":" + new_password) : new_password);
      const { error } = await admin
        .schema("shared").from("users")
        .update({ password_hash: newHash })
        .eq("username", session.username);
      if (error) return { ok: false, error: "update_failed" };
      return { ok: true, changed: true };
    }

    // ── list-contracts ───────────────────────────────────────────────────
    case "list-contracts": {
      const { search, mien, khay, status, page = 1, page_size = 50 } = payload || {};
      const from = (page - 1) * page_size;
      const to = from + page_size - 1;

      let q = admin
        .from("contract_expiry_view")
        .select("*", { count: "exact" });

      if (perm.filterMien) q = q.eq("mien", perm.filterMien);
      if (mien) q = q.eq("mien", mien);
      if (khay) q = q.eq("khay", khay);

      if (status === "active") q = q.gt("days_remaining", 0);
      else if (status === "expired") q = q.lte("days_remaining", 0);
      else if (status === "expiring") q = q.gt("days_remaining", 0).lte("days_remaining", 30);

      if (search) {
        const s = sanitizeSearch(search);
        if (s) q = q.or(`ma_hd.ilike.%${s}%,so_hd.ilike.%${s}%,ten_kh.ilike.%${s}%`);
      }

      q = q.order("status_order", { ascending: true }).order("days_remaining", { ascending: true }).order("ngay_ky", { ascending: true }).range(from, to);

      const { data, count, error } = await q;
      if (error) return { ok: false, error: error.message };
      return { ok: true, data, total: count };
    }

    // ── contract-detail ──────────────────────────────────────────────────
    case "contract-detail": {
      const { ma_hd } = payload || {};
      if (!ma_hd) return { ok: false, error: "missing ma_hd" };

      const { data: contract, error: cErr } = await admin
        .from("contract_contracts")
        .select("*")
        .eq("ma_hd", ma_hd)
        .maybeSingle();
      if (cErr || !contract) return { ok: false, error: cErr?.message || "not_found" };

      if (perm.filterMien && contract.mien !== perm.filterMien) {
        return { ok: false, error: "no permission" };
      }

      const { data: items, error: iErr } = await admin
        .from("contract_items_remaining_view")
        .select("*")
        .eq("ma_hd", ma_hd)
        .order("id", { ascending: true });
      if (iErr) return { ok: false, error: iErr.message };

      return { ok: true, contract, items };
    }

    // ── get-alerts ───────────────────────────────────────────────────────
    case "get-alerts": {
      const { data: cfgRows } = await admin.from("contract_alert_config").select("key, value");
      const cfg: Record<string, any> = {};
      for (const r of cfgRows || []) cfg[r.key] = r.value;

      const warnDays = cfg.contract_warn_days || [30, 15];
      const qtyWarnDays = cfg.quantity_warn_days || [20, 10];
      const qtyMult = cfg.quantity_multiplier || [20, 10];
      const maxWarn = Math.max(...warnDays);

      // Expiry alerts
      let eq = admin
        .from("contract_expiry_view")
        .select("*")
        .gte("days_remaining", 0)
        .lte("days_remaining", maxWarn)
        .order("days_remaining", { ascending: true });
      if (perm.filterMien) eq = eq.eq("mien", perm.filterMien);
      const { data: expiryRaw } = await eq;

      const expiry = (expiryRaw || []).map(c => ({
        ...c,
        level: c.days_remaining <= Math.min(...warnDays) ? "critical" : "warning",
      }));

      // Quantity alerts
      let qq = admin
        .from("contract_items_remaining_view")
        .select("*")
        .gt("so_luong_hd", 0)
        .gt("avg_daily_3m", 0);
      if (perm.filterMien) qq = qq.eq("mien", perm.filterMien);
      const { data: itemsRaw } = await qq;

      const quantity: any[] = [];
      for (const it of itemsRaw || []) {
        const conLai = it.so_luong_con_lai ?? 0;
        const avgDaily = it.avg_daily_3m ?? 0;
        if (avgDaily <= 0) continue;
        const daysSupply = avgDaily > 0 ? Math.floor(conLai / avgDaily) : 9999;

        const maxQtyWarn = Math.max(...qtyMult);
        if (daysSupply <= maxQtyWarn) {
          quantity.push({
            ...it,
            days_supply: daysSupply,
            level: daysSupply <= Math.min(...qtyMult) ? "critical" : "warning",
          });
        }
      }
      quantity.sort((a, b) => a.days_supply - b.days_supply);

      return { ok: true, expiry, quantity };
    }

    // ── dashboard-summary ────────────────────────────────────────────────
    case "dashboard-summary": {
      const { data: cfgRows } = await admin.from("contract_alert_config").select("key, value");
      const cfg: Record<string, any> = {};
      for (const r of cfgRows || []) cfg[r.key] = r.value;

      const warnDays = cfg.contract_warn_days || [30, 15];
      const qtyMult = cfg.quantity_multiplier || [20, 10];
      const maxWarn = Math.max(...warnDays);
      const maxQtyWarn = Math.max(...qtyMult);

      // Active contracts only (Sắp hết hạn + Còn hạn, i.e. days_remaining > 0)
      let aq = admin.from("contract_expiry_view")
        .select("ma_hd", { count: "exact", head: true })
        .gt("days_remaining", 0);
      if (perm.filterMien) aq = aq.eq("mien", perm.filterMien);
      const { count: totalActive } = await aq;

      // Fiscal year (April → March): contracts expiring within the current FY
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const fyStart = month >= 4 ? `${year}-04-01` : `${year - 1}-04-01`;
      const fyEnd = month >= 4 ? `${year + 1}-03-31` : `${year}-03-31`;

      let fyq = admin.from("contract_contracts")
        .select("ma_hd", { count: "exact", head: true })
        .not("thoi_han", "is", null)
        .gte("thoi_han", fyStart)
        .lte("thoi_han", fyEnd);
      if (perm.filterMien) fyq = fyq.eq("mien", perm.filterMien);
      const { count: fiscalYearCount } = await fyq;

      // Expiring contracts
      let eq = admin
        .from("contract_expiry_view")
        .select("*")
        .gte("days_remaining", 0)
        .lte("days_remaining", maxWarn)
        .order("days_remaining", { ascending: true })
        .limit(10);
      if (perm.filterMien) eq = eq.eq("mien", perm.filterMien);
      const { data: expiryAlerts } = await eq;

      // Quantity alerts (top 10)
      let qq = admin
        .from("contract_items_remaining_view")
        .select("*")
        .gt("so_luong_hd", 0)
        .gt("avg_daily_3m", 0);
      if (perm.filterMien) qq = qq.eq("mien", perm.filterMien);
      const { data: itemsRaw } = await qq;

      const quantityAlerts: any[] = [];
      for (const it of itemsRaw || []) {
        const conLai = it.so_luong_con_lai ?? 0;
        const avgDaily = it.avg_daily_3m ?? 0;
        if (avgDaily <= 0) continue;
        const daysSupply = avgDaily > 0 ? Math.floor(conLai / avgDaily) : 9999;
        if (daysSupply <= maxQtyWarn) {
          quantityAlerts.push({ ...it, days_supply: daysSupply });
        }
      }
      quantityAlerts.sort((a, b) => a.days_supply - b.days_supply);

      return {
        ok: true,
        total_active_contracts: totalActive || 0,
        expiring_count: (expiryAlerts || []).length,
        low_quantity_count: quantityAlerts.length,
        fiscal_year_expiry_count: fiscalYearCount || 0,
        max_warn_days: maxWarn,
        max_qty_warn_days: maxQtyWarn,
        expiry_alerts: (expiryAlerts || []).slice(0, 10),
        quantity_alerts: quantityAlerts.slice(0, 10),
      };
    }

    // ── get-config ───────────────────────────────────────────────────────
    case "get-config": {
      const { data } = await admin.from("contract_alert_config").select("key, value");
      const config: Record<string, any> = {};
      for (const r of data || []) config[r.key] = r.value;
      return { ok: true, config };
    }

    // ── update-config (admin only) ───────────────────────────────────────
    case "update-config": {
      if (perm.role !== "admin") return { ok: false, error: "no permission" };
      const { config } = payload || {};
      if (!config || typeof config !== "object") return { ok: false, error: "missing config" };

      for (const [key, value] of Object.entries(config)) {
        const { error } = await admin
          .from("contract_alert_config")
          .upsert({ key, value: JSON.parse(JSON.stringify(value)), updated_at: new Date().toISOString(), updated_by: session.username });
        if (error) return { ok: false, error: error.message };
      }
      return { ok: true };
    }

    // ── sync-invoices ────────────────────────────────────────────────────
    // Invoice table: app_sale.hoa_don_bovattu
    // Join: so_hd + ma_vat_tu (invoice) = so_hd + ma_ncc (contract)
    case "sync-invoices": {
      if (perm.role !== "admin") return { ok: false, error: "no permission" };

      const { data: cfgRows } = await admin.from("contract_alert_config").select("key, value");
      const cfg: Record<string, any> = {};
      for (const r of cfgRows || []) cfg[r.key] = r.value;
      const avgMonths = cfg.avg_period_months || 3;

      const today = new Date();
      const since = new Date(today);
      since.setMonth(since.getMonth() - avgMonths);
      const sinceStr = since.toISOString().slice(0, 10);
      const totalDays = Math.ceil((today.getTime() - since.getTime()) / 86400000);

      const { data: contracts } = await admin
        .from("contract_contracts")
        .select("ma_hd, so_hd");

      const soHdList = [...new Set((contracts || []).map(c => c.so_hd).filter(Boolean))];
      if (soHdList.length === 0) return { ok: true, updated: 0 };

      // Batch .in() queries to avoid PostgREST URL length limit
      const IN_BATCH = 50;
      const allInvoiceTotal: any[] = [];
      const allInvoiceRecent: any[] = [];

      for (let i = 0; i < soHdList.length; i += IN_BATCH) {
        const batch = soHdList.slice(i, i + IN_BATCH);

        const { data: d1, error: e1 } = await admin
          .schema("app_sale").from("hoa_don_bovattu")
          .select("so_hd, ma_vat_tu, so_luong")
          .in("so_hd", batch);
        if (e1) return { ok: false, error: "invoice query failed: " + e1.message };
        if (d1) allInvoiceTotal.push(...d1);

        const { data: d2, error: e2 } = await admin
          .schema("app_sale").from("hoa_don_bovattu")
          .select("so_hd, ma_vat_tu, so_luong")
          .in("so_hd", batch)
          .gte("ngay_tai_lieu", sinceStr);
        if (e2) return { ok: false, error: "recent invoice query failed: " + e2.message };
        if (d2) allInvoiceRecent.push(...d2);
      }

      // Aggregate totals by (so_hd, ma_vat_tu)
      const totals: Record<string, number> = {};
      for (const inv of allInvoiceTotal) {
        const key = `${inv.so_hd}|||${inv.ma_vat_tu}`;
        totals[key] = (totals[key] || 0) + (Number(inv.so_luong) || 0);
      }

      // Aggregate recent for avg daily
      const recents: Record<string, number> = {};
      for (const inv of allInvoiceRecent) {
        const key = `${inv.so_hd}|||${inv.ma_vat_tu}`;
        recents[key] = (recents[key] || 0) + (Number(inv.so_luong) || 0);
      }

      // Upsert snapshot (ma_ncc = ma_vat_tu from invoice)
      const rows = Object.keys(totals).map(key => {
        const [so_hd, ma_ncc] = key.split("|||");
        const sold = totals[key] || 0;
        const recentSold = recents[key] || 0;
        const avgDaily = totalDays > 0 ? recentSold / totalDays : 0;
        return {
          so_hd,
          ma_ncc,
          so_luong_ban: sold,
          avg_daily_3m: Math.round(avgDaily * 100) / 100,
          synced_at: new Date().toISOString(),
        };
      });

      let updated = 0;
      const UPSERT_BATCH = 500;
      for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
        const batch = rows.slice(i, i + UPSERT_BATCH);
        const { error } = await admin
          .from("contract_sold_snapshot")
          .upsert(batch, { onConflict: "so_hd,ma_ncc" });
        if (error) return { ok: false, error: "upsert failed: " + error.message };
        updated += batch.length;
      }

      return { ok: true, updated };
    }

    default:
      return { ok: false, error: `unknown action: ${action}` };
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);

  const secret = Deno.env.get("TOKEN_SECRET");
  if (!secret) return json({ ok: false, error: "TOKEN_SECRET chua duoc set" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad_body" }, 400); }

  const { action, token, payload } = body ?? {};
  if (!action) return json({ ok: false, error: "missing action" }, 400);

  const session = await verifyToken(token, secret);
  if (!session) return json({ ok: false, error: "unauthorized" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const perm = getPermission(session);

  try {
    const result = await handleAction(action, payload || {}, session, perm, admin);
    return json(result);
  } catch (err) {
    return json({ ok: false, error: (err as Error).message }, 500);
  }
});
