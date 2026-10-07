// Run only on the server console after the owner registers a personal account.
const Database = require('better-sqlite3');
const email = process.argv[2]?.trim().toLowerCase();
if (!email || email === 'demo@huevivu.app') {
  console.error('Usage: npm run admin:set -- owner@example.com (registered personal account)');
  process.exit(1);
}
const db = new Database('data/huevivu.db', { fileMustExist: true });
try {
  const user = db.prepare('SELECT id, is_guest FROM users WHERE lower(email) = ?').get(email);
  if (!user || user.is_guest || user.id === 'user_demo001') throw new Error('Register a personal account first.');
  db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
  console.log('Administrator role assigned to the registered account.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { db.close(); }
