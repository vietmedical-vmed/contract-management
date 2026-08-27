# Contract Management

Ứng dụng quản lý hợp đồng nội bộ VMED Group — theo dõi hợp đồng, cảnh báo hết hạn, giám sát số lượng thầu còn lại.

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Frontend | React 18 (CDN), Tailwind CSS, vanilla JS modules — SPA hash-router |
| Backend | Supabase Edge Functions (Deno) |
| Database | PostgreSQL (Supabase) |
| Auth | Token tự ký (HMAC-SHA256), bảng `shared.users` dùng chung nhiều app |
| Hosting | GitHub Pages (auto-deploy on push to `master`) |

## Cấu trúc thư mục

```
├── dashboard/                 # Frontend SPA
│   ├── index.html             # Entry point, load React + app modules
│   └── assets/js/
│       ├── config.js          # Supabase URL, keys, storage keys
│       ├── api.js             # API client, token management
│       ├── auth.js            # Login gate component
│       ├── router.js          # Hash-based SPA router
│       ├── filters.js         # Shared filter state (BU, Nhóm SP)
│       ├── app.js             # Shell layout, navigation, App root
│       └── screens/
│           ├── dashboard.js   # Tổng quan — KPI cards, cảnh báo hết hạn & hết thầu
│           ├── contracts.js   # Danh sách hợp đồng
│           ├── contract-detail.js  # Chi tiết từng hợp đồng
│           ├── alerts.js      # Cảnh báo số lượng
│           └── config.js      # Cấu hình (admin only)
├── supabase/
│   ├── functions/
│   │   └── contract-login/    # Edge Function xác thực
│   ├── migration_001.sql      # Fix join key ma_chung
│   ├── migration_002.sql      # Expiry view + don_gia
│   ├── seed.py                # Parse Excel → seed_data.sql
│   └── seed_data.sql          # (git-ignored) Generated SQL
├── Bảng kê Hợp đồng.xlsx     # Dữ liệu gốc hợp đồng
├── .github/workflows/deploy.yml  # CI/CD → GitHub Pages
└── index.html                 # Redirect root → dashboard
```

## Database Schema

4 bảng chính + 2 views:

- **`contract_contracts`** — Thông tin hợp đồng (số HĐ, khách hàng, miền, thời hạn)
- **`contract_items`** — Danh mục hàng hóa trong hợp đồng (mã chung, tên, số lượng, đơn giá)
- **`contract_sold_snapshot`** — Snapshot số lượng đã bán (join key: `so_hd` + `ma_chung`)
- **`contract_config`** — Cấu hình cảnh báo
- **`contract_expiry_view`** — View tính ngày còn lại, phân nhóm trạng thái
- **`contract_items_remaining_view`** — View tính số lượng còn lại = HĐ − đã bán

## Chạy local

Frontend là static files, không cần build:

```bash
cd dashboard
python -m http.server 8000
```

Mở `http://localhost:8000` — cần kết nối internet để load React từ CDN.

## Seed dữ liệu

```bash
pip install openpyxl
python supabase/seed.py
supabase db query --linked -f supabase/seed_data.sql
```

## Deploy

Push lên `master` → GitHub Actions tự deploy thư mục `dashboard/` lên GitHub Pages.

Deploy Edge Function:

```bash
supabase functions deploy contract-login --no-verify-jwt --project-ref nrfxymnfmjhbsgpipvkb
```
