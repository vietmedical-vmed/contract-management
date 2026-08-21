-- migration_004: add ma_kh to expiry and items_remaining views

DROP VIEW IF EXISTS contract_expiry_view;
DROP VIEW IF EXISTS contract_items_remaining_view;

CREATE VIEW contract_expiry_view AS
SELECT
    c.ma_hd,
    c.so_hd,
    c.ma_kh,
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

CREATE VIEW contract_items_remaining_view AS
SELECT
    ci.id,
    ci.ma_hd,
    cc.so_hd,
    cc.ma_kh,
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
