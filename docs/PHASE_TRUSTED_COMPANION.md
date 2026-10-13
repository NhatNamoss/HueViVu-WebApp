# Công cụ dữ liệu đáng tin và companion — 11/10/2026

## Phạm vi local đã triển khai

### Nhập, duyệt và kiểm chứng thủ công

Dùng lại schema, role collector/reviewer/admin và audit hiện có. Xác minh tại API cần tên nguồn, URL http/https hoặc ghi nhận khảo sát tại chỗ, người kiểm chứng, địa chỉ, tọa độ Huế và giờ mở cửa có cấu trúc hợp lệ. Collector vẫn không tự xác minh; dữ liệu CSV vẫn nhập thành bản nháp. Không tự nâng trạng thái địa điểm thật.

Ngày kiểm chứng do máy chủ ghi nhận khi xác minh. Xuất bản hoặc lưu lại không tự làm mới ngày. Thay đổi tên/danh mục/địa chỉ/tọa độ/giá/điện thoại/giờ/không gian/thời lượng/khả năng tiếp cận/nguồn mà chưa xác minh lại sẽ đưa bản ghi về chờ duyệt. Thiếu giá không tự mặc định miễn phí.

Độ đầy đủ nội dung và xác minh là hai khái niệm khác nhau; ghi nhận khảo sát được chấp nhận thay URL. Trạng thái dữ liệu còn mới cần đủ bằng chứng và ngày hợp lệ, không nằm trong tương lai. Giờ/giá/liên hệ dùng ngưỡng tối đa 30 ngày; chu kỳ mô tả tổng thể vẫn chọn 30/60/90. Đây là chính sách phần mềm cho lần kiểm chứng chung của bản ghi, chưa có lịch sử riêng từng trường.

Admin có danh sách đến hạn, khoảng thiếu bằng tiếng Việt và task-sync nêu thông tin cần bổ sung. Trang địa điểm giữ một nhãn gọn, mở nguồn/ngày kiểm tra khi cần. Dữ liệu chưa xác minh/cũ không được hiện “đang mở”. Hàng đợi admin thu gọn mặc định để không che nút trên điện thoại; thanh điều hướng cuộn ngang.

### AI chỉnh lịch có bảo vệ

Chat tạo phương án bám ngày đang xem, chỉ thêm địa điểm đã xuất bản. Tất cả phương án qua bộ kiểm tra: giữ số ngày, ngày hợp lệ, tên/giờ hợp lệ, không sửa/xóa nội dung hoặc thứ tự tương đối của điểm đã hoàn thành. Không suy diễn một địa điểm đã có trong database thành đã xác minh ngoài thực tế.

Customization API chỉ tạo preview khi nhận yêu cầu bằng lời. Áp dụng cần snapshot lịch và tiến độ; kiểm tra lại trong transaction. Snapshot cũ bị từ chối; tiến độ theo khóa hoạt động được giữ khi đổi lịch. UI giữ bước xác nhận, tải lại tiến độ sau khi áp dụng. Luồng tùy chỉnh cũ cũng chuyển qua preview.

Câu hỏi vận hành về giờ/giá/liên hệ/nguồn của địa điểm được trả theo dữ liệu xác định; thiếu/cũ thì nói rõ cần kiểm tra, không suy đoán giá hoặc đang mở. Nhánh LLM khác có thông tin trạng thái và quy tắc tương ứng; chưa chứng nhận grounding mọi câu hỏi/hallucination evaluation.

### Gợi ý hành động chung

API `/api/companion` dùng giờ Huế, thời tiết từ API hiện có (không dùng weather fallback giả định), sở thích tài khoản, chuyến đã bắt đầu đúng ngày và tiến độ theo ngày. Mệt/đêm muộn/hoàn thành ngày có hành động riêng; không gợi lại các điểm đã đi.

Khi đề xuất địa điểm cụ thể, chỉ dùng điểm đã xuất bản, đủ kiểm chứng còn mới, hợp không gian/thời tiết và còn đủ thời gian theo giờ đã nhập. Sở thích và khoảng cách ước tính thay đổi xếp hạng. Không có ứng viên phù hợp thì dẫn tới Khám phá và giải thích giới hạn.

Vị trí chỉ yêu cầu khi người dùng bấm “Gợi ý gần tôi”, gửi qua POST tới app, dùng trong bộ nhớ phiên tối đa 5 phút, không ghi GPS vào trip state. Từ chối vị trí vẫn giữ gợi ý cơ bản. Khoảng cách và thời gian đi bộ là ước tính, chưa có routing/traffic thực tế. Trang chủ cập nhật mỗi phút/khi quay lại tab, có thông báo fallback khi API lỗi.

### Chuẩn bị production local

Có preflight môi trường không in secrets, diễn tập backup/restore vào thư mục tạm riêng và đo tải nhẹ read-only local. Tài liệu [VPS Windows](WINDOWS_VPS_HANDOFF.md) ghi hostname app.huevivu.id.vn theo yêu cầu chủ dự án. Chưa thao tác VPS hoặc triển khai công khai.

## Kiểm chứng

- Types/lint/build: đạt; cảnh báo ảnh/font đã có không chặn build.
- Logic trusted-companion, travel-context, preferences, planner-preferences, chat-progress: đạt.
- API riêng: thiếu nguồn, ngày giả, sửa dữ liệu quan trọng, tái xác minh, trả lời giá mới/cũ, preview không ghi, thiếu snapshot, tiến độ cũ, điểm đã đi, owner isolation và vị trí sai: đạt trên dev và production local.
- Smoke 28/28 đạt trên dev và production local.
- Backup -> bản khôi phục riêng -> integrity/số dòng: đạt; database đang dùng không bị thay thế.
- Local baseline: 30 request read-only, concurrency 5, p95 80 ms, max 124 ms; không phải chứng nhận capacity/4G/VPS.
- Preflight đúng môi trường dự kiến (demo flag tắt): đạt. Local hiện có flag demo được chủ dự án dùng thử; file local này không được dùng làm cấu hình production.
- Browser desktop/mobile: thiếu nguồn bị chặn; không URL nhưng có khảo sát xác minh được; nguồn/ngày kiểm tra mở theo nhu cầu; dữ liệu cũ vào danh sách tái xác minh và kiểm tra lại thành công.
- Browser chat: từ chối bỏ Bánh canh O Hoa đã đi; dời Cà phê KODO tạo preview, xác nhận rồi đổi giờ; vẫn giữ 2/7 điểm đã đi.
- Browser trang chủ: CTA mở đúng địa điểm kiểm thử đủ điều kiện; màn hình nhỏ không tràn ngang. Khi giờ đã muộn, gợi ý nghỉ có ưu tiên cao hơn việc thêm điểm.
- Browser admin mobile sau sửa: bảng nhiệm vụ mặc định đóng, mở/đóng chủ động, nút xác minh không bị che và không tràn ngang.
- GPS thật/điện thoại vật lý chưa được cấp quyền hoặc kiểm chứng trong gói này; nhánh vị trí được kiểm tra logic và API bằng tọa độ QA. Không gọi số khẩn cấp thật.

## Bằng chứng

- [Dashboard dữ liệu](release-evidence/trusted-data-admin.jpg)
- [Nguồn địa điểm](release-evidence/trusted-place-source.jpg)
- [Admin mobile](release-evidence/trusted-admin-mobile.jpg)
- [Chat xác nhận thay đổi](release-evidence/chat-protected-change.jpg)
- [Gợi ý mobile](release-evidence/companion-action-mobile.jpg)

Ảnh có dữ liệu QA, không phải chứng thực địa điểm thật. Tài khoản/địa điểm/lịch trình QA của luồng browser được dọn sau kiểm tra. Các test tự tạo fixture riêng và dọn khi kết thúc.

## Mục còn mở

Thu thập và đối chiếu corpus bởi người phụ trách; nguồn và ngày kiểm tra riêng từng trường; xác minh độc lập số liên hệ; thời tiết có freshness/provenance đầy đủ; grounding mọi câu hỏi LLM/RAG và eval; routing thật; rate limiting và monitoring bên ngoài; public deployment, máy thật/4G/tải quy mô production. Không tick các mục tổng này chỉ vì gói local đã qua kiểm tra.
