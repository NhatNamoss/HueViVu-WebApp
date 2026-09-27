/* ================================================================
   SHOWCASE COMMERCIAL — CENTRALIZED CONFIG
   ================================================================
   Thay ảnh:  đổi đường dẫn trong `assets`
   Thay chữ:  đổi trong `scenes[n].texts`
   Chỉnh nhịp: đổi `startMs` / `durationMs` của mỗi scene
   Chỉnh màu: đổi trong `colors`
   ================================================================ */

export const colors = {
  orange: '#F47B20',
  orangeLight: '#FFAA55',
  cream: '#FFF9F0',
  creamWarm: '#FFF5EB',
  purple: '#3D1F56',
  purpleDeep: '#2A1540',
  navy: '#1A1D3B',
  dark: '#0D0A1A',
  coral: '#FF7F6B',
  gold: '#D4AF37',
  white: '#FFFFFF',
} as const;

export const assets = {
  /* ── Ảnh nền / cảnh ── */
  ngoMon: '/assets/hero.png',         // Ngọ Môn — THAY bằng ảnh Ngọ Môn rõ nét
  daiNoi: '/assets/citadel.png',      // Đại Nội
  river: '/assets/river.png',         // Sông Hương
  food: '/assets/food.png',           // Ẩm thực Huế
  /* ── Screenshot ứng dụng ── */
  screenDiscover: '/assets/screen-discover.png',
  screenTrip: '/assets/screen-trip.png',
  screenExplore: '/assets/screen-explore.png',
  /* ── Logo ── */
  logo: '/assets/logo.png',
} as const;

export type SceneConfig = {
  id: string;
  startMs: number;
  durationMs: number;
  texts: Record<string, string>;
};

export const totalDurationMs = 52_000; // ~52s

export const scenes: SceneConfig[] = [
  {
    id: 'scene1',
    startMs: 0,
    durationMs: 7000,
    texts: {
      line1: 'Huế không chỉ để ngắm.',
      line2: 'Huế để khám phá theo cách của bạn.',
    },
  },
  {
    id: 'scene2',
    startMs: 7000,
    durationMs: 7000,
    texts: {
      brand: 'HueViVu',
      tagline: 'Bạn đồng hành khám phá Huế cùng AI',
    },
  },
  {
    id: 'scene3',
    startMs: 14000,
    durationMs: 9000,
    texts: {
      title: 'Khám phá điểm đến',
    },
  },
  {
    id: 'scene4',
    startMs: 23000,
    durationMs: 10000,
    texts: {
      userPrompt: 'Mình có một ngày ở Huế, thích kiến trúc và ẩm thực.',
      title: 'AI gợi ý hành trình',
      note: 'Gợi ý minh họa — chưa phải dữ liệu thật',
    },
  },
  {
    id: 'scene5',
    startMs: 33000,
    durationMs: 10000,
    texts: {
      message: 'Một Huế rất riêng, trong từng hành trình.',
    },
  },
  {
    id: 'scene6',
    startMs: 43000,
    durationMs: 9000,
    texts: {
      tagline: 'Mở lối khám phá Huế',
      cta: 'Khám phá HueViVu',
      ctaUrl: '/',  // Đổi URL khi có link thật
    },
  },
];

/* Danh sách địa điểm minh họa cho Scene 3 */
export const samplePlaces = [
  { name: 'Ngọ Môn', desc: 'Cổng chính hoàng thành Huế', img: assets.ngoMon, tag: 'Di tích' },
  { name: 'Đại Nội', desc: 'Hoàng cung triều Nguyễn', img: assets.daiNoi, tag: 'Di sản' },
  { name: 'Sông Hương', desc: 'Dòng sông biểu tượng', img: assets.river, tag: 'Thiên nhiên' },
  { name: 'Ẩm thực Huế', desc: 'Bún bò, bánh bèo, chè Huế', img: assets.food, tag: 'Ẩm thực' },
];

/* Lịch trình AI minh họa cho Scene 4 */
export const sampleItinerary = [
  { time: '07:30', place: 'Bún bò Huế O Phượng', type: 'food' as const },
  { time: '09:00', place: 'Đại Nội — Hoàng Thành', type: 'heritage' as const },
  { time: '11:30', place: 'Lăng Tự Đức', type: 'heritage' as const },
  { time: '13:00', place: 'Cơm hến đường Trương Định', type: 'food' as const },
  { time: '15:00', place: 'Chùa Thiên Mụ', type: 'temple' as const },
  { time: '17:00', place: 'Thuyền sông Hương', type: 'nature' as const },
];
