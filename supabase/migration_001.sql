-- Migration 001: Fix column naming and view join
-- ma_vat_tu (invoice) maps to ma_chung (contract), not ma_ncc

-- Rename snapshot column for clarity
ALTER TABLE contract_sold_snapshot RENAME COLUMN ma_ncc TO ma_chung;

-- Drop and recreate unique constraint
ALTER TABLE contract_sold_snapshot DROP CONSTRAINT IF EXISTS contract_sold_snapshot_so_hd_ma_ncc_key;
ALTER TABLE contract_sold_snapshot ADD CONSTRAINT contract_sold_snapshot_so_hd_ma_chung_key UNIQUE (so_hd, ma_chung);

-- Recreate index
DROP INDEX IF EXISTS idx_css_so_hd;
CREATE INDEX idx_css_so_hd ON contract_sold_snapshot (so_hd);

-- Update view to join on ma_chung
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
    COALESCE(css.so_luong_ban, 0) AS so_luong_da_ban,
    ci.so_luong - COALESCE(css.so_luong_ban, 0) AS so_luong_con_lai,
    COALESCE(css.avg_daily_3m, 0) AS avg_daily_3m,
    css.synced_at
FROM contract_items ci
JOIN contract_contracts cc ON cc.ma_hd = ci.ma_hd
LEFT JOIN contract_sold_snapshot css
    ON css.so_hd = cc.so_hd AND css.ma_chung = ci.ma_chung;
