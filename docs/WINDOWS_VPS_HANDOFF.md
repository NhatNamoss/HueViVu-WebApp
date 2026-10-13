# Chuẩn bị VPS Windows — app.huevivu.id.vn

Đợt này chỉ chuẩn bị và kiểm chứng local. Chủ dự án sẽ thao tác máy chủ sau. Chưa có chứng nhận HTTPS, giám sát bên ngoài hoặc tải thực trên VPS.

## Trước khi chuyển

- Tách `.env.local` local khỏi môi trường VPS; tạo JWT_SECRET riêng (ít nhất 32 ký tự). Không đưa secrets, database, backups vào Git.
- Đặt `ALLOW_LEGACY_DEMO_LOGIN=0`; không sao chép tài khoản/fixture QA. Flag local không cấp đăng nhập demo trong production.
- Giữ `data/`, `public/uploads/` và backup trên ổ bền vững ngoài các thư mục build bị thay thế. Ứng dụng hiện đọc SQLite từ `data/huevivu.db` dưới thư mục chạy; không thay đổi working directory khi đăng ký dịch vụ.
- Cài dependencies trên chính Windows VPS; không sao chép node_modules từ máy khác, đặc biệt better-sqlite3.
- Chạy một tiến trình Node cho SQLite ở giai đoạn đầu. Chỉ mở backend ở loopback; proxy HTTPS phục vụ app.huevivu.id.vn. Chưa mở Redis/FastAPI nếu chưa dùng.

## Kiểm tra từ thư mục dự án trên VPS

```powershell
npm ci
npm run check:production-env
npm run test:types
npm run test:trusted-companion
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Đăng ký tiến trình khởi động cùng Windows bằng công cụ dịch vụ do chủ VPS quản lý; cấu hình tự khởi động lại, working directory, quyền truy cập data/uploads/secrets và luân chuyển log. Kiểm tra lại sau khi reboot. Không đặt JWT_SECRET trong lệnh công khai/log.

## Backup và khôi phục

```powershell
npm run db:backup
npm run test:restore
```

`test:restore` tạo backup nhất quán bằng SQLite backup API, khôi phục vào thư mục tạm riêng, mở SQLite và kiểm tra integrity/số dòng. Database đang dùng không bị thay thế. Backup kiểm tra giữ trong `backups/`; cần sao lưu thêm ra nơi khác trên VPS thực.

Khôi phục thật: đưa app vào bảo trì → dừng dịch vụ → giữ bản hiện tại cùng WAL/SHM để có đường quay lại → chọn backup đã kiểm tra → khôi phục vào data/huevivu.db trong thư mục sạch, tránh ghép WAL/SHM cũ với database mới → khởi động → kiểm tra health, đăng nhập, địa điểm và lịch/tiến độ. Diễn tập trên bản sao trước khi dùng cho dữ liệu thật.

## Cổng còn phải kiểm chứng trên VPS

- DNS, chứng chỉ HTTPS, proxy và header bảo mật; backend không lộ cổng trực tiếp.
- Giới hạn tốc độ truy cập/đăng nhập ở proxy hoặc ứng dụng, cấu hình địa chỉ client đáng tin; chưa có chứng nhận rate limiting trong gói này.
- Health `/api/health`, cảnh báo downtime, log không lộ secrets hoặc tọa độ.
- Lịch backup tự động, backup ngoài máy, retention và khôi phục sau reboot.
- Bộ smoke/API bằng tài khoản QA riêng trên staging; không chạy bộ test có quyền ghi dữ liệu trực tiếp trên production đang phục vụ khách.
- Điện thoại thật, 4G/mạng yếu, tải đồng thời và dữ liệu địa điểm quy mô thật.
- Người phụ trách nhập và xác minh corpus; phần mềm không tự chứng thực thông tin thực tế.

Chỉ đánh dấu Public deployment verification sau khi các bước trên có bằng chứng thật.
