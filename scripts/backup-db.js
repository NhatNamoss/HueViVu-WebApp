const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

(async () => {
  const targetDir = path.resolve('backups');
  fs.mkdirSync(targetDir, { recursive: true });
  const target = path.join(targetDir, `huevivu-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
  const db = new Database('data/huevivu.db', { fileMustExist: true });
  try {
    await db.backup(target);
    const backup = new Database(target, { readonly: true });
    try {
      if (backup.pragma('integrity_check', { simple: true }) !== 'ok') throw new Error('Backup integrity check failed');
    } finally { backup.close(); }
    console.log(`Verified backup: ${target}`);
  } finally { db.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
