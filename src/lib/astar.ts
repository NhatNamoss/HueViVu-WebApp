import { getDb } from './db';

const GRID_SIZE = 0.0045; // ~500m
const SPEED_KM_H = 30; // Giả sử tốc độ di chuyển trung bình trong thành phố là 30km/h

function distance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Tính thời gian di chuyển (phút)
function travelTime(distKm: number) {
  return (distKm / SPEED_KM_H) * 60;
}

// Hàng đợi ưu tiên (Min-Heap)
class PriorityQueue<T> {
  private items: T[];
  private compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number) {
    this.items = [];
    this.compare = compare;
  }

  push(item: T) {
    this.items.push(item);
    this.items.sort(this.compare); // Đơn giản hóa, dùng sort thay vì cài đặt heap chuẩn
  }

  pop(): T | undefined {
    return this.items.shift();
  }

  isEmpty() {
    return this.items.length === 0;
  }
}

type AStarNode = {
  currentLat: number;
  currentLng: number;
  visitedIds: Set<string>;
  path: any[];
  g_cost: number; // Tổng thời gian đã đi (di chuyển + tham quan)
  h_cost: number; // Điểm Heuristic (ước tính thời gian - bonus)
  f_cost: number; // g + h
};

function formatTime(startHour: number, currentMinutes: number) {
  const totalMinutes = startHour * 60 + Math.floor(currentMinutes);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function generateAstarTrip({ duration, styles, companion, budget, food }: {
  duration: number; styles: string | string[];
  companion: string; budget: number; food?: string[];
}) {
  const db = getDb();
  const allPlaces = db.prepare("SELECT * FROM places WHERE lat IS NOT NULL AND lng IS NOT NULL AND lat != 'NaN' AND lng != 'NaN' AND lat > 15 AND lat < 17").all() as any[];
  
  allPlaces.forEach(p => {
    p.base_score = (p.popularity * 50) + (p.rating * 10);
    const stylesArr = Array.isArray(styles) ? styles : [styles].filter(Boolean);
    if (stylesArr.includes(p.category)) p.base_score += 30;
    p.avg_visit_min = Number(p.avg_visit_min) || 60;
  });

  const dur = Number(duration) || 2;
  const days = [];
  const highlights: string[] = [];
  const globalVisitedIds = new Set<string>();

  // Điểm neo (Anchor) bắt đầu: Trung tâm Huế
  let currentLat = 16.4637;
  let currentLng = 107.5909;

  const TIME_BUDGET = 360; // Quỹ thời gian mỗi ngày (6 tiếng di chuyển + tham quan)
  const START_HOUR = 8; // Bắt đầu lúc 08:00 sáng

  for (let d = 1; d <= dur; d++) {
    const pq = new PriorityQueue<AStarNode>((a, b) => a.f_cost - b.f_cost);
    
    pq.push({
      currentLat,
      currentLng,
      visitedIds: new Set(globalVisitedIds),
      path: [],
      g_cost: 0,
      h_cost: 0,
      f_cost: 0
    });

    let bestDayPath: any[] = [];
    let stateVisited = 0;

    while (!pq.isEmpty()) {
      const node = pq.pop()!;
      stateVisited++;

      // GOAL: Nếu đã dùng hết khoảng 85% - 100% quỹ thời gian
      if (node.g_cost >= TIME_BUDGET * 0.85) {
        bestDayPath = node.path;
        break; // Tới đích
      }

      // Giới hạn tìm kiếm tránh bùng nổ tổ hợp (Pruning safety)
      if (stateVisited > 1000) {
        bestDayPath = node.path;
        break;
      }

      const candidates = allPlaces.filter(p => !node.visitedIds.has(p.id));
      
      // Dynamic Category Flow (Bẻ lái Heuristic tự động)
      candidates.forEach(p => {
        let dynamicBonus = 0;
        
        // Từ phút 180 đến 270 (tương đương 11:00 - 12:30), ưu tiên Food
        if (p.category === 'food' && node.g_cost >= 180 && node.g_cost <= 270) {
          dynamicBonus += 800;
        }
        // Trước 180 phút hoặc sau 270 phút, ưu tiên Heritage/Nature
        else if (['heritage', 'nature', 'architecture', 'temple'].includes(p.category) && (node.g_cost < 180 || node.g_cost > 270)) {
          dynamicBonus += 300;
        }
        // Gần cuối ngày ưu tiên Cafe / Market
        else if (['cafe', 'market'].includes(p.category) && node.g_cost >= 270) {
          dynamicBonus += 250;
        }
        
        // Food ngoài giờ ăn thì không nên đi
        if (p.category === 'food' && (node.g_cost < 150 || node.g_cost > 300)) {
          dynamicBonus -= 500; 
        }

        p.match_score = p.base_score + dynamicBonus;
      });

      // Chỉ lấy Top 8 điểm có match_score cao nhất để đẻ nhánh (Branching factor = 8)
      candidates.sort((a, b) => b.match_score - a.match_score);
      const topCandidates = candidates.slice(0, 8);

      for (const place of topCandidates) {
        const distKm = distance(node.currentLat, node.currentLng, place.lat, place.lng);
        const tTravel = travelTime(distKm);
        const tVisit = place.avg_visit_min;
        
        // Tính g(n): Tổng chi phí thời gian từ gốc
        const newG = node.g_cost + tTravel + tVisit;

        // Pruning: Nếu vượt quá ngân sách quá nhiều (cho phép lố 30 phút)
        if (newG > TIME_BUDGET + 30) {
          continue; 
        }

        // Penalty nếu điểm này quá xa
        const penalty = tTravel > 120 ? 10000 : 0; 

        // Tính h(n): Heuristic
        const estRemainingTime = Math.max(0, TIME_BUDGET - newG);
        const heuristicBonus = place.match_score * 0.5; // Thưởng điểm
        const newH = estRemainingTime - heuristicBonus;

        const newF = newG + newH + penalty;

        const newVisited = new Set(node.visitedIds);
        newVisited.add(place.id);
        
        const activity = {
          time: formatTime(START_HOUR, node.g_cost + tTravel),
          name: place.name,
          type: place.category,
          duration: `${tVisit} phút`,
          cost: place.price,
          description: place.description || 'Trải nghiệm văn hóa Cố đô',
          ai_tip: `Phù hợp với phong cách của bạn (điểm phù hợp: ${place.match_score})`,
          location: place.address,
          lat: place.lat,
          lng: place.lng,
          place_id: place.id,
        };

        pq.push({
          currentLat: place.lat,
          currentLng: place.lng,
          visitedIds: newVisited,
          path: [...node.path, activity],
          g_cost: newG,
          h_cost: newH,
          f_cost: newF
        });
      }
    }

    // Cập nhật state chung
    const dayActivities = bestDayPath || [];
    if (dayActivities.length > 0) {
      const lastPlace = allPlaces.find(p => p.name === dayActivities[dayActivities.length - 1].name);
      if (lastPlace) {
        currentLat = lastPlace.lat;
        currentLng = lastPlace.lng;
      }
      
      dayActivities.forEach(act => {
        const p = allPlaces.find(x => x.name === act.name);
        if (p) {
          globalVisitedIds.add(p.id);
          if (!highlights.includes(p.name) && ['heritage', 'nature'].includes(p.category)) {
            highlights.push(p.name);
          }
        }
      });
    }

    days.push({
      day: d,
      theme: d === 1 ? 'Khám phá văn hóa nổi bật' : `Ngày ${d}: Nhịp sống Cố đô`,
      day_tip: d === 1 ? 'Bắt đầu từ trung tâm, di chuyển theo vòng tròn để tiết kiệm thời gian.' : `Ngày ${d}: Khám phá thêm những góc nhỏ của Huế.`,
      activities: dayActivities
    });
  }

  const costEstimate = budget ? `${Number(budget).toLocaleString('vi-VN')} VNĐ` : 'Dự kiến 2,000,000 VNĐ';

  const COMPANION_LABELS: Record<string, string> = {
    solo: 'một mình', couple: 'cặp đôi', family: 'gia đình', friends: 'nhóm bạn',
  };
  const compLabel = COMPANION_LABELS[companion] || companion;
  const titleThemes = [
    `${dur} ngày khám phá Cố đô Huế`,
    `Hành trình ${dur} ngày tại Huế`,
    `Huế ${dur} ngày — Lịch trình cá nhân`,
  ];
  const titleStr = titleThemes[Math.floor(Math.random() * titleThemes.length)];

  return {
    title: titleStr,
    summary: `Hành trình ${dur} ngày dành cho ${compLabel} — được AI lên kế hoạch tối ưu dựa trên sở thích và quỹ thời gian của bạn.`,
    total_cost_estimate: costEstimate,
    highlights: highlights.slice(0, 4),
    ai_insight: '✨ AI cân bằng thời gian di chuyển, nghỉ ngơi và tham quan để bạn không bị kiệt sức.',
    days,
  };
}
