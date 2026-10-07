export const TOUR_SOURCE = 'https://dsvh.gov.vn/di-tich-lich-su-va-kien-truc-nghe-thuat-quan-the-kien-truc-co-do-hue-2944';

export const TOUR_STOPS = [
  { id: 'gate', title: 'Ngọ Môn — cửa vào Hoàng thành', hint: 'Đi đến vòng sáng phía trước công trình.',
    text: 'Ngọ Môn là cổng chính phía Nam của Hoàng thành Huế, được xây dựng năm 1833 dưới triều vua Minh Mạng. Đứng ở đây, bạn hãy nhìn phần nền đài phía dưới và hệ thống lầu phía trên. Hai phần này tạo nên hình dáng đặc trưng của công trình.' },
  { id: 'pavilion', title: 'Nhìn lên lầu Ngũ Phụng', hint: 'Đi vòng sang bên hông để nhìn mái lầu.',
    text: 'Phía trên Ngọ Môn là lầu Ngũ Phụng. Đây là nơi triều đình nhà Nguyễn từng tổ chức nghi lễ. Từ góc nhìn bên hông, hãy quan sát các lớp mái và cách phần lầu gỗ đặt trên nền đài. Bạn có thể kéo màn hình lên để nhìn rõ mái.' },
  { id: 'context', title: 'Ngọ Môn trong Hoàng thành', hint: 'Đi vòng ra phía sau công trình để hoàn thành chuyến tham quan.',
    text: 'Ngọ Môn thuộc Quần thể di tích Cố đô Huế. Không gian từ Ngọ Môn đến điện Thái Hòa từng gắn với những đại lễ của triều đình. Bản tham quan này mới có mô hình Ngọ Môn. Những công trình còn lại của Đại Nội chưa được tái hiện trong cảnh ba chiều.' },
] as const;

export type TourStop = typeof TOUR_STOPS[number];
