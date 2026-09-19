/**
 * Phase 2: Seed quality data — popularity, rating, meal_type
 * Run: node scripts/seed-quality.js
 */
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'data', 'huevivu.db'));

// ── Add meal_type column if missing ─────────────────────────────────────────
try { db.exec("ALTER TABLE places ADD COLUMN meal_type TEXT"); } catch(e) {}

// ── Popularity + Rating — differentiated by actual significance ─────────────
const QUALITY = {
  // Heritage — iconic
  'dd-dt01': { pop: 1.0,  rat: 4.8, name: 'Đại Nội Huế' },
  'dd-dt02': { pop: 0.9,  rat: 4.7, name: 'Lăng Tự Đức' },
  'dd-dt03': { pop: 0.85, rat: 4.6, name: 'Lăng Khải Định' },
  'dd-dt04': { pop: 0.85, rat: 4.7, name: 'Lăng Minh Mạng' },
  'dd-dt06': { pop: 0.95, rat: 4.8, name: 'Chùa Thiên Mụ' },
  'dd-dt05': { pop: 0.8,  rat: 4.5, name: 'Cầu Trường Tiền' },
  'dd-dt07': { pop: 0.7,  rat: 4.4, name: 'Chợ Đông Ba' },
  'dd-dt09': { pop: 0.65, rat: 4.3, name: 'Đàn Nam Giao' },
  'dd-dt10': { pop: 0.6,  rat: 4.2, name: 'Phu Văn Lâu' },
  'dd-dt12': { pop: 0.55, rat: 4.3, name: 'Cung An Định' },
  'dd-dt14': { pop: 0.7,  rat: 4.5, name: 'Chùa Từ Hiếu' },
  'dd-dt16': { pop: 0.5,  rat: 4.2, name: 'Lăng Đồng Khánh' },
  'dd-dt19': { pop: 0.45, rat: 4.2, name: 'Lăng Thiệu Trị' },
  'dd-dt20': { pop: 0.5,  rat: 4.3, name: 'Lăng Gia Long' },
  'dd-dt27': { pop: 0.6,  rat: 4.4, name: 'Điện Hòn Chén' },
  'dd-dt33': { pop: 0.55, rat: 4.4, name: 'Làng hoa giấy Thanh Tiên' },
  'dd-dt35': { pop: 0.65, rat: 4.3, name: 'Hồ Thủy Tiên' },
  'dd-dt31': { pop: 0.5,  rat: 4.2, name: 'Bến thuyền Tòa Khâm' },
  // Food — famous
  'at-01':   { pop: 0.9,  rat: 4.6 }, // Bún bò Bà Tuyết
  'at-06':   { pop: 0.85, rat: 4.5 }, // O Cương Chú Điệp
  'at-19':   { pop: 0.8,  rat: 4.5 }, // Bún bò O Liễu
  'at-10':   { pop: 0.75, rat: 4.4 }, // Bánh canh cá lóc
  'at-11':   { pop: 0.7,  rat: 4.5 }, // Nhà hàng Cung Đình
  'at-13':   { pop: 0.7,  rat: 4.4 }, // Cơm Huế O Én
  'at-17':   { pop: 0.75, rat: 4.5 }, // Bánh khoái Hồng Mai
  'at-08':   { pop: 0.7,  rat: 4.4 }, // Nem lụi Tài Phú
  'at-18':   { pop: 0.65, rat: 4.3 }, // Nem lụi Ôn Mệ
  'at-20':   { pop: 0.6,  rat: 4.3 }, // Chè Thanh
  'at-21':   { pop: 0.55, rat: 4.3 }, // Chè Ông Lạc
  'at-07':   { pop: 0.65, rat: 4.4 }, // Bánh Bà Đỏ
  'at-16':   { pop: 0.6,  rat: 4.3 }, // Bánh xèo quán Mộc
  // Cafes — popular
  'cf-01':   { pop: 0.7,  rat: 4.4 }, // Cafe Mắt Biếc
  'cf-05':   { pop: 0.75, rat: 4.5 }, // Vỹ Dạ Xưa
  'cf-04':   { pop: 0.65, rat: 4.3 }, // La Gare Bistro
  'cf-12':   { pop: 0.6,  rat: 4.3 }, // Truong Tien Coffee
};

// ── Meal type for food places ───────────────────────────────────────────────
const MEALS = {
  // Breakfast — quán sáng truyền thống
  'at-01': 'breakfast', // Bún bò Bà Tuyết
  'at-06': 'breakfast', // O Cương Chú Điệp - bún bò
  'at-19': 'breakfast', // Bún bò O Liễu
  'at-10': 'breakfast', // Bánh canh cá lóc
  'at-07': 'breakfast', // Bánh Bà Đỏ
  'at-05': 'breakfast', // Quán Thúy - bánh Nam Phổ
  'at-15': 'breakfast', // Quán bánh Chi
  'bnh_canh_o_hoa_3723': 'breakfast', // Bánh Canh O Hoa
  'bn_b_o_vy__1533': 'breakfast', // Bún Bò O Vầy
  'bn_b_o_vy__2458': 'breakfast', // Bún Bò O Vầy
  // Lunch/Dinner — cơm, nhà hàng
  'at-11': 'lunch',   // Nhà hàng Cung Đình
  'at-13': 'lunch',   // Cơm Huế O Én
  'at-14': 'lunch',   // Tiệm cơm Hồi Nớ
  'at-09': 'lunch',   // Cơm chay Liên Hoa
  'at-04': 'lunch',   // Quán chay Thanh Liễu
  'qun_cht__cm_mt__4162': 'lunch', // Quán Chất (Cơm Mẹt)
  // Dinner — nướng, nem lụi
  'at-02': 'dinner',  // Hẻm Huế - Nướng than
  'at-03': 'dinner',  // Hẻm Huế - Nướng bơ
  'at-08': 'dinner',  // Nem lụi Tài Phú
  'at-18': 'dinner',  // Nem lụi Ôn Mệ
  'at-17': 'any',     // Bánh khoái Hồng Mai (any time)
  'at-16': 'any',     // Bánh xèo quán Mộc
  'qun_ng_7800': 'any', // Quán Ngỏ
  // Snacks
  'at-20': 'snack',   // Chè Thanh
  'at-21': 'snack',   // Chè Ông Lạc
  'at-22': 'snack',   // Đậu hủ cô Tâm chùa
  'ch_thch_xoa_d_liu_8071': 'snack', // Chè Thạch Xoa
  'tu_h__di_cha_thin_m__5674': 'snack', // Tàu Hũ
  'tu_h__di_cha_thin_m__2858': 'snack', // Tàu Hũ
};

// ── Apply updates ───────────────────────────────────────────────────────────
const updateQuality = db.prepare('UPDATE places SET popularity=?, rating=? WHERE id=?');
const updateMeal = db.prepare('UPDATE places SET meal_type=? WHERE id=?');

let qCount = 0, mCount = 0;

db.transaction(() => {
  for (const [id, data] of Object.entries(QUALITY)) {
    updateQuality.run(data.pop, data.rat, id);
    qCount++;
  }
  for (const [id, type] of Object.entries(MEALS)) {
    updateMeal.run(type, id);
    mCount++;
  }
  // Default all remaining food to 'any'
  db.prepare("UPDATE places SET meal_type='any' WHERE category IN ('food','market') AND meal_type IS NULL").run();
})();

console.log(`✅ Updated ${qCount} places with quality data`);
console.log(`✅ Updated ${mCount} places with meal_type`);
console.log('Done!');
