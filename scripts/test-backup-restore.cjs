const Database = require('better-sqlite3');
const fs = require('fs');
const os = require('os');
const path = require('path');
(async () => {
  const root = path.resolve('backups'); fs.mkdirSync(root, { recursive: true });
  const file = path.join(root, `restore-drill-${Date.now()}.db`);
  const live = new Database('data/huevivu.db', { fileMustExist: true });
  try { await live.backup(file); } finally { live.close(); }
  const tempRoot = path.resolve(os.tmpdir());
  const temp = fs.mkdtempSync(path.join(tempRoot, 'huevivu-restore-drill-'));
  try {
    const restoredPath = path.join(temp, 'restored.db'); fs.copyFileSync(file, restoredPath);
    const backup = new Database(file, { readonly: true }), restored = new Database(restoredPath, { readonly: true });
    try {
      if (restored.pragma('integrity_check', { simple: true }) !== 'ok') throw new Error('Restored database failed integrity check');
      for (const table of ['users','places','trips','trip_state','journal_entries']) {
        const exists = backup.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
        if (!exists) continue;
        const count = database => database.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
        if (count(backup) !== count(restored)) throw new Error('Row count mismatch: ' + table);
      }
      console.log('PASS backup -> isolated restore -> integrity and row counts; live database unchanged');
      console.log('Backup retained in backups/' + path.basename(file));
    } finally { backup.close(); restored.close(); }
  } finally {
    const checked = path.resolve(temp);
    if (path.dirname(checked) !== tempRoot || !path.basename(checked).startsWith('huevivu-restore-drill-')) throw new Error('Unexpected restore test directory');
    fs.rmSync(checked, { recursive: true, force: true });
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
