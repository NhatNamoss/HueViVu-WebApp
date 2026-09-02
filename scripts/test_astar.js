const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data/huevivu.db');
const db = new Database(dbPath);

console.log('--- HỆ THỐNG KIỂM THỬ THUẬT TOÁN A-STAR (LỘ TRÌNH HUEVIVU) ---');
console.log('1. Khởi tạo Không gian trạng thái (State-Space)\n');

const places = db.prepare("SELECT * FROM places WHERE lat IS NOT NULL AND lng IS NOT NULL AND lat != 'NaN' AND lng != 'NaN' AND lat > 15 AND lat < 17").all();
console.log(`Đã tải ${places.length} địa điểm từ CSDL.`);

places.forEach(p => {
  p.base_score = (p.rating || 4.0) * 20; 
  p.avg_visit_min = Number(p.avg_visit_min) || 60;
});

const SPEED_KM_H = 30; // 30km/h
function distance(lat1, lng1, lat2, lng2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function travelTime(distKm) { return (distKm / SPEED_KM_H) * 60; }

function formatTime(startHour, currentMinutes) {
  const totalMinutes = startHour * 60 + Math.floor(currentMinutes);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

class PriorityQueue {
  constructor() { this.items = []; }
  push(item) {
    this.items.push(item);
    this.items.sort((a, b) => a.f_cost - b.f_cost);
  }
  pop() { return this.items.shift(); }
  isEmpty() { return this.items.length === 0; }
}

function runAStar(startLat, startLng) {
  const TIME_BUDGET = 360; // 6 tiếng
  const START_HOUR = 8;
  
  console.log(`\n======================================================`);
  console.log(`📍 BẮT ĐẦU TÌM KIẾM A* - QUỸ THỜI GIAN: ${TIME_BUDGET} phút`);
  console.log(`======================================================\n`);
  
  const pq = new PriorityQueue();
  pq.push({
    currentLat: startLat, currentLng: startLng,
    path: [], visitedIds: new Set(),
    g_cost: 0, h_cost: 0, f_cost: 0
  });

  let nodesExplored = 0;
  let bestPath = [];

  while (!pq.isEmpty()) {
    const node = pq.pop();
    nodesExplored++;

    const currentPlaceName = node.path.length > 0 ? node.path[node.path.length - 1].name : 'Khách sạn / Điểm xuất phát';
    
    console.log(`\n[🔍 LẦN DUYỆT THỨ ${nodesExplored}] Bốc Node từ Priority Queue (F nhỏ nhất)`);
    console.log(`   🔸 Đang đứng tại: ${currentPlaceName}`);
    console.log(`   🔸 Trạng thái: Thời gian đã dùng ${node.g_cost.toFixed(1)}/${TIME_BUDGET} phút (G=${node.g_cost.toFixed(1)} | H=${node.h_cost.toFixed(1)} | F=${node.f_cost.toFixed(1)})`);

    if (node.g_cost >= TIME_BUDGET * 0.85) {
      console.log(`\n[🎯 GOAL REACHED] Đã tiêu thụ đủ quỹ thời gian (${node.g_cost.toFixed(1)} phút) sau khi duyệt ${nodesExplored} nodes.`);
      bestPath = node.path;
      break;
    }

    if (nodesExplored > 1000) {
      console.log(`\n[⚠️ PRUNED] Đã chạm giới hạn an toàn (1000 nodes). Ngắt sớm.`);
      bestPath = node.path;
      break;
    }

    console.log(`   ▶️ Mở rộng Node: Tính lại Heuristic Bonus dựa trên giờ hiện tại (${formatTime(START_HOUR, node.g_cost)})...`);
    
    const candidates = places.filter(p => !node.visitedIds.has(p.id));
    
    candidates.forEach(p => {
      let dynamicBonus = 0;
      if (p.category === 'food' && node.g_cost >= 180 && node.g_cost <= 270) dynamicBonus += 800;
      else if (['heritage', 'nature', 'architecture'].includes(p.category) && (node.g_cost < 180 || node.g_cost > 270)) dynamicBonus += 300;
      else if (['cafe', 'market'].includes(p.category) && node.g_cost >= 270) dynamicBonus += 250;
      if (p.category === 'food' && (node.g_cost < 150 || node.g_cost > 300)) dynamicBonus -= 500; 

      p.match_score = p.base_score + dynamicBonus;
    });

    candidates.sort((a, b) => b.match_score - a.match_score);
    const topCandidates = candidates.slice(0, 5); 
    
    console.log(`   ▶️ Lọc được Top ${topCandidates.length} điểm có Match Score cao nhất:`);

    for (const place of topCandidates) {
      const dist = distance(node.currentLat, node.currentLng, place.lat, place.lng);
      const tTravel = travelTime(dist);
      const tVisit = place.avg_visit_min;

      const newG = node.g_cost + tTravel + tVisit;

      if (newG > TIME_BUDGET + 30) {
        console.log(`      ✂️ Prune: "${place.name}" vượt ngân sách thời gian (${newG.toFixed(1)} > ${TIME_BUDGET + 30})`);
        continue;
      }

      const penalty = tTravel > 120 ? 10000 : 0;
      if (penalty > 0) {
         console.log(`      ⛔ CẢNH BÁO: "${place.name}" quá xa. Phạt +10000 F.`);
      }

      const estRemainingTime = Math.max(0, TIME_BUDGET - newG);
      const heuristicBonus = place.match_score * 0.5; 
      const newH = estRemainingTime - heuristicBonus;
      const newF = newG + newH + penalty;

      const newVisited = new Set(node.visitedIds);
      newVisited.add(place.id);

      console.log(`      🌱 Sinh nhánh: "${place.name}" (Score: ${place.match_score})`);
      console.log(`         ↳ Đi: ${tTravel.toFixed(1)}p + Chơi: ${tVisit}p -> G: ${newG.toFixed(1)} | H: ${newH.toFixed(1)} | F: ${newF.toFixed(1)}`);

      pq.push({
        currentLat: place.lat, currentLng: place.lng,
        visitedIds: newVisited,
        path: [...node.path, { name: place.name, type: place.category, time: formatTime(START_HOUR, node.g_cost + tTravel), g: newG.toFixed(1), h: newH.toFixed(1), f: newF.toFixed(1) }],
        g_cost: newG, h_cost: newH, f_cost: newF
      });
    }
  }

  console.log('\n======================================================');
  console.log('🏆 KẾT QUẢ: LỘ TRÌNH TỐI ƯU THEO QUỸ THỜI GIAN');
  console.log('======================================================');
  bestPath.forEach((step, i) => {
    console.log(`[${step.time}] 📌 ${step.name} (${step.type})`);
    console.log(`   └─ Trạng thái lũy kế: G=${step.g} | H=${step.h} | F=${step.f}`);
  });
  console.log('======================================================\n');
}

// Chạy thử 
const HUE_CENTER_LAT = 16.4637;
const HUE_CENTER_LNG = 107.5909;

runAStar(HUE_CENTER_LAT, HUE_CENTER_LNG);
