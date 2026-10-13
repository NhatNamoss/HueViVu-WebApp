# HueViVu — triển khai gói ngữ cảnh thành hành động

Ngày 08/10/2026. Phạm vi: gói 1 trong phần “Thứ tự code tiếp” của [đánh giá maturity](PRODUCTION_MATURITY_AUDIT.md). Các mức L0–L4 vẫn theo [Production Master Blueprint](PRODUCTION_MASTER_BLUEPRINT.md). Đây là kết quả ở local, chưa xác nhận production công khai.

## Vấn đề du khách được giải quyết

Khi đang đi Huế, một gợi ý chung có thể khiến du khách tìm quán ngoài trời lúc mưa, đi tiếp khi đã mệt, hoặc đổi lịch dù chuyến đi còn chưa bắt đầu. Người dùng cũng không biết việc đánh dấu điểm đã đi đã được lưu hay chưa. Gói này dùng giờ Huế, ngày khởi hành đã xác nhận, thời tiết, trạng thái chuyến đi và tín hiệu mệt để chọn một hành động cụ thể. Khi thiếu dữ liệu, app nói rõ giới hạn và giữ lịch hiện tại.

## Những thay đổi đã hoàn thành

- Trang chủ chỉ gọi một chuyến là “đang đi” khi đã bắt đầu và hôm nay nằm trong ngày của chuyến. Khi người dùng báo mệt, gợi ý nghỉ được ưu tiên; gần cuối ngày, gợi ý về nghỉ trước, kèm lý do. Phần giải thích dùng cùng quyết định với thẻ hành động, không gợi ý món ăn/địa điểm cố định ngoài ngữ cảnh.
- CTA tránh mưa đi tới bộ lọc trong nhà hoạt động thật ở `/explore?indoor=true`. API chỉ trả địa điểm công bố có `indoor = 1`; trang giải thích đây là thông tin được ghi nhận và nhắc xác nhận giờ mở/lối vào. Bộ lọc đang mở có URL và trạng thái rỗng kèm lối phục hồi. Trời mưa, nóng hoặc se lạnh không được diễn đạt thành lời hứa về địa điểm chưa xác minh.
- Trạng thái hành trình được lưu theo từng ngày bằng khóa hoạt động để đổi ngày, tải lại hoặc đổi thứ tự hoạt động không đánh dấu nhầm một điểm khác. Người dùng chủ động bắt đầu chuyến, đánh dấu/bỏ đánh dấu điểm đã đi và báo sức đi. Mỗi lần lưu có phản hồi thành công, lỗi, thử lại hoặc tải lại khi một cửa sổ khác vừa cập nhật. Không còn tự ghi GPS trong nền vào trip state.
- Lịch cũ chưa có ngày khởi hành có bước xem trước “chưa chọn → hôm nay”, xác nhận hoặc hủy. Xác nhận lưu ngày và thời điểm bắt đầu trong một giao dịch, giữ nguyên lịch trình. Nếu một ngày đã được đặt trước đó thì yêu cầu “bắt đầu hôm nay” không ghi đè.
- Kiểm tra tự động chỉ áp dụng cho ngày đang đi, sau khi người dùng bắt đầu. Nó bỏ qua điểm đã đi, không dùng dự báo/thời tiết hiện tại để điều chỉnh lịch tương lai hoặc lịch đã qua, và không nhận thời tiết giả do trình duyệt gửi. Giờ được đọc theo `Asia/Ho_Chi_Minh` trong ngữ cảnh, gợi ý trễ và phương án điều chỉnh.
- Điều chỉnh mưa/trễ/mệt/đói giữ nguyên hoạt động đã hoàn thành. Phương án cũ bị chặn nếu tiến độ hoặc các hoạt động trên lịch vừa đổi. Sau 20:30 không chèn bữa ăn vào một giờ đã qua; gần 22:00 không thêm nghỉ 45 phút kéo lịch qua 22:00. Có thông điệp thực tế và đường tìm nơi ăn đang mở khi cần.
- Phương án khi mưa chỉ chọn nơi được ghi nhận có không gian trong nhà. Nếu không đủ dữ liệu, app giữ lịch, nói lý do và cho xem danh sách để tự kiểm tra. Trường hợp điểm đóng cửa nhưng không có lựa chọn cùng loại cũng giữ lịch và đưa bước tìm, gọi xác nhận; không trả lỗi máy chủ 500.
- Khi không cấp quyền vị trí, màn hình tình huống và bản đồ nói rõ vẫn xem/chỉnh lịch được, nhưng không thể ưu tiên điểm gần vị trí hiện tại.

## Bằng chứng kiểm tra

- Sao lưu SQLite có kiểm tra trước thay đổi schema. Sau khi dọn dữ liệu thử, 18 bản ghi địa điểm giống hoàn toàn với bản sao lưu trước phase; `integrity_check = ok`. Hiện có 15 địa điểm công bố: 1 `verified`, 6 `reviewed`, 8 `draft`. Các nhãn này là trạng thái trong DB, không phải xác minh nội dung độc lập.
- `npm run test:types`, `npm run test:context`, `node scripts/test-offline-trip-cache.mjs` và `npm run build`: đạt. Build còn các cảnh báo tối ưu ảnh/font đã biết. Smoke trên bản production local: **28 đạt, 0 lỗi**; có kiểm tra auth, dữ liệu sai, ngày chưa bắt đầu, lưu tiến độ qua hai ngày, khóa bản xem trước cũ và không sửa điểm đã hoàn thành.
- Trình duyệt ở 390×844: chọn ngày bắt đầu có xem trước/hủy/xác nhận; đánh dấu điểm, chuyển ngày, tải lại vẫn giữ tiến độ; gợi ý nghỉ có bản xem trước khi còn đủ giờ; khi gần 22:00 có bước nghỉ và xem ngày mai. Giả lập lỗi lưu cho kết quả bằng tiếng Việt và thử lại thành công. Hai cửa sổ cùng sửa cho thông báo xung đột, giữ nguyên bản đã lưu và yêu cầu tải lại.
- Kiểm tra `/explore?indoor=true` và `/explore?cat=food&open=true`: bộ lọc hoạt động; khi không có nơi đang mở, người dùng thấy lý do và có thể xem nơi khác để gọi xác nhận. Bản đồ tải tile sau khi trang ổn định; không thấy lỗi JavaScript trong luồng bình thường. Lỗi request do cố ý ngắt mạng trong bài kiểm tra lưu được xác định riêng.
- API thử riêng tình huống không có điểm cùng loại: trả thông báo phục hồi, giữ nguyên itinerary và không trả 500. Screenshot: [tiến độ trên điện thoại](release-evidence/context-progress-mobile.png), [xung đột tiến độ](release-evidence/context-conflict-mobile.png), [trang chủ cuối ngày](release-evidence/context-home-mobile.png), [bộ lọc trong nhà](release-evidence/context-indoor-mobile.png).

## Mức hoàn thiện và công việc tiếp theo

Travel Context, Dynamic Replanning và Trip State đã tiến thêm ở **L2 — hoạt động local có kiểm chứng luồng chính**. Chưa nâng thành L3/L4: chưa thử trên môi trường công khai, điện thoại vật lý, mạng di động kém và dữ liệu địa điểm quy mô production; nhiều giờ/giá vẫn ở trạng thái `draft` hoặc `reviewed`. Bản đồ offline, thông báo đáng tin và các đề xuất dựa trên accessibility/chất lượng nguồn cũng chưa hoàn tất.

Gói tiếp theo là dữ liệu đáng tin: freshness cho giờ/giá/số liên hệ, nguồn trực tiếp, workflow kiểm tra của con người, cảnh báo khi thông tin cũ và lựa chọn thay thế chỉ từ dữ liệu có đủ điều kiện. Sau đó kiểm chứng trên hành trình thật của du khách trước khi tuyên bố tác động xã hội hoặc readiness công khai.
