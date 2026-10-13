# HueViVu landing, bản kế thừa

Bản mới dựa trên `../landing-page/index.html`, giữ tinh thần tím Huế, sắc hoàng hôn, thông điệp “Chạm vào linh hồn Huế” và câu chuyện hành trình. Bản đầu tiên được giữ nguyên để đối chiếu.

HTML/CSS/JavaScript thuần, không cần Next.js, cơ sở dữ liệu hoặc API để phục vụ landing. Font, ảnh, âm thanh, mô hình và thư viện 3D đều được lưu tại đây. 3D chỉ tải khi khách chọn mở; âm thanh chỉ phát khi chọn nghe. Không thu thập thông tin, không analytics hay form gửi dữ liệu.

## Chạy local

Từ gốc dự án:

```powershell
node landing/serve.mjs
```

Mở `http://127.0.0.1:4173/`. Nút sản phẩm mặc định dẫn tới app local 3000; dùng `npm run dev` để mở app chính. Có thể đặt `NEXT_DIST_DIR` riêng cho dev khi một tiến trình build khác đang chạy cùng lúc.

## Upload hosting tĩnh

1. Đổi `appUrl` trong `config.js` thành URL HTTPS đang hoạt động của HueViVu.
2. Upload `index.html`, `styles.css`, `script.js`, `config.js`, `heritage.js` và toàn bộ `assets/`, hoặc giải nén `HueViVu-landing.zip`.
3. Mở qua HTTP/HTTPS để các module 3D và tài sản được tải đúng. Không dùng mở file trực tiếp để kiểm tra 3D vì trình duyệt có giới hạn với module `file://`.
4. Thử cả link trang chủ và phần lập lịch, mô hình 3D, âm thanh sau khi upload.

Đường dẫn tài sản tương đối nên có thể phục vụ tại thư mục con. Không cần Node hoặc build trên hosting. `serve.mjs` và `check.mjs` chỉ dành cho local, không có trong gói upload.

## Kiểm tra

```powershell
node --check landing/script.js
node --check landing/heritage.js
node --check landing/serve.mjs
node landing/check.mjs
```

Xem `../docs/LANDING_PAGE_V2.md` cho so sánh bản cũ, click-through và bằng chứng. Antislop after audit nằm tại `../anti-slop/audit-002-2026-10-13.md`. Các emulation dùng cho QA đã được phục hồi trước bàn giao.

## Thiết kế và lý do

- ENERGY 3 / RHYTHM 3 / MOTION 3: mục tiêu mới là giao diện nhiều dấu ấn và hiệu ứng theo hành trình, đúng yêu cầu tiếp theo của chủ sản phẩm.
- Tím `#5b3256` kế thừa bản cũ; peach gợi hoàng hôn, dùng chữ tím đậm để nút vẫn đạt tương phản.
- Hero tối có ảnh Ngọ Môn thật để tạo không khí và đưa giao diện sản phẩm lên trước; nền giấy giữ phần giải thích dễ đọc.
- Scrim trên ảnh phục vụ tương phản chữ, không dùng gradient xanh/tím hoặc glow làm trang trí mặc định.
- Lora giữ chất serif du lịch của bản cũ; Be Vietnam Pro giúp dấu tiếng Việt rõ trong nội dung nhỏ. Font lưu local để không phụ thuộc CDN.
- Phần mở đầu hai lớp ảnh/điện thoại, manifesto dạng biên tập, story giữ hình khi cuộn, di sản toàn chiều ngang và board đổi lịch tạo nhịp theo nội dung.
- Điện thoại nghiêng khi rê chuột để nhấn việc đang xem một sản phẩm; hiệu ứng tắt trên màn hình nhỏ và reduced-motion.
- Parallax ảnh hero và chuyển scene theo chương giúp nối câu chuyện; không cuộn hộ người xem, không chặn con lăn.
- Vòng quanh điện thoại liên hệ các sở thích với một hành trình; không dùng đèn trạng thái, capsule AI hoặc loop nổi liên tục.
- Mưa chỉ chuyển động sau lựa chọn của người xem và khi board trong viewport; waveform chỉ chuyển động lúc audio thật đang phát.
- Tờ ghi chú và khung điện thoại dùng bóng để tách khỏi ảnh/nền; các khu nội dung không có bóng tràn lan.
- Góc 6–13px cho điều khiển/panel, khung điện thoại theo hình thiết bị; không dùng mọi thành phần dạng pill.
- Header cố định gọn và tiến độ đọc giữ người xem định hướng; mobile có Menu với nhãn, không giữ nav hàng desktop.
- Mobile không pin khung story; chọn chương trực tiếp, giảm độ cao/khoảng cách. Dialog 3D vừa viewport và góc nhìn ban đầu giữ toàn bộ mô hình.
- Nội dung giữ các vấn đề thật: mưa, trễ, mệt; không kế thừa số liệu, review, email đối tác hoặc khả năng GPS chưa có chứng cứ.

## Tài sản

- Ảnh Ngọ Môn: `public/assets/dainoi.jpg`, `ngomon.jpg`.
- Ảnh thực địa từ dự án: `public/uploads/IMG_1017.JPG`, `IMG_3598.JPG`, `IMG_0917.JPG`.
- Giao diện thật của bản phát triển: `docs/release-evidence/planner-clean-mobile.jpg`, `trip-clean-mobile.jpg`, được ghi nhãn trong story.
- Điện thoại ở hero và board là ví dụ minh họa tĩnh, không phải dự báo hoặc lịch trình thật, không gọi AI.
- Mô hình: `public/models/ngo-mon-preview.glb`, cùng bản dự án đang sử dụng; audio: `public/audio/ngo-mon/gate.mp3`.
- Lora và Be Vietnam Pro: SIL Open Font License trong `assets/fonts/`.
- Three.js và Meshoptimizer decoder: MIT; giấy phép lưu trong `assets/vendor/three/` và `libs/`.

Các ảnh không dùng ở bản hiện tại vẫn giữ trong thư mục tài sản từ bản local trước, không phải thành phần giao diện mới.
