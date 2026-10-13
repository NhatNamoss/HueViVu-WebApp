# Chủ động đánh giá thời tiết với lịch trình — 13/10/2026

## Thay đổi

Trang chi tiết hành trình đang mở tự đối chiếu thời tiết Huế còn mới với ngày đang đi khi tải/cập nhật thời tiết, tiến độ/lịch thay đổi hoặc đến lượt kiểm tra 5 phút. Bộ lọc client chỉ quyết định có cần gọi API; server đọc lịch, quyền sở hữu, tiến độ và metadata trong nhà/ngoài trời rồi tự lấy nguồn thời tiết. Không tin thời tiết do client gửi.

Endpoint replan có chế độ `trigger: weather, assessOnly: true`. Bước nền chỉ đọc và trả quyết định; không tạo/lưu lịch hoặc gọi bộ thích nghi. Chỉ rủi ro mưa/nóng được xét trong chế độ này, không biến việc trễ/mệt thành lời mời do thời tiết. Bước tự kiểm tra thủ công giữ cách xét các tình huống hiện có.

Chỉ chủ lịch đã tải tiến độ thành công, chuyến đã bắt đầu, trạng thái active, đúng ngày hiện tại theo giờ Huế, còn điểm chưa đi và chưa gần cuối ngày được kiểm tra. Mưa cần còn điểm ngoài trời; nóng từ 36°C cần còn điểm ngoài trời. Ngày tương lai, chuyến chưa đi/đã kết thúc, ngày đã hoàn thành hoặc toàn bộ điểm còn lại trong nhà không tạo lời mời. Thời tiết cũ/không rõ/lỗi nguồn không kích hoạt đổi lịch.

Lời mời có hai lựa chọn: Xem phương án và Giữ lịch hiện tại. Xem phương án lấy lại dữ liệu server, chỉ tạo preview; phần Trước dựa vào snapshot server. Áp dụng vẫn cần xác nhận và các snapshot lịch/tiến độ qua guard hiện có. Điểm đã đi được giữ.

Giữ lịch ẩn cùng rủi ro trên cùng phần lịch chưa đi trong lần mở trang; timestamp mới hoặc nhiệt độ dao động nhẹ không lặp lời mời. Rủi ro khác hoặc phần lịch chưa đi thay đổi được đánh giá lại. Tải lại toàn trang có thể nhắc lại; không lưu lựa chọn sang tài khoản/thiết bị khác.

Đổi ngày/lịch/tiến độ hoặc mất dữ liệu thời tiết còn mới làm lời mời không còn hợp lệ biến mất. Request nền được hủy và bỏ phản hồi cũ khi đổi ngữ cảnh; preview kiểm tra tự động có epoch để phản hồi muộn không mở phương án cho ngày cũ. API lỗi hiển thị trạng thái giữ lịch và nút Thử kiểm tra lại.

## Kiểm chứng local

- `test:weather-impact`: ngày hợp lệ, dữ liệu mới/cũ, nóng/mưa, loại điểm hoàn thành/trong nhà, phạm vi chống lặp, assessment không ghi/call adapter, bước preview riêng, lỗi nguồn, quyền sở hữu và input mode.
- `test:weather`, `test:context`: đạt; type-check/lint/build cuối đạt. Cảnh báo ảnh/font đã có không chặn lint.
- Development app chạy bằng lệnh dự án tại 127.0.0.1:3002. Smoke 28/28 đạt.
- Runtime API với tài khoản/lịch QA: rain/heat có quyết định; sunny/stale/upstream lỗi không có quyết định thời tiết; ngày mai không bị tác động. Snapshot cả lịch và tiến độ không đổi sau các lượt assessment.
- Browser: lời mời mưa tự xuất hiện; xem trước không ghi; xác nhận thay đúng điểm chưa đi thành trong nhà và giữ điểm đã hoàn thành; lời mời mất khi phần còn lại không còn ngoài trời.
- Browser: chọn Giữ lịch -> tải lại thời tiết qua focus không lặp mưa; khi đổi sang nóng có lời mời mới; chuyển sang ngày mai ẩn lời mời ngay.
- Browser: HTTP 503 của assessment hiển thị trạng thái lỗi, thử lại phục hồi lời mời. Console không có lỗi JavaScript mới; response 503 là tình huống QA chủ động.
- Desktop 1280px và mobile 390px: lời mời/hai nút không tràn ngang; mở preview tự cuộn/focus tới vùng so sánh trước/sau và nút xác nhận. Hủy preview giữ nguyên lịch.

Nguồn thời tiết cho các tình huống browser/API được thay bằng fixture chỉ trong tiến trình dev QA qua preload tạm ngoài repository. Không thêm flag hoặc dữ liệu thời tiết giả vào code production. Bằng chứng có tên địa điểm QA, không chứng thực địa điểm thật.

## Giới hạn

Chỉ chủ động trong trang hành trình đang mở, không phải xử lý nền khi đóng app hoặc push từ máy chủ. Tiếp tục dùng thời tiết hiện tại cho khu vực trung tâm thành phố Huế; chưa dự báo theo giờ/địa điểm cho toàn chuyến. Chưa chứng nhận public deployment, sai số thời tiết hoặc độ đúng thực địa của điểm thay thế.

[Lời mời mobile](release-evidence/weather-impact-mobile.jpg) · [Preview mobile](release-evidence/weather-impact-preview-mobile.jpg) · [Desktop](release-evidence/weather-impact-desktop.jpg).

Fixture database, token/cache của phiên QA, preload và nguồn thời tiết tạm đã được dọn. App trở lại bản production local tại 127.0.0.1:3001 với nguồn Open-Meteo thật.
