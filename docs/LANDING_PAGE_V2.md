# Landing page V2, kế thừa bản đầu tiên, 13/10/2026

## Căn cứ và quyết định

Theo yêu cầu của chủ sản phẩm, đọc và mở thực tế `landing-page/index.html` trước khi xây lại. Bản đó được giữ nguyên. Hướng mới ENERGY 3 / RHYTHM 3 / MOTION 3, vẫn là trang tĩnh tiếng Việt.

| Điểm ở bản đầu | Đánh giá | Cách kế thừa hoặc cải tiến |
| --- | --- | --- |
| “Chạm vào linh hồn Huế”, giọng cảm xúc | Đáng giữ, gắn với điểm đến hơn slogan SaaS | Giữ thông điệp, rút mô tả theo hành động sản phẩm |
| Tím Huế, hoàng hôn, serif | Bản sắc rõ hơn bản local đầu của lượt trước | Giữ tím, sắc peach, chữ serif; điều chỉnh màu chữ/nút cho AA |
| Điện thoại trong hero | Nhìn thấy sản phẩm ngay | Giữ vai trò trung tâm, có nút mưa đổi phương án thật trong ví dụ |
| Câu chuyện 4 giai đoạn | Làm rõ độ sâu của sản phẩm | Giữ lên lịch, gặp di sản, nghe chuyện, điều chỉnh; dùng pinned story và 4 scene |
| Màn hình 3D và audio chỉ giả lập | Chưa thể chứng minh bằng thao tác | Mô hình Ngọ Môn thật 1,24 MB, kéo/xoay/đặt lại, audio mẫu 21,312 giây |
| Các nút đổi/tạo lịch, privacy có href # hoặc chưa có handler | HIGH, đích đến/hành vi chưa đúng | Chỉ giữ link/điều khiển có hành vi; CTA tới app local, phần lập lịch và section thật |
| 300+, 500+, 92%, 4,8 và review không có nguồn kèm theo | HIGH, chưa đủ chứng cứ trong phạm vi tài liệu đọc | Không kế thừa vào bản mới; không khẳng định những số liệu đó sai |
| Tự nhận biết mệt, GPS tự phát, tự thay mọi lịch | HIGH, vượt phần đã chứng minh của app | Nêu người dùng chủ động, xem trước và xác nhận; không đưa claim GPS |
| Float/pulse/marquee lặp và nhiều thẻ cùng kiểu | MEDIUM, hiệu ứng không nối thành một câu chuyện | Chuyển cảnh theo cuộn, parallax, pointer tilt, 3D theo thao tác; mưa/waveform gắn trạng thái |
| Chữ xám nhạt, nút nhỏ, mockup có kích thước cố định | HIGH, cần kiểm tra mobile/AA | Scale riêng, Menu mobile, 44px, tương phản và 5 viewport |
| Tailwind CDN/font ngoài | Có phụ thuộc để hiển thị | CSS thuần, font/tài sản/vendor local, không build trên hosting |

Các điểm HIGH/MEDIUM là phân tích bản tham chiếu để phục vụ yêu cầu cải tiến; không sửa trực tiếp bản tham chiếu. Không có phê duyệt hoặc claim mới về số liệu/đối tác.

## Thay đổi hoàn thành

- Hero ảnh Ngọ Môn nhiều lớp, tím/hoàng hôn, giao diện ví dụ và thử trời mưa.
- Header gọn, tiến độ đọc, Menu mobile.
- Câu chuyện sản phẩm giữ hình theo cuộn trên tablet/desktop; bốn scene, chọn chương bằng phím/nút. Mobile không pin khung lớn.
- Xoay mô hình Ngọ Môn thật trong dialog, tải theo nhu cầu, loading/error/retry, đóng/Escape trả focus, điều khiển nút và bàn phím canvas.
- Audio thật, phát/tạm dừng/kết thúc, không autoplay; tạm dừng khi rời tab, waveform theo trạng thái phát.
- Ba tình huống có phần lịch cũ/đề xuất, giữ tiến độ, áp dụng và khôi phục trong ví dụ.
- Reduced-motion và chế độ không JavaScript có nội dung đọc được; không giữ nút tương tác vô hiệu ở chế độ đó.
- Gói tĩnh mới gồm cả `heritage.js`, mô hình, audio và vendor, không gọi API của app để chạy landing.

## Kiểm chứng

- `npm run test:types`: exit 0.
- Syntax script/config/heritage/serve/check: PASS.
- `node landing/check.mjs`: PASS, 28 tài nguyên gồm graph 3D, root/HEAD/404/405, chặn đường dẫn cha, ID/anchors, alt/kích thước, không autoplay.
- Preview landing 4173 và ứng dụng Next local 3000 đã mở; cả trang chủ và `/flow` có UI thực. `/flow` đang báo phiên hết hạn và cho chọn sở thích thủ công, là trạng thái app hiện có; không đăng nhập/đổi dữ liệu để kiểm tra landing.
- Desktop, tablet, laptop và mobile được xem qua browser, không dùng compilation thay cho kiểm chứng UI.

| Viewport | clientWidth = scrollWidth | Vùng bấm hiển thị dưới 44px |
| --- | ---: | ---: |
| 320 | 305 | 0 |
| 390 | 375 | 0 |
| 768 | 753 | 0 |
| 1024 | 1009 | 0 |
| 1440 | 1425 | 0 |

Tương phản: đo chữ trên nền CSS ở các scene hiển thị, không có failure AA. Chữ trên ảnh dùng scrim/filter có lý do; phần ảnh được giảm sáng để đảm bảo vùng chữ, header có nền đậm. Màu cam cho hover đã tối hơn để dùng được với chữ nhỏ.

## Click-through và phục hồi

| Nhóm | Kết quả thực tế |
| --- | --- |
| Menu Enter/click/Escape | Mở/đóng, aria-expanded, focus trở về Menu |
| Wordmark/footer về đầu | `#dau-trang`, scrollY về 0 |
| Skip Enter | `#noi-dung` |
| Cách đồng hành / Đi cùng HueViVu | `#hanh-trinh` |
| Cuộn để đi cùng câu chuyện | `#cau-chuyen` |
| Chạm di sản | `#di-san` |
| Thử đổi lịch / Thử một tình huống | `#trai-nghiem` |
| 3 liên kết nỗi đau | Cùng section và chọn đúng rain/late/slow |
| Link cuối chương điều chỉnh | Section đổi lịch |
| Weather switch | Đổi sang phương án trong nhà; aria-pressed và mô tả cập nhật; bật/tắt được |
| Chương 01/02/03/04 | Stage-count và scene đúng, hidden scenes inert; cuộn desktop đổi scene |
| Mở Ngọ Môn 3D / Mở mô hình Ngọ Môn / Xoay Ngọ Môn 3D | Đều mở dialog thật |
| Xoay trái/phải, góc ban đầu | Mô hình đổi góc, đặt lại; nút Enter hoạt động |
| Canvas ArrowRight/Home | Xoay/đặt lại, outline focus rõ |
| Đóng / Escape | Dialog đóng, không còn body scroll lock, focus trả về nút mở |
| GLB thiếu trong QA local | Error có hướng dẫn, Retry xuất hiện; phục hồi file rồi bấm Retry mở thành công; backup đã gỡ |
| Các nút nghe ở story/chapter/di sản | Audio phát thật, duration 21,312s, currentTime chạy; tạm dừng quan sát paused=true, trạng thái kết thúc rõ |
| 3 tình huống | Đề xuất và lý do rain/late/slow thay đổi |
| Áp dụng vào ví dụ / Khôi phục ví dụ | Feedback rõ, giữ điểm hoàn thành, không sửa lịch thật |
| Mở HueViVu / CTA cuối | Trang chủ app 3000 |
| Mở phần lên kế hoạch | `/flow`, heading Tạo lịch trình Huế |

Đã thử reduced-motion bằng browser emulation: animation none, scroll-behavior auto, scene/menu vẫn hoạt động. Đã thử tắt JS và reload: notice hiện, header relative, nội dung còn đọc được, không tràn ngang; sau đó phục hồi JS và media emulation. Không để emulation thay đổi môi trường người dùng khi bàn giao.

Lượt kiểm tra lỗi tải audio bằng di chuyển file gặp media cache cũ, nên không ghi là đã chứng minh nhánh lỗi audio. Nhánh `error`, timeout/play rejection và retry audio được kiểm tra bằng đọc mã; phát/tạm dừng/kết thúc đã chạy thực tế. Các 404 mô hình trong log QA là lỗi được tạo có chủ đích, không phải lỗi bản bàn giao.

## Bằng chứng

- [Desktop](release-evidence/landing-v2-desktop.png)
- [Mobile](release-evidence/landing-v2-mobile.png)
- [Mô hình trên mobile](release-evidence/landing-v2-model-mobile.png)
- [Toàn trang desktop](release-evidence/landing-v2-full-desktop.png), ảnh tĩnh không thể thể hiện toàn bộ chuyển cảnh pinned.
- [Antislop audit 002](../anti-slop/audit-002-2026-10-13.md)
- [Chạy/hosting/thiết kế/tài sản](../landing/README.md)

Chưa publish. `appUrl` vẫn là local; đổi URL HTTPS thật trước khi upload. Không chứng nhận toàn ứng dụng hoặc các mục production khác từ kiểm tra landing này.
