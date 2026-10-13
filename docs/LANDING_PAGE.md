# Landing page HueViVu, bản local 1, kiểm chứng 13/10/2026

Báo cáo này ghi nhận bản local trước khi chủ sản phẩm yêu cầu kế thừa trang đầu tiên. Bản đang bàn giao và gói zip đã được thay bằng [V2](LANDING_PAGE_V2.md); ảnh và kết quả dưới đây là lịch sử của bản 1.

## Kết quả

Tạo trang tĩnh độc lập tại `landing/`, dùng HTML/CSS/JS thuần, ảnh WebP và font local. Không sửa UI/API/logic sản phẩm. Gói triển khai: `landing/HueViVu-landing.zip`, gồm index, CSS, JS, config và tài sản, không gồm máy chủ preview hoặc công cụ kiểm tra.

Hướng được chủ sản phẩm chọn: đậm chất Huế, ấm, giàu hình ảnh, tập trung cả vào sản phẩm. Trang gồm thông điệp mở đầu, câu chuyện khách tự túc, sắc thái Huế, lợi ích theo giai đoạn chuyến đi, ba ví dụ đổi kế hoạch, ảnh màn hình và CTA đến sản phẩm. Ví dụ được ghi rõ là minh họa, không gọi AI hay sửa lịch thật.

## Tự động

- `npm run test:types`: PASS, exit 0.
- `node --check` cho script/config/serve/check: PASS.
- `node landing/check.mjs`: PASS, 17 tài nguyên HTML/CSS/JS/WebP/TTF trả 200 và có nội dung; ID không trùng, anchor có đích, ảnh có alt và kích thước; root/HEAD/404/405 và chặn đường dẫn cha đúng.
- Trang không có compilation hoặc bundling riêng; đây là sản phẩm buildless.

## Browser/runtime

Preview landing: `http://127.0.0.1:4173/`, HTTP 200. Khởi động app chính bằng script có sẵn `npm run dev -- --hostname 127.0.0.1`. Do có tiến trình `next build` khác đang dùng `.next`, preview ban đầu gặp thiếu manifest; đã dừng riêng dev của lượt này và khởi động với `NEXT_DIST_DIR=.next-landing-preview`. Không dừng build của người dùng, không xóa output hay dữ liệu. Mục include do Next tự thêm vào tsconfig đã được gỡ lại, không giữ thay đổi cấu hình tracked chỉ để preview. Thư mục preview được loại khỏi git bằng local exclude.

App chính sau đó trả HTTP 200 và cả hai CTA mở được trang chủ. App chính vẫn có trạng thái không lấy được thời tiết và fallback companion; log ghi `SQLITE_IOERR_TRUNCATE` ở dữ liệu local đang dùng. Đây là hạn chế của app/session hiện có, ngoài mã landing; không thay dữ liệu hoặc ghi nhận toàn app đạt production. Landing không đọc cơ sở dữ liệu và không phụ thuộc các API này.

Landing cuối cùng: logs `error/warn` rỗng. Các ảnh hiện diện sau lazy-load, font loaded. Đo 92 phần tử chữ trên nền CSS: không có failure AA, tỷ lệ nhỏ nhất 4,74:1. Ảnh UI có sẵn được xem là minh chứng của bản phát triển, không phải điều khiển landing.

| Viewport | clientWidth | scrollWidth | Phần tử tràn ngang | Vùng bấm dưới 44px |
| --- | ---: | ---: | ---: | ---: |
| 320 | 305 | 305 | 0 | 0 |
| 390 | 375 | 375 | 0 | 0 |
| 768 | 753 | 753 | 0 | 0 |
| 1024 | 1009 | 1009 | 0 | 0 |
| 1440 | 1425 | 1425 | 0 | 0 |

Browser có scrollbar 15px; so sánh scrollWidth với clientWidth. Đã nhìn thực tế hero, nội dung, demo, screenshot sản phẩm, footer và ảnh toàn trang. Mobile thay cấu trúc thay vì giữ hàng desktop.

## Click-through

| Điều khiển | Kết quả quan sát |
| --- | --- |
| Skip link, Enter | `#noi-dung` |
| Wordmark header | `#dau-trang` |
| Về HueViVu | `#cau-chuyen` |
| Cách đồng hành | `#dong-hanh` |
| Giao diện | `#giao-dien` |
| Xem bản trải nghiệm | `#trai-nghiem` |
| Xem HueViVu đồng hành | `#trai-nghiem` |
| Từ lên kế hoạch đến lúc đang đi | `#dong-hanh` |
| Menu, click/Enter | Mở nav và aria-expanded=true |
| Menu, Escape | Đóng nav, aria-expanded=false, focus trở về Menu |
| Menu rồi Tab | Focus vào Về HueViVu, outline solid |
| Link trong menu | Đến section, menu tự đóng |
| Trời đang mưa, click/Enter | Nội dung phương án ưu tiên trong nhà, aria-pressed=true |
| Tôi bị trễ giờ, click/Enter | Nội dung cân nhắc phần lịch còn lại, bỏ lựa chọn trước |
| Muốn đi chậm hơn, click/Enter | Nội dung thêm khoảng nghỉ, chỉ một nút được chọn |
| Mở HueViVu | `http://localhost:3000/`, trang Khám phá Cố đô hiển thị |
| Bắt đầu chuyến đi với HueViVu | Cùng trang app, back trở lại landing |
| Wordmark footer | `#dau-trang` |
| Về đầu trang | `#dau-trang` |
| Config URL không hợp lệ, kiểm tra tạm | Thông báo nguyên nhân, 2 CTA chuyển về trạng thái; config đã được phục hồi về local và kiểm tra lại |

Trạng thái chưa chọn xuất hiện khi tải. Không có fetch trong landing, nên không mô phỏng độ trễ/AI loading; không có form thu thập dữ liệu. Native lazy-load có alt và kích thước dành sẵn. CSS có nhánh reduced-motion, nav vẫn hiển thị nếu JavaScript không chạy và nội dung minh họa cơ bản có noscript.

## Bằng chứng và bàn giao

- [Desktop](release-evidence/landing-desktop.png)
- [Mobile](release-evidence/landing-mobile.png)
- [Toàn trang desktop](release-evidence/landing-full-desktop.png)
- [Antislop after audit, Delivery Gate và hai skill supplements](../anti-slop/audit-001-2026-10-13.md)
- [Hướng dẫn chạy và đưa lên hosting tĩnh](../landing/README.md)

Chưa publish, chưa xác nhận domain public. Thay `appUrl` trong config bằng URL HTTPS đang hoạt động trước khi đưa lên hosting. Không cần Node để phục vụ các file tĩnh trên hosting; Node chỉ được dùng cho preview local/check.
