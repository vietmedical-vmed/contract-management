-- Migration 009: BV tư (type_lvl2 = 'Tư') -> so_luong_con_lai floor at 0

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
    COALESCE(snap.total_ban, 0) AS so_luong_da_ban,
    CASE
        WHEN kh.type_lvl2 = 'Tư'
        THEN GREATEST(ig.so_luong_hd - COALESCE(snap.total_ban, 0), 0)
        ELSE ig.so_luong_hd - COALESCE(snap.total_ban, 0)
    END AS so_luong_con_lai,
    COALESCE(snap.avg_daily, 0) AS avg_daily_3m,
    snap.last_synced AS synced_at,
    EXISTS (
        SELECT 1 FROM shared.dm_vat_tu dmv
        WHERE dmv.ma_ncc = ig.ma_ncc
        AND dmv.bu IN ('CH&CS', 'CTTM & CTUT', 'THNS &CSVT', 'THNS & CSVT')
    ) AS is_ngoai_khoa
FROM items_grouped ig
JOIN contract_contracts cc ON cc.ma_hd = ig.ma_hd
LEFT JOIN shared.dm_khach_hang kh ON kh.customer_id = cc.ma_kh
LEFT JOIN LATERAL (
    SELECT
        SUM(css.so_luong_ban) AS total_ban,
        SUM(css.avg_daily_3m) AS avg_daily,
        MAX(css.synced_at) AS last_synced
    FROM contract_sold_snapshot css
    WHERE css.so_hd = cc.so_hd
      AND css.ma_ncc = ANY(
          string_to_array(
              regexp_replace(TRIM(ig.ma_ncc), '\s*/\s*', '/', 'g'),
              '/'
          )
      )
) snap ON true;
