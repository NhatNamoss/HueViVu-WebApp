# Sở thích chủ động và xếp hạng Khám phá — 10/10/2026

## Phạm vi đã triển khai

Người dùng chọn danh mục yêu thích, nhịp đi và ưu tiên không gian trong nhà tại Hồ sơ. Sở thích lưu trong SQLite theo danh tính đã xác thực; không nhận user ID từ request. Lựa chọn rỗng khôi phục thứ tự mặc định.

Khám phá gửi yêu cầu cá nhân hóa khi có phiên đăng nhập. Xếp hạng ưu tiên danh mục đã chọn (+40), nơi có metadata trong nhà (+20) và thời lượng 1–60 phút khi chọn thong thả (+5). Điểm bằng nhau giữ thứ tự popularity/rating có sẵn. Không loại địa điểm vì không hợp sở thích; category, từ khóa, indoor và bộ lọc đang mở vẫn có hiệu lực. Thẻ hiển thị lý do ưu tiên, có công tắc tắt cá nhân hóa.

API từ chối dữ liệu sai, trường lạ và truy cập chưa đăng nhập. Sở thích hỏng/legacy đọc về mặc định; response cá nhân hóa là private/no-store. Form có loading, khóa khi gửi, phản hồi thành công, tải lại khi lỗi ban đầu; lưu thất bại giữ lựa chọn để thử lại.

## Kiểm chứng

- `npm run test:types`, `npm run lint`, `npm run build`: đạt. Lint/build còn các warning ảnh/font ở mã hiện có.
- `npm run test:preferences`: đạt validation, fallback, thứ tự ổn định, lý do xếp hạng, đầu vào không bị sửa.
- Chạy thêm script với `TEST_BASE_URL=http://127.0.0.1:3000`: đạt quyền truy cập, lưu/đọc lại, tách hai tài khoản, bảo vệ dữ liệu khi request sai, khớp thứ tự xếp hạng, bộ lọc danh mục, cache và reset mặc định.
- `npm run test:context`: đạt regression ngữ cảnh/lịch trình.
- Development smoke: **28 đạt, 0 lỗi**.
- Khởi động bằng development command của dự án; thử giao diện browser ở desktop và 390×844: chọn cà phê, thong thả, trong nhà → lưu → tải lại và kiểm tra lựa chọn.
- Chặn riêng request preferences để thử lỗi lưu: phát hiện thông báo kỹ thuật, sửa sang tiếng Việt; kiểm tra lại lỗi giữ lựa chọn và thử lại thành công khi bỏ chặn.
- Khám phá: kiểm tra lý do gợi ý, tắt/bật cá nhân hóa, lọc chùa vẫn chỉ trả chùa dù sở thích là cà phê/ẩm thực. Console Khám phá không ghi error/warn. Các request lỗi do chủ động chặn là lỗi kỳ vọng trong thử nghiệm.
- Ảnh: `release-evidence/preferences-explore-mobile.png`. Tài khoản thử nghiệm đã được dọn; không commit.
- API preferences cũng đạt trên production local sau build. Khi kiểm tra phiên không còn hợp lệ, phát hiện Khám phá hiển thị lỗi mạng; đã sửa tự tắt cá nhân hóa, tải danh sách công khai, giữ bộ lọc và giải thích cần đăng nhập lại. Browser xác nhận 15 địa điểm tải lại thành công; HTTP 401 trong trường hợp này là lỗi xác thực kỳ vọng.

## Khoảng còn mở

Cập nhật tiếp ngày 10/10/2026: mốc tích hợp sở thích vào lập lịch đã được kiểm chứng riêng trong [Phase Planner Preferences](PHASE_PLANNER_PREFERENCES.md). Các giới hạn bên dưới ghi phạm vi của mốc Khám phá ban đầu.

Đây là mốc hoạt động local, chưa phải toàn bộ mục Profile/preferences + contextual ranking. Sở thích chưa mặc định vào lập lịch/AI chat/trang chủ. Nhịp cân bằng/nhiều trải nghiệm được lưu nhưng chưa thay đổi lịch đã có; hiện chỉ nhịp thong thả tạo điểm ưu tiên thời lượng trong Khám phá. Chưa kết hợp ranking với vị trí, thời tiết, freshness hoặc khả năng tiếp cận. Metadata indoor/duration là dữ liệu hiện có, không được tự nâng trạng thái xác minh. Corpus và public deployment vẫn là cổng riêng còn mở.
