// Reset only the legacy demo user's password in this checkout's local database.
const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

if (process.env.NODE_ENV === 'production') throw new Error('Run this only for local development.');
const settings = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
if (!/^ALLOW_LEGACY_DEMO_LOGIN=1\s*$/m.test(settings)) throw new Error('Enable ALLOW_LEGACY_DEMO_LOGIN=1 in the ignored local env file first.');

const db = new Database(path.join(process.cwd(), 'data/huevivu.db'), { fileMustExist: true });
try {
  const user = db.prepare('SELECT id, role, is_guest FROM users WHERE id = ? AND lower(email) = ?')
    .get('user_demo001', 'demo@huevivu.app');
  if (!user || user.is_guest || user.role !== 'user') throw new Error('The legacy account is absent or has an unexpected role.');
  const password = randomBytes(18).toString('base64url');
  const hash = bcrypt.hashSync(password, 12);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  console.log('Local test account: demo@huevivu.app');
  console.log('New password: ' + password);
  console.log('This password is shown once. No plaintext password was saved to the repository.');
} finally { db.close(); }
