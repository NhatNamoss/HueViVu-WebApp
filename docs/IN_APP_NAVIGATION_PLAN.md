# Kế hoạch chỉ đường trong HueViVu — 13/10/2026

## Mục tiêu và lựa chọn đề xuất

Du khách mở Bản đồ trong hành trình, chọn điểm chưa đi, xem đường tới điểm đó và bắt đầu theo dõi ngay trong HueViVu. Ưu tiên đi bộ trong Huế trước; giữ nút mở Google Maps khi cần chuyển sang ứng dụng điều hướng chuyên dụng.

Đề xuất dùng Google Maps JavaScript API cho bản đồ và Routes API cho đường đi, khoảng cách, thời gian và các bước hướng dẫn. Routes Library hiện dùng Route/RouteMatrix thay DirectionsService/DistanceMatrixService cũ. [Tài liệu Routes Library](https://developers.google.com/maps/documentation/javascript/routes/overview).

Google cung cấp Navigation SDK cho Android/iOS và các cầu nối mobile. Với web hiện tại, giai đoạn đầu là trải nghiệm xem tuyến và theo dõi khi trang đang mở; chưa hứa tương đương toàn bộ app Google Maps về dẫn đường giọng nói, chạy nền khi khóa màn hình hoặc vận hành offline. Điều hướng đầy đủ cần nhánh mobile native và kiểm thử trên máy thật. [Navigation SDK](https://developers.google.com/maps/documentation/navigation/android-sdk/overview), [Danh mục nền tảng](https://developers.google.com/maps/documentation).

## Hiện trạng trong repository

- CinematicMapInner dùng Leaflet + OpenStreetMap; gọi endpoint OSRM public và vẽ polyline qua các điểm của ngày.
- Có marker vị trí người dùng, theo dõi GPS, khoảng cách đường chim bay và liên kết mở Google Maps từ hoạt động.
- Chưa có danh sách hướng dẫn rẽ, ETA theo tiến trình tuyến, lựa chọn tuyến thay thế, trạng thái lệch tuyến hay tự tính lại chặng đang đi.
- Điểm thiếu tọa độ hiện được đặt bằng offset quanh trung tâm Huế; đường thẳng fallback có thể bị hiểu nhầm thành đường đi thật. Gói bản đồ phải loại bỏ hai cách hiển thị này: thiếu vị trí thì báo thiếu, route lỗi thì giữ marker và báo chưa lấy được đường đi.
- Chưa thấy cấu hình Google Maps/Routes trong .env.example hoặc adapter nhà cung cấp bản đồ.

## Gói 1 — Bản đồ và đường đi thật bên trong hành trình

1. GoogleTripMap tải SDK khi người dùng mở tab Bản đồ; đặt marker đánh số theo ngày, đánh dấu đã đi/điểm tiếp theo, fitBounds và lựa chọn điểm đến.
2. API riêng `/api/trips/[id]/route` kiểm tra chủ lịch hoặc quyền đọc được phép, lấy các điểm từ lịch đã lưu, kiểm tra tọa độ và thứ tự. Với GPS cá nhân, chỉ chủ lịch và phiên hợp lệ được yêu cầu; không gửi GPS trong query URL.
3. Bắt đầu với WALK và DRIVE, dùng origin -> điểm tiếp theo; có chế độ xem toàn bộ ngày. Xe máy chỉ đưa vào sau khi xác nhận hỗ trợ và kiểm chứng tuyến tại Huế.
4. Trả polyline, các chặng, các bước rẽ, khoảng cách, thời gian, thời điểm tính, chế độ di chuyển và định danh điểm/lịch. Google Maps hiển thị dữ liệu tuyến Google; không đặt polyline Google lên bản đồ Leaflet/OSM. [Chính sách Routes](https://developers.google.com/maps/documentation/routes/policies).
5. Thẻ dưới bản đồ: điểm đến, khoảng cách, thời gian dự kiến, bước đi; nút Bắt đầu đi, Xem các bước, Mở Google Maps.
6. Chưa tự tối ưu thứ tự điểm. Lịch và các điểm đã đi là nguồn chuẩn; thay thứ tự/giờ vẫn preview -> xác nhận.

**Điều kiện đạt:** tuyến bám đường, đúng chế độ, đúng cổng/lối vào thực tế; dữ liệu thiếu không tạo marker giả; API lỗi không vẽ đường thẳng như chỉ đường; xử lý denied GPS, không có route, timeout, khóa bị giới hạn/quota và mạng yếu.

## Gói 2 — Theo dõi khi đang di chuyển trên web

- GPS chỉ bật khi nhấn Bắt đầu đi. Nêu rõ vị trí được gửi tới dịch vụ tính đường, dùng trong phiên và có nút Dừng; không ghi tọa độ vào log hoặc lịch sử chuyến đi theo mặc định.
- Hiển thị vị trí và vòng độ chính xác; khóa theo dõi/về toàn tuyến; nhận biết GPS cũ hoặc không chính xác. Không tự đánh dấu đã đến khi tín hiệu thiếu tin cậy.
- Theo dõi đoạn/bước đang đi, khoảng cách còn lại và thời gian dự kiến. Lệch tuyến phải có nhiều tín hiệu GPS liên tiếp đáng tin; ngưỡng chọn sau diễn tập thực tế tại Huế.
- Tính lại tuyến khi lệch thật hoặc đổi điểm đích; debounce và giới hạn tần suất, không gọi API cho mỗi tọa độ.
- Khi đã đến: hỏi đánh dấu hoàn thành, rồi dẫn tới điểm tiếp theo. Thay tuyến di chuyển không tự đổi lịch; chuyển điểm đến cần xác nhận.

**Điều kiện đạt:** đi thử Chợ Đông Ba -> cầu Tràng Tiền, khu phố/hẻm và lối vào di tích; Chrome Android/Safari iPhone; GPS nhảy, quay lại tab, mất mạng; pin/tần suất request được đo trên máy thật.

## Gói 3 — Liên kết với AI và thời tiết

- ETA thật thay ước tính đường chim bay khi kiểm tra khả năng kịp giờ/giờ mở cửa.
- Phương án mưa/mệt/trễ so sánh cả chặng đường, thời gian tới và điểm đã đi, có lý do và nguồn/giờ tính route.
- Sau khi xác nhận lịch mới, hủy route/request cũ và tính lại chặng theo điểm mới. Snapshot/phiên route ngăn phản hồi chậm vẽ sai ngày hoặc điểm đến.
- AI giải thích lựa chọn; các thao tác rẽ lấy từ dữ liệu routing, không tạo bằng câu trả lời LLM.

## Gói 4 — Điều hướng mobile đầy đủ

Nếu cần giọng nói, tự điều hướng liên tục và trải nghiệm gần Google Maps khi khóa màn hình: tạo nhánh Android/iOS, tích hợp Navigation SDK bằng native hoặc cầu nối được hỗ trợ. Dùng lại itinerary, progress và API context hiện có; không viết lại backend. Chỉ quảng bá dẫn đường đầy đủ sau kiểm chứng GPS/âm thanh/quyền nền trên máy thật.

## Chuẩn bị và giới hạn chi phí

- Google Cloud project có billing; bật Maps JavaScript API và Routes API; Map ID nếu dùng cấu hình yêu cầu Map ID.
- Browser key giới hạn HTTP referrer/domain và API; server key riêng theo môi trường/IP hoặc phương thức hạn chế thích hợp. Key server không mang tiền tố NEXT_PUBLIC và không gửi xuống client.
- Cấu hình quota/tần suất để hạn chế chi phí; billing budget alert để theo dõi, không coi alert là cơ chế chặn tiền. Chỉ tải map theo nhu cầu và chỉ request field cần thiết. [Billing](https://developers.google.com/maps/documentation/javascript/usage-and-billing), [Thiết lập key](https://developers.google.com/maps/documentation/javascript/get-api-key).
- Chưa ước lượng tiền khi chưa biết số người dùng, số map loads và requests. Chốt ngân sách/tháng rồi tính theo bảng giá tại thời điểm triển khai.
- Giữ attribution Google Maps và rà soát nội dung/privacy/cache theo điều khoản nguồn. Không đưa nội dung route Google vào cache offline lâu dài nếu chưa có quyền phù hợp.
- Giữ chế độ danh sách hành trình khi map/GPS/API lỗi; có liên kết mở Google Maps. Offline thiết yếu vẫn là giờ đi/địa chỉ đã lưu.

## Thứ tự triển khai đề xuất

Gói 1 -> gói 2 cho đi bộ -> gói 3 -> đánh giá nhu cầu mobile cho gói 4. Trước gói 1, cần project/key/billing và ngân sách sử dụng do chủ dự án quản lý. Đây là kế hoạch; chưa thay nhà cung cấp bản đồ hoặc tạo tài khoản/bật billing trong đợt thu gọn UI.

## Trạng thái triển khai local — 13/10/2026

- Đã có API `/api/trips/[id]/route`, chọn điểm từ timeline và chỉ đường từng chặng từ GPS hiện tại. Bỏ tự tính tuyến cả ngày và danh sách các bước dài; hiển thị hướng dẫn hiện tại, khoảng cách tới lần rẽ tiếp theo và thời gian còn lại. Không lấy điểm trước trong lịch làm vị trí xuất phát.
- Đã có luồng bật/tắt GPS theo phiên, vòng độ chính xác, nhận biết tín hiệu cũ/lệch tuyến và hỏi xác nhận đến nơi. Vị trí không ghi vào lịch hoặc log. Chưa diễn tập GPS thực địa và quyền vị trí trên Chrome Android/Safari iPhone.
- Đã nối ETA từ Google Routes vào kiểm tra trễ giờ, giờ mở cửa và preview đổi lịch cùng thời tiết; chỉ dùng khi đã cấu hình Google. Route cũ bị loại bằng snapshot lịch/ngày/đích.
- Theo yêu cầu không phụ thuộc Google key, bản local chuyển sang Leaflet + Valhalla pedestrian. Demo FOSSGIS dùng khi development; production cấu hình `VALHALLA_URL` riêng hoặc Google. ETA đi bộ lấy từ Valhalla; ETA này chưa dùng cho preview AI đổi lịch. Chế độ ô tô và Google Map chỉ bật khi đủ cấu hình Google.
- Đã qua kiểm tra type, build, test route/API/thời tiết và browser local 390/1280px với GPS mô phỏng: chỉ đường tới một đích, banner rẽ, đổi đích, từ chối GPS, dừng và hỏi xác nhận gần đích. [Bằng chứng và giới hạn](PHASE_IN_APP_NAVIGATION.md). Chưa đạt gate GPS và tuyến thực địa nêu ở gói 1–3.
