# 🚀 Hướng dẫn Deploy OperaIQ 24/7 Miễn Phí

> **Thời gian ước tính**: 30-45 phút  
> **Chi phí**: $0

---

## Tổng quan kiến trúc

```
Firebase Hosting (React) ──API──► Fly.io (.NET 10) ──► Supabase (PostgreSQL)
    ✅ Free forever              ✅ Free 3 VMs           ✅ Free 500MB
```

---

## BƯỚC 1: Tạo database trên Supabase

1. Truy cập [supabase.com](https://supabase.com) → **Start your project** (đăng ký bằng GitHub)
2. Nhấn **New Project** → đặt tên `operaiq` → chọn region **Southeast Asia (Singapore)**
3. Đặt password mạnh → **Create new project** (đợi ~2 phút)
4. Vào **Settings → Database → Connection string → URI**
5. Copy chuỗi kết nối dạng:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres
   ```
6. **Lưu lại** – đây là `DATABASE_URL` sẽ dùng ở Bước 2

---

## BƯỚC 2: Deploy Backend lên Fly.io

### 2.1 Cài Fly CLI

```powershell
# Windows - mở PowerShell (không cần Admin)
iwr https://fly.io/install.ps1 -useb | iex
```

### 2.2 Đăng nhập Fly.io

```powershell
flyctl auth login
# Mở trình duyệt, đăng ký bằng GitHub (miễn phí)
```

### 2.3 Khởi tạo app trên Fly.io

```powershell
cd C:\Users\Kietn\Downloads\OperaIQ-main\OperaIQ-main
flyctl launch --name operaiq --no-deploy
# Chọn region: sin (Singapore)
# Trả lời "No" khi hỏi thêm database (đã có Supabase)
```

### 2.4 Set environment variables (secrets)

```powershell
# Database từ Supabase (Bước 1)
flyctl secrets set DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres"

# JWT Secret (tạo random, ít nhất 32 ký tự)
flyctl secrets set JWT__SECRET="OperaIQ_Prod_Secret_Key_2024_Secure_!@#"

# API Keys thật của bạn
flyctl secrets set CLAUDE__APIKEY="sk-ant-..."
flyctl secrets set GEMINI__APIKEY="AIza..."
flyctl secrets set GEMINISETTINGS__APIKEY="AIza..."
```

### 2.5 Chạy EF Core Migration trên Supabase

```powershell
# Set env var tạm thời để dotnet ef chạy với PostgreSQL
$env:DATABASE_URL = "postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres"
$env:ASPNETCORE_ENVIRONMENT = "Production"

cd OperaIQ.Web
dotnet ef database update --project ..\OperaIQ.Infrastructure\OperaIQ.Infrastructure.csproj
```

### 2.6 Deploy Backend

```powershell
cd C:\Users\Kietn\Downloads\OperaIQ-main\OperaIQ-main
flyctl deploy
# Đợi 3-5 phút, sau đó kiểm tra:
flyctl status
flyctl logs
```

### 2.7 Kiểm tra backend

Mở trình duyệt: **https://operaiq.fly.dev/api/health**  
Nếu thấy `{"status":"healthy", ...}` → ✅ Backend đang chạy!

---

## BƯỚC 3: Deploy Frontend lên Firebase

### 3.1 Cài Firebase CLI (nếu chưa có)

```powershell
npm install -g firebase-tools
firebase login
```

### 3.2 Build và Deploy

```powershell
cd C:\Users\Kietn\Downloads\OperaIQ-main\OperaIQ-main\operaiq.client
npm install
npm run build   # Build với .env.production (trỏ vào fly.dev)

cd ..
firebase deploy --only hosting
```

### 3.3 Kiểm tra frontend

Mở trình duyệt: **https://opera-ai-b0fea.web.app**  
Đăng nhập thử với tài khoản SuperAdmin seed sẵn.

---

## BƯỚC 4: Cài đặt CI/CD tự động (tuỳ chọn nhưng khuyến nghị)

### 4.1 Lấy Fly.io API Token

```powershell
flyctl tokens create deploy -x 999999h
# Copy token xuất ra
```

### 4.2 Lấy Firebase Service Account

1. Vào [Firebase Console](https://console.firebase.google.com) → Project **opera-ai-b0fea**
2. **Project Settings → Service Accounts → Generate new private key**
3. Download file JSON

### 4.3 Thêm Secrets vào GitHub

Vào GitHub repo → **Settings → Secrets and variables → Actions** → **New repository secret**:

| Secret Name | Giá trị |
|-------------|---------|
| `FLY_API_TOKEN` | Token từ bước 4.1 |
| `FIREBASE_SERVICE_ACCOUNT` | Nội dung file JSON từ bước 4.2 |

Từ nay, **mỗi lần push code lên GitHub** sẽ tự động deploy! 🎉

---

## Kiểm tra sau deploy

| URL | Mục đích |
|-----|---------|
| https://opera-ai-b0fea.web.app | Frontend React |
| https://operaiq.fly.dev/api/health | Health check |
| https://operaiq.fly.dev/swagger | Swagger API docs |
| https://operaiq.fly.dev/hangfire | Hangfire dashboard |

---

## Theo dõi và debug

```powershell
# Xem logs realtime
flyctl logs --app operaiq

# Xem trạng thái máy
flyctl status --app operaiq

# SSH vào máy (nếu cần debug)
flyctl ssh console --app operaiq

# Xem metrics (RAM, CPU)
flyctl dashboard --app operaiq
```

---

## ⚠️ Lưu ý quan trọng

1. **Fly.io free tier**: 3 shared VMs miễn phí/tháng. App này chỉ dùng 1 VM → hoàn toàn free.
2. **Supabase free**: 500MB database, đủ cho hàng nghìn records. Nếu hết thì nâng cấp $25/tháng.
3. **Firebase Hosting**: 10GB bandwidth/tháng → hoàn toàn đủ cho app nội bộ.
4. **Auto-sleep**: Đã cấu hình `auto_stop_machines = "off"` → app KHÔNG bao giờ tắt → 24/7 ✅

---

## Tài khoản đăng nhập demo (đã seed sẵn)

Kiểm tra trong file `DbInitializer.cs` hoặc `XuanDatSeeder.cs` trong Infrastructure/Data/
