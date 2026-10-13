# Giao diện chatbot, tạo lịch trình và Trips — 11/10/2026

## Thay đổi

- Chatbot có dropdown “Hỏi nhanh” với 7 câu hỏi, chia theo chuyến đi và điều chỉnh lịch. Dropdown luôn có sau khi trò chuyện; chọn để điền, sửa rồi gửi. Chọn câu hỏi không tự gửi hoặc lưu thay đổi lịch.
- Bước cuối tạo lịch: một thẻ lựa chọn, số sở thích đã chọn, ngày bắt đầu và ưu tiên trong nhà. Giải thích nằm trong “Lưu ý trước khi tạo”; nút tạo là hành động chính.
- Trips: tiêu đề và trạng thái trống ngắn hơn. Trang chi tiết giới hạn chiều rộng desktop; nút “Hỏi AI / Đổi lịch / Thêm” gọn trên mobile; các lưu ý và hướng dẫn mở theo nhu cầu; tiến độ dùng thanh trực quan.
- Giữ nguyên lỗi, nút thử lại, bản xem trước và xác nhận thay đổi.

## Kiểm chứng local

- Type-check, lint cho 5 file TSX liên quan: đạt. Lint còn cảnh báo ảnh img đã có trong dự án.
- Build production: đạt.
- Logic planner-preferences và trip-chat-progress: đạt.
- Smoke: 28/28 đạt.
- Chạy bằng development command của dự án; kiểm tra browser ở 390×844 và 1280×800.
- Thử toàn bộ 6 bước tạo lịch, trạng thái nút khi chưa chọn sở thích, bật ưu tiên trong nhà, mở/đóng lưu ý, tạo thành công và mở chuyến đi.
- Thử chọn dropdown, gửi “Tiếp theo tôi đi đâu?”, nhận phản hồi theo tiến độ, chọn câu hỏi tiếp theo và sửa trong ô nhập.
- Thử mở/hủy ngày khởi hành, mở tiện ích, các lưu ý, danh sách Trips và tab trống. Không tràn ngang mobile; console cuối không có error/warn.
- Dev cold compilation từng làm request tiến độ vượt timeout 8 giây. Nút tải lại hoạt động sau khi compile xong; đã kiểm tra lại trên phiên ổn định.

## Ảnh

- [Tạo lịch mobile](release-evidence/planner-clean-mobile.jpg)
- [Chuyến đi mobile](release-evidence/trip-clean-mobile.jpg)
- [Chat dropdown mobile](release-evidence/chat-dropdown-mobile.jpg)
- [Chat dropdown desktop](release-evidence/chat-dropdown-desktop.jpg)

Chỉ kiểm chứng local, chưa triển khai công khai. Không thay đổi khả năng grounding của AI hoặc thuật toán tạo lịch.
