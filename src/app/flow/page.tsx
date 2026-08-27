'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type FlowState = {
  duration: string; companion: string; budget: string;
  pacing: string; exploration: string; energy: string;
  physical: string; taste: string[]; styles: string[];
};

const STEPS = [
  { key: 'duration', title: 'Bạn muốn khám phá Huế', accent: 'bao lâu?', emoji: '🗓️', desc: 'Thời gian giúp AI căn chỉnh nhịp độ và chiều sâu cho lịch trình.', type: 'grid', multi: false, options: [{ v: '1-2', emoji: '⚡', label: '1–2 ngày', sub: 'Ghé thăm nhanh' }, { v: '3-4', emoji: '🌤️', label: '3–4 ngày', sub: 'Cuối tuần' }, { v: '5-7', emoji: '🌊', label: '5–7 ngày', sub: 'Khám phá sâu' }, { v: '7+', emoji: '🏡', label: '7+ ngày', sub: 'Sống chậm ở Huế' }] },
  { key: 'companion', title: 'Bạn đi cùng', accent: 'ai?', emoji: '👥', desc: 'Giúp AI gợi ý hoạt động phù hợp với từng nhóm.', type: 'row', multi: false, options: [{ v: 'solo', emoji: '🧑', label: 'Một mình', sub: 'Tự do & khám phá' }, { v: 'couple', emoji: '💑', label: 'Cặp đôi', sub: 'Lãng mạn & thư giãn' }, { v: 'friends', emoji: '👫', label: 'Nhóm bạn', sub: 'Vui vẻ & năng động' }, { v: 'family', emoji: '👨‍👩‍👧', label: 'Gia đình', sub: 'An toàn & đa dạng' }] },
  { key: 'budget', title: 'Ngân sách của', accent: 'bạn là?', emoji: '💰', desc: 'AI sẽ gợi ý địa điểm và hoạt động phù hợp với túi tiền.', type: 'budget', multi: false, options: [{ v: 'budget', emoji: '🎒', label: 'Tiết kiệm', sub: '< 1 triệu/ngày', amount: '< 1tr VNĐ' }, { v: 'moderate', emoji: '🌸', label: 'Vừa phải', sub: '1–2.5 triệu/ngày', amount: '1–2.5tr VNĐ' }, { v: 'premium', emoji: '✨', label: 'Thoải mái', sub: '2.5–5 triệu/ngày', amount: '2.5–5tr VNĐ' }, { v: 'luxury', emoji: '👑', label: 'Sang trọng', sub: '> 5 triệu/ngày', amount: '> 5tr VNĐ' }] },
  { key: 'pacing', title: 'Nhịp độ bạn', accent: 'thích?', emoji: '⏱️', desc: 'Giúp AI sắp xếp số điểm dừng và khoảng nghỉ hợp lý.', type: 'row', multi: false, options: [{ v: 'relaxed', emoji: '🌊', label: 'Thư thả', sub: 'Ít nơi, thật sâu' }, { v: 'balanced', emoji: '🌤️', label: 'Cân bằng', sub: 'Vừa đủ điểm thú vị' }, { v: 'active', emoji: '⚡', label: 'Năng động', sub: 'Nhiều nơi, không bỏ lỡ' }] },
  { key: 'exploration', title: 'Bạn thích', accent: 'khám phá thế nào?', emoji: '🗺️', desc: 'Giúp AI cân bằng giữa điểm nổi tiếng và bí ẩn.', type: 'row', multi: false, options: [{ v: 'popular', emoji: '🏛️', label: 'Điểm nổi tiếng', sub: 'Không bỏ sót gì lớn' }, { v: 'hidden', emoji: '🔍', label: 'Góc khuất', sub: 'Ít người biết, độc đáo' }, { v: 'mixed', emoji: '⚖️', label: 'Cả hai', sub: 'Kết hợp hài hòa' }] },
  { key: 'energy', title: 'Mức năng lượng', accent: 'của bạn?', emoji: '⚡', desc: 'Để AI điều chỉnh cường độ hoạt động phù hợp.', type: 'grid', multi: false, options: [{ v: 'low', emoji: '🧘', label: 'Nhẹ nhàng', sub: 'Nghỉ ngơi là chính' }, { v: 'medium', emoji: '🚶', label: 'Vừa phải', sub: 'Đi bộ ổn' }, { v: 'high', emoji: '🏃', label: 'Năng động', sub: 'Sẵn sàng khám phá' }, { v: 'very_high', emoji: '🌋', label: 'Nhiệt huyết', sub: 'Thử thách bản thân' }] },
  { key: 'physical', title: 'Khả năng thể chất', accent: 'của bạn?', emoji: '🦵', desc: 'Giúp AI chọn địa điểm phù hợp với sức khỏe.', type: 'grid', multi: false, options: [{ v: 'easy', emoji: '🪑', label: 'Dễ dàng', sub: 'Không đi bộ nhiều' }, { v: 'moderate', emoji: '👟', label: 'Trung bình', sub: 'Đi bộ vừa phải' }, { v: 'active', emoji: '🥾', label: 'Tốt', sub: 'Leo núi nhẹ ổn' }, { v: 'sporty', emoji: '🧗', label: 'Vận động', sub: 'Thích thử thách' }] },
  { key: 'taste', title: 'Ẩm thực bạn', accent: 'yêu thích?', emoji: '🍜', desc: 'Chọn nhiều tùy thích — AI sẽ cân bằng.', type: 'grid', multi: true, options: [{ v: 'street_food', emoji: '🍢', label: 'Đường phố', sub: 'Quán vỉa hè' }, { v: 'traditional', emoji: '🍱', label: 'Truyền thống', sub: 'Cung đình & bản địa' }, { v: 'vegetarian', emoji: '🥗', label: 'Chay', sub: 'Không thịt' }, { v: 'seafood', emoji: '🦐', label: 'Hải sản', sub: 'Tươi mỗi ngày' }, { v: 'cafe', emoji: '☕', label: 'Cà phê', sub: 'Không gian & vibe' }, { v: 'sweet', emoji: '🍡', label: 'Tráng miệng', sub: 'Bánh & ngọt Huế' }] },
  { key: 'styles', title: 'Phong cách chuyến', accent: 'đi của bạn?', emoji: '🎨', desc: 'Chọn tất cả những gì phù hợp — AI sẽ tối ưu hóa.', type: 'grid', multi: true, options: [{ v: 'culture', emoji: '🏛️', label: 'Văn hóa', sub: 'Di tích & lịch sử' }, { v: 'food', emoji: '🍜', label: 'Ẩm thực', sub: 'Khám phá vị giác' }, { v: 'nature', emoji: '🌿', label: 'Thiên nhiên', sub: 'Sông, núi, làng' }, { v: 'photography', emoji: '📸', label: 'Nhiếp ảnh', sub: 'Góc đẹp mọi nơi' }, { v: 'spiritual', emoji: '🛕', label: 'Tâm linh', sub: 'Chùa & lễ hội' }, { v: 'relaxation', emoji: '🧘', label: 'Thư giãn', sub: 'Không vội vã' }] },
];

const BUDGET_MAP: Record<string, number> = { budget: 1000000, moderate: 2500000, premium: 5000000, luxury: 10000000 };
const DURATION_MAP: Record<string, number> = { '1-2': 2, '3-4': 3, '5-7': 5, '7+': 7 };

const AI_FACTS = [
  'Huế có hơn 1,300 món ăn đặc trưng trong truyền thống ẩm thực!',
  'Hoàng Thành Huế được xây dựng năm 1805, mất 30 năm để hoàn thành.',
  'Sông Hương được đặt tên vì hoa thơm từ thượng nguồn trôi theo dòng nước.',
  'Thành phố có 7 Di sản Thế giới UNESCO trong phạm vi tỉnh Thừa Thiên Huế.',
  'Chỉ riêng bánh bèo đã có hơn 10 biến thể đặc trưng ở Huế!',
];

export default function FlowPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<FlowState>({ duration: '', companion: '', budget: '', pacing: '', exploration: '', energy: '', physical: '', taste: [], styles: [] });
  const [phase, setPhase] = useState<'questions' | 'thinking' | 'result'>('questions');
  const [result, setResult] = useState<any>(null);
  const [factIdx, setFactIdx] = useState(0);
  const [thinking, setThinking] = useState(0);
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState('');

  const currentStep = STEPS[step];
  const currentVal = state[currentStep?.key as keyof FlowState];
  const isMulti = currentStep?.multi;
  const canContinue = isMulti ? (Array.isArray(currentVal) ? currentVal.length > 0 : false) : !!currentVal;

  useEffect(() => {
    if (phase === 'thinking') {
      const iv = setInterval(() => {
        setThinking(prev => {
          if (prev >= 4) { clearInterval(iv); return prev; }
          return prev + 1;
        });
        setFactIdx(prev => (prev + 1) % AI_FACTS.length);
      }, 1400);
      return () => clearInterval(iv);
    }
  }, [phase]);

  const select = (value: string) => {
    const key = currentStep.key as keyof FlowState;
    if (isMulti) {
      setState(prev => {
        const arr = prev[key] as string[];
        return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
      });
    } else {
      setState(prev => ({ ...prev, [key]: value }));
      setTimeout(() => nextStep(), 350);
    }
  };

  const nextStep = () => {
    if (step < STEPS.length - 1) {
      setTransitioning(true);
      setTimeout(() => { setStep(s => s + 1); setTransitioning(false); }, 200);
    } else {
      generateItinerary();
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setTransitioning(true);
      setTimeout(() => { setStep(s => s - 1); setTransitioning(false); }, 200);
    } else { router.push('/'); }
  };

  const generateItinerary = async () => {
    setPhase('thinking');
    setThinking(0);
    try {
      const token = localStorage.getItem('hv_token');
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          duration: DURATION_MAP[state.duration] || 3,
          styles: state.styles,
          companion: state.companion,
          budget: BUDGET_MAP[state.budget] || 2500000,
          food: state.taste,
        }),
      });
      const data = await res.json();
      if (data.tripId) {
        setTimeout(() => { setResult(data); setPhase('result'); }, Math.max(0, 5600 - thinking * 1400)); 
      } else { setError(data.error || 'Có lỗi xảy ra'); setPhase('questions'); }
    } catch (err) { setError('Không thể kết nối. Thử lại nhé!'); setPhase('questions'); }
  };

  const saveTrip = async () => {
    if (!result?.tripId) { router.push('/trips'); return; }
    setSaving(true);
    setTimeout(() => router.push(`/trips/${result.tripId}`), 500);
  };

  const THINKING_STEPS = ['Phân tích sở thích của bạn...', 'Tìm kiếm địa điểm bản địa...', 'Tối ưu lộ trình di chuyển...', 'Cân bằng ẩm thực và văn hóa...', 'Hoàn thiện lịch trình cá nhân hóa...'];

  if (phase === 'thinking') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: 'var(--soft-white)', position: 'relative', overflow: 'hidden' }}>
        <div className="ambient-bg"><div className="ambient-orb orb-1" /><div className="ambient-orb orb-2" /></div>
        <div style={{ position: 'relative', zIndex: 5, textAlign: 'center', width: '100%' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '2rem', boxShadow: '0 8px 32px rgba(255,127,107,0.4)', animation: 'pulse 2s ease-in-out infinite' }}>✨</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>Đang tạo hành trình...</h2>
          <p style={{ color: 'var(--navy-muted)', marginBottom: 32, fontSize: '0.9375rem' }}>AI đang cá nhân hóa lịch trình cho bạn</p>

          <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: 24, textAlign: 'left', boxShadow: 'var(--shadow-sm)' }}>
            {THINKING_STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < THINKING_STEPS.length - 1 ? '1px solid rgba(26,29,59,0.04)' : 'none', opacity: i <= thinking ? 1 : 0.3, transition: 'opacity 0.5s' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: i < thinking ? '#4CAF50' : i === thinking ? 'linear-gradient(135deg, var(--coral), var(--warm-orange))' : 'rgba(26,29,59,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'white', flexShrink: 0 }}>
                  {i < thinking ? '✓' : i === thinking ? '·' : ''}
                </div>
                <span style={{ fontSize: '0.875rem', color: i <= thinking ? 'var(--navy)' : 'var(--gray-soft)', fontWeight: i === thinking ? 600 : 400 }}>{s}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(255,127,107,0.06)', border: '1px solid rgba(255,127,107,0.12)', borderRadius: 'var(--radius-md)', padding: '14px', transition: 'all 0.3s' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--coral)', marginBottom: 4, letterSpacing: '0.04em' }}>💡 BẠN CÓ BIẾT?</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--navy)', lineHeight: 1.5 }}>{AI_FACTS[factIdx]}</p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'result' && result?.trip) {
    const trip = result.trip;
    return (
      <div style={{ minHeight: '100dvh', padding: '0 0 40px', background: 'var(--soft-white)', position: 'relative', overflow: 'hidden' }}>
        <div className="ambient-bg"><div className="ambient-orb orb-1" /></div>
        <div style={{ position: 'relative', zIndex: 5 }}>
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
            <button onClick={() => setPhase('questions')} className="header-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div className="ai-badge"><span className="ai-badge-dot" />Lịch trình đã sẵn sàng</div>
            <div style={{ width: 40 }} />
          </header>

          <div style={{ padding: '0 24px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 8 }}>{trip.title}</h1>
            {trip.summary && <p style={{ fontSize: '0.9375rem', color: 'var(--navy-muted)', lineHeight: 1.6, marginBottom: 16 }}>{trip.summary}</p>}

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ padding: '5px 12px', background: 'rgba(255,127,107,0.08)', border: '1px solid rgba(255,127,107,0.15)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--coral)' }}>📅 {state.duration} ngày</span>
              <span style={{ padding: '5px 12px', background: 'rgba(255,127,107,0.08)', border: '1px solid rgba(255,127,107,0.15)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--coral)' }}>{trip.total_cost_estimate}</span>
            </div>

            {trip.ai_insight && (
              <div style={{ background: 'rgba(255,127,107,0.06)', border: '1px solid rgba(255,127,107,0.12)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 8 }}>
                <span>🧠</span>
                <p style={{ fontSize: '0.8125rem', color: 'var(--navy)', lineHeight: 1.5 }}>{trip.ai_insight}</p>
              </div>
            )}

            {trip.highlights && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy-muted)', marginBottom: 8 }}>ĐIỂM NỔI BẬT</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {trip.highlights.map((h: string, i: number) => (
                    <span key={i} style={{ padding: '5px 12px', background: 'var(--card-bg)', border: '1px solid rgba(26,29,59,0.06)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--navy)' }}>✦ {h}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Preview days */}
            {trip.days?.slice(0, 2).map((day: any) => (
              <div key={day.day} style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', padding: '14px', marginBottom: 12, boxShadow: 'var(--shadow-sm)' }}>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--navy)', marginBottom: 10 }}>Ngày {day.day}: {day.theme}</p>
                {day.activities?.slice(0, 3).map((act: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: i < 2 ? '1px solid rgba(26,29,59,0.04)' : 'none' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-soft)', width: 36, flexShrink: 0 }}>{act.time}</span>
                    <span style={{ fontSize: '0.875rem' }}>{act.name}</span>
                    {act.cost && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--coral)', fontWeight: 600, flexShrink: 0 }}>{act.cost}</span>}
                  </div>
                ))}
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setPhase('thinking'); generateItinerary(); }} className="btn-secondary" style={{ flex: 1 }}>🔄 Tạo lại</button>
              <button onClick={saveTrip} className="btn-primary" style={{ flex: 2 }}>
                <span>{saving ? '⏳' : '✅'}</span>
                <span>{saving ? 'Đang lưu...' : 'Lưu lịch trình'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--soft-white)', position: 'relative', overflow: 'hidden' }}>
      <div className="ambient-bg"><div className="ambient-orb orb-1" /><div className="ambient-orb orb-2" /><div className="ambient-orb orb-3" /></div>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', paddingTop: 'max(16px, env(safe-area-inset-top, 16px))', position: 'relative', zIndex: 10 }}>
        <button onClick={prevStep} className="header-btn" style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div style={{ flex: 1, height: 4, background: 'rgba(26,29,59,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', borderRadius: 2, transition: 'width 0.4s var(--ease-out)' }} />
        </div>
        {step < STEPS.length - 1 && (
          <button onClick={nextStep} style={{ background: 'none', border: 'none', color: 'var(--navy-muted)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font)' }}>Bỏ qua</button>
        )}
      </header>

      {error && (
        <div style={{ margin: '0 24px', padding: '10px 14px', background: 'rgba(255,0,0,0.06)', border: '1px solid rgba(255,0,0,0.15)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', color: '#c0392b', textAlign: 'center' }}>{error}</div>
      )}

      {/* Step Content */}
      <main style={{ flex: 1, padding: '24px', position: 'relative', zIndex: 5, opacity: transitioning ? 0 : 1, transform: transitioning ? 'translateY(10px)' : 'translateY(0)', transition: 'all 0.2s' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }}>{currentStep?.emoji}</span>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--coral)', letterSpacing: '0.06em', marginBottom: 8 }}>BƯỚC {step + 1}/{STEPS.length}</p>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 8 }}>
            {currentStep?.title}<br />
            <span style={{ background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{currentStep?.accent}</span>
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--navy-muted)', lineHeight: 1.5 }}>{currentStep?.desc}</p>
        </div>

        {/* Grid options */}
        {currentStep?.type === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {currentStep.options.map(opt => {
              const isSelected = isMulti ? (state[currentStep.key as keyof FlowState] as string[]).includes(opt.v) : state[currentStep.key as keyof FlowState] === opt.v;
              return (
                <button key={opt.v} onClick={() => select(opt.v)} className={`option-card ${isSelected ? 'selected' : ''}`} style={{ border: isSelected ? '2px solid var(--coral)' : '2px solid rgba(26,29,59,0.06)' }}>
                  <span style={{ fontSize: '2rem' }}>{opt.emoji}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--navy)' }}>{opt.label}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--navy-muted)' }}>{opt.sub}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Row options */}
        {currentStep?.type === 'row' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {currentStep.options.map(opt => {
              const isSelected = state[currentStep.key as keyof FlowState] === opt.v;
              return (
                <button key={opt.v} onClick={() => select(opt.v)} className={`option-row ${isSelected ? 'selected' : ''}`} style={{ border: isSelected ? '2px solid var(--coral)' : '2px solid rgba(26,29,59,0.06)' }}>
                  <span style={{ fontSize: '1.5rem' }}>{opt.emoji}</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--navy)' }}>{opt.label}</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)' }}>{opt.sub}</p>
                  </div>
                  {isSelected && <span style={{ color: 'var(--coral)', fontSize: '1.25rem' }}>✓</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Budget options */}
        {currentStep?.type === 'budget' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {currentStep.options.map(opt => {
              const isSelected = state.budget === opt.v;
              return (
                <button key={opt.v} onClick={() => select(opt.v)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: isSelected ? 'linear-gradient(135deg, rgba(255,127,107,0.08), rgba(255,154,92,0.05))' : 'var(--card-bg)', border: `2px solid ${isSelected ? 'var(--coral)' : 'rgba(26,29,59,0.06)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.25s', textAlign: 'left', fontFamily: 'var(--font)' }}>
                  <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{opt.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--navy)' }}>{opt.label}</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)' }}>{opt.sub}</p>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isSelected ? 'var(--coral)' : 'var(--navy-muted)', flexShrink: 0 }}>{(opt as any).amount}</span>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      {isMulti && (
        <div style={{ padding: '16px 24px', paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))', position: 'relative', zIndex: 10 }}>
          <button onClick={nextStep} disabled={!canContinue} className="btn-primary" style={{ width: '100%', opacity: canContinue ? 1 : 0.5, cursor: canContinue ? 'pointer' : 'default' }}>
            {step === STEPS.length - 1 ? '✨ Tạo lịch trình AI' : 'Tiếp tục →'}
          </button>
        </div>
      )}
    </div>
  );
}
