# SỔ ĐĂNG KÝ COMPONENT (COMPONENTS REGISTRY)

> **MỤC ĐÍCH**: Ngăn chặn việc AI hoặc lập trình viên tạo trùng lặp component. 
> **QUY TẮC**: 
> 1. Tránh tạo component mới nếu đã có ở đây. 
> 2. KHI TẠO COMPONENT MỚI DÙNG CHUNG, BẮT BUỘC THÊM TÊN VÀ ĐƯỜNG DẪN VÀO FILE NÀY.

## 1. UI Components (Thành phần giao diện cơ bản)
*Thư mục: `src/components/ui/`*
- `<PlaceCard />` (`src/components/ui/PlaceCard.tsx`) - Thẻ hiển thị địa điểm (hỗ trợ dạng lưới và cuộn ngang, tự fallback ảnh lỗi).
- `<CategoryFilter />` (`src/components/ui/CategoryFilter.tsx`) - Thanh lọc danh mục theo chuẩn giao diện nổi.
- `<WeatherWidget />` (`src/components/ui/WeatherWidget.tsx`) - Khối hiển thị thông tin thời tiết.

## 2. Layout Components (Thành phần bộ khung)
*Thư mục: `src/components/layout/`*
- `<BottomNav />` (`src/components/layout/BottomNav.tsx`) - Thanh điều hướng dưới cùng.

## 3. Core Logic & Utility (Tiện ích & API)
*Thư mục: `src/lib/`*
- Lịch trình AI (`src/lib/ai.ts`): Có hàm `generateTrip` tạo lịch trình cá nhân hóa.

---
*(AI Note: Hãy cập nhật file này tự động khi bạn tạo ra một Component dùng chung mới)*
