-- Migration 011: Đổi join key snapshot từ ma_ncc sang ma_chung
-- Fix: nhiều contract items cùng ma_ncc (VD: AR-1588RT × 3) gây nhân bản SL bán.
-- ma_chung unique per item → join chính xác.

-- 1. Xóa data cũ (sẽ repopulate bằng sync)
TRUNCATE contract_sold_snapshot;

-- 2. Đổi cột: thêm ma_chung, bỏ UNIQUE cũ, thêm UNIQUE mới
ALTER TABLE contract_sold_snapshot
  ADD COLUMN IF NOT EXISTS ma_chung TEXT;

ALTER TABLE contract_sold_snapshot
  DROP CONSTRAINT IF EXISTS contract_sold_snapshot_so_hd_ma_ncc_key;

ALTER TABLE contract_sold_snapshot
  ADD CONSTRAINT contract_sold_snapshot_so_hd_ma_chung_key UNIQUE (so_hd, ma_chung);

-- 3. Expiry view: join dm_khach_hang, add loai_bv
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
        INNER JOIN shared.dm_vat_tu dmv ON dmv.ma_ncc = ci.ma_ncc
        WHERE ci.ma_hd = c.ma_hd
        AND dmv.bu IN ('CH&CS', 'CTTM & CTUT', 'THNS &CSVT', 'THNS & CSVT')
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

-- 4. Items view: join trên ma_chung, add loai_bv
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
    EXISTS (
        SELECT 1 FROM shared.dm_vat_tu dmv
        WHERE dmv.ma_ncc = ig.ma_ncc
        AND dmv.bu IN ('CH&CS', 'CTTM & CTUT', 'THNS &CSVT', 'THNS & CSVT')
    ) AS is_ngoai_khoa,
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

-- 4. Cập nhật RPC function: aggregate theo ma_chung
CREATE OR REPLACE FUNCTION fn_sync_sold_snapshot(p_avg_months int DEFAULT 3)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_since date := current_date - (p_avg_months || ' months')::interval;
  v_count int;
BEGIN
  WITH contract_so_hd AS (
    SELECT DISTINCT so_hd
    FROM contract_contracts
    WHERE so_hd IS NOT NULL
  ),
  totals AS (
    SELECT inv.so_hd,
           inv.ma_chung,
           SUM(COALESCE(inv.so_luong, 0)) AS so_luong_ban
    FROM app_sale.hoa_don_bovattu inv
    INNER JOIN contract_so_hd c ON c.so_hd = inv.so_hd
    WHERE inv.ma_chung IS NOT NULL
    GROUP BY inv.so_hd, inv.ma_chung
  ),
  recent_stats AS (
    SELECT inv.so_hd,
           inv.ma_chung,
           SUM(COALESCE(inv.so_luong, 0)) AS recent_sold,
           COUNT(DISTINCT inv.ngay_tai_lieu::date) AS days_with_sales
    FROM app_sale.hoa_don_bovattu inv
    INNER JOIN contract_so_hd c ON c.so_hd = inv.so_hd
    WHERE inv.ma_chung IS NOT NULL
      AND inv.ngay_tai_lieu >= v_since
    GROUP BY inv.so_hd, inv.ma_chung
  ),
  upserted AS (
    INSERT INTO contract_sold_snapshot (so_hd, ma_chung, so_luong_ban, avg_daily_3m, synced_at)
    SELECT t.so_hd,
           t.ma_chung,
           t.so_luong_ban,
           COALESCE(ROUND(r.recent_sold / NULLIF(r.days_with_sales, 0), 2), 0),
           now()
    FROM totals t
    LEFT JOIN recent_stats r ON r.so_hd = t.so_hd AND r.ma_chung = t.ma_chung
    ON CONFLICT (so_hd, ma_chung) DO UPDATE SET
      so_luong_ban = EXCLUDED.so_luong_ban,
      avg_daily_3m = EXCLUDED.avg_daily_3m,
      synced_at    = EXCLUDED.synced_at
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upserted;

  RETURN v_count;
END;
$$;
