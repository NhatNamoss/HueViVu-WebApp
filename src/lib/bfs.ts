import { getDb } from './db';

const GRID_SIZE = 0.0045; // ~500m

function distance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export function generateBfsTrip({ duration, styles, companion, budget, food }: {
  duration: number; styles: string | string[];
  companion: string; budget: number; food?: string[];
}) {
  const db = getDb();
  const allPlaces = db.prepare('SELECT * FROM places WHERE lat IS NOT NULL AND lng IS NOT NULL').all() as any[];
  
  // Create grid
  const grid = new Map<string, any[]>();
  
  allPlaces.forEach(p => {
    const gridX = Math.floor(p.lng / GRID_SIZE);
    const gridY = Math.floor(p.lat / GRID_SIZE);
    const key = `${gridX},${gridY}`;
    if (!grid.has(key)) grid.set(key, []);
    
    // Base match score from popularity/rating
    p.match_score = (p.popularity * 50) + (p.rating * 10);
    
    // Boost score if category matches styles
    const stylesArr = Array.isArray(styles) ? styles : [styles].filter(Boolean);
    if (stylesArr.includes(p.category)) {
      p.match_score += 30;
    }
    
    grid.get(key)!.push(p);
  });

  const dur = Number(duration) || 2;
  const days = [];
  const highlights: string[] = [];
  const usedPlaceIds = new Set<string>();

  // Center of Hue as starting point for Day 1
  let currentLat = 16.4637;
  let currentLng = 107.5909;

  for (let d = 1; d <= dur; d++) {
    const dayActivities = [];
    
    // Schedule template for a day
    const slots = [
      { time: '08:00', type: ['heritage', 'temple', 'nature'], label: 'Tham quan sáng' },
      { time: '11:30', type: ['food', 'market'], label: 'Ăn trưa' },
      { time: '14:00', type: ['cafe', 'market', 'heritage'], label: 'Trải nghiệm chiều' },
      { time: '18:30', type: ['food'], label: 'Ăn tối' },
    ];

    for (const slot of slots) {
      let bestPlace = null;
      let maxScore = -Infinity;
      
      const startX = Math.floor(currentLng / GRID_SIZE);
      const startY = Math.floor(currentLat / GRID_SIZE);
      
      const queue = [{ x: startX, y: startY, radius: 0 }];
      const visited = new Set<string>();
      
      while (queue.length > 0 && !bestPlace && queue[0].radius < 10) {
        queue.sort((a, b) => a.radius - b.radius);
        const current = queue.shift()!;
        
        const cellKey = `${current.x},${current.y}`;
        if (!visited.has(cellKey)) {
          visited.add(cellKey);
          
          const cellPlaces = grid.get(cellKey) || [];
          for (const place of cellPlaces) {
            if (usedPlaceIds.has(place.id)) continue;
            if (!slot.type.includes(place.category)) continue;
            
            const dist = distance(currentLat, currentLng, place.lat, place.lng);
            const score = place.match_score - (dist * 5); 
            
            if (score > maxScore) {
              maxScore = score;
              bestPlace = place;
            }
          }
          
          if (!bestPlace) {
            const dirs = [[0,1], [0,-1], [1,0], [-1,0], [1,1], [-1,-1], [1,-1], [-1,1]];
            for (const [dx, dy] of dirs) {
              const nx = current.x + dx;
              const ny = current.y + dy;
              if (!visited.has(`${nx},${ny}`)) {
                queue.push({ x: nx, y: ny, radius: current.radius + 1 });
              }
            }
          }
        }
      }

      if (!bestPlace) {
        const fallbackPlaces = allPlaces.filter(p => !usedPlaceIds.has(p.id) && slot.type.includes(p.category));
        fallbackPlaces.sort((a, b) => b.match_score - a.match_score);
        if (fallbackPlaces.length > 0) {
          bestPlace = fallbackPlaces[0];
        } else {
          const reuse = allPlaces.filter(p => slot.type.includes(p.category)).sort((a, b) => b.match_score - a.match_score);
          if (reuse.length > 0) bestPlace = reuse[0];
        }
      }

      if (bestPlace) {
        usedPlaceIds.add(bestPlace.id);
        if (!highlights.includes(bestPlace.name) && slot.type.includes('heritage')) {
          highlights.push(bestPlace.name);
        }
        
        currentLat = bestPlace.lat;
        currentLng = bestPlace.lng;
        
        dayActivities.push({
          time: slot.time,
          name: bestPlace.name,
          type: bestPlace.category,
          duration: `${bestPlace.avg_visit_min} phút`,
          cost: bestPlace.price,
          description: bestPlace.description || slot.label,
          ai_tip: 'Khoảng cách tối ưu bằng BFS từ địa điểm trước.',
          location: bestPlace.address
        });
      }
    }

    days.push({
      day: d,
      theme: d === 1 ? 'Khám phá văn hóa nổi bật' : `Ngày ${d}: Nhịp sống Cố đô`,
      day_tip: 'Chú ý thời tiết Huế thường thay đổi vào buổi chiều.',
      activities: dayActivities
    });
  }

  const costEstimate = budget ? `${Number(budget).toLocaleString('vi-VN')} VNĐ` : 'Dự kiến 2,000,000 VNĐ';

  return {
    title: `Lịch trình Cố đô ${dur} ngày tối ưu bằng BFS`,
    summary: `Chuyến đi được lập trình bằng thuật toán loang BFS thông minh, tự động tính toán lộ trình ngắn nhất giữa các điểm đến yêu thích.`,
    total_cost_estimate: costEstimate,
    highlights: highlights.slice(0, 4),
    ai_insight: '✨ Lịch trình được sinh ra từ dữ liệu thật trong CSDL bằng thuật toán BFS, tối ưu quãng đường di chuyển.',
    days,
  };
}
