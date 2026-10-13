# Sở thích từ hồ sơ vào lập lịch — 10/10/2026

## Mốc local đã hoàn thành

Luồng `/flow` đọc sở thích đã lưu và trình bày nút **Dùng sở thích đã lưu**. Chỉ thao tác chủ động này áp dụng danh mục, nhịp đi và ưu tiên trong nhà; tải muộn/thử tải lại không ghi đè lựa chọn đang nhập. Số ngày, người đi cùng, ngân sách và ngày khởi hành không bị thay đổi khi áp dụng.

Nhịp đi chỉ chọn tại bước hỏi đã có. Bước cuối cho phép chỉnh danh mục và không gian trước khi tạo, không hỏi lại nhịp đi. Danh mục dùng chung với Hồ sơ/Khám phá; Chợ và Làng nghề là hai lựa chọn riêng. Form giữ lựa chọn khi tạo lịch lỗi. Lỗi tải hồ sơ vẫn cho phép lập lịch thủ công và có nút thử lại. Ngày tối thiểu tính theo ngày Huế.

API nhận `indoorPreferred` boolean, từ chối kiểu dữ liệu sai trước khi tạo bản ghi. Request chuyến đi là lựa chọn cuối cùng; không tự lấy sở thích hồ sơ để ghi đè request. Bộ A* cộng ưu tiên cho điểm có metadata indoor, giữ ràng buộc mở cửa/di chuyển và giới hạn hoạt động theo nhịp đi. Đây là ưu tiên mềm, không cam kết lịch toàn bộ trong nhà hoặc che mưa trên đường di chuyển.

Lựa chọn khi tạo được lưu dưới `itinerary.planning_preferences` cùng lịch đã tối ưu: styles, pacing, indoorPreferred. Lập chuyến không sửa sở thích tài khoản. Không nâng nhãn xác minh của địa điểm.

## Bằng chứng

- `npm run test:types`: đạt. `npm run build`: đạt cả kiểm tra types/lint; còn warning ảnh/font từ mã hiện có.
- `npm run test:planner-preferences`: đạt ưu tiên indoor, fallback ngoài trời, giới hạn relaxed/packed và không vượt giờ đóng cửa; fixture xác định, không gọi AI.
- `npm run test:preferences` với `TEST_BASE_URL`: đạt validation/isolation/ranking; thêm kiểm tra indoor sai không tạo chuyến, request chỉnh riêng được lưu đúng, snapshot tồn tại sau tối ưu, hồ sơ giữ nguyên và guest không kế thừa sở thích tài khoản.
- Bộ preferences/API đã chạy lại thành công trên production local sau build bằng `npm run start -- --hostname 127.0.0.1 --port 3000`.
- `npm run test:context`: đạt. Development smoke **28 đạt, 0 lỗi**.
- Đã chạy development command và thử browser 390×844: hồ sơ Cà phê/Chợ/Thư giãn/trong nhà → áp dụng vào flow → kiểm tra nhịp đi và danh mục được chọn sẵn.
- Chỉnh riêng thành Chùa chiền/Cân bằng/không ưu tiên trong nhà → chủ động chặn request tạo lịch → form báo lỗi tiếng Việt và giữ lựa chọn → bỏ chặn, tạo lại thành công → mở lịch và kiểm tra giao diện.
- SQLite xác nhận snapshot chuyến mới đúng lựa chọn riêng, hồ sơ vẫn là Cà phê/Chợ/Thư giãn/trong nhà. Browser trip detail không có console error/warn trong luồng xem lịch.
- Chặn request tải preferences → vẫn chọn được chuyến hai ngày → bỏ chặn và thử lại → sở thích tải được, vẫn ở bước chọn người đi cùng, không quay lại bước đầu.
- Screenshot: `release-evidence/planner-preferences-mobile.png`. Đã bỏ các chặn request, đăng xuất, dọn tài khoản/chuyến QA. Không commit.

## Cổng còn mở

Điều chỉnh UX theo phản hồi: bỏ dropdown nhịp đi trùng tại bước cuối. Type-check đạt; đã chạy dev và đi qua các bước trong browser, xác nhận bước nhịp đi vẫn hoạt động, bước cuối không còn dropdown nhịp đi và không có console error/warn. Ảnh bản điều chỉnh: `release-evidence/planner-single-pacing.png`. Kiểm chứng trước đó về dropdown cuối là lịch sử trước điều chỉnh này.

Mục tổng Profile/preferences + contextual ranking vẫn mở: chưa nối sở thích vào AI chat/trang chủ hoặc ranking theo vị trí/thời tiết/freshness. Kho indoor còn nhỏ, metadata cần người phụ trách xác minh. Chưa kiểm tra thiết bị vật lý hay deployment công khai. Snapshot ghi lựa chọn lúc tạo, không khẳng định mọi hoạt động đều thuộc danh mục yêu thích hoặc đáp ứng mọi sở thích sau khi điều chỉnh lịch.
