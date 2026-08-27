const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data/huevivu.db');
const db = new Database(dbPath);

console.log('--- HỆ THỐNG KIỂM THỬ THUẬT TOÁN BFS (LỘ TRÌNH HUEVIVU) ---');
console.log('1. Khởi tạo Grid Spatial Hashing (Lưới 2D)\n');

// 1. Lấy dữ liệu và khởi tạo lưới
const places = db.prepare('SELECT * FROM places WHERE lat IS NOT NULL AND lng IS NOT NULL').all();
console.log(`Đã tải ${places.length} địa điểm từ CSDL.`);

// Giả lập lưới: Kích thước ô lưới khoảng 500mx500m
const GRID_SIZE = 0.0045; // ~500m theo toạ độ địa lý

const grid = new Map();

places.forEach(p => {
  const gridX = Math.floor(p.lng / GRID_SIZE);
  const gridY = Math.floor(p.lat / GRID_SIZE);
  const key = `${gridX},${gridY}`;
  if (!grid.has(key)) grid.set(key, []);
  
  // Tính điểm phù hợp ảo (Match Score) dựa trên rating và thời lượng thăm
  p.match_score = p.rating * 20; 
  grid.get(key).push(p);
});

console.log(`Đã phân bổ vào ${grid.size} ô lưới (Cells).`);

// 2. Thuật toán BFS Loang Tìm Đường
function runBFS(startLat, startLng, maxTimeMinutes) {
  console.log(`\n2. Bắt đầu loang BFS từ toạ độ [${startLat}, ${startLng}] với quỹ thời gian ${maxTimeMinutes} phút...`);
  
  const startX = Math.floor(startLng / GRID_SIZE);
  const startY = Math.floor(startLat / GRID_SIZE);
  
  // Hàng đợi lưu trạng thái (Queue)
  // Mỗi state = { x, y, timeUsed, path: [place_ids], currentScore }
  const queue = [{
    x: startX,
    y: startY,
    timeUsed: 0,
    path: [],
    currentScore: 0
  }];
  
  const visited = new Set();
  let bestRoute = null;

  let iterations = 0;
  
  while (queue.length > 0 && iterations < 1000) { // Giới hạn an toàn
    iterations++;
    // Lấy trạng thái hiện tại ra (Shift - BFS thông thường)
    // Trong thực tế đây sẽ là Priority Queue (A*) để lấy state có điểm cao nhất
    queue.sort((a, b) => b.currentScore - a.currentScore); 
    const current = queue.shift();
    
    // Cập nhật tuyến đường tốt nhất
    if (!bestRoute || current.currentScore > bestRoute.currentScore) {
      bestRoute = current;
    }
    
    // Lấy danh sách địa điểm tại ô lưới hiện tại
    const cellKey = `${current.x},${current.y}`;
    const placesInCell = grid.get(cellKey) || [];
    
    // Thử thăm các địa điểm trong ô này
    for (const place of placesInCell) {
      if (current.path.some(p => p.id === place.id)) continue;
      
      const timeToVisit = place.avg_visit_min || 60;
      // Cộng thời gian di chuyển giả định (15 phút)
      const moveTime = current.path.length === 0 ? 0 : 15; 
      
      if (current.timeUsed + timeToVisit + moveTime <= maxTimeMinutes) {
        // Sinh trạng thái mới
        queue.push({
          x: current.x,
          y: current.y,
          timeUsed: current.timeUsed + timeToVisit + moveTime,
          path: [...current.path, place],
          currentScore: current.currentScore + place.match_score
        });
      }
    }
    
    // Loang sang 4 hướng xung quanh (Lên, Xuống, Trái, Phải)
    const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
    for (const [dx, dy] of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const nKey = `${nx},${ny}`;
      
      // Nếu ô lân cận có dữ liệu và chưa đi qua ô đó
      if (grid.has(nKey) && !visited.has(nKey)) {
        visited.add(nKey);
        // Cộng 10 phút di chuyển giữa các ô
        if (current.timeUsed + 10 <= maxTimeMinutes) {
          queue.push({
            x: nx,
            y: ny,
            timeUsed: current.timeUsed + 10,
            path: [...current.path], // Chưa thăm điểm nào mới, chỉ di chuyển
            currentScore: current.currentScore
          });
        }
      }
    }
  }
  
  console.log(`\n3. Hoàn tất loang sau ${iterations} bước. Tìm thấy lộ trình tối ưu!`);
  return bestRoute;
}

// Chạy test giả lập
// Tọa độ giả định trung tâm Huế (gần cầu Tràng Tiền): 16.4618, 107.5861
// Quỹ thời gian: 4 tiếng (240 phút) - Buổi sáng
const route = runBFS(16.4618, 107.5861, 240);

if (route && route.path.length > 0) {
  console.log('\n--- KẾT QUẢ LỘ TRÌNH ĐỀ XUẤT ---');
  console.log(`Tổng thời gian sử dụng: ${route.timeUsed} phút / 240 phút`);
  console.log(`Điểm số phù hợp (Match Score): ${route.currentScore}\n`);
  
  route.path.forEach((p, idx) => {
    console.log(`[Điểm ${idx + 1}] ${p.name}`);
    console.log(`   - Thể loại: ${p.category.toUpperCase()}`);
    console.log(`   - Điểm số: ${p.match_score}`);
    console.log(`   - Thời gian thăm: ${p.avg_visit_min || 60} phút`);
  });
  console.log('\n--------------------------------');
} else {
  console.log('Không tìm thấy lộ trình phù hợp với quỹ thời gian.');
}
