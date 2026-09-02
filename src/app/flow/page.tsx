'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────
type FlowState = {
  duration: string; companion: string; budget: string;
  pacing: string; exploration: string; tags: string[];
};

// ─── Step Config ──────────────────────────────────────────────────
const STEP_QUESTIONS = [
  { key: 'duration', q: 'Bạn có bao nhiêu ngày cho chuyến đi Huế?' },
  { key: 'companion', q: 'Bạn đi cùng ai?' },
  { key: 'budget', q: 'Ngân sách của bạn như thế nào?' },
  { key: 'pacing', q: 'Bạn muốn lịch trình như thế nào?' },
  { key: 'exploration', q: 'Phong cách khám phá của bạn?' },
  { key: 'tags', q: 'Điều gì bạn muốn trải nghiệm nhất?' },
];

const STEP_OPTIONS: Record<string, { value: string; label: string; emoji: string }[]> = {
  duration: [
    { value: '1', label: '1 ngày', emoji: '⚡' },
    { value: '2', label: '2 ngày', emoji: '✌️' },
    { value: '3', label: '3 ngày', emoji: '🌟' },
    { value: '5+', label: '5+ ngày', emoji: '🎒' },
  ],
  companion: [
    { value: 'solo', label: 'Một mình', emoji: '🧘' },
    { value: 'couple', label: 'Cặp đôi', emoji: '💑' },
    { value: 'family', label: 'Gia đình', emoji: '👨‍👩‍👧' },
    { value: 'friends', label: 'Nhóm bạn', emoji: '👯' },
  ],
  budget: [
    { value: 'budget', label: 'Tiết kiệm', emoji: '💰' },
    { value: 'moderate', label: 'Vừa phải', emoji: '💳' },
    { value: 'comfort', label: 'Thoải mái', emoji: '✨' },
    { value: 'luxury', label: 'Cao cấp', emoji: '👑' },
  ],
  pacing: [
    { value: 'relaxed', label: 'Thư giãn', emoji: '🌿' },
    { value: 'balanced', label: 'Cân bằng', emoji: '⚖️' },
    { value: 'packed', label: 'Đầy ắp', emoji: '🚀' },
  ],
  exploration: [
    { value: 'deep', label: 'Chiều sâu', emoji: '🔍' },
    { value: 'wide', label: 'Rộng rãi', emoji: '🗺️' },
    { value: 'spontaneous', label: 'Ngẫu hứng', emoji: '🎲' },
  ],
};

const ALL_TAGS = [
  '🏛️ Di sản Triều Nguyễn', '🍜 Ẩm thực đường phố', '☕ Cà phê & Trà',
  '📸 Nhiếp ảnh', '🌿 Thiên nhiên sông Hương', '🛕 Chùa chiền tâm linh',
  '🎭 Nghệ thuật truyền thống', '🛍️ Mua sắm & Thủ công', '🎵 Nhã nhạc Cung đình',
];

const DURATION_WHISPERS: Record<string, string> = {
  '1': 'Chỉ 1 ngày — đủ để cảm nhận linh hồn cố đô nếu đi đúng chỗ.',
  '2': '2 ngày thong thả — buổi sáng di tích, buổi chiều sông Hương.',
  '3': '3 ngày là "ngọt ngào" nhất — đủ sâu mà không vội.',
  '5+': '5 ngày trở lên — bạn có thể khám phá đến từng ngõ nhỏ của Huế.',
};

const COMPANION_BUDGET_WHISPERS: Record<string, string> = {
  solo: 'Đi một mình thường khám phá được nhiều góc nhỏ nhất.',
  couple: 'Cặp đôi ở Huế — buổi tối thuyền trên sông Hương, tuyệt lắm!',
  family: 'Gia đình thích hợp những điểm thoáng, ít leo trèo.',
  friends: 'Nhóm bạn thì năng động — thêm ẩm thực đường phố nhé!',
  budget: 'Huế rất thân thiện với túi tiền — ăn ngon dưới 50k không khó.',
  moderate: 'Ngân sách vừa phải — đủ để thử một bữa cơm cung đình.',
  comfort: 'Thoải mái — có thể xem xét resort ven sông hoặc spa Huế.',
  luxury: 'Luxury — Azerai La Résidence Hue xứng đáng trải nghiệm.',
};

type ChatMessage = { from: 'ai' | 'user'; text: string };

const initialState: FlowState = {
  duration: '', companion: '', budget: '', pacing: '', exploration: '', tags: [],
};


export default function FlowPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<FlowState>(initialState);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [tripId, setTripId] = useState('');
  const [freeInput, setFreeInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChat([{ from: 'ai', text: 'Xin chào! Tôi sẽ giúp bạn tạo một hành trình Huế hoàn toàn riêng. ' + STEP_QUESTIONS[0].q }]);
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  const handlePick = (key: keyof FlowState, value: string) => {
    setState(prev => ({ ...prev, [key]: value }));
    const whisper = COMPANION_BUDGET_WHISPERS[value] || DURATION_WHISPERS[value] || '';
    const label = STEP_OPTIONS[key]?.find(o => o.value === value)?.label ?? value;
    setChat(prev => [
      ...prev,
      { from: 'user', text: label },
      ...(whisper ? [{ from: 'ai' as const, text: whisper }] : []),
    ]);
    if (step < STEP_QUESTIONS.length - 1) {
      setTimeout(() => {
        setChat(prev => [...prev, { from: 'ai', text: STEP_QUESTIONS[step + 1].q }]);
        setStep(s => s + 1);
      }, whisper ? 700 : 300);
    }
  };

  const handleTagToggle = (tag: string) => {
    setState(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
    }));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setChat(prev => [
      ...prev,
      { from: 'user', text: `Sở thích: ${state.tags.join(', ')}${freeInput ? ' · ' + freeInput : ''}` },
      { from: 'ai', text: 'Tuyệt! Đang tạo lịch trình cho bạn...' },
    ]);
    try {
      const token = localStorage.getItem('hv_token');
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          duration: state.duration,
          styles: state.tags.map(t => t.replace(/^[\s\S]{1,2}\s/, '')),
          companion: state.companion,
          budget: state.budget === 'budget' ? 300 : state.budget === 'moderate' ? 600 : state.budget === 'comfort' ? 1000 : 2000,
          food: [],
          notes: freeInput,
        }),
      });
      const data = await res.json();
      if (data.tripId) {
        setTripId(data.tripId);
        setDone(true);
        setChat(prev => [...prev, { from: 'ai', text: `Xong rồi! Lịch trình ${state.duration} ngày đã sẵn sàng 🎉` }]);
      } else {
        setChat(prev => [...prev, { from: 'ai', text: 'Có lỗi xảy ra. Thử lại nhé!' }]);
        setGenerating(false);
      }
    } catch {
      setChat(prev => [...prev, { from: 'ai', text: 'Mất kết nối. Thử lại sau nhé!' }]);
      setGenerating(false);
    }
  };

  const currentStepKey = STEP_QUESTIONS[step]?.key as keyof FlowState;
  const isTagStep = currentStepKey === 'tags';


  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--soft-white)' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, padding: '14px 20px', background: 'rgba(255,249,247,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,127,107,0.07)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(26,29,59,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <p className="section-eyebrow" style={{ marginBottom: 1 }}>LÊN KẾ HOẠCH</p>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--navy)' }}>Hành trình với AI</h1>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {STEP_QUESTIONS.map((_, i) => (
            <div key={i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 3, background: i <= step ? 'var(--coral)' : 'rgba(26,29,59,0.1)', transition: 'all 0.3s var(--ease-spring)' }} />
          ))}
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {chat.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start', gap: 10, alignItems: 'flex-end' }}>
              {msg.from === 'ai' && (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.875rem' }}>✨</div>
              )}
              <div className={msg.from === 'ai' ? 'ai-bubble' : 'user-bubble'} style={{ maxWidth: '80%' }}>
                <p style={{ fontSize: '0.9375rem', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>


      {!done && !generating && (
        <div style={{ padding: '16px 20px 32px', borderTop: '1px solid rgba(26,29,59,0.06)', background: 'var(--soft-white)' }}>
          {!isTagStep && STEP_OPTIONS[currentStepKey] && (
            <div style={{ display: 'grid', gridTemplateColumns: STEP_OPTIONS[currentStepKey].length <= 3 ? `repeat(${STEP_OPTIONS[currentStepKey].length}, 1fr)` : 'repeat(2, 1fr)', gap: 10 }}>
              {STEP_OPTIONS[currentStepKey].map(opt => (
                <button key={opt.value} onClick={() => handlePick(currentStepKey, opt.value)} style={{ padding: '14px 10px', background: state[currentStepKey] === opt.value ? 'linear-gradient(135deg, var(--coral), var(--warm-orange))' : 'var(--card-bg)', border: `1.5px solid ${state[currentStepKey] === opt.value ? 'transparent' : 'rgba(26,29,59,0.08)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.2s var(--ease-spring)', boxShadow: state[currentStepKey] === opt.value ? 'var(--shadow-glow)' : 'none', fontFamily: 'var(--font)' }}>
                  <span style={{ fontSize: '1.5rem' }}>{opt.emoji}</span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: state[currentStepKey] === opt.value ? 'white' : 'var(--navy)' }}>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
          {isTagStep && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ALL_TAGS.map(tag => (
                  <button key={tag} onClick={() => handleTagToggle(tag)} style={{ padding: '8px 14px', background: state.tags.includes(tag) ? 'linear-gradient(135deg, var(--coral), var(--warm-orange))' : 'var(--card-bg)', border: `1.5px solid ${state.tags.includes(tag) ? 'transparent' : 'rgba(26,29,59,0.08)'}`, borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: state.tags.includes(tag) ? 'white' : 'var(--navy)', transition: 'all 0.2s var(--ease-spring)', fontFamily: 'var(--font)' }}>
                    {tag}
                  </button>
                ))}
              </div>
              <textarea value={freeInput} onChange={e => setFreeInput(e.target.value)} placeholder="Ghi chú thêm (tuỳ chọn)..." style={{ width: '100%', padding: '12px', background: 'var(--card-bg)', border: '1.5px solid rgba(26,29,59,0.08)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.9rem', outline: 'none', color: 'var(--navy)', resize: 'none', minHeight: 60, lineHeight: 1.5 }} />
              <button onClick={handleGenerate} disabled={state.tags.length === 0} className="btn-primary btn-ripple" style={{ width: '100%', opacity: state.tags.length === 0 ? 0.5 : 1 }}>
                ✨ Tạo hành trình của tôi
              </button>
            </div>
          )}
        </div>
      )}

      {generating && !done && (
        <div style={{ padding: '24px 20px 48px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.5rem', animation: 'pulse 2s ease-in-out infinite' }}>✨</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>AI đang tạo hành trình...</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--navy-muted)' }}>Lắng nghe từng sở thích, cân bằng từng khoảnh khắc</p>
        </div>
      )}

      {done && (
        <div style={{ padding: '20px 20px 48px' }}>
          <button onClick={() => router.push(`/trips/${tripId}`)} className="btn-primary btn-ripple" style={{ width: '100%', fontSize: '1rem' }}>
            Xem lịch trình của bạn →
          </button>
        </div>
      )}
    </div>
  );
}

