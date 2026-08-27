# Chiến Lược Thu Thập Dữ Liệu Lai (Hybrid Data Pipeline) cho HueViVu

> **Mục đích:** Tài liệu hướng dẫn team phát triển cách kết hợp giữa việc thu thập dữ liệu thủ công và tự động hóa qua Google Maps API + LLM để xây dựng cơ sở dữ liệu địa điểm phong phú, tối ưu cho thuật toán AI (BFS) của HueViVu.

---

## 1. Vấn Đề Hiện Tại

- **Thu thập thủ công:** Tạo ra dữ liệu chất lượng cao, đúng "chất" (vibe) của HueViVu nhưng cực kỳ tốn thời gian, khó mở rộng (scale).
- **Google Maps API:** Tự động, bao phủ rộng, nhưng dữ liệu "công nghiệp", thiếu các thuộc tính quan trọng để AI cá nhân hóa lịch trình (ví dụ: `vibe`, `noise_level`, `physical_level`, `authenticity`). Google Maps cũng thường bỏ sót các "hidden gems" (quán nhỏ, quán người địa phương hay ăn).

## 2. Mô Hình Giải Quyết: Phân Tầng Dữ Liệu (Tiered Data Strategy)

Để cân bằng giữa **Chất lượng** và **Số lượng**, chúng ta chia các địa điểm du lịch tại Huế thành 2 nhóm (Tier) với chiến lược thu thập khác nhau:

### 🌟 Tier 1: Local Gems & Điểm Nhấn (Nhập thủ công 100%)
- **Bao gồm:** Quán ăn gia truyền trong hẻm, quán cà phê cóc đặc trưng, hoặc các di tích văn hóa lịch sử mang tính biểu tượng cần độ chính xác thông tin tuyệt đối.
- **Chiến lược:** Team tập trung toàn bộ nguồn lực con người vào nhóm này. Đây là **"vũ khí bí mật"** tạo ra sự khác biệt của HueViVu so với các app du lịch đại trà khác. Càng đào sâu, lịch trình của AI càng mang lại cảm giác chân thực (Authentic).

### 🤖 Tier 2: Generic Places (Tự động hóa 100% qua Google Maps + AI)
- **Bao gồm:** Các nhà hàng lớn, quán cà phê phổ thông, khách sạn, điểm check-in đại trà.
- **Chiến lược:** Sử dụng Script tự động cào dữ liệu và dùng AI (LLM) để làm giàu (enrich) dữ liệu. (Xem chi tiết ở Phần 3).

---

## 3. Luồng Tự Động Hóa Dữ Liệu (Auto-Enrichment Pipeline)

Làm sao để có được các thuộc tính như `vibe`, `noise_level` từ Google Maps? Câu trả lời là kết hợp **Google Places API** với **LLM (ChatGPT/Gemini)**.

**Quy trình 3 bước:**

1. **Thu thập thô (Google Places API):**
   - Script gọi API lấy các thông tin cơ bản: Tên, Tọa độ (Lat/Lng), Giờ mở cửa, Rating.
   - **Quan trọng:** Lấy thêm 5 - 10 bài Reviews (đánh giá) mới nhất và chi tiết nhất của người dùng.

2. **Phân tích & Trích xuất (LLM Enrichment):**
   - Đưa chuỗi dữ liệu (đặc biệt là nội dung Reviews) vào một prompt cấu trúc sẵn.
   - *Ví dụ Prompt:* 
     > "Đọc các bài review sau của quán cà phê X. Hãy suy luận và phân loại các thuộc tính sau thành JSON: 
     > 1. `noise_level` (yên tĩnh / vừa phải / ồn ào)
     > 2. `vibe` (cổ kính / chữa lành / năng động)
     > 3. `authenticity` (thang 1-5)"
   - *Logic của AI:* Nếu review có câu *"Quán đông, nhạc xập xình hơi nhức đầu"*, AI sẽ tự động map dữ liệu thành `noise_level: "ồn ào"`, `vibe: "năng động"`.

3. **Lưu trữ vào CSDL:**
   - Script nhận JSON từ AI và chèn trực tiếp (Insert) vào CSDL SQLite/Supabase của HueViVu.
   - Admin chỉ việc lướt qua duyệt lại vào cuối tuần.

---

## 4. Tích Hợp Với Thuật Toán BFS Lên Lịch Trình

Cách dữ liệu lai này hoạt động cùng thuật toán BFS (Grid Spatial Hashing):

- **Giai đoạn 1 - Lựa chọn (AI Planner & BFS):**
  - Thuật toán BFS chạy **hoàn toàn trên dữ liệu nội bộ** của HueViVu (chứa cả Tier 1 và Tier 2 đã được enrich).
  - Thuật toán đọc các cột `vibe`, `taste_profile` để tính điểm khớp (Match Score) và loang trên lưới (Grid) để chốt danh sách các điểm đi. (Quá trình này KHÔNG tốn phí gọi Google Maps API).

- **Giai đoạn 2 - Dẫn đường (Routing):**
  - Khi lộ trình đã chốt (Ví dụ: `Khách sạn -> Quán Mụ Rớt -> Đại Nội`), App mới gọi **Google Maps Directions API** để vẽ đường đi lên bản đồ thực tế, lấy tình trạng kẹt xe và số phút di chuyển chính xác cho user.

---

## 5. Kế Hoạch Hành Động (Action Items cho Team)

1. **Dev Team:** Viết một script Node.js / Python nhỏ làm Proof of Concept (PoC) cho pipeline: `Input (Tên quán) -> Gọi Google API -> Gọi OpenAI/Gemini API -> Output (JSON data chuẩn HueViVu)`.
2. **Data Team (Content):** Dừng nhập liệu các quán cà phê/nhà hàng phổ thông. Bắt đầu lên danh sách và dồn sức đi khảo sát, thu thập thông tin các "Local Gems" (Tier 1).
3. **Product/Thiết kế:** Cập nhật UI Admin Dashboard để có nút "Auto-Fill with AI" (Nhập link Google Maps, hệ thống tự cào và điền form cho admin duyệt).
