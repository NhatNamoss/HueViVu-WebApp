import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const dbPath = path.join(dbDir, 'huevivu.db');
  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  createSchema(_db);
  seedData(_db);
  return _db;
}

function addColumnIfMissing(db: Database.Database, table: string, column: string, definition: string) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`); } catch {}
}

function createSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      total_trips INTEGER DEFAULT 0,
      total_places INTEGER DEFAULT 0,
      is_guest INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      duration INTEGER NOT NULL,
      style TEXT NOT NULL,
      companion TEXT NOT NULL,
      budget INTEGER NOT NULL,
      food_prefs TEXT DEFAULT '[]',
      itinerary TEXT DEFAULT '{}',
      highlights TEXT DEFAULT '[]',
      ai_insight TEXT,
      total_cost_estimate TEXT,
      status TEXT DEFAULT 'active',
      is_shared INTEGER DEFAULT 0,
      like_count INTEGER DEFAULT 0,
      save_count INTEGER DEFAULT 0,
      clone_count INTEGER DEFAULT 0,
      ai_match_score INTEGER DEFAULT 85,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS places (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      address TEXT,
      rating REAL DEFAULT 4.5,
      rating_count INTEGER DEFAULT 100,
      price TEXT DEFAULT 'Miễn phí',
      duration TEXT DEFAULT '1-2 giờ',
      distance TEXT,
      lat REAL DEFAULT 16.4637,
      lng REAL DEFAULT 107.5909,
      img TEXT DEFAULT '/assets/citadel.png',
      ai_insight TEXT,
      hours TEXT,
      hours_time TEXT,
      hours_note TEXT,
      highlights TEXT DEFAULT '[]',
      tips TEXT DEFAULT '[]',
      indoor INTEGER DEFAULT 0,
      best_time TEXT DEFAULT 'all',
      crowd_level TEXT DEFAULT 'medium',
      physical_level TEXT DEFAULT 'easy',
      tags TEXT DEFAULT '[]',
      avg_visit_min INTEGER DEFAULT 90,
      popularity REAL DEFAULT 0.5
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      trip_id TEXT,
      user_id TEXT NOT NULL,
      time_str TEXT,
      place_name TEXT,
      content TEXT NOT NULL,
      mood TEXT DEFAULT 'happy',
      is_private INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS trip_likes (
      trip_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (trip_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS trip_saves (
      trip_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (trip_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      trip_id TEXT,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      topic TEXT NOT NULL,
      message TEXT NOT NULL,
      email TEXT,
      rating INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_events (
      id          TEXT PRIMARY KEY,
      user_id     TEXT,
      session_id  TEXT NOT NULL,
      event_type  TEXT NOT NULL,
      place_id    TEXT,
      trip_id     TEXT,
      value       REAL,
      context     TEXT DEFAULT '{}',
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trip_feedback (
      id               TEXT PRIMARY KEY,
      trip_id          TEXT NOT NULL,
      user_id          TEXT,
      session_id       TEXT,
      overall_rating   REAL,
      ai_rating        REAL,
      places_visited   TEXT DEFAULT '[]',
      places_skipped   TEXT DEFAULT '[]',
      duration_actual  INTEGER,
      notes            TEXT,
      created_at       TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS training_examples (
      id            TEXT PRIMARY KEY,
      user_profile  TEXT NOT NULL,
      context       TEXT NOT NULL,
      output        TEXT NOT NULL,
      reward        REAL DEFAULT 0.0,
      source        TEXT DEFAULT 'generated',
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      before_data TEXT,
      after_data TEXT,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS data_tasks (
      id TEXT PRIMARY KEY,
      place_id TEXT,
      task_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      assigned_to TEXT,
      created_by TEXT,
      evidence TEXT,
      resolution_note TEXT,
      due_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tours (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE,
      description TEXT,
      short_desc TEXT,
      theme TEXT DEFAULT 'classic',
      duration_hours REAL DEFAULT 8,
      price INTEGER DEFAULT 0,
      original_price INTEGER DEFAULT 0,
      cover_img TEXT DEFAULT '/assets/citadel.png',
      gallery TEXT DEFAULT '[]',
      place_ids TEXT DEFAULT '[]',
      highlights TEXT DEFAULT '[]',
      includes TEXT DEFAULT '[]',
      excludes TEXT DEFAULT '[]',
      difficulty TEXT DEFAULT 'easy',
      max_people INTEGER DEFAULT 10,
      rating REAL DEFAULT 4.8,
      review_count INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      is_featured INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tours_active ON tours(is_active, sort_order);
    CREATE INDEX IF NOT EXISTS idx_tours_featured ON tours(is_featured, is_active);

    CREATE INDEX IF NOT EXISTS idx_events_user ON user_events(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_events_place ON user_events(place_id, event_type);
    CREATE INDEX IF NOT EXISTS idx_feedback_trip ON trip_feedback(trip_id);
    CREATE INDEX IF NOT EXISTS idx_training_reward ON training_examples(reward DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_data_tasks_status ON data_tasks(status, priority, due_at);
  `);

  addColumnIfMissing(db, 'training_examples', 'image_url', 'TEXT');
  addColumnIfMissing(db, 'users', 'is_guest', 'INTEGER DEFAULT 0');
  addColumnIfMissing(db, 'users', 'role', "TEXT DEFAULT 'user'");

  addColumnIfMissing(db, 'places', 'indoor',         'INTEGER DEFAULT 0');
  addColumnIfMissing(db, 'places', 'best_time',      "TEXT DEFAULT 'all'");
  addColumnIfMissing(db, 'places', 'crowd_level',    "TEXT DEFAULT 'medium'");
  addColumnIfMissing(db, 'places', 'physical_level', "TEXT DEFAULT 'easy'");
  addColumnIfMissing(db, 'places', 'tags',           "TEXT DEFAULT '[]'");
  addColumnIfMissing(db, 'places', 'avg_visit_min',  'INTEGER DEFAULT 90');
  addColumnIfMissing(db, 'places', 'popularity',     'REAL DEFAULT 0.5');

  // Advanced columns from admin-collector
  addColumnIfMissing(db, 'places', 'vibe',              "TEXT");
  addColumnIfMissing(db, 'places', 'noise_level',       "TEXT");
  addColumnIfMissing(db, 'places', 'authenticity',      "TEXT");
  addColumnIfMissing(db, 'places', 'walking_distance',  "TEXT");
  addColumnIfMissing(db, 'places', 'accessibility',     "TEXT");
  addColumnIfMissing(db, 'places', 'weather_dependent', "TEXT");
  addColumnIfMissing(db, 'places', 'best_time_of_day',  "TEXT");
  addColumnIfMissing(db, 'places', 'ideal_pacing',      "TEXT");
  addColumnIfMissing(db, 'places', 'taste_profile',     "TEXT");
  addColumnIfMissing(db, 'places', 'dining_style',      "TEXT");
  addColumnIfMissing(db, 'places', 'specialties',       "TEXT");
  addColumnIfMissing(db, 'places', 'meal_type',         "TEXT"); // breakfast|lunch|dinner|snack|any
  addColumnIfMissing(db, 'places', 'phone',             'TEXT');
  addColumnIfMissing(db, 'places', 'website',           'TEXT');
  addColumnIfMissing(db, 'places', 'source_name',       'TEXT');
  addColumnIfMissing(db, 'places', 'source_url',        'TEXT');
  addColumnIfMissing(db, 'places', 'verification_status', "TEXT DEFAULT 'draft'");
  addColumnIfMissing(db, 'places', 'verified_by',       'TEXT');
  addColumnIfMissing(db, 'places', 'verified_at',       'TEXT');
  addColumnIfMissing(db, 'places', 'verification_notes','TEXT');
  addColumnIfMissing(db, 'places', 'opening_hours',     "TEXT DEFAULT '{}'");
  addColumnIfMissing(db, 'places', 'publication_status', "TEXT DEFAULT 'published'");
  addColumnIfMissing(db, 'places', 'reverify_after_days','INTEGER DEFAULT 90');
  addColumnIfMissing(db, 'feedback', 'place_id',         'TEXT');
  addColumnIfMissing(db, 'trips', 'start_date',         'TEXT');

  const categoryAliases: Record<string, string> = {
    'Heritage (Di sản)': 'heritage', 'Di sản': 'heritage',
    'Temple (Chùa chiền)': 'temple', 'Chùa': 'temple',
    'Culinary (Ẩm thực)': 'food', 'Ẩm thực': 'food',
    'Cafe & Chill': 'cafe', 'Nature (Thiên nhiên)': 'nature',
    'Thiên nhiên': 'nature', 'Chợ': 'market', 'Làng nghề': 'craft_village',
  };
  const normalizeCategory = db.prepare('UPDATE places SET category = ? WHERE category = ?');
  db.transaction(() => {
    for (const [legacy, canonical] of Object.entries(categoryAliases)) {
      normalizeCategory.run(canonical, legacy);
    }
  })();
}

function seedData(db: Database.Database) {

  const passwordHash = bcrypt.hashSync('demo123', 10);

  db.prepare(`INSERT OR IGNORE INTO users (id, name, email, password_hash, level, total_trips, total_places)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    'user_demo001', 'HueViVu Explorer', 'demo@huevivu.app', passwordHash, 5, 12, 48
  );
  db.prepare("UPDATE users SET role = 'admin' WHERE id = 'user_demo001'").run();

  // ── Seed combo tours ──
  const tourCount = (db.prepare('SELECT COUNT(*) as c FROM tours').get() as any).c;
  if (tourCount === 0) {
    const allPlaces = db.prepare('SELECT id, name, category FROM places').all() as any[];
    const byCategory = (cat: string) => allPlaces.filter(p => p.category.toLowerCase().includes(cat)).map(p => p.id);
    const heritage = byCategory('di sản').concat(byCategory('heritage'));
    const food = byCategory('ẩm thực').concat(byCategory('culinary'));
    const nature = byCategory('thiên nhiên').concat(byCategory('nature'));
    const cafe = byCategory('cafe').concat(byCategory('chill'));

    const tours = [
      {
        id: 'tour_hue_classic01',
        title: 'Một Ngày Kinh Thành — Di Sản & Ẩm Thực',
        slug: 'mot-ngay-kinh-thanh',
        description: 'Hành trình một ngày khám phá những di sản quan trọng nhất của Huế kết hợp thưởng thức ẩm thực đường phố chính gốc. Bắt đầu từ Chùa Thiên Mụ buổi sáng, thưởng thức bún bò giữa trưa, rồi dạo quanh các ngõ phố cổ buổi chiều.',
        short_desc: 'Di sản + ẩm thực Huế trong 1 ngày trọn vẹn',
        theme: 'classic',
        duration_hours: 8,
        price: 0,
        original_price: 0,
        cover_img: '/assets/citadel.png',
        gallery: [] as string[],
        place_ids: [...heritage.slice(0, 3), ...food.slice(0, 3)].slice(0, 6),
        highlights: ['Tham quan chùa Thiên Mụ lúc sáng sớm', 'Thưởng thức bún bò chính gốc', 'Khám phá kiến trúc triều Nguyễn', 'Chiều tản bộ khu phố cổ'],
        includes: ['Lộ trình chi tiết trên app', 'Gợi ý thời gian tối ưu', 'Bản đồ offline'],
        excludes: ['Chi phí ăn uống', 'Vé tham quan'],
        difficulty: 'easy',
        max_people: 20,
        rating: 4.9,
        review_count: 156,
        tags: ['di sản', 'ẩm thực', 'phổ biến', '1 ngày'],
        is_featured: 1,
        is_active: 1,
        sort_order: 1,
      },
      {
        id: 'tour_hue_food02',
        title: 'Food Tour Huế — Ăn Sập Huế',
        slug: 'food-tour-hue',
        description: 'Tour ẩm thực đặc biệt dành cho những ai muốn trải nghiệm đủ hương vị Huế. Từ bún bò, bánh bèo, bánh nậm đến chè Huế và cà phê muối. Mỗi điểm dừng là một câu chuyện ẩm thực, một hương vị mà chỉ Huế mới có.',
        short_desc: 'Trải nghiệm trọn vẹn ẩm thực Cố Đô',
        theme: 'food',
        duration_hours: 5,
        price: 0,
        original_price: 0,
        cover_img: '/assets/food.png',
        gallery: [] as string[],
        place_ids: [...food.slice(0, 4), ...cafe.slice(0, 2)].slice(0, 6),
        highlights: ['Bún bò Huế chính gốc', 'Bánh bèo – nậm – lọc tại quán gia truyền', 'Chè Huế truyền thống', 'Cà phê muối đặc sản'],
        includes: ['Lộ trình ẩm thực tối ưu', 'Gợi ý món nên thử tại mỗi quán', 'Bản đồ đi bộ'],
        excludes: ['Chi phí ăn uống (~150K-300K/người)'],
        difficulty: 'easy',
        max_people: 15,
        rating: 4.8,
        review_count: 203,
        tags: ['ẩm thực', 'đường phố', 'nổi bật', 'nửa ngày'],
        is_featured: 1,
        is_active: 1,
        sort_order: 2,
      },
      {
        id: 'tour_hue_zen03',
        title: 'Huế Tĩnh Lặng — Chùa Chiền & Thiên Nhiên',
        slug: 'hue-tinh-lang',
        description: 'Hành trình dành cho những tâm hồn tìm kiếm sự tĩnh lặng. Ghé thăm những ngôi chùa cổ kính giữa thiên nhiên Huế, thưởng tàu hủ nóng tại Chùa Thiên Mụ, ngắm sông Hương từ đồi Vọng Cảnh. Chậm lại, hít thở và cảm nhận.',
        short_desc: 'Tĩnh tâm giữa chùa cổ và thiên nhiên Huế',
        theme: 'spiritual',
        duration_hours: 6,
        price: 0,
        original_price: 0,
        cover_img: '/assets/river.png',
        gallery: [] as string[],
        place_ids: [...heritage.slice(0, 2), ...nature.slice(0, 2), ...cafe.slice(0, 1)].slice(0, 5),
        highlights: ['Thăm Chùa Thiên Mụ buổi sáng sớm', 'Thiền tại Chùa Từ Hiếu', 'Thưởng tàu hủ nóng ven chùa', 'Ngắm sông Hương lúc chiều tà'],
        includes: ['Lộ trình tối ưu tránh đông', 'Gợi ý thời gian vàng', 'Tips chụp ảnh đẹp'],
        excludes: ['Chi phí di chuyển', 'Phí cúng dường (tùy tâm)'],
        difficulty: 'easy',
        max_people: 10,
        rating: 4.9,
        review_count: 89,
        tags: ['tâm linh', 'thiên nhiên', 'thư giãn', 'nửa ngày'],
        is_featured: 0,
        is_active: 1,
        sort_order: 3,
      },
    ];

    const stmt = db.prepare(`INSERT OR IGNORE INTO tours
      (id, title, slug, description, short_desc, theme, duration_hours, price, original_price,
       cover_img, gallery, place_ids, highlights, includes, excludes,
       difficulty, max_people, rating, review_count, tags, is_featured, is_active, sort_order)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

    for (const t of tours) {
      stmt.run(
        t.id, t.title, t.slug, t.description, t.short_desc,
        t.theme, t.duration_hours, t.price, t.original_price,
        t.cover_img,
        JSON.stringify(t.gallery), JSON.stringify(t.place_ids),
        JSON.stringify(t.highlights), JSON.stringify(t.includes),
        JSON.stringify(t.excludes),
        t.difficulty, t.max_people, t.rating, t.review_count,
        JSON.stringify(t.tags), t.is_featured, t.is_active, t.sort_order
      );
    }
  }

  // Seed places
  // Dữ liệu mẫu (Mock data) đã được xóa để sử dụng 100% dữ liệu từ admin-collector
}
