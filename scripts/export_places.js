const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'data/huevivu.db');
const db = new Database(dbPath);

const places = db.prepare("SELECT id, name, category, lat, lng, rating, avg_visit_min, popularity FROM places WHERE lat IS NOT NULL AND lng IS NOT NULL AND lat != 'NaN' AND lng != 'NaN'").all();

fs.writeFileSync(path.join(process.cwd(), 'algorithm/places.json'), JSON.stringify(places, null, 2));
console.log('Exported places.json');
