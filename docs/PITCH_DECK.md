# HueViVu web pitch deck

Route: `/pitch`, gồm 9 slide theo brief. Dùng phím ← / →, Space, PageUp / PageDown, Home / End hoặc thanh chọn slide. Hash `#1` đến `#9` hỗ trợ mở trực tiếp. Nút Trình chiếu yêu cầu toàn màn hình từ trình duyệt; có hướng dẫn Chrome/Edge + F11 khi không hỗ trợ.

## Nội dung

- Ba nỗi đau tương tác: mưa, thiếu thời gian, thông tin rời rạc. Hình Huế là minh họa SVG; tình huống không phải trích dẫn phỏng vấn.
- 30 người là **mục tiêu tuyển mẫu đề xuất**, chưa phải kết quả phỏng vấn. Không tạo testimonial hoặc tỷ lệ khảo sát giả.
- Showcase minh họa các luồng local: lịch trình theo sở thích, xem trước điều chỉnh và chat đọc tiến độ. Liên kết mở app thật trong tab khác.
- 4,3 triệu lượt khách có nguồn TTXVN ngày 30/06/2026, liên kết trên slide. Nguồn cũng báo cáo doanh thu 10.300 tỷ VNĐ.
- TAM 13.000 tỷ, SAM 216 tỷ, SOM 900 triệu giữ theo brief và ghi rõ mô hình ước tính. Phép tính minh họa dùng chi tiêu/lượt và doanh thu gói 49k/ngày; các đơn vị TAM và SAM/SOM khác nhau, cần chuẩn hóa mô hình trước khi dùng như sizing đã kiểm chứng.
- Định vị cạnh tranh là sơ đồ định tính theo nhóm sản phẩm, HueViVu ở vị trí mục tiêu, không phải benchmark.
- >60.000 sinh viên là quy mô theo brief, chưa xác minh nguồn. Giá, partner commission và lộ trình là đề xuất.
- Tên và vai trò bốn thành viên do người dùng cung cấp. Avatar chữ cái tránh tạo chân dung giả.

## Kiểm tra giao diện và runtime (11/10/2026)

- Mở app bằng `npm run dev -- --port 3010`; dùng `NEXT_DIST_DIR=.codex/pitch-dev` để tách khỏi build.
- Kiểm tra trực quan cả 9 slide trên desktop 1440×900 và phiên trình chiếu 1920×1080.
- Kiểm tra mobile 390×844: bố cục đội ngũ, biểu đồ định vị, không tràn ngang; chuyển slide trở về đầu trang.
- Thử ba tình huống nỗi đau, ba lựa chọn showcase, thanh chọn slide, previous/next, ArrowLeft và Home.
- Mở phiên sạch với `/pitch#4`: khôi phục đúng slide thị trường sau hydration; console không có error/warn.
- Thử nút toàn màn hình trong browser nhúng; browser nhúng có thể khác Chrome/Edge thực tế.
- `npm run test:types` và production build được chạy; build ban đầu dùng chung `.next` với dev gây lỗi manifest. Build tách tại `.codex/pitch-build` đã qua; không thay đổi cấu hình dự án để khắc phục.
- Ảnh minh chứng: `release-evidence/pitch-opening.png`.

Chưa deploy công khai, chưa commit. Đây là bản trình chiếu local, không chứng nhận production cho các chức năng app được minh họa.
