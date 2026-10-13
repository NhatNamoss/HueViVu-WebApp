# HueViVu — đánh giá maturity đợt 1

Ngày đánh giá: 08/10/2026. Phạm vi: các nền tảng đã tick trong Production Tracker và luồng P0 liên quan. Đây là đánh giá mã nguồn và bản local, chưa là chứng nhận production công khai.

## Cách đọc kết quả

Checkbox giữ lịch sử công việc đã triển khai của chủ dự án. Mức L0–L4 đánh giá khoảng cách tới blueprint: L0 chưa có, L1 prototype/nền tảng, L2 hoạt động local, L3 đạt các cổng production, L4 có khác biệt được kiểm chứng. Không tính tỷ lệ hoàn thiện từ số checkbox; từng hệ thống có tiêu chí và bằng chứng riêng.

## Vấn đề thực tế mà đợt này giải quyết

Du khách tự túc có thể mất kết nối giữa chuyến đi và không đọc lại được giờ đi hoặc địa chỉ. Đợt này giúp họ đọc lịch đã lưu mà không cần AI, bản đồ hoặc máy chủ hoạt động. Đây là một đóng góp cụ thể cho khả năng tiếp cận thông tin khi mạng yếu; chưa có dữ liệu để tuyên bố tác động kinh tế hay xã hội ở quy mô rộng.

Mục tiêu tiếp theo: người lần đầu đến Huế hiểu thông tin nào đáng tin, có lịch trình phù hợp với thời gian và sức đi, biết cách xử lý khi mưa/trễ/mệt. Dữ liệu khả năng tiếp cận cho người cao tuổi, gia đình và người hạn chế di chuyển cần được xác minh trước khi hứa về sự phù hợp. Đo qua việc hoàn thành tác vụ, lỗi giờ/giá/địa chỉ, lịch quá tải và phản hồi của các nhóm người dùng thực.

## Đánh giá các mục đã có

| Mục trong tracker | Hiện tại | Bằng chứng và khoảng thiếu so với blueprint |
|---|---|---|
| Logger, headers, request ID, health | L2 | `src/lib/logger.ts`, `middleware.ts`, `/api/health` hoạt động. Health chỉ kiểm tra DB/cấu hình và địa điểm công bố; không chứng nhận nguồn dữ liệu, kết nối Redis/AI thật hoặc mọi API đã được gắn request ID trong log. Thiếu kiểm chứng HTTPS, giám sát/cảnh báo và backup/restore trên môi trường công khai. |
| FastAPI AI boundary | L1 | `src/lib/ai/service.ts` có timeout và logging. `services/ai/main.py` trả danh sách rỗng cho RAG/vision. Chưa có corpus, retrieval/inference hoặc đánh giá kết quả; health local báo chưa cấu hình AI service. |
| Redis/BullMQ boundary | L1 | `src/lib/jobs/queue.ts` có queue, retry/backoff và chính sách giữ job. Chưa thấy worker xử lý job trong phạm vi kiểm kê; Redis chưa cấu hình. Chỉ nên vận hành khi ingestion có nhu cầu thật. |
| Emergency Assistant | L2 | `/emergency` mở được trên màn hình 390×844, có liên kết điện thoại và hướng dẫn nói vị trí/sự cố. Nguồn hiện mới là tên cơ quan, chưa có URL/ngày kiểm tra và cơ chế freshness. Luồng tình huống, dữ liệu hỗ trợ thống nhất với trang chuyến đi và truy cập offline còn thiếu; chưa xác minh trực tiếp số liên hệ hoặc thử gọi thật. |
| Service worker/offline foundation | L2 | Bản production local tự đăng ký SW; tài nguyên đọc offline được lưu, API không cache. Navigation mất mạng mở bản đọc lịch. Không có bản đồ offline; không chứng minh hoạt động trên mọi trình duyệt/điện thoại. |
| Offline trip-cache utility | L2 | Đã bổ sung phiên bản snapshot, tách theo tài khoản, giới hạn 6 lịch/30 ngày, loại dữ liệu tài khoản/lịch sử GPS, xử lý lưu bị chặn. Không dùng token đọc local thay cho quyền truy cập API. Không phải đồng bộ chỉnh sửa offline. |
| Travel Context Engine | L2 một phần | `src/lib/travel-context.ts` chọn CTA theo giờ/thời tiết/trip. Homepage chưa truyền đầy đủ vị trí/sở thích/trạng thái hoạt động. CTA `?indoor=true` chưa được trang explore đọc; có gợi ý nhưng hành động chưa lọc đúng nhu cầu. Active trip đang luôn được ưu tiên cao hơn mưa/nóng. |
| Dynamic replanning | L2 một phần | UI tình huống và `/replan` có xem trước, áp dụng qua bộ adapt hiện có. Detector chưa kiểm tra đầy đủ chuyến đã bắt đầu/chưa bắt đầu/đã xong; giờ dùng `getHours()` phụ thuộc timezone máy chạy. Chưa dùng đầy đủ completion/fatigue/closure từ trip state và dữ liệu xác minh. Chưa đạt L4 contextual adaptation. |
| Trip State Engine | L2 | API có quyền sở hữu và persistence; smoke đã kiểm tra lưu trạng thái. Đợt này sửa lỗi input sai gây 500 và kiểm tra day/activity bounds, location, fatigue, mode, weather, timestamp. Frontend còn nuốt lỗi lưu nền, chuyển tab ngày chưa cập nhật dayIndex và thiếu thao tác ghi nhận tiến độ rõ cho người dùng. |

Các mục chưa tick như notification, grounded chat, verified discovery và public deployment chưa được đánh giá đầy đủ trong đợt này. Không suy luận rằng chúng chưa có code chỉ từ checkbox.

## Dữ liệu hiện tại

Đọc SQLite sau khi smoke đã dọn fixture: 15 địa điểm công bố, gồm 1 `verified`, 6 `reviewed`, 8 `draft`; thêm 3 bản nháp mang trạng thái `reviewed`. Khác baseline 14 địa điểm trong tài liệu ngày 07/10. Đây là trạng thái database, không phải xác nhận độc lập rằng nội dung thực tế đúng. Không tự đổi publication/verification của địa điểm người dùng nhập.

## Công việc đã thực hiện đợt này

1. Dùng một module snapshot chung cho trang Next.js và trang đọc offline, tránh hai định dạng dữ liệu khác nhau.
2. Trang chuyến đi thông báo lưu thành công/thất bại và có đường mở bản lưu. Snapshot cập nhật khi lịch trên màn hình thay đổi. Bản lưu có thể khác bản trên tài khoản, được nói rõ.
3. `/offline.html` hiển thị danh sách chuyến, từng ngày, giờ đi, địa chỉ, thời lượng, mô tả và chi phí dự kiến. Có thời gian lưu theo giờ Việt Nam, cảnh báo thông tin có thể thay đổi và chỉ đường cần mạng.
4. Không có hành động chỉnh sửa/AI trong bản đọc offline. Có xác nhận xóa bản lưu, hủy và thông báo kết quả; không xóa lịch trên máy chủ.
5. Đăng xuất xóa snapshot, có nhãn truy cập cho nút đăng xuất. Legacy/corrupt/expired/other-account snapshots không được hiển thị. Browser storage bị chặn có phản hồi để phục hồi.
6. SW chỉ dọn cache mang tên HueViVu, giữ cache không liên quan. Bổ sung favicon để trang offline không còn request lỗi cho icon.
7. API trạng thái trả 400 cho JSON/kiểu dữ liệu không hợp lệ, 404 cho người không sở hữu; đầu vào sai không thay đổi trạng thái đã lưu.

## Bằng chứng kiểm chứng

- Đã chạy development server bằng `npm run dev -- --port 3000`, mở và thử giao diện thật; sau đó dừng dev trước khi build.
- `node scripts/test-offline-trip-cache.mjs`: đạt các kiểm tra account isolation, expiry, corruption, tối giản dữ liệu, giới hạn số lịch, logout và storage không dùng được.
- `npm run test:types`: đạt. `npm run lint`: đạt, còn cảnh báo ảnh/font đã có. `npm run build` bản cuối: đạt, không bỏ qua kiểm tra kiểu dữ liệu/lint.
- Smoke trên production local `http://localhost:3000`: **23 đạt, 0 lỗi**. Có regression cho malformed/null/array input, ngày/hoạt động vượt giới hạn, tọa độ sai, trạng thái sai, JSON lỗi và truy cập của người khác. Những chỉnh sửa sau lần smoke chỉ liên quan phản hồi UI/nút logout và favicon; build và browser đã kiểm tra lại phần đó.
- Browser Chrome: tạo lịch thử gia đình hai ngày → mở lịch → xác nhận lưu → tắt mạng → tải lại URL lịch → đọc giờ/địa chỉ → mở ngày thứ hai → bật mạng trở lại.
- UI kiểm tra ở 390×844, 320×740 và 1280×800; bản offline không tràn chiều ngang. Screenshot ở `docs/release-evidence/offline-trip-mobile.png`.
- Kiểm tra không có token, snapshot hỏng, hủy/xác nhận xóa bản lưu, logout xóa dữ liệu và chặn storage gây lỗi lưu: phản hồi phù hợp.
- Điều tra console offline: ban đầu favicon bị lỗi mạng; đã sửa precache. Bản cuối không có console error hay JavaScript exception trong luồng đọc offline. Cache không liên quan được giữ lại.
- Lịch/tài khoản guest dùng riêng cho kiểm tra được dọn sau khi hoàn thành. Chưa thử điện thoại vật lý, mạng di động thật hoặc máy chủ công khai.

## Thứ tự code tiếp

### 1. Ngữ cảnh phải dẫn tới hành động đúng

Sửa `?indoor=true` từ CTA thời tiết tới bộ lọc explore; thống nhất thời gian Việt Nam; chỉ phát hiện trễ khi đúng ngày và chuyến đã bắt đầu; dùng trạng thái hoàn thành/mệt. Bổ sung phản hồi lưu trạng thái và đồng bộ ngày đang đi. Acceptance: lịch tương lai không bị báo trễ; hoạt động hoàn thành không bị kéo vào lịch mới; từ chối vị trí vẫn có lựa chọn hữu ích; preview/hủy/áp dụng không làm mất dữ liệu hay sửa lịch ngoài ý muốn.

### 2. Dữ liệu đáng tin và lựa chọn phù hợp

Giữ workflow collector/reviewer hiện có. Thêm tiêu chí freshness cho các thông tin vận hành; hiển thị lý do chưa chắc chắn và một bước kiểm tra. Xác minh những điểm cần cho lịch 1–2 ngày trước, mở rộng tới mục tiêu 100+ địa điểm/30+ ẩm thực của blueprint theo khả năng thu thập thực. Không gán nhãn accessible hoặc verified do AI suy đoán. Acceptance: điểm được đề xuất có nguồn và trạng thái rõ; không biến số feasibility cao thành lời hứa dữ liệu đúng.

### 3. Trợ giúp và offline thiết yếu còn lại

Hợp nhất dữ liệu liên hệ hỗ trợ; gắn nguồn trực tiếp/ngày kiểm tra và quy trình người phụ trách cập nhật. Hoàn thiện tình huống mất đồ/cần trợ giúp và phần dữ liệu cần đọc offline. Acceptance: người mới biết bước tiếp theo và cách liên hệ; thông tin cần xác minh được nêu rõ; liên kết gọi đúng định dạng, không thử gọi khẩn cấp trong test.

### 4. Cổng production công khai

Deployment HTTPS, secrets và persistence, backup/restore drill, rate limit/auth regression, monitoring/cảnh báo, mobile/4G/load test. Chỉ nâng thành L3 khi có bằng chứng từ môi trường này. Giữ modular monolith và chỉ bật Redis/FastAPI cho công việc đã có nhu cầu và dữ liệu.

Mỗi gói áp dụng vòng bắt buộc: kiểm tra tự động phù hợp → chạy app → mở browser → thao tác luồng → kiểm tra console/network/runtime → sửa lỗi và kiểm tra lại → cập nhật tracker sau khi đạt. Vision/3D/booking tiếp tục theo các phase của blueprint sau các khoảng thiếu P0.
