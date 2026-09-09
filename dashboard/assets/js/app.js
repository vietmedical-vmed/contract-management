(function () {
  const h = React.createElement;
  const { useState, useEffect } = React;
  const { api, getToken, getUser, clearToken } = window.CONTRACT_API;
  const { LoginGate } = window.CONTRACT_AUTH;
  const R = window.CONTRACT_ROUTER;
  const F = window.CONTRACT_FILTERS;

  const NAV = [
    { path: "/dashboard",  label: "Tổng quan" },
    { path: "/contracts",  label: "Hợp đồng" },
  ];

  const initials = (u) => {
    const src = (u.ho_ten || u.username || "").trim();
    if (!src) return "CT";
    const parts = src.split(/\s+/);
    const s = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : src.slice(0, 2);
    return s.toUpperCase();
  };

  function SyncBtn() {
    const [syncing, setSyncing] = useState(false);
    const [msg, setMsg] = useState(null);

    async function handleSync() {
      setSyncing(true);
      setMsg(null);
      try {
        const res = await api("sync-invoices", {});
        setMsg({ ok: true, text: "Đồng bộ xong! " + (res.updated || 0) + " dòng." });
      } catch (err) {
        setMsg({ ok: false, text: err.message });
      } finally {
        setSyncing(false);
      }
    }

    return h("div", { className: "relative" },
      h("button", {
        onClick: handleSync, disabled: syncing,
        className: "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition " +
          (syncing ? "text-slate-400 border-slate-200" : "text-slate-700 border-slate-300 hover:bg-slate-50"),
      }, h("span", null, "⟳"), syncing ? "Đang đồng bộ..." : "Đồng bộ dữ liệu"),
      msg && h("div", {
        className: "absolute right-0 top-full mt-1 whitespace-nowrap text-xs px-2 py-1 rounded shadow-lg z-10",
        style: { background: msg.ok ? "#dcfce7" : "#fee2e2", color: msg.ok ? "#16a34a" : "#dc2626" },
      }, msg.text),
    );
  }

  function ConfigPopup({ onClose }) {
    const [config, setConfig] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
      api("get-config", {})
        .then(res => setConfig(res.config || {}))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }, []);

    async function handleSave() {
      setSaving(true); setError(""); setSuccess("");
      try {
        await api("update-config", { config });
        setSuccess("Đã lưu!");
      } catch (err) { setError(err.message); }
      finally { setSaving(false); }
    }

    return h("div", {
      className: "fixed inset-0 z-50 flex items-start justify-center pt-24",
      onClick: e => { if (e.target === e.currentTarget) onClose(); },
    },
      h("div", { className: "absolute inset-0 bg-black/30" }),
      h("div", { className: "relative bg-white rounded-xl shadow-xl w-full max-w-md p-5" },
        h("div", { className: "flex items-center justify-between mb-4" },
          h("h3", { className: "text-base font-bold", style: { color: "#1c1e21" } }, "Cấu hình cảnh báo"),
          h("button", { onClick: onClose, className: "text-slate-400 hover:text-slate-600 text-lg leading-none" }, "✕"),
        ),
        loading
          ? h("div", { className: "text-center py-8 text-slate-400 text-sm" }, "Đang tải...")
          : h("div", null,
              error && h("div", { className: "rounded-lg px-3 py-2 mb-3 text-sm", style: { background: "#fee2e2", color: "#dc2626" } }, error),
              success && h("div", { className: "rounded-lg px-3 py-2 mb-3 text-sm", style: { background: "#dcfce7", color: "#16a34a" } }, success),
              h("label", { className: "block text-sm font-medium mb-1", style: { color: "#1c1e21" } }, "Cảnh báo hết hạn HĐ (ngày)"),
              h("p", { className: "text-xs mb-2", style: { color: "#65676b" } }, "Mốc cảnh báo trước ngày hết hạn. VD: 30, 15"),
              h("input", {
                type: "text",
                value: (config.contract_warn_days || []).join(", "),
                onChange: e => {
                  const v = e.target.value.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n));
                  setConfig(prev => ({ ...prev, contract_warn_days: v }));
                  setSuccess("");
                },
                className: "w-full px-3 py-2 rounded-lg border text-sm mb-4", style: { borderColor: "#dadde1" },
                placeholder: "VD: 30, 15",
              }),
              h("label", { className: "block text-sm font-medium mb-1", style: { color: "#1c1e21" } }, "Cảnh báo mức sử dụng thầu (%)"),
              h("p", { className: "text-xs mb-2", style: { color: "#65676b" } }, "Cảnh báo khi SP đã sử dụng vượt ngưỡng này"),
              h("input", {
                type: "number",
                value: config.quantity_warn_pct ?? 80,
                onChange: e => {
                  setConfig(prev => ({ ...prev, quantity_warn_pct: Number(e.target.value) }));
                  setSuccess("");
                },
                className: "w-full max-w-[120px] px-3 py-2 rounded-lg border text-sm mb-4", style: { borderColor: "#dadde1" },
                min: 1, max: 100,
              }),
              h("button", {
                onClick: handleSave, disabled: saving,
                className: "px-5 py-2 rounded-lg text-white font-semibold text-sm transition",
                style: { background: saving ? "#93c5fd" : "#1877f2" },
              }, saving ? "Đang lưu..." : "Lưu"),
            ),
      ),
    );
  }

  function Shell({ user, onLogout }) {
    const path = R.useRoute();
    const filters = F.useFilters();
    const [buOptions, setBuOptions] = useState([]);
    const [nhomSpOptions, setNhomSpOptions] = useState([]);
    const [showConfig, setShowConfig] = useState(false);
    const visibleNav = NAV.filter(n => !n.roles || n.roles.includes(user.role));
    const Screen = R.get(path);
    const subtitle = user.ho_ten || user.username || "—";

    useEffect(() => {
      api("list-contracts", { page_size: 1 }).then(res => {
        if (res.bu_list) setBuOptions(res.bu_list);
        if (res.nhom_sp_list) setNhomSpOptions(res.nhom_sp_list);
      }).catch(() => {});
    }, []);
    const ROLE_BADGE = {
      admin:   { label: "Admin",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
      manager: { label: "Manager", cls: "bg-blue-50 text-blue-700 border-blue-200" },
      product_manager: { label: "PM", cls: "bg-violet-50 text-violet-700 border-violet-200" },
      area_manager: { label: "AM", cls: "bg-teal-50 text-teal-700 border-teal-200" },
      ps:      { label: "PS",      cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    };
    const badge = ROLE_BADGE[user.role];

    return h("div", { className: "min-h-screen bg-slate-50" },
      h("header", { className: "bg-white border-b border-slate-200" },
        h("div", { className: "w-full px-4 md:px-6" },
          h("div", { className: "flex items-start justify-between pt-3 gap-4" },
            h("div", { className: "flex items-center gap-3" },
              h("div", {
                className: "w-11 h-11 rounded-full bg-blue-500 text-white grid place-items-center font-bold text-sm shrink-0",
              }, initials(user)),
              h("div", { className: "leading-tight" },
                h("div", { className: "font-bold text-slate-900 text-base md:text-lg" }, "QUẢN LÝ HỢP ĐỒNG"),
                h("div", { className: "flex items-center gap-2 mt-0.5" },
                  h("span", { className: "text-xs text-slate-500" }, subtitle),
                  badge && h("span", { className: "px-1.5 py-0.5 rounded text-[10px] font-semibold border " + badge.cls }, badge.label),
                ),
              ),
            ),
            h("div", { className: "flex flex-col items-end gap-2" },
              h("div", { className: "text-[9px] text-slate-400 italic text-right" },
                "Designed and developed by ",
                h("span", { className: "font-semibold text-slate-500 not-italic" }, "Do Hoang Giang"),
              ),
              h("div", { className: "flex items-center gap-2" },
                h("button", {
                  onClick: () => window.location.reload(),
                  className: "flex items-center gap-1.5 text-xs text-white bg-blue-500 hover:bg-blue-600 px-2.5 py-1.5 rounded-md",
                }, h("span", null, "⟳"), "Reload"),
                h("button", {
                  onClick: onLogout,
                  className: "flex items-center gap-1.5 text-xs text-white bg-red-500 hover:bg-red-600 px-2.5 py-1.5 rounded-md",
                }, h("span", null, "⎋"), "Đăng xuất"),
              ),
            ),
          ),
          h("div", { className: "flex flex-wrap items-center gap-3 py-2.5 border-t border-slate-200 mt-3" },
            h("span", { className: "text-xs font-semibold uppercase", style: { color: "#9ca3af", letterSpacing: "0.05em" } }, "Lọc"),
            h("select", {
              value: filters.bu,
              onChange: e => F.set({ bu: e.target.value }),
              className: "px-2.5 py-1.5 rounded-lg border text-xs", style: { borderColor: "#dadde1" }
            },
              h("option", { value: "" }, "BU: tất cả"),
              buOptions.map(k => h("option", { key: k, value: k }, k))
            ),
            h("select", {
              value: filters.nhom_sp,
              onChange: e => F.set({ nhom_sp: e.target.value }),
              className: "px-2.5 py-1.5 rounded-lg border text-xs", style: { borderColor: "#dadde1" }
            },
              h("option", { value: "" }, "Nhóm SP: tất cả"),
              nhomSpOptions.map(k => h("option", { key: k, value: k }, k))
            ),
            user.role === "admin" && h("div", { className: "flex items-center gap-2 ml-auto" },
              h(SyncBtn),
              h("button", {
                onClick: () => setShowConfig(true),
                className: "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition text-slate-700 border-slate-300 hover:bg-slate-50",
              }, h("span", null, "⚙"), "Cấu hình"),
            ),
          ),
          h("nav", { className: "flex items-center gap-5 md:gap-6 pt-2.5 overflow-x-auto overflow-y-hidden border-t border-slate-200" },
            visibleNav.map((it) => h("button", {
              key: it.path,
              onClick: () => R.navigate(it.path),
              className: "relative px-0.5 pb-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors " +
                (path === it.path
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"),
            }, it.label)),
          ),
        ),
      ),
      h("main", { className: "w-full px-4 md:px-6 py-4" },
        Screen
          ? h(Screen, { user })
          : h("div", { className: "text-slate-500 text-sm" }, "Trang chưa được xây dựng"),
      ),
      showConfig && h(ConfigPopup, { onClose: () => setShowConfig(false) }),
    );
  }

  function App() {
    const token = getToken();
    const cached = getUser();
    const [user, setUser] = useState(token && cached ? cached : null);

    useEffect(() => {
      const boot = document.getElementById("boot");
      if (boot) boot.style.display = "none";

      if (token && cached) {
        api("whoami").then(me => {
          setUser(prev => ({
            ...prev,
            role: me.role || prev.role,
            mien: me.mien || prev.mien,
          }));
        }).catch(() => {
          clearToken();
          setUser(null);
        });
      } else {
        clearToken();
      }
    }, []);

    if (!user) return h(LoginGate, { onAuth: setUser });

    return h(Shell, {
      user,
      onLogout: () => { clearToken(); setUser(null); }
    });
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(App));
})();
