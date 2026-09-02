const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'data/huevivu.db');
const db = new Database(dbPath);

const places = db.prepare("SELECT id, name, category, lat, lng, rating, avg_visit_min, popularity FROM places WHERE lat IS NOT NULL AND lng IS NOT NULL AND lat != 'NaN' AND lng != 'NaN' AND lat > 15 AND lat < 17").all();

places.forEach(p => {
  p.base_score = (p.rating || 4.0) * 20; 
  p.avg_visit_min = Number(p.avg_visit_min) || 60;
});

const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>A* Simulation - HueViVu</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 20px; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    h1 { margin-top: 0; font-size: 24px; color: #38bdf8; display: flex; align-items: center; justify-content: space-between; }
    button { background: #38bdf8; color: #0f172a; border: none; padding: 10px 20px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s; }
    button:hover { background: #7dd3fc; }
    button:disabled { background: #475569; cursor: not-allowed; }
    #container { display: flex; flex: 1; gap: 20px; min-height: 0; }
    .panel { background: #1e293b; border-radius: 8px; padding: 15px; overflow-y: auto; flex: 1; border: 1px solid #334155; }
    .panel h2 { font-size: 18px; margin-top: 0; border-bottom: 1px solid #334155; padding-bottom: 10px; position: sticky; top: 0; background: #1e293b; }
    .log-entry { margin-bottom: 12px; font-size: 14px; line-height: 1.5; font-family: 'Consolas', 'Courier New', monospace; border-bottom: 1px dashed #334155; padding-bottom: 8px; }
    .log-step { color: #fcd34d; font-weight: bold; }
    .log-info { color: #94a3b8; }
    .log-branch { color: #6ee7b7; padding-left: 20px; }
    .log-penalty { color: #f87171; padding-left: 20px; }
    .log-goal { color: #34d399; font-weight: bold; font-size: 16px; margin-top: 20px; }
    .pq-item { display: flex; justify-content: space-between; padding: 6px 10px; background: #0f172a; margin-bottom: 4px; border-radius: 4px; font-family: monospace; font-size: 13px; border-left: 3px solid #38bdf8; }
    .pq-item .f-score { color: #f472b6; font-weight: bold; }
  </style>
</head>
<body>

  <h1>
    <span>Khung Mô Phỏng Thuật Toán A* (State-Space)</span>
    <button id="btnStart">Chạy Mô Phỏng</button>
  </h1>

  <div id="container">
    <div class="panel" id="logPanel">
      <h2>Nhật Ký Quét (Logs)</h2>
      <div id="logs"></div>
    </div>
    
    <div class="panel" id="pqPanel" style="flex: 0.5;">
      <h2>Hàng Đợi Ưu Tiên (Priority Queue)</h2>
      <div id="pqList"></div>
    </div>
  </div>

  <script>
    const places = ${JSON.stringify(places)};
    const SPEED_KM_H = 30;

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

    class PriorityQueue {
      constructor() { this.items = []; }
      push(item) {
        this.items.push(item);
        this.items.sort((a, b) => a.f_cost - b.f_cost);
      }
      pop() { return this.items.shift(); }
      isEmpty() { return this.items.length === 0; }
      getItems() { return this.items; }
    }

    const TIME_BUDGET = 360;
    const START_HOUR = 8;
    const startLat = 16.4637;
    const startLng = 107.5909;

    const btnStart = document.getElementById('btnStart');
    const logsDiv = document.getElementById('logs');
    const pqListDiv = document.getElementById('pqList');

    let pq = new PriorityQueue();
    let nodesExplored = 0;
    let timer = null;

    function formatTime(startHour, currentMinutes) {
      const totalMinutes = startHour * 60 + Math.floor(currentMinutes);
      const h = Math.floor(totalMinutes / 60) % 24;
      const m = totalMinutes % 60;
      return \`\${h.toString().padStart(2, '0')}:\${m.toString().padStart(2, '0')}\`;
    }

    function addLog(html) {
      const div = document.createElement('div');
      div.className = 'log-entry';
      div.innerHTML = html;
      logsDiv.appendChild(div);
      logsDiv.parentElement.scrollTop = logsDiv.parentElement.scrollHeight;
    }

    function renderPQ() {
      pqListDiv.innerHTML = '';
      const items = pq.getItems().slice(0, 15);
      items.forEach((item, idx) => {
        const name = item.path.length > 0 ? item.path[item.path.length-1].name : 'Khách sạn';
        pqListDiv.innerHTML += \`
          <div class="pq-item">
            <span>\${idx + 1}. \${name} (\${formatTime(START_HOUR, item.g_cost)})</span>
            <span class="f-score">F=\${item.f_cost.toFixed(1)}</span>
          </div>
        \`;
      });
      if (pq.getItems().length > 15) {
        pqListDiv.innerHTML += \`<div class="pq-item" style="justify-content: center; color:#64748b;">+ \${pq.getItems().length - 15} nhánh khác...</div>\`;
      }
    }

    function step() {
      if (pq.isEmpty()) {
        addLog(\`<div class="log-goal">❌ Hàng đợi rỗng. Không tìm thấy đường đi!</div>\`);
        clearInterval(timer);
        btnStart.disabled = false;
        return;
      }

      const node = pq.pop();
      nodesExplored++;
      renderPQ();

      const currentPlaceName = node.path.length > 0 ? node.path[node.path.length - 1].name : 'Điểm xuất phát';
      
      let html = \`<div class="log-step">🔍 [DUYỆT NODE #\${nodesExplored}] Bốc ra: \${currentPlaceName}</div>\`;
      html += \`<div class="log-info">Đã dùng \${node.g_cost.toFixed(1)}/\${TIME_BUDGET} phút | G=\${node.g_cost.toFixed(1)} | H=\${node.h_cost.toFixed(1)} | F=\${node.f_cost.toFixed(1)}</div>\`;

      if (node.g_cost >= TIME_BUDGET * 0.85) {
        html += \`<div class="log-goal">🎯 GOAL REACHED! Đã tiêu thụ đủ quỹ thời gian!</div>\`;
        html += \`<div class="log-branch" style="margin-top:10px;">🏆 LỘ TRÌNH TỐI ƯU:</div>\`;
        node.path.forEach((step, i) => {
          html += \`<div class="log-branch">[\${step.time}] \${step.name} (F=\${step.f})</div>\`;
        });
        addLog(html);
        clearInterval(timer);
        btnStart.disabled = false;
        return;
      }

      if (nodesExplored > 1000) {
        addLog(html + \`<div class="log-penalty">⚠️ PRUNED: Chạm mốc 1000 nodes! Ngắt.</div>\`);
        clearInterval(timer);
        btnStart.disabled = false;
        return;
      }

      html += \`<div class="log-info">▶️ Điều hướng nhánh mới (Heuristic thay đổi theo thời gian hiện tại \${formatTime(START_HOUR, node.g_cost)})</div>\`;
      
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
      
      html += \`<div class="log-info">Lọc được Top 5 điểm có Match Score cao nhất:</div>\`;

      for (const place of topCandidates) {
        const dist = distance(node.currentLat, node.currentLng, place.lat, place.lng);
        const tTravel = travelTime(dist);
        const tVisit = place.avg_visit_min;

        const newG = node.g_cost + tTravel + tVisit;

        if (newG > TIME_BUDGET + 30) {
          html += \`<div class="log-penalty">✂️ Prune: \${place.name} vượt quá ngân sách (\${newG.toFixed(0)} > \${TIME_BUDGET + 30})</div>\`;
          continue;
        }

        const penalty = tTravel > 120 ? 10000 : 0;
        if (penalty > 0) {
           html += \`<div class="log-penalty">⛔ Phạt \${place.name}: Cách quá xa -> +10000 F-cost</div>\`;
        }

        const estRemainingTime = Math.max(0, TIME_BUDGET - newG);
        const heuristicBonus = place.match_score * 0.5; 
        const newH = estRemainingTime - heuristicBonus;
        const newF = newG + newH + penalty;

        const newVisited = new Set(node.visitedIds);
        newVisited.add(place.id);

        html += \`<div class="log-branch">🌱 Nạp vào Hàng Đợi: \${place.name} (G:\${newG.toFixed(1)} + H:\${newH.toFixed(1)} = <b>F:\${newF.toFixed(1)}</b>)</div>\`;

        pq.push({
          currentLat: place.lat, currentLng: place.lng,
          visitedIds: newVisited,
          path: [...node.path, { name: place.name, type: place.category, time: formatTime(START_HOUR, node.g_cost + tTravel), g: newG.toFixed(1), h: newH.toFixed(1), f: newF.toFixed(1) }],
          g_cost: newG, h_cost: newH, f_cost: newF
        });
      }

      addLog(html);
      renderPQ();
    }

    btnStart.onclick = () => {
      btnStart.disabled = true;
      logsDiv.innerHTML = '';
      pq = new PriorityQueue();
      nodesExplored = 0;
      
      pq.push({
        currentLat: startLat, currentLng: startLng,
        path: [], visitedIds: new Set(),
        g_cost: 0, h_cost: 0, f_cost: 0
      });
      renderPQ();
      
      addLog('<div class="log-step">Chuẩn bị mô phỏng A* (Speed: 1 node / 1.5s)...</div>');
      timer = setInterval(step, 1500);
    };
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(process.cwd(), 'algorithm/simulation.html'), htmlContent);
console.log('Created simulation.html');
