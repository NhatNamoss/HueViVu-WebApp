# Chỉ đường từng chặng — 13/10/2026

## Hành vi đã triển khai

Mở Bản đồ chỉ hiển thị các điểm của ngày. Điểm mặc định là điểm đầu tiên chưa hoàn thành; điểm mở từ timeline được chọn đúng. App không tự tính tuyến cả ngày và không hiển thị danh sách hàng chục bước đi.

Chọn điểm → Chỉ đường → lấy GPS hiện tại → xem tuyến tới một đích → Bắt đầu. Khi đang đi, thẻ chọn điểm thu gọn; banner hiển thị thao tác hiện tại và khoảng cách tới thao tác tiếp theo. Bản đồ vẽ tuyến xanh và theo vị trí; kéo bản đồ sẽ tạm dừng camera theo vị trí. Có nút quay lại vị trí, đổi đích và dừng phiên GPS.

API tuyến điểm bắt buộc có vị trí hiện tại; không lấy hoạt động trước đó làm điểm xuất phát. Tuyến/lịch/ngày/đích cũ bị hủy khi thay đổi. Lệch tuyến và tới gần đích cần nhiều mẫu GPS khác nhau; app hỏi xác nhận đã tới, không tự cập nhật tiến độ.

## Nhà cung cấp

- Leaflet + OpenStreetMap hiển thị bản đồ; CSS Leaflet tải trong layout chung để tránh mất vị trí lớp tile/marker khi component động được mở lại.
- Valhalla tính tuyến với `costing: pedestrian`, `format: osrm`, `shape_format: geojson`. Giữ thời gian đi bộ do Valhalla trả; lời rẽ tiếng Việt được ánh xạ từ maneuver và tên đường, không sinh bằng LLM. Không gọi OSRM demo cũ.
- Development chưa có key dùng demo FOSSGIS, gửi `X-Client-Id`. Production cần `VALHALLA_URL` trỏ tới endpoint tự host/managed, hoặc cấu hình Google đã có. Demo không được tự coi là dịch vụ production.
- ETA Valhalla hiện dùng trong màn hình dẫn đường. Liên kết ETA với preview đổi lịch/giờ mở cửa vẫn chỉ dùng nhánh Google đã triển khai; phần này chưa diễn tập Google thực tế do thiếu key.

[Valhalla route API](https://valhalla.github.io/valhalla/api/route/api-reference/) · [Điều kiện demo và lựa chọn host](https://valhalla.github.io/valhalla/valhalla-intro/).

## Kiểm chứng local

- `test:types`, `build`, `test:navigation-route`, `test:navigation-api`, `test:weather-impact`: qua. Build được chạy khi dev server đã dừng, sau đó khởi động lại bằng `npm run dev -- --port 3001`.
- Browser 390/1280px: không tràn ngang; chọn điểm, tính tuyến từ GPS, bắt đầu, hướng dẫn hiện tại, đổi đích, dừng, GPS bị từ chối và xác nhận gần đích. Không còn nút tuyến cả ngày hoặc danh sách bước đi dài.
- GPS QA là tọa độ mô phỏng ở Huế; tuyến Valhalla thực được gọi. Tiến độ vẫn 0/7 sau khi mô phỏng tới đích; không bấm xác nhận để thay lịch của người dùng. Override GPS và viewport được xóa sau QA.
- Một cảnh báo React khi đổi dependency trong HMR được xử lý bằng reload; không có lỗi mới của luồng điều hướng sau reload. Khi restart, SQLite có một lỗi I/O tạm thời và app mở bản offline; mở lại đã phục hồi, `PRAGMA quick_check` trả `ok`. Chưa tái hiện lỗi này sau phục hồi.
- [Ảnh mobile — GPS mô phỏng](release-evidence/navigation-single-leg-mobile.jpg).

Chưa chứng nhận GPS/tuyến/lối vào thực địa trên Android/iPhone, điều hướng giọng nói hoặc chạy nền khi khóa màn hình. Các gate production vẫn mở.
