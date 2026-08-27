const Database = require('better-sqlite3');
const path = require('path');

const srcDbPath = path.join(process.cwd(), 'admin_collector.db');
const destDbPath = path.join(process.cwd(), 'data/huevivu.db');

console.log('Starting migration...');

try {
  const srcDb = new Database(srcDbPath);
  const destDb = new Database(destDbPath);

  const places = srcDb.prepare('SELECT * FROM places').all();
  console.log(`Found ${places.length} places in admin_collector.db`);

  const insertStmt = destDb.prepare(`
    INSERT OR REPLACE INTO places 
    (id, name, category, description, address, rating, rating_count, price, duration, distance, lat, lng, img, ai_insight, hours, hours_time, hours_note, highlights, tips, indoor, best_time, crowd_level, physical_level, tags, avg_visit_min, popularity, vibe, noise_level, authenticity, walking_distance, accessibility, weather_dependent, best_time_of_day, ideal_pacing, taste_profile, dining_style, specialties)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = destDb.transaction((placesToInsert) => {
    placesToInsert.forEach((p, index) => {
      let finalImg = p.img;
      const isAI = index < 69;

      if (isAI || !finalImg) {
        // Fallback or fill image based on category
        switch (p.category) {
          case 'heritage':
          case 'temple':
            finalImg = '/assets/citadel.png';
            break;
          case 'food':
          case 'cafe':
            finalImg = '/assets/food.png';
            break;
          default:
            finalImg = '/assets/river.png';
            break;
        }
      } else {
        if (finalImg && finalImg.startsWith('[')) {
          try {
            const arr = JSON.parse(finalImg);
            finalImg = arr[0] || null;
          } catch(e) {}
        }

        if (finalImg && !finalImg.startsWith('/')) {
          if (finalImg.startsWith('uploads/')) {
            finalImg = '/' + finalImg;
          } else {
            finalImg = `/uploads/${finalImg}`;
          }
        }
      }

      insertStmt.run(
        p.id, p.name, p.category, p.description, p.address,
        p.rating || 4.5, p.rating_count || 100, p.price || 'Miễn phí', p.duration || '1-2 giờ',
        p.distance || null, p.lat || 16.4637, p.lng || 107.5909,
        finalImg, p.ai_insight || null, p.hours || null, p.hours_time || null, p.hours_note || null,
        p.highlights || '[]', p.tips || '[]', p.indoor || 0, p.best_time || 'all',
        p.crowd_level || 'medium', p.physical_level || 'easy', p.tags || '[]',
        p.avg_visit_min || 90, isAI ? (p.popularity || 0.5) : 0.9,
        p.vibe || null, p.noise_level || null, p.authenticity || null,
        p.walking_distance || null, p.accessibility || null, p.weather_dependent || null,
        p.best_time_of_day || null, p.ideal_pacing || null, p.taste_profile || null,
        p.dining_style || null, p.specialties || null
      );
    });
  });

  tx(places);
  console.log('Migration completed successfully!');

} catch (err) {
  console.error('Migration failed:', err);
}
