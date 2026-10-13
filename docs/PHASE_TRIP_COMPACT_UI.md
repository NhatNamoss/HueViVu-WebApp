# Thu gọn đầu trang hành trình — 13/10/2026

## Kết quả

- Hỏi AI/Đổi lịch/Thêm giảm padding và cỡ chữ nhẹ; hàng nút bớt khoảng trống trên/dưới.
- WeatherWidget có tùy chọn compact chỉ dùng trong chi tiết hành trình: padding 8×12, khoảng cách nguồn sát hơn. Nguồn/timestamp/độ mới vẫn mở được; các trang khác giữ bố cục đang có.
- Lời mời theo thời tiết giảm padding, tiêu đề/line-height và kích thước nút. Khi đã có lời mời mưa/nóng, không lặp thêm thẻ cảnh báo thời tiết chung; dữ liệu thời tiết vẫn hiển thị ở thẻ nguồn.
- Thẻ feasibility có điểm số nhỏ hơn và nút Chi tiết trong cùng hàng; cảnh báo giờ mở cửa vẫn đọc đủ và mở được chi tiết. Tổng quan giảm padding/icon, giữ ngân sách và nội dung mở rộng.
- Thứ tự: chọn ngày -> Lịch trình/Bản đồ -> tiến độ. Không cần đi qua cả khối tiến độ để tìm chế độ xem.
- Các nút compact có phần hiển thị khoảng 36px và vùng chạm mở rộng tối thiểu 44px. Nút ngày có chiều cao 44px trực tiếp. Focus keyboard được giữ.
- Trợ lý nổi 44px, dùng safe area; chỉ xuất hiện khi hàng Hỏi AI và cụm chế độ xem đều ra khỏi màn hình, hoặc cần nút đóng trợ lý. Không che nút Bản đồ lúc mới mở trang, kể cả khi có thông báo trễ phát sinh.

## Kiểm chứng

- Type-check/lint/build cuối: đạt. Lint giữ cảnh báo ảnh/font trước đó.
- test:weather và test:weather-impact: đạt; không thay quy tắc độ mới, quyền sở hữu hay xác nhận đổi lịch.
- Chạy development bằng lệnh dự án ở 127.0.0.1:3001; browser thật kiểm tra viewport 360×740, 390×844, 1280×900.
- Ở trạng thái các chi tiết đóng, nút ngày/Bản đồ nằm trong màn hình đầu, kể cả mưa và toast trễ. Mẫu lịch 2 ngày: Bản đồ khoảng y=599–635 tại 360×740 trước toast, vẫn nằm trong viewport khi có toast. Không tràn ngang.
- Mẫu trước sửa tại 390×844: Bản đồ khoảng y=1119–1157; bản gọn nằm khoảng y=566–602 khi không có toast. Vị trí tùy độ dài tiêu đề/cảnh báo và trạng thái mở chi tiết; không cam kết mọi nội dung luôn vừa mọi chiều cao màn hình.
- Mở/đóng nguồn thời tiết, chi tiết giờ mở cửa, tổng quan, Hỏi AI, Đổi lịch, Thêm: đạt. Chuyển ngày 1/2 và Lịch trình/Bản đồ trên lịch QA: đạt. Bản đồ cũ tải marker/route; console không có lỗi mới.
- Cuộn xuống cuối trang: trợ lý nổi xuất hiện, mở/đóng được; về đầu trang nó ẩn để không che điều hướng.
- Lịch QA 2 ngày và cache QA đã dọn. So sánh database xác nhận itinerary và tiến độ của lịch gốc không đổi.
- Bản production local cuối được khởi động lại tại 127.0.0.1:3001. Kiểm tra thêm request thời tiết bị giữ/hủy tới timeout: source vẫn mở được, nút Thử lại riêng biệt hoạt động và phục hồi nguồn thật sau khi bỏ interception. Thẻ lỗi có vùng nguồn rộng hơn để tránh chồng vùng chạm với retry.
- [Ảnh chuyến gốc trên bản cuối](release-evidence/trip-compact-actual-mobile.jpg): cảnh báo mưa và toast trễ cùng xuất hiện, cụm ngày/chế độ xem vẫn ở màn hình đầu.

[Bản gọn mobile](release-evidence/trip-compact-mobile.jpg) · [Desktop](release-evidence/trip-compact-desktop.jpg). Ảnh có lịch QA riêng, không phải chứng thực dữ liệu địa điểm.

## Bản đồ

Đã chuẩn bị [kế hoạch chỉ đường trong app](IN_APP_NAVIGATION_PLAN.md). Đợt này thu gọn UI, giữ nhà cung cấp bản đồ hiện có; các gói Google Maps/Routes/GPS/navigation chưa triển khai và không được tick hoàn thành.
