# HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG THI TRỰC TUYẾN 2026
## "BÍ THƯ CHI BỘ GIỎI 2026"

Tài liệu này hướng dẫn chi tiết các bước để đóng gói, cấu hình biến môi trường và triển khai hệ thống thi trực tuyến lên các nền tảng thực tế (Render, Railway, VPS, Docker, Vercel) cùng với cấu hình cơ sở dữ liệu bền vững (Supabase/PostgreSQL).

---

## 1. KIẾN TRÚC HỆ THỐNG

Ứng dụng được xây dựng theo mô hình **Fullstack**:
*   **Frontend (SPA)**: React 19 + Vite + Tailwind CSS v4 + Motion.
*   **Backend API**: Express Server viết bằng TypeScript (`server.ts`).
*   **Database mặc định**: Tệp tin cơ sở dữ liệu cục bộ `/src/db/db.json` (phù hợp cho chạy thử nghiệm hoặc môi trường đơn giản).
*   **Cơ chế Build**:
    1.  Vite biên dịch mã nguồn React tĩnh vào thư mục `dist/`.
    2.  `esbuild` đóng gói máy chủ `server.ts` thành một file tự chứa `dist/server.cjs` duy nhất chạy trên môi trường Node.js giúp tối ưu hóa hiệu suất và tránh lỗi import tương đối của ES Module.

---

## 2. BIẾN MÔI TRƯỜNG (ENVIRONMENT VARIABLES)

Tạo tệp `.env` tại thư mục gốc của dự án trước khi khởi chạy:

```env
# Cổng chạy ứng dụng (Mặc định: 3000)
PORT=3000

# Chế độ môi trường (production / development)
NODE_ENV=production

# (Tùy chọn) API Key của Google Gemini để sử dụng các tính năng thông minh của AI
GEMINI_API_KEY=your_gemini_api_key_here

# (Tùy chọn) URL kết nối cơ sở dữ liệu nếu nâng cấp lên Supabase/PostgreSQL thực tế
DATABASE_URL=postgresql://postgres:password@your-db-host:5432/postgres
```

---

## 3. TRIỂN KHAI TRÊN MÁY CHỦ RIÊNG (VPS / DOCKER / RENDER / RAILWAY)

Vì ứng dụng có phần máy chủ Express (chạy liên tục để theo dõi thí sinh thi trực tuyến theo thời gian thực và quản lý trạng thái thi), các nền tảng hỗ trợ container hoặc máy chủ Node.js chạy liên tục là lựa chọn tối ưu nhất.

### Cách A: Triển khai thủ công bằng dòng lệnh (VPS / Local Server)

1.  **Cài đặt các gói phụ thuộc**:
    ```bash
    npm install
    ```
2.  **Biên dịch dự án (Build)**:
    ```bash
    npm run build
    ```
    *Lệnh này sẽ tạo ra thư mục `dist/` chứa toàn bộ tài nguyên frontend tĩnh và máy chủ `dist/server.cjs`.*

3.  **Khởi chạy máy chủ Production**:
    ```bash
    npm run start
    ```
    *Hệ thống sẽ hoạt động tại địa chỉ: `http://localhost:3000`.*

### Cách B: Triển khai bằng Docker

Tạo tệp `Dockerfile` tại thư mục gốc của dự án:

```dockerfile
# Sử dụng Node.js LTS làm base image
FROM node:20-alpine AS builder

WORKDIR /app

# Sao chép các tệp cấu hình package
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci

# Sao chép toàn bộ mã nguồn
COPY . .

# Build ứng dụng
RUN npm run build

# Giai đoạn chạy (Runner)
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db ./src/db

# Cài đặt chỉ các dependencies sản xuất (production)
RUN npm ci --only=production

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]
```

---

## 4. HƯỚNG DẪN KẾT NỐI VÀ CHUYỂN ĐỔI SANG SUPABASE / POSTGRESQL

Để ứng dụng ổn định tuyệt đối trong thực tế với số lượng thí sinh lớn, tránh ghi đè tệp `db.json` cục bộ, bạn nên cấu hình lưu trữ dữ liệu vào database thực tế (Supabase / PostgreSQL).

### Bước 1: Khởi tạo database trên Supabase
1. Đăng ký tài khoản tại [Supabase](https://supabase.com/).
2. Tạo một Project mới và lấy chuỗi **Connection String (URI)** từ phần: **Project Settings -> Database -> Connection string (URI)**.
3. Cấu hình biến môi trường `DATABASE_URL` trong dịch vụ đám mây của bạn.

### Bước 2: Đồng bộ cấu hình Database trong mã nguồn `server.ts`
Hiện tại, `server.ts` đang đọc/ghi qua các hàm `readDB()` và `writeDB()`. Để đồng bộ sang PostgreSQL thông qua chuỗi kết nối `DATABASE_URL`, bạn chỉ cần cập nhật các hàm xử lý dữ liệu sang truy vấn SQL thực tế bằng thư viện Client như `pg` hoặc `drizzle-orm`.

Ví dụ nâng cấp `readDB` và `writeDB` sang kết nối Postgres trong `server.ts`:
```typescript
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
client.connect();

// Truy vấn các bảng thay vì đọc tệp tin json cục bộ
```

---

## 5. TRIỂN KHAI TRÊN NỀN TẢNG VERCEL

Vercel mặc định hỗ trợ tối ưu nhất cho các ứng dụng Serverless hoặc Tĩnh (Static). Để triển khai ứng dụng fullstack Node.js/Express của bạn lên Vercel một cách trực tiếp, ta sẽ cấu hình tệp cấu hình Vercel để chạy phần máy chủ backend Express dưới dạng một **Vercel Serverless Function**.

Tạo tệp `vercel.json` tại thư mục gốc của dự án:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/server.cjs",
      "use": "@vercel/node"
    },
    {
      "src": "dist/**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "dist/server.cjs"
    },
    {
      "src": "/(.*)",
      "dest": "dist/$1",
      "continue": true
    },
    {
      "src": "/(.*)",
      "dest": "dist/index.html"
    }
  ]
}
```

### Các bước triển khai lên Vercel:
1. Tải và cài đặt **Vercel CLI** hoặc kết nối kho lưu trữ **GitHub** của bạn trực tiếp với Vercel Dashboard.
2. Đẩy toàn bộ mã nguồn lên kho lưu trữ GitHub của bạn.
3. Trên trang Vercel Dashboard, chọn **Add New Project** -> Chọn kho lưu trữ của bạn.
4. Cấu hình cài đặt dự án:
   * **Framework Preset**: Chọn `Other` hoặc `Vite`.
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
5. Khai báo các **Environment Variables** thiết yếu trong mục Settings (như `NODE_ENV=production` và `GEMINI_API_KEY`).
6. Nhấn nút **Deploy** để hệ thống tự động biên dịch và tạo liên kết truy cập công khai.

---

## 6. LƯU Ý KHI VẬN HÀNH THỰC TẾ (PRODUCTION RUNTIME)

1.  **Tính năng tự động lưu câu trả lời (Autosave)**: Đang được bật tự động lưu trữ định kỳ xuống `localStorage` của trình duyệt thí sinh và đồng bộ lên server. Điều này đảm bảo thí sinh không bao giờ mất bài khi mất điện hoặc mất mạng đột ngột.
2.  **Cảnh báo rời trang**: Hệ thống đã được tích hợp bộ chặn và hiển thị hộp thoại xác nhận khi thí sinh cố tình nhấn đổi tab hoặc chuyển trang trong lúc bài thi chính thức đang diễn ra để bảo vệ tính công bằng tối đa.
3.  **Tự động Đăng xuất do Không Hoạt Động (Inactivity Logout)**: Hệ thống sẽ tự động đăng xuất thí sinh nếu không ghi nhận bất kỳ thao tác chuột hay bàn phím nào trong vòng 15 phút để phòng tránh việc lạm dụng tài khoản hoặc rò rỉ đề thi khi thí sinh bỏ máy đi ra ngoài.
