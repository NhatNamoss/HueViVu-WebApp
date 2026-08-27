# Deployment Plan cho `huevivu-trainer`

Dựa trên thông tin VPS và key của bạn, đây là kế hoạch để đóng gói và đưa project `huevivu-trainer` lên server:

## 1. Chuẩn bị File và Quyền (Local)
- Nén thư mục `huevivu-trainer` thành file `huevivu-trainer.tar.gz` (bỏ qua thư mục `node_modules` và `.next` để file nén nhẹ nhất có thể).
- Cập nhật quyền (permissions) cho file `vps1.pem` trên máy Windows của bạn (vì SSH sẽ từ chối kết nối nếu file key có quyền truy cập quá lỏng lẻo - lỗi *UNPROTECTED PRIVATE KEY FILE*).

## 2. Upload lên VPS
- Sử dụng lệnh `scp` thông qua `vps1.pem` để đẩy file `huevivu-trainer.tar.gz` từ máy tính lên VPS `ec2-54-151-178-171.ap-southeast-1.compute.amazonaws.com`.

## 3. Cài đặt và Chạy trên VPS (Port 3003)
- Kết nối SSH vào VPS.
- Giải nén `huevivu-trainer.tar.gz`.
- Chạy `npm install` để tải các dependencies.
- Chạy `npm run build` để build bản production cho Next.js.
- Sử dụng `pm2` (trình quản lý process rất phổ biến cho Node.js) để chạy server liên tục ở port **3003**. Lệnh dự kiến: `npx pm2 start npm --name 'huevivu-trainer' -- run start -- -p 3003`.

## User Review Required
> [!IMPORTANT]
> Quá trình này sẽ thực thi các lệnh nén file, cấp quyền file hệ thống cục bộ (icacls) và SSH vào AWS EC2 của bạn.
> Nếu bạn đồng ý, hãy nhấn **Proceed (Duyệt)** để mình tự động chạy toàn bộ quy trình đẩy code và bật server cho bạn!
