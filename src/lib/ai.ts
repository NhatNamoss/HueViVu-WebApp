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

// ── Local Fallback Trip Generator ────────────────────────────────────────────
function generateLocalFallbackTrip({ duration, styles, companion, budget, food }: {
  duration: number; styles: string | string[];
  companion: string; budget: number; food?: string[];
}): any {
  const db = getDb();
  const allPlaces = db.prepare('SELECT * FROM places').all() as any[];
  const dur = Number(duration) || 2;

  const heritages = allPlaces.filter(p => p.category === 'heritage' || p.category === 'temple');
  const foods = allPlaces.filter(p => p.category === 'food' || p.category === 'market');
  const cafes = allPlaces.filter(p => p.category === 'cafe');
  const natures = allPlaces.filter(p => p.category === 'nature' || p.category === 'craft_village');

  const days = [];
  const highlights: string[] = [];

  for (let i = 1; i <= dur; i++) {
    const dayActivities = [];

    const morningPlace = heritages[(i - 1) % heritages.length] || allPlaces[0];
    if (morningPlace && !highlights.includes(morningPlace.name)) highlights.push(morningPlace.name);
    dayActivities.push({ time: '08:00', name: morningPlace?.name || 'Đại Nội Huế', type: morningPlace?.category || 'heritage', duration: morningPlace?.duration || '2 giờ', cost: morningPlace?.price || '150,000 VNĐ', description: morningPlace?.description || 'Tham quan di tích lịch sử đặc sắc của Huế.', ai_tip: 'Nên đi sớm để tránh nắng và có ảnh đẹp.', location: morningPlace?.address || 'TP. Huế' });

    const lunchPlace = foods[(i - 1) * 2 % foods.length] || allPlaces[1];
    if (lunchPlace && highlights.length < 3 && !highlights.includes(lunchPlace.name)) highlights.push(lunchPlace.name);
    dayActivities.push({ time: '11:30', name: lunchPlace?.name || 'Bún Bò Bà Tuyết', type: 'food', duration: '1.5 giờ', cost: lunchPlace?.price || '45,000 VNĐ', description: lunchPlace?.description || 'Thưởng thức ẩm thực đặc sản bản địa Huế.', ai_tip: 'Nên thử nước dùng ninh và bắp bò gia truyền.', location: lunchPlace?.address || 'TP. Huế' });

    const afternoonPlace = i % 2 === 1 ? (cafes[(i - 1) % cafes.length] || allPlaces[2]) : (natures[(i - 1) % natures.length] || allPlaces[3]);
    dayActivities.push({ time: '15:00', name: afternoonPlace?.name || 'The Time Coffee', type: afternoonPlace?.category || 'cafe', duration: '2 giờ', cost: afternoonPlace?.price || '40,000 VNĐ', description: afternoonPlace?.description || 'Thư giãn trong không gian đậm chất Huế.', ai_tip: 'Góc chụp ảnh hoàng hôn cực thơ mộng.', location: afternoonPlace?.address || 'TP. Huế' });

    const dinnerPlace = foods[((i - 1) * 2 + 1) % foods.length] || allPlaces[4];
    dayActivities.push({ time: '18:30', name: dinnerPlace?.name || 'Cơm Hến Bà Cẩm', type: 'food', duration: '2 giờ', cost: dinnerPlace?.price || '35,000 VNĐ', description: dinnerPlace?.description || 'Trải nghiệm ẩm thực về đêm và dạo phố Huế.', ai_tip: 'Ớt khá cay, hỏi trước khi gia giảm.', location: dinnerPlace?.address || 'TP. Huế' });

    days.push({ day: i, theme: i === 1 ? 'Dấu ấn Hoàng thành & Ẩm thực Cố đô' : i === 2 ? 'Lăng tẩm hoàng gia & Không gian hoài cổ' : `Ngày ${i}: Khám phá chất Huế sâu lắng`, day_tip: i === 1 ? 'Nên mặc trang phục lịch sự khi vào Đại Nội và các di tích.' : 'Buổi chiều thời tiết mát mẻ rất thích hợp đi dạo ven sông.', activities: dayActivities });
  }

  return {
    title: `Hành trình Cố đô Huế ${dur} ngày 100% bản địa`,
    summary: `Chuyến đi ${dur} ngày được tối ưu cho phong cách ${Array.isArray(styles) ? styles.join(', ') : (styles || 'khám phá')}, kết hợp hài hòa giữa di tích lịch sử hoàng gia và ẩm thực đường phố đặc sắc.`,
    total_cost_estimate: `${Number(budget || 2000000).toLocaleString('vi-VN')} VNĐ`,
    highlights: highlights.slice(0, 3),
    ai_insight: '✨ (Chế độ Local Engine) Lịch trình được tổng hợp tự động từ cơ sở dữ liệu địa điểm bản địa Huế của HueViVu, tối ưu khoảng cách di chuyển và giờ mở cửa.',
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

  let personalizationSection = '';
  if (userContext?.personalized) {
    const lines: string[] = [];
    if (userContext.visited_place_ids?.length > 0) lines.push(`- Đã từng ghé: ${userContext.visited_place_ids.join(', ')} → KHÔNG gợi ý lại`);
    if (userContext.skipped_place_ids?.length > 0) lines.push(`- Đã từng bỏ qua: ${userContext.skipped_place_ids.join(', ')} → Tránh gợi ý`);
    if (userContext.favorite_styles?.length > 0) lines.push(`- Phong cách yêu thích: ${userContext.favorite_styles.join(', ')} → Ưu tiên`);
    if (lines.length > 0) personalizationSection = `\n\n⚠️ DỮ LIỆU CÁ NHÂN HÓA:\n${lines.join('\n')}`;
  }

  const prompt = `Bạn là HueViVu AI, chuyên gia du lịch Huế, Việt Nam.
Hãy tạo lịch trình du lịch cá nhân hóa với thông tin sau:
- Thời gian: ${duration} ngày
- Phong cách: ${styleStr}
- Đi cùng: ${companion}
- Ngân sách: ${Number(budget).toLocaleString('vi-VN')} VNĐ (tổng ${duration} ngày)
- Ẩm thực: ${foodStr}${personalizationSection}

Tạo lịch trình thực tế và cụ thể. Ưu tiên địa điểm bản địa Huế, tránh nơi quá đông khách. Ghi đúng giờ mở cửa, giá vé, địa chỉ thực tế.

Trả về JSON HỢP LỆ (không có markdown, không có text thừa):
{
  "title": "Tên chuyến đi đầy cảm hứng",
  "summary": "1-2 câu tóm tắt phong cách và điểm nhấn chuyến đi",
  "total_cost_estimate": "Ước tính chi phí (ví dụ: 2,500,000 VNĐ)",
  "highlights": ["3-4 điểm nổi bật nhất chuyến đi"],
  "ai_insight": "1 câu nhận xét thông minh lý do lịch trình này hợp với người dùng",
  "days": [
    {
      "day": 1,
      "theme": "Chủ đề ngày (ví dụ: Hoàng thành & Vị Huế xưa)",
      "day_tip": "Lời khuyên thực tế cho ngày này",
      "activities": [
        {
          "time": "07:30",
          "name": "Tên địa điểm/hoạt động",
          "type": "heritage|food|nature|cafe|experience|temple|market",
          "duration": "2 giờ",
          "cost": "25,000 VNĐ",
          "description": "Mô tả ngắn hấp dẫn",
          "ai_tip": "Mẹo bản địa cụ thể",
          "location": "Địa chỉ thực tế tại Huế"
        }
      ]
    }
  ]
}`;

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
