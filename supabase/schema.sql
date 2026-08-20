-- ============================================================
-- Contract Management — Schema
-- Supabase project: nrfxymnfmjhbsgpipvkb
-- ============================================================

-- 1. Contract headers (deduplicated from Excel by ma_hd)
CREATE TABLE IF NOT EXISTS contract_contracts (
    ma_hd       TEXT PRIMARY KEY,
    so_hd       TEXT,
    nam         INTEGER,
    ngay_ky     DATE,
    thoi_han    DATE,
    khay        TEXT,
    mien        TEXT,
    ma_kh       TEXT,
    ten_kh      TEXT,
    ten_ps      TEXT,
    ten_so      TEXT,
    so_bao_gia  TEXT,
    so_goi_thau TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cc_thoi_han ON contract_contracts (thoi_han);
CREATE INDEX IF NOT EXISTS idx_cc_mien     ON contract_contracts (mien);
CREATE INDEX IF NOT EXISTS idx_cc_so_hd    ON contract_contracts (so_hd);

-- 2. Contract line items (one row per product per contract)
CREATE TABLE IF NOT EXISTS contract_items (
    id          SERIAL PRIMARY KEY,
    ma_hd       TEXT NOT NULL REFERENCES contract_contracts(ma_hd) ON DELETE CASCADE,
    ma_chung    TEXT,
    ma_ncc      TEXT,
    ten_hang_hoa TEXT,
    so_luong    NUMERIC DEFAULT 0,
    don_gia     NUMERIC DEFAULT 0,
    tong_tien   NUMERIC DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ci_ma_hd  ON contract_items (ma_hd);
CREATE INDEX IF NOT EXISTS idx_ci_ma_ncc ON contract_items (ma_ncc);

-- 3. Alert configuration (key-value, editable from UI)
CREATE TABLE IF NOT EXISTS contract_alert_config (
    key         TEXT PRIMARY KEY,
    value       JSONB NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now(),
    updated_by  TEXT
);

INSERT INTO contract_alert_config (key, value) VALUES
    ('contract_warn_days', '[30, 15]'),
    ('quantity_warn_days', '[20, 10]'),
    ('quantity_multiplier', '[20, 10]'),
    ('avg_period_months', '3')
ON CONFLICT (key) DO NOTHING;

-- 4. Weekly snapshot of sold quantities from invoices
CREATE TABLE IF NOT EXISTS contract_sold_snapshot (
    id              SERIAL PRIMARY KEY,
    so_hd           TEXT NOT NULL,
    ma_ncc          TEXT NOT NULL,
    so_luong_ban    NUMERIC DEFAULT 0,
    avg_daily_3m    NUMERIC DEFAULT 0,
    synced_at       TIMESTAMPTZ DEFAULT now(),
    UNIQUE (so_hd, ma_ncc)
);

CREATE INDEX IF NOT EXISTS idx_css_so_hd ON contract_sold_snapshot (so_hd);

-- 5. Useful view: contracts with days remaining + status_order for sorting
CREATE OR REPLACE VIEW contract_expiry_view AS
SELECT
    c.ma_hd,
    c.so_hd,
    c.ten_kh,
    c.mien,
    c.khay,
    c.ngay_ky,
    c.thoi_han,
    (c.thoi_han - CURRENT_DATE) AS days_remaining,
    c.ten_ps,
    c.ten_so,
    CASE
        WHEN (c.thoi_han - CURRENT_DATE) > 0 AND (c.thoi_han - CURRENT_DATE) <= 30 THEN 1
        WHEN (c.thoi_han - CURRENT_DATE) > 30 THEN 2
        ELSE 3
    END AS status_order
FROM contract_contracts c
WHERE c.thoi_han IS NOT NULL;

-- 7. Useful view: items with remaining quantity
CREATE OR REPLACE VIEW contract_items_remaining_view AS
SELECT
    ci.id,
    ci.ma_hd,
    cc.so_hd,
    cc.ten_kh,
    cc.mien,
    cc.thoi_han,
    ci.ma_chung,
    ci.ma_ncc,
    ci.ten_hang_hoa,
    ci.so_luong AS so_luong_hd,
    ci.don_gia,
    COALESCE(css.so_luong_ban, 0) AS so_luong_da_ban,
    ci.so_luong - COALESCE(css.so_luong_ban, 0) AS so_luong_con_lai,
    COALESCE(css.avg_daily_3m, 0) AS avg_daily_3m,
    css.synced_at
FROM contract_items ci
JOIN contract_contracts cc ON cc.ma_hd = ci.ma_hd
LEFT JOIN contract_sold_snapshot css
    ON css.so_hd = cc.so_hd AND css.ma_ncc = ci.ma_ncc;
