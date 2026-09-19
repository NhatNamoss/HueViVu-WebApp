import { getDb } from './db';

// ── JSON extraction from AI output ─────────────────────────────────────────
function extractJSON(text: string): any {
  let s = text.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI không trả về JSON hợp lệ');
  let json = s.slice(start, end + 1);
  json = json.replace(/,(\s*[}\]])/g, '$1');
  try {
    return JSON.parse(json);
  } catch {
    json = json.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    return JSON.parse(json);
  }
}

// ── Call Gemini Native API ───────────────────────────────────────────────────
async function callGeminiNative({ apiKey, model, max_tokens, temperature, system, messages, signal }: {
  apiKey: string; model: string; max_tokens?: number; temperature?: number;
  system?: string; messages: any[]; signal?: AbortSignal;
}): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
  }));

  const body: any = {
    contents,
    generationConfig: { maxOutputTokens: max_tokens || 1024, temperature: temperature !== undefined ? temperature : 0.7 },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && (data.error?.message || JSON.stringify(data))) || `HTTP ${res.status}`;
    throw new Error(`Gemini API ${res.status}: ${msg}`);
  }
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((p: any) => p.text || '').join('') : null;
  if (!text) throw new Error('Gemini không trả về nội dung hợp lệ');
  return text;
}

// ── Call AI (auto-select Gemini or Anthropic-compatible) ────────────────────
async function callMessages({ model, max_tokens, temperature, system, messages, timeout_ms }: {
  model?: string; max_tokens?: number; temperature?: number; system?: string;
  messages: any[]; timeout_ms?: number;
}): Promise<string> {
  const targetModel = model || (process.env.GEMINI_API_KEY ? 'gemini-3.6-flash' : 'claude-sonnet-4-6');
  const apiKey = process.env.GEMINI_API_KEY;
  const baseURL = (process.env.ORIMISE_BASE_URL || process.env.ANTHROPIC_BASE_URL || '').replace(/\/+$/, '');
  const token = process.env.GEMINI_API_KEY || process.env.ORIMISE_AUTH_TOKEN || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || '';

  const controller = new AbortController();
  const ms = timeout_ms || 150000;
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    if (apiKey && !baseURL) {
      return await callGeminiNative({ apiKey, model: targetModel, max_tokens, temperature, system, messages, signal: controller.signal });
    }

    const body: any = { model: targetModel, max_tokens: max_tokens || 1024, temperature: temperature !== undefined ? temperature : 0.7, messages };
    if (system) body.system = system;

    const res = await fetch(`${baseURL || 'https://api.anthropic.com'}/v1/messages`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${token}`,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (data && (data.error?.message || data.detail || JSON.stringify(data))) || `HTTP ${res.status}`;
      throw new Error(`AI API ${res.status}: ${msg}`);
    }
    const text = data?.content?.[0]?.text;
    if (!text) throw new Error('AI không trả về nội dung hợp lệ');
    return text;
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error(`AI timeout sau ${Math.round(ms / 1000)}s`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Geo Cluster: gom địa điểm theo khu vực địa lý ────────────────────────────
// Greedy nearest-neighbor: chọn seed → gom các điểm trong bán kính 3.5km
function clusterByArea(places: any[], numDays: number): any[][] {
  const distKm = (a: any, b: any) => {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  };
  const RADIUS_KM = 3.5;
  const remaining = [...places];
  const clusters: any[][] = [];
  while (remaining.length > 0 && clusters.length < numDays) {
    remaining.sort((a, b) => (b.popularity || 0.5) - (a.popularity || 0.5));
    const seed = remaining.shift()!;
    const cluster = [seed];
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (distKm(seed, remaining[i]) <= RADIUS_KM) cluster.push(remaining.splice(i, 1)[0]);
    }
    clusters.push(cluster);
  }
  if (remaining.length > 0) {
    for (const p of remaining) {
      let minDist = Infinity, bestIdx = 0;
      clusters.forEach((c, i) => { const d = distKm(p, c[0]); if (d < minDist) { minDist = d; bestIdx = i; } });
      clusters[bestIdx].push(p);
    }
  }
  while (clusters.length < numDays) clusters.push([]);
  return clusters.slice(0, numDays);
}

function nearestOf(cluster: any[], pool: any[]): any | null {
  if (!pool.length) return null;
  const distKm = (a: any, b: any) => {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  };
  const center = cluster[0] || { lat: 16.4637, lng: 107.5909 };
  return pool.reduce((best, p) => distKm(center, p) < distKm(center, best) ? p : best);
}

// ── Local Fallback Trip Generator ────────────────────────────────────────────
function generateLocalFallbackTrip({ duration, styles, companion, budget, food }: {
  duration: number; styles: string | string[];
  companion: string; budget: number; food?: string[];
}): any {
  const db = getDb();
  const allPlaces = db.prepare('SELECT * FROM places').all() as any[];
  const dur = Number(duration) || 2;

  const sightseeing = allPlaces.filter(p => ['heritage', 'temple', 'nature', 'craft_village', 'experience'].includes(p.category));
  const foods = allPlaces.filter(p => ['food', 'market'].includes(p.category));
  const cafes = allPlaces.filter(p => p.category === 'cafe');

  const clusters = clusterByArea(sightseeing, dur);
  const usedFoodIds = new Set<string>();
  const usedCafeIds = new Set<string>();
  const highlights: string[] = [];
  const days = [];

  for (let i = 0; i < dur; i++) {
    const cluster = clusters[i] || [];
    const dayActivities = [];
    const [morning, midmorning, afternoon3] = cluster;

    if (morning) {
      if (highlights.length < 3) highlights.push(morning.name);
      dayActivities.push({ time: '08:00', name: morning.name, type: morning.category, duration: morning.duration || '2 giờ', cost: morning.price || 'Miễn phí', description: morning.description || '', ai_tip: 'Nên đi sớm để tránh nắng.', location: morning.address || 'TP. Huế' });
    }
    if (midmorning) {
      dayActivities.push({ time: '10:30', name: midmorning.name, type: midmorning.category, duration: midmorning.duration || '1.5 giờ', cost: midmorning.price || 'Miễn phí', description: midmorning.description || '', ai_tip: '', location: midmorning.address || 'TP. Huế' });
    }
    const lunch = nearestOf(cluster, foods.filter(p => !usedFoodIds.has(p.id)));
    if (lunch) { usedFoodIds.add(lunch.id); dayActivities.push({ time: '12:00', name: lunch.name, type: 'food', duration: '1 giờ', cost: lunch.price || '50,000 VNĐ', description: lunch.description || '', ai_tip: '', location: lunch.address || 'TP. Huế' }); }
    if (afternoon3) {
      dayActivities.push({ time: '14:00', name: afternoon3.name, type: afternoon3.category, duration: afternoon3.duration || '1.5 giờ', cost: afternoon3.price || 'Miễn phí', description: afternoon3.description || '', ai_tip: '', location: afternoon3.address || 'TP. Huế' });
    }
    const cafe = nearestOf(cluster, cafes.filter(p => !usedCafeIds.has(p.id)));
    if (cafe) { usedCafeIds.add(cafe.id); dayActivities.push({ time: afternoon3 ? '16:00' : '14:00', name: cafe.name, type: 'cafe', duration: '1.5 giờ', cost: cafe.price || '40,000 VNĐ', description: cafe.description || '', ai_tip: '', location: cafe.address || 'TP. Huế' }); }
    const dinner = nearestOf(cluster, foods.filter(p => !usedFoodIds.has(p.id)));
    if (dinner) { usedFoodIds.add(dinner.id); dayActivities.push({ time: '18:30', name: dinner.name, type: 'food', duration: '1.5 giờ', cost: dinner.price || '60,000 VNĐ', description: dinner.description || '', ai_tip: '', location: dinner.address || 'TP. Huế' }); }

    const areaName = morning?.address?.split(',').slice(-2).join(',').trim() || 'TP. Huế';
    days.push({ day: i + 1, theme: i === 0 ? 'Dấu ấn Hoàng thành & Ẩm thực Cố đô' : i === 1 ? 'Lăng tẩm hoàng gia & Sông Hương' : `Khám phá ${areaName}`, day_tip: 'Các điểm trong ngày nằm gần nhau, di chuyển tối ưu.', activities: dayActivities });
  }

  return {
    title: `Hành trình Cố đô Huế ${dur} ngày 100% bản địa`,
    summary: `Chuyến đi ${dur} ngày tối ưu địa lý, mỗi ngày khám phá một khu vực riêng — di chuyển tối thiểu, trải nghiệm tối đa.`,
    total_cost_estimate: `${Number(budget || 2000000).toLocaleString('vi-VN')} VNĐ`,
    highlights: highlights.slice(0, 3),
    ai_insight: '✨ Lịch trình gom cụm theo khu vực địa lý, mỗi ngày các điểm nằm trong bán kính ≤3.5km.',
    days,
  };
}

// ── Generate Trip ────────────────────────────────────────────────────────────
export async function generateTrip({ duration, styles, companion, budget, food, userContext }: {
  duration: number; styles: string | string[]; companion: string;
  budget: number; food?: string[]; userContext?: any;
}): Promise<any> {
  const styleStr = Array.isArray(styles) ? styles.join(', ') : (styles || 'general');
  const foodStr = Array.isArray(food) ? food.join(', ') : (food || 'all');
  const dur = Number(duration) || 2;

  let personalizationSection = '';
  if (userContext?.personalized) {
    const lines: string[] = [];
    if (userContext.visited_place_ids?.length > 0) lines.push(`- Đã từng ghé: ${userContext.visited_place_ids.join(', ')} → KHÔNG gợi ý lại`);
    if (userContext.skipped_place_ids?.length > 0) lines.push(`- Đã từng bỏ qua: ${userContext.skipped_place_ids.join(', ')} → Tránh gợi ý`);
    if (userContext.favorite_styles?.length > 0) lines.push(`- Phong cách yêu thích: ${userContext.favorite_styles.join(', ')} → Ưu tiên`);
    if (lines.length > 0) personalizationSection = `\n\n⚠️ DỮ LIỆU CÁ NHÂN HÓA:\n${lines.join('\n')}`;
  }

  // Gom địa điểm theo cụm địa lý TRƯỚC — AI chỉ cần điền theme/mô tả, không tự quyết địa lý
  const db = getDb();
  const allPlaces = db.prepare('SELECT id, name, category, address, price, lat, lng, avg_visit_min, popularity FROM places').all() as any[];
  const sightseeing = allPlaces.filter((p: any) => ['heritage', 'temple', 'nature', 'craft_village', 'experience'].includes(p.category));
  const foods = allPlaces.filter((p: any) => ['food', 'market'].includes(p.category));
  const cafes = allPlaces.filter((p: any) => p.category === 'cafe');

  const clusters = clusterByArea(sightseeing, dur);

  const clusterContext = clusters.slice(0, dur).map((cluster, i) => {
    const sights = cluster.map((p: any) => `  - ${p.name} (${p.category}, ${p.address || 'Huế'}, giá: ${p.price || 'Miễn phí'})`).join('\n');
    const center = cluster[0] || { lat: 16.4637, lng: 107.5909 };
    const nearFoods = [...foods].sort((a: any, b: any) => Math.hypot(a.lat - center.lat, a.lng - center.lng) - Math.hypot(b.lat - center.lat, b.lng - center.lng)).slice(0, 3).map((p: any) => `  - ${p.name} (${p.address || 'Huế'}, giá: ${p.price || '~50k'})`).join('\n');
    const nearCafes = [...cafes].sort((a: any, b: any) => Math.hypot(a.lat - center.lat, a.lng - center.lng) - Math.hypot(b.lat - center.lat, b.lng - center.lng)).slice(0, 2).map((p: any) => `  - ${p.name} (${p.address || 'Huế'}, giá: ${p.price || '~40k'})`).join('\n');
    const areaName = cluster[0]?.address?.split(',').slice(-2).join(',').trim() || 'TP. Huế';
    return `NGÀY ${i + 1} — Khu vực: ${areaName}\nĐiểm tham quan (GOM SẴN theo địa lý — KHÔNG tách sang ngày khác):\n${sights || '  (chưa có)'}\nĂn uống gần khu vực:\n${nearFoods || '  (chưa có)'}\nCafe gần khu vực:\n${nearCafes || '  (chưa có)'}`;
  }).join('\n\n');

  const prompt = `Bạn là HueViVu AI, chuyên gia du lịch Huế — thay thế hướng dẫn viên chuyên nghiệp.
Thông tin: ${dur} ngày | Phong cách: ${styleStr} | Đi cùng: ${companion} | Ngân sách: ${Number(budget).toLocaleString('vi-VN')} VNĐ | Ẩm thực: ${foodStr}${personalizationSection}

⚠️ QUY TẮC BẮT BUỘC — như hướng dẫn viên Huế thực tế:
1. NHỊP NGÀY: 07:00 ăn sáng → 08:00-10:30 di tích/tham quan → 10:30 cafe nghỉ chân → 11:30 ăn trưa → 12:30-14:00 NGHỈ TRƯA (Huế rất nóng) → 14:00-16:30 tham quan tiếp → 16:30-18:00 dạo chơi nhẹ → 18:00 ăn tối → 19:00-21:00 hoạt động tối
2. TỐI ĐA 2 di tích (heritage/temple) mỗi ngày — 1 sáng + 1 chiều. KHÔNG nhồi nhét.
3. XEN KẼ nặng-nhẹ: sau di tích phải có cafe/ăn uống/dạo chơi, KHÔNG 2 di tích liên tiếp.
4. BẮT BUỘC 3 bữa ăn: sáng (07:00), trưa (11:30), tối (18:00).
5. ai_tip phải là MẸO THỰC TẾ (giá vé combo, giờ đẹp chụp ảnh, gọi món gì...), KHÔNG generic.

Địa điểm ĐÃ được gom theo khu vực địa lý. Bạn PHẢI dùng đúng danh sách từng ngày, KHÔNG hoán đổi, KHÔNG bịa thêm:

${clusterContext}

Sắp xếp theo nhịp ngày ở trên, đặt theme, viết mô tả và mẹo thực tế.
Trả về JSON (không markdown): {"title":"...","summary":"...","total_cost_estimate":"...","highlights":["..."],"ai_insight":"...","days":[{"day":1,"theme":"...","day_tip":"...","activities":[{"time":"07:00","name":"...","type":"food","duration":"45 phút","cost":"...","description":"...","ai_tip":"...","location":"..."}]}]}`;

  try {
    const text = (await callMessages({ max_tokens: 8192, messages: [{ role: 'user', content: prompt }] })).trim();
    return extractJSON(text);
  } catch (err: any) {
    console.warn('[AI Fallback] Lỗi AI:', err.message);
    return generateLocalFallbackTrip({ duration, styles, companion, budget, food });
  }
}

// ── Customize Trip ───────────────────────────────────────────────────────────
export async function customizeTrip(trip: any, instruction: string): Promise<any> {
  const currentItinerary = typeof trip.itinerary === 'string' ? trip.itinerary : JSON.stringify(trip.itinerary);

  const prompt = `Bạn là HueViVu AI, chuyên gia du lịch Huế.
Đây là lịch trình hiện tại của người dùng (JSON):
${currentItinerary}

Người dùng muốn điều chỉnh: "${instruction}"

Hãy CHỈNH SỬA lịch trình theo yêu cầu trên — giữ nguyên cấu trúc, chỉ thay đổi những gì cần. Vẫn ưu tiên địa điểm bản địa Huế thực tế.

Trả về JSON HỢP LỆ (không markdown, không text thừa) ĐÚNG schema sau:
{
  "title": "Tên chuyến đi",
  "summary": "Mô tả 1-2 câu",
  "total_cost_estimate": "X,XXX,000 VNĐ",
  "highlights": ["điểm nổi bật 1", "điểm nổi bật 2", "điểm nổi bật 3"],
  "ai_insight": "Giải thích ngắn vì sao chỉnh sửa này phù hợp",
  "days": [{ "day": 1, "theme": "Chủ đề ngày", "day_tip": "Lời khuyên", "activities": [{ "time": "07:30", "name": "Tên", "type": "heritage", "duration": "2 giờ", "cost": "25,000 VNĐ", "description": "Mô tả", "ai_tip": "Mẹo", "location": "Địa chỉ" }] }]
}`;

  try {
    const text = (await callMessages({ max_tokens: 8192, messages: [{ role: 'user', content: prompt }] })).trim();
    return extractJSON(text);
  } catch (err: any) {
    console.warn('[AI Fallback] customizeTrip:', err.message);
    const parsed = typeof trip.itinerary === 'string' ? JSON.parse(trip.itinerary) : { ...trip.itinerary };
    parsed.ai_insight = `✨ Đã tiếp nhận yêu cầu: "${instruction}". Lịch trình đã được điều chỉnh phù hợp.`;
    return parsed;
  }
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export async function chat(messages: any[], tripContext?: any): Promise<string> {
  const history = messages.slice(0, -1);
  const lastUser = messages[messages.length - 1]?.content || '';

  const db = getDb();
  const dbPlaces = db.prepare("SELECT name, category, price, address FROM places").all() as any[];
  const placesContext = dbPlaces.map(p => `- ${p.name} (Loại: ${p.category}, Giá: ${p.price || 'Miễn phí'}) - ${p.address || 'Huế'}`).join('\n');

  let rules = '';
  let qas = '';
  try {
    const fs = require('fs');
    const path = require('path');
    const jsonPath = path.join(process.cwd(), 'data', 'bot_knowledge.json');
    if (fs.existsSync(jsonPath)) {
      const knowledge = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (Array.isArray(knowledge)) {
        rules = knowledge.filter(k => k.type === 'rule' && k.is_active).map(k => `- ${k.answer}`).join('\n');
        qas = knowledge.filter(k => k.type === 'qa' && k.is_active).map(k => `Q: ${k.question}\nA: ${k.answer}`).join('\n\n');
      }
    }
  } catch (err) {
    console.error('Error reading bot_knowledge.json:', err);
  }

  let ctx = '';
  let hasItinerary = false;
  if (tripContext) {
    ctx += `\nLỊCH TRÌNH KHÁCH ĐANG XEM: "${tripContext.title}" — ${tripContext.duration} ngày${tripContext.companion ? `, đi ${tripContext.companion}` : ''}${tripContext.total_cost_estimate ? `, chi phí ~${tripContext.total_cost_estimate}` : ''}.`;
    if (tripContext.summary) ctx += `\nMô tả: ${tripContext.summary}`;
    const days = tripContext.itinerary?.days;
    if (Array.isArray(days) && days.length) {
      hasItinerary = true;
      ctx += '\nChi tiết từng ngày:';
      for (const d of days) {
        ctx += `\n• Ngày ${d.day}${d.theme ? ' — ' + d.theme : ''}:`;
        for (const a of (d.activities || [])) {
          ctx += `\n   - ${a.time || ''} ${a.name || ''}${a.location ? ' (' + a.location + ')' : ''}${a.cost ? ' · ' + a.cost : ''}`;
        }
      }
    }
  }
  if (history.length) {
    ctx += '\nHội thoại trước:\n' + history.slice(-6).map((m: any) => `${m.role === 'user' ? 'Khách' : 'Trợ lý'}: ${m.content}`).join('\n');
  }

  const grounding = hasItinerary
    ? 'Bạn là trợ lý đồng hành cho ĐÚNG lịch trình ở trên. Hãy bám sát các địa điểm/giờ giấc trong lịch trình khi trả lời.'
    : 'Bạn là trợ lý ảo của HueViVu, chuyên gia du lịch Huế.';

  const systemInstruction = `Bạn là trợ lý ảo của HueViVu, chuyên gia du lịch Huế.
Quy tắc chung:
1. Bạn chỉ gợi ý các địa điểm có trong dữ liệu dưới đây.
2. Không bịa đặt thêm địa điểm ngoài danh sách này.
3. Nếu người dùng hỏi địa điểm không có trong danh sách, hãy nói bạn chưa có thông tin và gợi ý điểm khác.
4. Trả lời bằng tiếng Việt, ngắn gọn (dưới 100 từ), thân thiện.
${rules ? '\nQuy tắc bổ sung (ƯU TIÊN TUÂN THỦ):\n' + rules : ''}
${qas ? '\nKiến thức Q&A (Sử dụng để trả lời các câu hỏi tương tự):\n' + qas : ''}

[DANH SÁCH ĐỊA ĐIỂM HUEVIVU]:
${placesContext}`;

  const prompt = `${grounding}${ctx}

Câu hỏi của khách: "${lastUser}"

Chỉ viết câu trả lời, không giải thích thêm.`;

  try {
    return await callMessages({ 
      max_tokens: 2048, 
      temperature: 0.4, // Cân bằng độ sáng tạo và tính chính xác
      system: systemInstruction,
      messages: [{ role: 'user', content: prompt }] 
    });
  } catch {
    return 'Chào bạn! Mình là HueViVu AI ✨. Hệ thống đang bận, bạn thử lại sau ít phút nhé!';
  }
}
