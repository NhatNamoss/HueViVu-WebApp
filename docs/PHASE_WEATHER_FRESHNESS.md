# Thời tiết thành phố Huế và độ mới dữ liệu — 12/10/2026

## Phạm vi

- Cố định khu vực thời tiết tại trung tâm thành phố Huế: 16.4637, 107.5909; timezone Asia/Ho_Chi_Minh. GPS hoặc query lat/lng của người dùng không đổi khu vực thời tiết.
- Dùng Open-Meteo thay nguồn wttr.in cũ. Mẫu wttr.in kiểm tra thực tế chỉ có giờ quan trắc, không đủ ngày để xác định độ mới một cách chắc chắn.
- Open-Meteo trả dữ liệu ước tính từ mô hình. `data_at` là giờ hiệu lực của dữ liệu hiện tại từ `current.time`, không phải thời điểm quan trắc tại trạm hoặc thời điểm mô hình được chạy/cập nhật. `fetched_at` là lần tải/kiểm tra nguồn; `updated_at` tương thích được đặt bằng `data_at`, không đặt bằng giờ tải.
- Nguồn, vị trí, trạng thái độ mới và các thời điểm được trả trong API. Response và upstream fetch dùng no-store.
- Ngưỡng 60 phút là chính sách HueViVu, không phải cam kết độ chính xác của nhà cung cấp. Thời điểm tương lai quá 5 phút, thiếu/sai timestamp, nhiệt độ sai, vùng/timezone sai, mã thời tiết không hiểu hoặc lỗi upstream đều không được dùng để gợi ý.
- Companion và kiểm tra đổi lịch dùng cùng service/guard; bỏ nhánh wttr riêng ở replan. Chỉ dữ liệu còn mới mới tác động tới gợi ý, ranking trong nhà và thông báo thay đổi thời tiết. Các tình huống mệt/trễ do người dùng vẫn hoạt động khi thời tiết không khả dụng.
- Trang chủ, Khám phá và chuyến đi hiển thị Thành phố Huế; nguồn, giờ dữ liệu/giờ tải, độ ẩm/gió mở theo nhu cầu. Dữ liệu cũ/không rõ/lỗi hiển thị trạng thái và nút thử lại. Live Guide chỉ truyền thời tiết còn mới, ghi rõ Huế ở nhãn thời tiết.
- Khám phá/Live/chuyến đi tải lại mỗi 5 phút và khi quay lại tab, đánh giá tuổi dữ liệu mỗi phút. Trang chủ theo vòng cập nhật companion 1 phút đã có. Khi lỗi tải, loại bỏ thời tiết cũ khỏi ngữ cảnh.
- Dự báo lấy ngày thực từ daily.time; nhãn Hôm nay/Ngày mai theo giờ Huế, không suy đoán ngày từ thứ tự mảng hoặc timezone máy.

## Kiểm chứng

- `npm run test:weather`: mới/cũ, ngưỡng 60 phút, thiếu/sai/ngày tương lai, vùng/timezone sai, nhiệt độ/mã sai, qua nửa đêm, loại thời tiết cũ khỏi companion/replan, lỗi upstream, API no-store và timestamp nguồn riêng giờ tải.
- `npm run test:context`, `npm run test:trusted-companion`: đạt.
- Type-check, lint và build: đạt ở vòng kiểm tra; lint có cảnh báo ảnh/font tồn tại trước đó.
- Dev server bằng lệnh dự án tại 127.0.0.1:3001; smoke 28/28 đạt. Bản build cuối khởi động bằng next start tại cùng cổng; API weather/companion và browser Khám phá được kiểm tra lại trên production local.
- API thật: nhận đúng metadata Huế dù query gửi tọa độ khác; cache-control no-store; giờ dữ liệu tách khỏi giờ tải.
- Browser: mở nguồn/thời điểm ở trang chủ desktop và Khám phá/chuyến đi mobile; mobile 390px không tràn ngang. Luồng phản hồi QA dữ liệu cũ -> nút thử lại -> HTTP 503 -> nút thử lại -> nguồn thật phục hồi, không giữ nhiệt độ cũ hoặc gợi ý thời tiết cũ.
- Console không có lỗi JavaScript mới. Request 401 tiến độ khi xem chuyến QA công khai không đăng nhập là kiểm tra quyền hiện có; weather API 200. Phản hồi 503 chỉ được chèn trong kiểm thử và đã tháo bỏ.
- Chuyến/tài khoản QA được dọn; không sửa dữ liệu địa điểm thật.

## Bằng chứng và giới hạn

- [Trang chủ desktop](release-evidence/weather-home-desktop.jpg)
- [Khám phá mobile](release-evidence/weather-explore-mobile.jpg)
- [Tài liệu API nguồn](https://open-meteo.com/en/docs)

Thời tiết là ước tính cho khu vực trung tâm thành phố, không chứng thực điều kiện ở từng lăng/điểm đến hoặc toàn địa giới thành phố. Chưa có cảnh báo thiên tai từ cơ quan chính thức, kiểm chứng sai số thực địa, monitoring nguồn ngoài máy hay chứng nhận deployment công khai. Khi triển khai thương mại, cần đối chiếu gói API/quota và điều khoản nguồn phù hợp. Không tick các mục tổng companion/grounding/public deployment từ thay đổi này.
