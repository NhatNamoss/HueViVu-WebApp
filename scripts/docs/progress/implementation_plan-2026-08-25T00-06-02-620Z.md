# Tách Web Huấn Luyện Thành Project Độc Lập

Dựa trên yêu cầu của bạn, chúng ta sẽ tách riêng trang "Train Chatbot" thành một ứng dụng độc lập để bạn dễ dàng deploy lên VPS. Dữ liệu huấn luyện sẽ được lưu dưới dạng file `bot_knowledge.json`. Sau này, bạn chỉ cần tải file JSON từ VPS về và bỏ vào app chính là bot sẽ tự động cập nhật kiến thức.

## 1. Tạo Project Mới: `huevivu-trainer`
Mình sẽ tạo một project Next.js hoàn toàn mới nằm cạnh thư mục `huevivu-nextjs` hiện tại (ví dụ: `scratch/huevivu-trainer`).
- **Giao diện**: Di chuyển toàn bộ code giao diện (UI) của trang huấn luyện sang project này.
- **Backend (API)**: Project này sẽ có API riêng để đọc và ghi các quy tắc/Q&A vào một file `bot_knowledge.json` lưu ngay trên thư mục gốc của project trên VPS.

## 2. Dọn Dẹp App Chính (`huevivu-nextjs`)
- Xóa thư mục giao diện `src/app/admin/train`.
- Xóa các thư mục API `src/app/api/train`.
- Xóa đoạn code tạo bảng `bot_knowledge` trong `src/lib/db.ts` để tối ưu (do chúng ta không dùng DB cho bot nữa).

## 3. Cập Nhật Cơ Chế Đọc Dữ Liệu (App Chính)
Cập nhật file `src/lib/ai.ts` trong `huevivu-nextjs`:
- Thay vì truy vấn database, bot sẽ tự động đọc file `data/bot_knowledge.json` (bạn sẽ copy file này từ VPS về bỏ vào thư mục `data/` của app chính).
- Nếu file tồn tại, bot sẽ trích xuất các "Quy tắc (Rule)" và "Kiến thức (Q&A)" đang được bật (is_active = 1) và đưa vào cấu hình của AI.

## User Review Required
> [!IMPORTANT]
> - Mình sẽ dùng **Next.js** cho `huevivu-trainer` nhé (vì cần API để ghi file JSON ở server/VPS). Bạn đồng ý chứ?
> - Thư mục gốc của project mới sẽ là `C:\Users\LENOVO\.gemini\antigravity\scratch\huevivu-trainer`.
> - Theo luồng làm việc này, sau khi train xong trên VPS, bạn sẽ tải file `bot_knowledge.json` về và copy đè vào thư mục `data/` của project `huevivu-nextjs`.

Vui lòng **Proceed (Duyệt)** để mình bắt đầu code luồng này!
