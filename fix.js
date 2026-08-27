const db = require('better-sqlite3')('data/huevivu.db');
const places = db.prepare("SELECT id, img FROM places WHERE img LIKE '/uploads/%'").all();
const stmt = db.prepare('UPDATE places SET img = ? WHERE id = ?');
for (const p of places) {
  const match = p.img.match(/^\/uploads\/\d+-(.+)$/);
  if (match) {
    const newImg = '/uploads/' + match[1];
    stmt.run(newImg, p.id);
    console.log('Updated', p.img, '->', newImg);
  }
}
