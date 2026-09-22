-- Migration 015: Function to get sold quantities by fiscal year for a contract
-- FY = April to March. FY25 = Apr 2025 - Mar 2026.

CREATE OR REPLACE FUNCTION fn_sold_by_fy(p_so_hd text)
RETURNS TABLE(ma_chung text, fy int, sold numeric)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT inv.ma_chung::text,
         (CASE WHEN EXTRACT(MONTH FROM inv.ngay_tai_lieu) >= 4
               THEN EXTRACT(YEAR FROM inv.ngay_tai_lieu)
               ELSE EXTRACT(YEAR FROM inv.ngay_tai_lieu) - 1
          END)::int AS fy,
         SUM(COALESCE(inv.so_luong, 0))::numeric AS sold
  FROM app_contract.hoa_don_bovattu inv
  WHERE inv.so_hd = p_so_hd
    AND inv.ma_chung IS NOT NULL
  GROUP BY inv.ma_chung, fy;
$$;
