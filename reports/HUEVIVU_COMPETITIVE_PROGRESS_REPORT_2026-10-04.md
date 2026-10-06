# BÁO CÁO HIỆN TRẠNG, ĐỐI THỦ VÀ TIẾN ĐỘ PHÁT TRIỂN HUEVIVU

**Ngày báo cáo:** 04/10/2026  
**Sản phẩm:** HueViVu WebApp  
**Đối thủ tham chiếu:** Hue4U — https://hue4u.com  
**Phạm vi:** Hiện trạng trước sửa chữa, phân tích đối thủ, công việc đã hoàn thành trong ngày và phương hướng phát triển tiếp theo.

---

## 1. Tóm tắt điều hành

HueViVu và Hue4U cùng giải quyết bài toán khám phá Huế theo hướng cá nhân hóa. Hue4U hiện có lợi thế rõ ràng về cách đóng gói sản phẩm: không yêu cầu đăng ký ngay, onboarding bằng thao tác quẹt, chân dung du lịch dễ chia sẻ và một hệ sinh thái tính năng được truyền thông liền mạch.

HueViVu sở hữu nền tảng kỹ thuật có khả năng tạo khác biệt sâu hơn: bộ máy lập lịch dựa trên thời gian và khoảng cách, khả năng điều chỉnh lịch trình, dữ liệu địa điểm do con người kiểm chứng, Live Guide sử dụng camera–giọng nói, cộng đồng hành trình và công cụ quản trị dữ liệu nội bộ.

Trước đợt sửa chữa, nhiều năng lực của HueViVu mới tồn tại ở mức mã nguồn hoặc giao diện thử nghiệm, chưa kết nối thành một vòng lặp sản phẩm ổn định. Trong ngày 04/10/2026, hệ thống đã được sửa nền móng dữ liệu, luồng khách không đăng nhập, analytics, Adaptive Trip, bản đồ thật, Live Guide, Data Collector và phân quyền quản trị. Một smoke-test suite tái sử dụng cũng đã được bổ sung để ngăn lỗi hồi quy.

Định vị được đề xuất cho giai đoạn tiếp theo:

> **HueViVu là trợ lý điều hành chuyến đi Huế theo thời gian thực — tự thích nghi khi thời tiết, thời gian, sức khỏe hoặc kế hoạch của du khách thay đổi.**

---

## 2. Hiện trạng HueViVu trước khi sửa chữa

### 2.1. Điểm mạnh đã có

- WebApp Next.js có đầy đủ các nhóm trang: khám phá, tạo lịch trình, chi tiết chuyến đi, cộng đồng, nhật ký, tour, profile và admin.
- Có thuật toán A* để lập lịch theo tọa độ, thời gian tham quan và loại địa điểm.
- Có khả năng chỉnh sửa lịch trình thủ công và bằng AI.
- Có camera AI, nhận dạng hình ảnh, nhận giọng nói và TTS thử nghiệm.
- Có dữ liệu thời tiết và cảnh báo thời tiết.
- Có bản đồ Leaflet cho chi tiết hành trình.
- Có hệ thống tour/combo, feedback, training examples và công cụ thu thập địa điểm.
- Giao diện mobile mang bản sắc ấm áp, phù hợp với cảm xúc du lịch Huế.

### 2.2. Những vấn đề nghiêm trọng trước sửa chữa

#### Dữ liệu

- Kho dữ liệu chỉ có 14 địa điểm, 3 tour, 1 hành trình mẫu và chưa có dữ liệu hành vi thực.
- Category trong database dùng các giá trị như `Culinary (Ẩm thực)`, `Cafe & Chill`, `Heritage (Di sản)` trong khi giao diện và thuật toán dùng `food`, `cafe`, `heritage`.
- Bộ lọc địa điểm và chấm điểm lịch trình có thể trả về rỗng hoặc sai category.
- Chưa lưu nguồn, người xác minh, thời điểm xác minh hoặc trạng thái kiểm duyệt.
- Data Collector chưa đánh giá độ đầy đủ và chưa phát hiện taxonomy đáng ngờ.

#### Luồng người dùng

- Người dùng bị chuyển sang đăng nhập trước khi tạo lịch trình.
- Lựa chọn `5+ ngày` bị chuyển thành `NaN/NULL`, làm API tạo trip thất bại.
- Với chuyến dài, các ngày sau có thể rỗng vì thuật toán cấm lặp mọi địa điểm, kể cả nhà hàng/cà phê.
- Sở thích tiếng Việt không được ánh xạ về category mà thuật toán hiểu.
- Bản đồ trang Explore chỉ là hình minh họa, không dùng dữ liệu thật.

#### Analytics và cá nhân hóa

- API event ghi vào cột `metadata` không tồn tại, trong khi schema dùng `context`.
- Event thiếu trường ID bắt buộc.
- Giao diện chưa gửi event, khiến bảng hành vi và training hoàn toàn rỗng.
- Dữ liệu visited/skipped được đọc trong API tạo trip nhưng không tham gia thuật toán A*.

#### Live Guide

- Camera được xin quyền ngay khi mở trang.
- Prompt có dữ liệu mock đặc biệt, không phù hợp production.
- AI không được grounding bằng kho địa điểm đã kiểm chứng.
- TTS phụ thuộc endpoint Google Translate không chính thức.
- Chưa có chế độ nhận diện, kể chuyện, mẹo thực tế và đề xuất bước tiếp theo rõ ràng.

#### Bảo mật và quyền truy cập

- API thêm/sửa/xóa địa điểm, tour và dữ liệu training không yêu cầu quyền admin.
- Danh sách feedback quản trị có thể đọc công khai.
- Chat có thể lấy context của trip riêng tư nếu biết ID.
- Endpoint like có thể tạo lượt thích ẩn danh giả, cho trip chưa chia sẻ hoặc không tồn tại.
- API sửa lịch trình cho phép request không có token đi qua trong một số trường hợp.
- Xóa trip có nguy cơ lỗi khóa ngoại hoặc để lại dữ liệu liên quan mồ côi.

#### Chất lượng kỹ thuật

- Production build bỏ qua type-check và lint.
- ESLint chưa có baseline dùng được: hàng trăm lỗi kiểu `any` che lấp lỗi logic thực.
- Chưa có smoke-test suite tự động.
- README vẫn là nội dung mặc định của Create Next App.

---

## 3. Phân tích đối thủ Hue4U

### 3.1. Định vị công khai

Hue4U tự định vị là nền tảng tạo “hành trình Huế cá nhân hóa”. Vòng lặp sản phẩm được truyền thông gồm:

1. Quẹt thẻ theo bốn thời điểm Sáng – Trưa – Chiều – Tối.
2. Phân tích sáu nét sở thích.
3. Tạo một trong 30 chân dung du lịch.
4. Sinh lịch trình Huế 1–3 ngày.
5. Hợp nhất sở thích khi đi nhóm.
6. Tự đổi lịch khi trời mưa.
7. Khám phá di sản bằng audio, bản đồ, 3D và passport.
8. Chia chi phí và sử dụng trợ lý AI “Sứ Giả Huế”.

Nguồn công khai: https://hue4u.com/

### 3.2. Điểm mạnh của Hue4U

- **Activation tốt:** vào là sử dụng, không cần email.
- **Onboarding dễ hiểu:** thao tác quẹt tạo cảm giác trò chơi.
- **Câu chuyện sản phẩm nhất quán:** từ hiểu gu đến lập lịch và đồng hành.
- **Khả năng chia sẻ:** chân dung du lịch và passport tạo nội dung dễ lan truyền.
- **Bao phủ nhiều nhu cầu:** di sản, ăn uống, lưu trú, dịch vụ thiết yếu và đi nhóm.
- **Hướng thương mại rõ:** trang địa điểm có form yêu cầu đặt chỗ/liên hệ.
- **Đa ngôn ngữ:** công bố audio guide năm ngôn ngữ.

### 3.3. Điểm yếu và cơ hội cho HueViVu

- Trang chủ mới nêu quy mô khoảng hơn 10 người dùng thử; social proof còn mỏng.
- Phạm vi tính năng rất rộng, có nguy cơ nhiều tính năng chỉ dừng ở mức trình diễn.
- Dữ liệu công khai có dấu hiệu nhiễu: thiếu giờ mở cửa, category chưa hợp lý và một số địa điểm ít liên quan đến hành trình du lịch.
- Đặt chỗ hiện được mô tả là yêu cầu liên hệ, chưa thể hiện availability hoặc xác nhận tức thời.
- Những tuyên bố như hàng nghìn địa điểm, tự thích nghi thời tiết và hợp gu nhóm chưa được kiểm chứng độc lập qua trải nghiệm end-to-end.
- Passport, XP và 3D có thể tạo hiệu ứng ban đầu nhưng chưa chắc tạo retention nếu không gắn với quyền lợi hoặc hành động thật.

### 3.4. Kết luận cạnh tranh

HueViVu không nên sao chép toàn bộ passport, 30 persona hoặc số lượng 3D của Hue4U. Cơ hội thắng nằm ở:

- Dữ liệu ít hơn nhưng có nguồn và người kiểm chứng.
- Lịch trình khả thi hơn, tính cả thời gian, khoảng cách, nghỉ và tình huống phát sinh.
- Điều chỉnh trong lúc đang đi, không chỉ lập kế hoạch trước chuyến đi.
- Live Guide dựa trên vị trí và dữ liệu thật.
- Hệ thống vận hành cho collector, reviewer và đối tác địa phương.

---

## 4. Những gì đã sửa và bổ sung trong ngày 04/10/2026

### 4.1. Chuẩn hóa dữ liệu

- Tạo taxonomy (hệ thống phân loại và chuẩn hóa các nhóm dữ liệu) dùng chung cho toàn hệ thống.
- Tự động migrate category cũ về category chuẩn.
- API luôn chuẩn hóa category trước khi lưu/trả dữ liệu.
- Thêm completeness score cho từng địa điểm.
- Thêm cảnh báo taxonomy dựa trên tên địa điểm nhưng không tự ý sửa dữ liệu.
- Phát hiện các địa điểm cần con người rà soát như:
  - “Cà phê Lẩu Tứ Phương Vô Sự” đang thuộc `heritage`.
  - “Tàu Hủ - Chùa Thiên Mụ” đang thuộc `nature`.
  - Các địa điểm có chữ “Chùa” nhưng được phân loại `heritage`.

### 4.2. Data Collector mới

- Dashboard tổng địa điểm, số đã xác minh, số cần bổ sung và chất lượng trung bình.
- Lọc theo category, trạng thái, completeness và nguồn quá hạn.
- Quy trình `Bản nháp → Chờ duyệt → Đã xác minh`.
- Chỉ cho xác minh khi dữ liệu đạt tối thiểu 80%.
- Tự lưu và khôi phục bản nháp trên thiết bị.
- Lưu tên nguồn, URL nguồn, người kiểm chứng, thời gian và ghi chú kiểm chứng.
- Thêm giờ hoạt động, liên hệ, website, indoor và weather-dependent.
- Trích xuất tọa độ từ URL Google Maps đầy đủ hoặc chuỗi tọa độ.
- Nhập highlights, tips, specialties và tags theo từng dòng.

### 4.3. Guest activation

- Bỏ yêu cầu đăng nhập trước khi tạo lịch trình.
- Tạo tài khoản khách riêng cho từng session.
- Không còn dùng chung tài khoản demo cho khách.
- Trả token tự động sau khi tạo hành trình.
- Trip khách vẫn riêng tư và chỉ chủ token đọc/sửa được.

### 4.4. Sửa thuật toán lịch trình

- Sửa lỗi `5+ ngày` gây `NULL` ở database.
- Chuyến 5 ngày không còn ngày rỗng khi dữ liệu còn ít.
- Cho phép nhà hàng/cà phê lặp hợp lý qua các ngày; điểm tham quan không lặp.
- Ánh xạ sở thích tiếng Việt về category chuẩn.
- Dữ liệu visited/skipped đã tham gia tăng/giảm điểm A*.
- Loại bỏ các category legacy khỏi đầu ra.

### 4.5. Analytics

- Sửa schema ghi event: ID, session, trip, value và context.
- Ghi nhận hành động xem địa điểm, lưu/bỏ lưu, chọn sở thích, tạo trip và thích nghi lịch.
- Analytics hoạt động cho cả tài khoản thật và guest session.

### 4.6. Bản đồ thật

- Thay bản đồ minh họa trên Explore bằng OpenStreetMap/Leaflet.
- Marker lấy từ database và thay đổi theo bộ lọc.
- Popup có tên, địa chỉ, rating, giá và liên kết chi tiết.
- Hỗ trợ mở rộng/thu gọn bản đồ.
- Chỉ xin quyền vị trí sau khi người dùng bấm “Vị trí của tôi”.
- Hiển thị marker vị trí hiện tại.
- Bản đồ trip tiếp tục sử dụng tuyến đường và link chỉ đường.

### 4.7. Adaptive Trip — “Cứu lịch trình”

Đã xây dựng engine server-side, không phụ thuộc Gemini, cho năm tình huống:

- **Trời mưa:** thay tối đa ba điểm ngoài trời bằng địa điểm trong nhà/gần nhất.
- **Đang đói:** đưa bữa ăn sắp tới lên sớm hoặc chèn quán phù hợp.
- **Đã mệt:** giảm số điểm tham quan và thêm 45 phút nghỉ.
- **Điểm đóng cửa:** thay bằng địa điểm cùng loại chưa xuất hiện trong lịch.
- **Đến trễ:** dời phần lịch còn lại 30–90 phút và bỏ hoạt động vượt 22:00.

Mỗi lần thích nghi được lưu vào database, ghi adaptation history, analytics event và hiển thị danh sách thay đổi cho người dùng.

Sau vòng kiểm thử khả năng khám phá, Adaptive Trip được đưa thành một khối hành động nổi bật ngay trong trang chi tiết chuyến đi, đổi nhãn từ “Cứu lịch trình” sang “Adaptive Trip” và bổ sung badge trên các chuyến đang diễn ra trong danh sách chuyến đi.

### 4.8. Live Guide mới

- Không xin camera ngay khi mở trang.
- Chỉ xin camera/vị trí sau khi người dùng chủ động bắt đầu.
- Có bốn chế độ: Nhận diện, Kể chuyện, Mẹo tham quan và Đi đâu tiếp.
- Grounding bằng các địa điểm gần nhất trong kho HueViVu.
- Ưu tiên dữ liệu đã xác minh; không cho AI bịa giờ, giá hoặc lịch sử.
- Hiển thị địa điểm gần người dùng và khoảng cách.
- Hỗ trợ giọng nói và nút hỏi nhanh.
- Dùng Speech Synthesis của trình duyệt thay cho TTS không chính thức trong Live Guide.
- Có fallback dựa trên database khi chưa cấu hình Gemini.

### 4.9. Bảo mật và phân quyền

- Thêm role `admin/user`.
- Tài khoản demo được gán role admin để quản trị môi trường hiện tại.
- Bảo vệ API ghi địa điểm, tour và training.
- Chỉ admin đọc được danh sách feedback.
- Giao diện `/admin` kiểm tra role trước khi hiển thị.
- Chat chỉ nhận context của trip công khai hoặc thuộc người đang đăng nhập.
- Like yêu cầu đăng nhập và trip phải được chia sẻ.
- Các API chỉnh trip yêu cầu token và quyền sở hữu.
- Xóa trip dọn reaction/chat/feedback liên quan; journal được giữ lại và tách khỏi trip.

### 4.10. Sửa authentication và UX

- Email được trim và chuyển lowercase khi đăng ký/đăng nhập.
- Kiểm tra email hợp lệ, tên tối thiểu hai ký tự và mật khẩu tối thiểu sáu ký tự.
- Sửa mật khẩu demo mặc định trên onboarding thành `demo123`.
- Không còn optimistic-like sai khi server từ chối.
- Không tự động xin notification permission khi mở chi tiết trip.
- Giới hạn độ dài đầu vào TTS để giảm khả năng lạm dụng.

### 4.11. Kiểm thử và chất lượng kỹ thuật

- Thêm script `npm run test:types`.
- Thêm smoke suite `npm run test:smoke`.
- Thiết lập lại ESLint baseline để bắt lỗi logic thay vì bị che bởi các lỗi `any` của prototype.
- Sửa import chết, biến không dùng, hook dependency và lỗi BottomNav.
- Production build thành công.
- SQLite `quick_check` thành công.

---

## 5. Kết quả kiểm thử hôm nay

> **Cập nhật 05/10/2026:** Dev server đã được khởi động lại tại `http://localhost:3100`. Bộ smoke test được chạy lại đầy đủ với kết quả 13/13 đạt; type-check và lint đạt; log server không ghi nhận lỗi runtime trong toàn bộ chuỗi request kiểm thử. Chrome extension nhận diện được tab localhost nhưng Browser Use vẫn bị saved origin preference chặn quyền claim tab, nên visual QA tự động chưa thể thực hiện.

### 5.1. Smoke test

**13/13 bài test đạt:**

1. Danh sách địa điểm công khai và category chuẩn.
2. Từ chối category không hợp lệ.
3. Từ chối truy cập admin khi chưa đăng nhập.
4. Tài khoản demo có role admin.
5. Đăng ký kiểm tra và chuẩn hóa email.
6. CRUD địa điểm với phân quyền.
7. Trip khách riêng tư và Adaptive Trip.
8. CRUD nhật ký đúng chủ sở hữu.
9. CRUD training chỉ dành cho admin.
10. CRUD tour chỉ dành cho admin.
11. Feedback gửi công khai, danh sách chỉ admin đọc.
12. Like yêu cầu xác thực và trip công khai.
13. Xóa trip giữ nội dung journal và dọn quan hệ liên quan.

### 5.2. Các kiểm tra khác

- `npm run test:types`: đạt.
- `npm run lint`: đạt, còn cảnh báo hiệu năng ảnh/font.
- `npm run build`: đạt.
- API Adaptive Trip cho năm tình huống: đạt.
- Database không còn dữ liệu smoke test sau khi hoàn tất.

### 5.3. Giới hạn kiểm thử

Kiểm thử browser tự động trên localhost chưa thực hiện được vì Browser Use vẫn báo saved preference chặn origin `http://localhost:3100`, kể cả khi tab đã được mở thủ công. API, database, type-check, lint và build đã được kiểm thử. Vòng visual QA desktop/mobile cần thực hiện sau khi mục chặn origin này được xóa hoàn toàn trong Settings > Browser.

---

## 6. Phương hướng phát triển tiếp theo

### Phase 3 — Trust & Operations

**Trạng thái cập nhật 05/10/2026: Đã triển khai nền tảng chính.**

- Đã có lịch mở cửa bảy ngày, tối đa ba ca/ngày, tương thích dữ liệu giờ cũ.
- Explore và Place Card hiển thị `Đang mở`, `Sắp đóng`, `Đã đóng` hoặc `Chưa xác minh giờ`.
- Đã có bộ lọc “Đang mở” đồng bộ danh sách và bản đồ.
- A* loại điểm đóng cửa khỏi lịch khi có ngày bắt đầu và dữ liệu giờ đã cấu hình.
- Flow cho nhập ngày bắt đầu để kiểm tra giờ mở cửa chính xác.
- Đã có feasibility validator chấm điểm thời gian, quãng đường, giờ đóng cửa, tọa độ và bữa ăn.
- Trang trip hiển thị điểm khả thi, xung đột theo ngày, tổng km và km đi bộ.
- Điểm khả thi không còn chỉ để đánh giá: mỗi lỗi có thể mở đúng hoạt động liên quan; khi điểm thấp hoặc bằng 0, người dùng có thể bấm “Sửa lịch trình ngay/Tối ưu tự động”. Engine sẽ dời giờ, thêm thời gian di chuyển, tránh giờ đóng cửa, thay điểm phù hợp khi có thể, lưu lịch và trả điểm mới.
- Sau phản hồi UX, luồng này tiếp tục được đơn giản hóa theo tâm lý người dùng mới: không yêu cầu tự mở và sửa từng hoạt động; giải thích hậu quả thực tế bằng ngôn ngữ đời thường; HueViVu tạo phương án sửa, hiển thị trước–sau và chỉ lưu khi người dùng bấm “Áp dụng phương án này”.
- Backend tạo lịch đã được sửa từ gốc: A* và validator dùng chung công thức thời gian di chuyển; số hoạt động được giới hạn theo nhịp thư giãn/cân bằng/dày; thời lượng ăn/cà phê được chuẩn hóa; tiêu đề không còn tuyên bố một phong cách không có trong dữ liệu; lịch được đánh giá, tự cân lại và qua quality gate tối thiểu trước khi lưu. Ma trận kiểm thử thực tế đạt 100/100 với 6 hoạt động thư giãn, 100/100 với 7 hoạt động cân bằng và 94/100 với 8 hoạt động dày.
- Đã có role `collector`, `reviewer`, `admin` với quyền hạn khác nhau.
- Collector không thể tự xác minh dữ liệu; Reviewer và Admin có quyền duyệt.
- Đã có trang quản lý nhân sự, trang audit log và diff trước–sau.
- Smoke suite mở rộng lên 14/14 test đạt.

#### P0. Engine giờ mở cửa

- Schema bảy ngày trong tuần.
- Nhiều khung giờ trong một ngày và nghỉ giữa giờ.
- Ngoại lệ ngày lễ/sự kiện.
- Trạng thái Đang mở, Sắp đóng, Đóng cửa, Chưa xác minh.
- Không đưa địa điểm đóng cửa vào lịch trình.
- Adaptive Trip tự thay điểm sắp đóng.

#### P0. Kiểm tra tính khả thi của lịch trình

- Tính thời gian di chuyển giữa từng cặp điểm.
- Phát hiện trùng giờ, thiếu thời gian và quay đầu tuyến đường.
- Tính thời gian nghỉ, ăn và xếp hàng.
- Chấm điểm khả thi cho từng ngày.
- Cảnh báo trước khi người dùng lưu hoặc chia sẻ lịch.

#### P0. Hoàn thiện quyền quản trị

- Role `collector`, `reviewer`, `admin` thay vì chỉ `admin/user`.
- Collector nhập nhưng không tự xác minh.
- Reviewer duyệt/trả lại và ghi lý do.
- Audit log: ai sửa trường nào, lúc nào, giá trị trước–sau.
- Thu hồi phiên đăng nhập và quản lý tài khoản nội bộ.

### Phase 4 — Data Operations

**Trạng thái cập nhật 06/10/2026: Phase 4A đã triển khai.**

- Tách riêng trạng thái xác minh và trạng thái xuất bản; dữ liệu nháp/lưu trữ không xuất hiện trong app công khai hoặc bộ sinh lịch.
- Dữ liệu cũ được giữ ở trạng thái xuất bản để không làm gián đoạn ứng dụng; độ ưu tiên thuật toán giảm nếu chưa được xác minh.
- Dashboard Data Collector hiển thị độ phủ 10 danh mục, category còn trống, trường dữ liệu còn thiếu, số chờ duyệt, chưa xuất bản và cần tái xác minh.
- Hỗ trợ chu kỳ tái xác minh 30/60/90 ngày.
- Phát hiện trùng theo tên, số điện thoại, website và tọa độ trong bán kính 80 m trước khi lưu.
- Có preview thẻ địa điểm trước khi xuất bản.
- Import CSV luôn đưa dữ liệu vào bản nháp; dòng trùng bị bỏ qua và lỗi được báo theo từng dòng.
- Export CSV có đầy đủ trạng thái workflow và nguồn kiểm chứng.
- Có hàng đợi nhiệm vụ dữ liệu, mức ưu tiên, người nhận việc, bằng chứng và ghi chú kết luận.
- Phản hồi “Địa điểm/Nội dung” từ người dùng tự động tạo nhiệm vụ xác minh cho đội dữ liệu.
- Production build bằng thư mục riêng đạt 51 routes mà không làm hỏng dev server đang chạy.
- Smoke suite mở rộng lên 15/15 nhóm kiểm thử đạt.

- Lịch mở cửa trực quan bảy ngày trong Data Collector.
- Phát hiện trùng tên, tọa độ, điện thoại và website.
- So sánh diff trước–sau khi duyệt.
- Hàng đợi tái xác minh sau 30/60/90 ngày.
- Import/export CSV có validation.
- Preview card/map trước khi xuất bản.
- Chỉ địa điểm `verified` mới được ưu tiên cao trong lịch trình.

### Phase 5 — Product Growth

- Link chia sẻ trip không yêu cầu tài khoản.
- Hợp nhất sở thích nhóm.
- Mời thành viên và biểu quyết địa điểm.
- Dashboard đối tác địa phương.
- Theo dõi lead, gọi điện, chỉ đường và yêu cầu đặt chỗ.
- Passport chỉ triển khai khi gắn với ưu đãi thật.
- Referral cho khách sạn, homestay, hướng dẫn viên và dịch vụ vận chuyển.

### Phase 6 — Offline và hiệu năng

- PWA cài lên màn hình chính.
- Lưu lịch trình và dữ liệu thiết yếu offline.
- Đồng bộ thay đổi khi có mạng trở lại.
- Marker clustering và tải địa điểm theo vùng bản đồ.
- Chuyển ảnh quan trọng sang `next/image`.
- Lazy-load 3D và Live Guide.
- Giảm bundle `/3d-demo`, hiện lớn hơn đáng kể so với các trang khác.

---

## 7. Thứ tự ưu tiên đề xuất cho sprint kế tiếp

1. Hoàn thành visual QA trên desktop và mobile.
2. Xây schema và UI giờ mở cửa bảy ngày.
3. Xây feasibility validator cho hành trình.
4. Thêm role collector/reviewer và audit log.
5. Hoàn thiện Map “Open now / Near me / Indoor”.
6. Xử lý các địa điểm đang bị cảnh báo taxonomy.
7. Chuyển ảnh quan trọng sang `next/image`.
8. Nâng README thành tài liệu cài đặt, kiến trúc và quy trình test.

---

## 8. KPI sản phẩm đề xuất

- Thời gian đến lịch trình đầu tiên: **≤ 60 giây**.
- Tỷ lệ khách truy cập tạo xong lịch trình: **≥ 35%**.
- Tỷ lệ mở chỉ đường từ trip: **≥ 25%**.
- Tỷ lệ chấp nhận phương án Adaptive Trip: **≥ 50%**.
- Tỷ lệ hoàn thành ít nhất hai hoạt động/ngày.
- Tỷ lệ địa điểm production có completeness ≥ 80%.
- Tỷ lệ địa điểm được xác minh trong 90 ngày gần nhất.
- Tỷ lệ gợi ý AI sử dụng dữ liệu `verified`.
- Tỷ lệ lead đối tác được xác nhận.

---

## 9. Kết luận

Hue4U hiện đi trước về cách kể câu chuyện sản phẩm và khả năng tạo hiệu ứng ngay trong vài phút đầu. HueViVu đã bắt đầu hình thành lợi thế khác biệt ở lớp khó sao chép hơn: dữ liệu có kiểm chứng, lịch trình có khả năng vận hành thật, engine thích nghi theo tình huống và Live Guide theo ngữ cảnh.

Trọng tâm tiếp theo không phải bổ sung thật nhiều tính năng. HueViVu cần chứng minh ba điều:

1. **Dữ liệu đáng tin hơn.**
2. **Lịch trình khả thi hơn.**
3. **Ứng dụng hữu ích hơn khi chuyến đi không diễn ra đúng kế hoạch.**

Nếu thực hiện tốt ba điểm này, HueViVu có thể cạnh tranh bằng chất lượng vận hành và niềm tin thay vì chỉ chạy đua số lượng tính năng với Hue4U.
