"""
Seed script: parse "Bảng kê Hợp đồng.xlsx" -> generate seed_data.sql
Run: python supabase/seed.py
Then: supabase db query --linked -f supabase/seed_data.sql
"""

import openpyxl
import os
from datetime import datetime, date

EXCEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'Bảng kê Hợp đồng.xlsx')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), 'seed_data.sql')
BATCH_SIZE = 500


def escape_sql(val):
    if val is None:
        return 'NULL'
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, (datetime, date)):
        return f"'{val.strftime('%Y-%m-%d')}'"
    s = str(val).replace("'", "''").strip()
    if not s:
        return 'NULL'
    return f"'{s}'"


def main():
    print(f'Reading {EXCEL_PATH} ...')
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True, read_only=True)
    ws = wb['Template']

    contracts = {}
    items = []
    skipped = 0

    for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        ma_hd = row[6]
        if not ma_hd:
            skipped += 1
            continue

        ma_hd = str(ma_hd).strip()

        if ma_hd not in contracts:
            contracts[ma_hd] = {
                'ma_hd': ma_hd,
                'so_hd': row[7],
                'nam': row[0],
                'ngay_ky': row[2],
                'thoi_han': row[3],
                'khay': row[4],
                'mien': row[5],
                'ma_kh': row[8],
                'ten_kh': row[9],
                'ten_ps': row[16],
                'ten_so': row[17],
                'so_bao_gia': row[18] if len(row) > 18 else None,
                'so_goi_thau': row[19] if len(row) > 19 else None,
            }

        items.append({
            'ma_hd': ma_hd,
            'ma_chung': row[10],
            'ma_ncc': row[11],
            'ten_hang_hoa': row[12],
            'so_luong': row[13] if row[13] else 0,
            'don_gia': row[14] if row[14] else 0,
            'tong_tien': row[15] if row[15] else 0,
        })

    wb.close()
    print(f'Parsed: {len(contracts)} contracts, {len(items)} items, {skipped} empty rows skipped')

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write('-- Auto-generated seed data\n')
        f.write('-- Generated: ' + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + '\n\n')

        f.write('BEGIN;\n\n')

        f.write('-- Clear existing data\n')
        f.write('DELETE FROM contract_items;\n')
        f.write('DELETE FROM contract_contracts;\n\n')

        # Insert contracts in batches
        f.write(f'-- Contracts ({len(contracts)} rows)\n')
        contract_list = list(contracts.values())
        for batch_start in range(0, len(contract_list), BATCH_SIZE):
            batch = contract_list[batch_start:batch_start + BATCH_SIZE]
            f.write('INSERT INTO contract_contracts '
                    '(ma_hd, so_hd, nam, ngay_ky, thoi_han, khay, mien, '
                    'ma_kh, ten_kh, ten_ps, ten_so, so_bao_gia, so_goi_thau) VALUES\n')
            rows = []
            for c in batch:
                vals = ', '.join([
                    escape_sql(c['ma_hd']),
                    escape_sql(c['so_hd']),
                    escape_sql(c['nam']),
                    escape_sql(c['ngay_ky']),
                    escape_sql(c['thoi_han']),
                    escape_sql(c['khay']),
                    escape_sql(c['mien']),
                    escape_sql(c['ma_kh']),
                    escape_sql(c['ten_kh']),
                    escape_sql(c['ten_ps']),
                    escape_sql(c['ten_so']),
                    escape_sql(c['so_bao_gia']),
                    escape_sql(c['so_goi_thau']),
                ])
                rows.append(f'({vals})')
            f.write(',\n'.join(rows))
            f.write(';\n\n')

        # Insert items in batches
        f.write(f'-- Items ({len(items)} rows)\n')
        for batch_start in range(0, len(items), BATCH_SIZE):
            batch = items[batch_start:batch_start + BATCH_SIZE]
            f.write('INSERT INTO contract_items '
                    '(ma_hd, ma_chung, ma_ncc, ten_hang_hoa, so_luong, don_gia, tong_tien) VALUES\n')
            rows = []
            for item in batch:
                vals = ', '.join([
                    escape_sql(item['ma_hd']),
                    escape_sql(item['ma_chung']),
                    escape_sql(item['ma_ncc']),
                    escape_sql(item['ten_hang_hoa']),
                    escape_sql(item['so_luong']),
                    escape_sql(item['don_gia']),
                    escape_sql(item['tong_tien']),
                ])
                rows.append(f'({vals})')
            f.write(',\n'.join(rows))
            f.write(';\n\n')

        f.write('COMMIT;\n')

    file_size = os.path.getsize(OUTPUT_PATH) / 1024
    print(f'Generated: {OUTPUT_PATH} ({file_size:.0f} KB)')
    print(f'Run: supabase db query --linked -f supabase/seed_data.sql')


if __name__ == '__main__':
    main()
