const Database = require('better-sqlite3');
const path = require('path');

const srcDbPath = path.join(process.cwd(), '../HueViVu/data/admin_collector.db');
const destDbPath = path.join(process.cwd(), 'data/huevivu.db');

try {
  const srcDb = new Database(srcDbPath);
  const destDb = new Database(destDbPath);

  const places = srcDb.prepare('SELECT * FROM places').all();
  console.log(`Found ${places.length} places in admin_collector.db`);

  if (places.length > 0) {
    const keys = Object.keys(places[0]);
    console.log('Columns in src places:', keys.join(', '));
    
    // show first place to see missing values
    console.log('Row 1:', places[0]);
  }

} catch (err) {
  console.error(err);
}
