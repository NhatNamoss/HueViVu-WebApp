# Thiết kế Thuật toán Đề xuất Lộ trình (State-Space A* Search trên Lưới 2D)

> [!NOTE]
> Tài liệu này mô tả kiến trúc cốt lõi của thuật toán gợi ý lộ trình du lịch HueViVu. Thuật toán được thiết kế dựa trên thuật toán tìm kiếm đường đi tối ưu **A-Star (A*) kết hợp Không gian Trạng thái (State-Space)** trên bản đồ Lưới 2D (Grid Spatial Hashing).

## 1. Ý tưởng cốt lõi (Core Concept)

Thay vì duyệt qua toàn bộ các địa điểm trong thành phố bằng các thuật toán tính khoảng cách truyền thống tốn kém, ta mô hình hóa không gian thành một **Lưới 2D (Grid)**. 
Bài toán tìm kiếm lộ trình du lịch thực tế là một bài toán trên **Đồ thị có trọng số (Weighted Graph)**, nơi mỗi nhánh di chuyển có "chi phí" thực tế như khoảng cách, thời gian di chuyển, kẹt xe.

Do đó, thuật toán **A* (A-Star)** được sử dụng thay cho BFS truyền thống. A* tìm đường đi ngắn nhất (hoặc tốt nhất) một cách thông minh nhờ sử dụng **Hàm Heuristic** để "nhắm thẳng" về phía đích đến, giảm thiểu đáng kể số lượng tổ hợp trạng thái cần duyệt.

## 2. Các bước tinh chỉnh & Bổ sung

### 2.1. Mô hình hóa Không gian (Grid Spatial Hashing)
- Chia bản đồ thành các ô (Cell). Đối với đặc thù du lịch ở Huế, kích thước ô lý tưởng là **400m x 400m hoặc 500m x 500m**.
- Mỗi ô chứa một danh sách các POI (Points of Interest - Điểm tham quan, ăn uống) đã được phân loại. 
- Giúp thuật toán chỉ cần quan tâm đến các điểm trong ô hiện tại và ô lân cận thay vì rà quét toàn bộ bản đồ.

### 2.2. Giới hạn Không gian (Search Corridor)
- **Vấn đề:** A* dù tối ưu nhưng nếu thả rông trên một bản đồ quá rộng vẫn gây lãng phí bộ nhớ.
- **Giải pháp:** Tạo một "corridor" (khu vực khoanh vùng dạng hình chữ nhật hoặc elip) bao quanh điểm Start (Sân bay/Khách sạn) và End. 
- Chỉ tải các địa điểm nằm trong khu vực này vào thuật toán A* để tiết kiệm tài nguyên.

### 2.3. Hàng đợi Ưu tiên (Priority Queue) & Hàm Đánh Giá A*
Mỗi bước duyệt (Node) trong thuật toán lưu trữ một **Trạng thái (State)**: 
`State = [Tọa độ ô hiện tại, Danh sách điểm đã đi, Tổng thời gian đã dùng]`

Thay vì dùng Queue thông thường như BFS, A* sử dụng một `Priority Queue` sắp xếp các Node dựa trên hàm đánh giá:
**`f(n) = g(n) + h(n)`**

- **`g(n)` (Chi phí thực tế Cost so far):** Là tổng thời gian di chuyển từ điểm Start đến Node hiện tại `n`, bao gồm thời gian đi đường thực tế (tính đến kẹt xe) và thời gian tham quan tại các POI đã ghé thăm.
- **`h(n)` (Hàm Heuristic):** Ước tính thời gian ngắn nhất (hoặc tốt nhất) từ Node `n` đến điểm đích `End`.
  - Có thể dùng khoảng cách đường chim bay chia cho tốc độ di chuyển tối đa.
  - **Heuristic Bonus:** Hệ thống sẽ cộng thêm "Điểm Thưởng" (Làm giảm `h(n)`) nếu ô tiếp theo có chứa địa điểm cực kỳ khớp với Vibe/Sở thích của người dùng, giúp A* ưu tiên "bẻ lái" qua khu vực đó.

### 2.4. Rẽ nhánh và Cắt tỉa (Pruning)
- Trước khi đưa một nhánh mới vào `Priority Queue`, thuật toán sẽ kiểm tra: `(Tổng thời gian đã đi + Thời gian tham quan ô mới + h(n)) > Quỹ thời gian trong ngày?`
  - Nếu **Có**: Hủy nhánh này (Không đi tiếp) ngay lập tức.
  - Nếu **Không**: Đưa vào Queue.
Nhờ hàm Heuristic, A* cắt tỉa các nhánh đi vào "ngõ cụt" hoặc đi sai hướng nhanh hơn gấp nhiều lần so với BFS.

---

## 3. Luồng thực thi hoàn chỉnh (Execution Flow)

1. **Tiền Xử lý (Pre-filtering):**
   - Query từ cơ sở dữ liệu các POI thỏa mãn tiêu chí cứng (Budget, Vibe, Loại hình...).
   - Lọc tiếp các điểm nằm trong "Search Corridor" giữa Start và End. Chỉ những điểm "chắc chắn phù hợp" mới được phép trải lên ma trận lưới.
2. **Khởi tạo Lưới (Grid Init):**
   - Phân bổ các điểm vừa lọc vào các Ô (Cell) trên lưới 2D.
   - Tính toán trước `match_score` cho mỗi POI để làm dữ liệu cho hàm Heuristic.
3. **Quá trình Tìm kiếm (State-Space A*):**
   - Khởi tạo `Priority Queue` với Node bắt đầu (Start).
   - Lấy Node có `f(n)` nhỏ nhất ra khỏi Queue.
   - Bắt đầu duyệt sang các ô xung quanh (Lên, Xuống, Trái, Phải).
   - Cắt tỉa nhánh sai, cập nhật hàm `f(n) = g(n) + h(n)` và đẩy các Node hợp lệ vào Queue.
4. **Đến Đích (Goal Reached):**
   - Thuật toán dừng lại và trả về lộ trình khi lấy ra được Node mục tiêu (End) từ Queue, hoặc khi Queue rỗng (Không tìm được đường trong quỹ thời gian).
5. **Đánh giá & Trả kết quả (Scoring):**
   - Báo cáo kết quả và trả về Top 3 lộ trình tốt nhất đưa lên giao diện người dùng (UI).

---

## 4. Kiến trúc Đa ngày (Multi-Day) & Điểm Neo (Anchor Points)

Để xử lý bài toán lịch trình nhiều ngày với các điểm xuất phát/kết thúc thay đổi (Ví dụ: Ngày 1 từ Sân bay -> Khách sạn, Ngày 2 từ Khách sạn -> Ga tàu), hệ thống sử dụng chiến lược **Chia để trị (Divide and Conquer)** thông qua các **Key Locations (Anchor Points)**.

### 4.1. Khái niệm Anchor Points (Điểm Neo)
Điểm neo là các địa điểm mang tính "bắt buộc" và cố định về thời gian/không gian trong lịch trình của khách:
- Sân bay (Lúc đến/đi)
- Khách sạn (Check-in/Check-out/Ngủ qua đêm)
- Nhà ga, Bến xe...

### 4.2. Thuật toán Chia chặng (Segmentation)
Thay vì chạy thuật toán tìm kiếm cho toàn bộ chuyến đi 3 ngày (gây bùng nổ không gian trạng thái cực lớn), thuật toán sẽ cắt nhỏ chuyến đi:
1. **Xác định các Khung thời gian (Time Envelopes):** Dựa vào các Anchor Points, chuyến đi được cắt thành các chặng nhỏ.
   - *Chặng 1 (Sáng Ngày 1):* `Start (Sân bay 9:00)` ➔ `End (Khách sạn 14:00)`.
   - *Chặng 2 (Chiều Ngày 1):* `Start (Khách sạn 15:00)` ➔ `End (Khách sạn 21:00)`.
2. **Gom cụm địa lý (Clustering):** Nhóm các địa điểm POI thành từng cụm. Phân bổ các cụm này vào các Chặng có quỹ đạo đường đi phù hợp.
3. **Thực thi A* Độc lập:** Chạy thuật toán A* cho *từng chặng riêng biệt*. Vì mỗi chặng giờ đây chỉ còn 3-5 POI và quỹ thời gian ngắn, A* sẽ chạy với tốc độ cực nhanh (millisecond) và không bị Memory Leak.

### 4.3. Tinh chỉnh qua Hội thoại (Conversational Refinement)
Việc sử dụng Điểm Neo cho phép AI điều chỉnh lịch trình "on-the-fly".
- *Ví dụ:* User chat *"Chiều mai 5h mình phải ra bến xe rồi"*. Ngay lập tức, AI cập nhật `Anchor_End` của Ngày 2 thành "Bến Xe lúc 17:00".
- Thuật toán A* chỉ cần chạy lại đúng chặng của Chiều Ngày 2 để vẽ đường về bến xe, giữ nguyên vẹn và không cần tính toán lại các chặng của ngày khác.
