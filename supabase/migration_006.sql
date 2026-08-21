-- Migration 006: Handle compound ma_ncc (e.g. "AR-2324BCCT/ AR-2324BCCTT")
-- Split ma_ncc by "/" and sum sold quantities across all matching codes

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
    cc.thoi_han,
    ig.ma_chung,
    ig.ma_ncc,
    ig.ten_hang_hoa,
    ig.so_luong_hd,
    ig.don_gia,
    COALESCE(snap.total_ban, 0) AS so_luong_da_ban,
    ig.so_luong_hd - COALESCE(snap.total_ban, 0) AS so_luong_con_lai,
    COALESCE(snap.avg_daily, 0) AS avg_daily_3m,
    snap.last_synced AS synced_at
FROM items_grouped ig
JOIN contract_contracts cc ON cc.ma_hd = ig.ma_hd
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
