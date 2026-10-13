# Chat đọc tiến độ hành trình — 10/10/2026

Mốc local: câu hỏi “Tiếp theo tôi đi đâu?”, “tiến độ”, “còn điểm nào” đọc lịch và tiến độ từ máy chủ, không phụ thuộc LLM. Bám ngày đang xem, bỏ hoạt động đã hoàn thành, ghi rõ điểm đang chọn hoặc điểm chưa hoàn thành đầu tiên; tất cả đã đi thì báo hoàn thành ngày. Nếu chuyến đã bắt đầu, đúng ngày đi và người dùng báo mệt, nhắc nghỉ trước. Giờ trong câu trả lời là giờ dự kiến; không khẳng định địa điểm đang mở.

Thay một gợi ý trong chat sẵn có, không thêm bước nhập. API kiểm tra tin nhắn, role/content lịch sử và ngày; lịch riêng không truy cập được trả 404. Tiến độ chỉ đọc cho chủ chuyến; lịch được chia sẻ không đọc tiến độ của chủ và không ghi hội thoại của người khác vào lịch của chủ. Tin nhắn thường và luồng đề xuất chỉnh lịch vẫn dùng nhánh cũ.

Kiểm chứng: `npm run test:types` đạt; `node scripts/test-trip-chat-progress.mjs` với `TEST_BASE_URL=http://127.0.0.1:3002` đạt các trường hợp hoàn thành, ngày xem, mệt đúng ngày, lịch chia sẻ, validation, lịch riêng và không sửa itinerary. `npm run test:context` đạt. Đã khởi động bằng development command, đăng nhập tài khoản QA, mở lịch có 1/7 điểm đã đi, mở chat và gửi gợi ý; phản hồi bỏ điểm đã đi, chỉ Chùa Thiên Mụ tiếp theo, giờ dự kiến/địa chỉ đúng lịch. Browser không có console error/warn trong luồng này. Ảnh: `release-evidence/chat-progress.png`.

Mục Grounded trip-state AI chat tổng thể vẫn mở: chưa bảo đảm grounding của mọi câu hỏi LLM, chưa hợp nhất dữ liệu weather/freshness, chưa đánh giá chống hallucination trên corpus hoặc chứng nhận production công khai. Nhánh đề xuất chỉnh lịch cần được kiểm tra bảo vệ điểm đã hoàn thành và xung đột riêng. Mốc này chỉ hoàn thành phần đọc tiến độ xác định.
