-- Migration 012: Fix is_ngoai_khoa — check cả dm_vat_tu và dm_bo_vat_tu
-- Bug: HĐ có bộ vật tư (VD: 83-25/HĐ/VIETCUONG-BVĐKTH) bị is_ngoai_khoa=false
-- vì view chỉ join dm_vat_tu (vật tư riêng lẻ), bỏ sót dm_bo_vat_tu (bộ vật tư).

-- 1. Expiry view
DROP VIEW IF EXISTS contract_expiry_view;
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
    END AS status_order,
    EXISTS (
        SELECT 1 FROM contract_items ci
        WHERE ci.ma_hd = c.ma_hd
        AND (
            EXISTS (
                SELECT 1 FROM shared.dm_vat_tu dmv
                WHERE dmv.ma_ncc = ci.ma_ncc
                AND dmv.bu IN ('CH&CS', 'CTTM & CTUT', 'THNS &CSVT', 'THNS & CSVT')
            )
            OR EXISTS (
                SELECT 1 FROM shared.dm_bo_vat_tu dbv
                WHERE dbv.ma_chung = ci.ma_chung
                AND dbv.bu IN ('CH&CS', 'CTTM & CTUT', 'THNS &CSVT', 'THNS & CSVT')
            )
        )
    ) AS is_ngoai_khoa,
    CASE
        WHEN LOWER(kh.type_lvl2) = 'công' THEN 'Công'
        WHEN LOWER(kh.type_lvl2) = 'tư' THEN 'Tư'
        WHEN LOWER(kh.type_lvl1) LIKE '%công%' THEN 'Công'
        WHEN LOWER(kh.type_lvl1) LIKE '%tư%' THEN 'Tư'
    END AS loai_bv
FROM contract_contracts c
LEFT JOIN shared.dm_khach_hang kh ON kh.customer_id = c.ma_kh
WHERE c.thoi_han IS NOT NULL;

-- 2. Items remaining view
DROP VIEW IF EXISTS contract_items_remaining_view;
CREATE VIEW contract_items_remaining_view AS
WITH items_grouped AS (
    SELECT
        MIN(ci.id) AS id,
        ci.ma_hd,
        ci.ma_chung,
        ci.ma_ncc,
        ci.ten_hang_hoa,
        SUM(ci.so_luong) AS so_luong_hd,
        ci.don_gia
    FROM contract_items ci
    GROUP BY ci.ma_hd, ci.ma_chung, ci.ma_ncc, ci.ten_hang_hoa, ci.don_gia
)
SELECT
    ig.id,
    ig.ma_hd,
    cc.so_hd,
    cc.ma_kh,
    cc.ten_kh,
    cc.mien,
    cc.khay,
    cc.thoi_han,
    ig.ma_chung,
    ig.ma_ncc,
    ig.ten_hang_hoa,
    ig.so_luong_hd,
    ig.don_gia,
    COALESCE(css.so_luong_ban, 0) AS so_luong_da_ban,
    CASE
        WHEN kh.type_lvl2 = 'Tư'
        THEN GREATEST(ig.so_luong_hd - COALESCE(css.so_luong_ban, 0), 0)
        ELSE ig.so_luong_hd - COALESCE(css.so_luong_ban, 0)
    END AS so_luong_con_lai,
    COALESCE(css.avg_daily_3m, 0) AS avg_daily_3m,
    css.synced_at,
    (EXISTS (
        SELECT 1 FROM shared.dm_vat_tu dmv
        WHERE dmv.ma_ncc = ig.ma_ncc
        AND dmv.bu IN ('CH&CS', 'CTTM & CTUT', 'THNS &CSVT', 'THNS & CSVT')
    ) OR EXISTS (
        SELECT 1 FROM shared.dm_bo_vat_tu dbv
        WHERE dbv.ma_chung = ig.ma_chung
        AND dbv.bu IN ('CH&CS', 'CTTM & CTUT', 'THNS &CSVT', 'THNS & CSVT')
    )) AS is_ngoai_khoa,
    (kh.type_lvl2 = 'Tư') AS is_bv_tu,
    CASE
        WHEN LOWER(kh.type_lvl2) = 'công' THEN 'Công'
        WHEN LOWER(kh.type_lvl2) = 'tư' THEN 'Tư'
        WHEN LOWER(kh.type_lvl1) LIKE '%công%' THEN 'Công'
        WHEN LOWER(kh.type_lvl1) LIKE '%tư%' THEN 'Tư'
    END AS loai_bv
FROM items_grouped ig
JOIN contract_contracts cc ON cc.ma_hd = ig.ma_hd
LEFT JOIN shared.dm_khach_hang kh ON kh.customer_id = cc.ma_kh
LEFT JOIN contract_sold_snapshot css
    ON css.so_hd = cc.so_hd AND css.ma_chung = ig.ma_chung;
