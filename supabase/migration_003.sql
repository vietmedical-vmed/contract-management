-- Migration 003: Fix join key — invoice ma_vat_tu maps to contract ma_ncc, not ma_chung
-- ma_chung is the internal common code; ma_ncc is the supplier/material code used in invoices

ALTER TABLE contract_sold_snapshot RENAME COLUMN ma_chung TO ma_ncc;

ALTER TABLE contract_sold_snapshot DROP CONSTRAINT IF EXISTS contract_sold_snapshot_so_hd_ma_chung_key;
ALTER TABLE contract_sold_snapshot ADD CONSTRAINT contract_sold_snapshot_so_hd_ma_ncc_key UNIQUE (so_hd, ma_ncc);

DROP VIEW IF EXISTS contract_items_remaining_view;
CREATE VIEW contract_items_remaining_view AS
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
