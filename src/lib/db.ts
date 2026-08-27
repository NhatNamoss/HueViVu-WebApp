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

    CREATE INDEX IF NOT EXISTS idx_events_user ON user_events(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_events_place ON user_events(place_id, event_type);
    CREATE INDEX IF NOT EXISTS idx_feedback_trip ON trip_feedback(trip_id);
    CREATE INDEX IF NOT EXISTS idx_training_reward ON training_examples(reward DESC);
  `);

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
}

function seedData(db: Database.Database) {

  const passwordHash = bcrypt.hashSync('demo123', 10);

  db.prepare(`INSERT OR IGNORE INTO users (id, name, email, password_hash, level, total_trips, total_places)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    'user_demo001', 'HueViVu Explorer', 'demo@huevivu.app', passwordHash, 5, 12, 48
  );

  // Seed places
  // Dữ liệu mẫu (Mock data) đã được xóa để sử dụng 100% dữ liệu từ admin-collector
}
