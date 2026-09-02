'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PlaceCard from '@/components/ui/PlaceCard';
import CategoryFilter from '@/components/ui/CategoryFilter';
import WeatherWidget from '@/components/ui/WeatherWidget';

type Place = {
  id: string; name: string; category: string; description: string;
  rating: number; rating_count: number; price: string; duration: string;
  address: string; img: string; lat: number; lng: number; tags: string[];
};

const CATEGORIES = [
  { key: 'all', label: '🌟 Tất cả' },
  { key: 'heritage', label: '🏛️ Di tích' },
  { key: 'food', label: '🍜 Ẩm thực' },
  { key: 'nature', label: '🌿 Thiên nhiên' },
  { key: 'temple', label: '🛕 Chùa chiền' },
  { key: 'cafe', label: '☕ Cà phê' },
  { key: 'market', label: '🛍️ Chợ' },
];

const MOODS = [
  { key: 'all', label: 'Tất cả', emoji: '🌟' },
  { key: 'calm', label: 'Yên tĩnh', emoji: '🍵' },
  { key: 'lively', label: 'Vui vẻ', emoji: '🎉' },
  { key: 'cultural', label: 'Văn hóa', emoji: '🏛️' },
  { key: 'food', label: 'Ăn ngon', emoji: '🍜' },
  { key: 'spontaneous', label: 'Ngẫu hứng', emoji: '✨' },
];

const MOOD_CATEGORY_MAP: Record<string, string> = {
  calm: 'cafe',
  lively: 'market',
  cultural: 'heritage',
  food: 'food',
  spontaneous: 'all',
};

// Minimal markdown renderer: **bold**, - bullets, newlines
function renderAiMarkdown(text: string) {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let key = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { out.push(<br key={key++} />); continue; }
    const isBullet = /^[-*•]\s+/.test(trimmed);
    const content = trimmed.replace(/^[-*•]\s+/, '');
    // parse **bold**
    const parts = content.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p
    );
    if (isBullet) {
      out.push(<div key={key++} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        <span style={{ color: 'var(--coral)', flexShrink: 0, marginTop: 1 }}>•</span>
        <span>{parts}</span>
      </div>);
    } else {
      out.push(<p key={key++} style={{ margin: '0 0 6px', lineHeight: 1.6 }}>{parts}</p>);
    }
  }
  return out;
}

function ExploreInner() {
  const searchParams = useSearchParams();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [activeMood, setActiveMood] = useState('all');
  const [q, setQ] = useState('');
  const [weather, setWeather] = useState<any>(null);
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Read URL params on mount: ?cat=cafe or ?time=morning
  useEffect(() => {
    const cat = searchParams.get('cat');
    const time = searchParams.get('time');
    if (cat && cat !== 'all') setCategory(cat);
    else if (time) {
      // map time-of-day to relevant category
      const timeMap: Record<string, string> = {
        morning: 'heritage', afternoon: 'cafe', evening: 'food',
      };
      if (timeMap[time]) setCategory(timeMap[time]);
    }
  }, [searchParams]);

  const handleMoodSelect = (moodKey: string) => {
    setActiveMood(moodKey);
    if (moodKey !== 'all') setCategory(MOOD_CATEGORY_MAP[moodKey] || 'all');
    else setCategory('all');
  };

  const handleAiSearch = async () => {
    if (!q.trim()) return;
    setIsAiLoading(true);
    setAiResponse('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: `Hãy gợi ý một vài địa điểm hoặc hoạt động (kèm giải thích ngắn) cho người đang tìm: "${q}"` }] })
      });
      const data = await res.json();
      if (data.reply) setAiResponse(data.reply);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/weather').then(r => r.json()).then(setWeather).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (q.trim()) params.set('q', q.trim());
    fetch('/api/places?' + params).then(r => r.json()).then(data => { setPlaces(data); setLoading(false); });
  }, [category, q]);

  const categoryEmoji: Record<string, string> = {
    heritage: '🏛️', food: '🍜', nature: '🌿', temple: '🛕', cafe: '☕', market: '🛍️', craft_village: '🎨',
  };

  return (
    <>
      {/* Header */}
      <header className="page-header">
        <div>
          <p className="section-eyebrow" style={{ marginBottom: 2 }}>Tìm kiếm</p>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 600, color: 'var(--navy)' }}>
            Hôm nay muốn <em style={{ color: 'var(--coral)' }}>cảm nhận</em> gì?
          </h1>
        </div>
        <button className="header-btn" aria-label="Map view">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
            <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
          </svg>
        </button>
      </header>

      {/* Mood filter */}
      <div style={{ padding: '14px 20px 0' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--navy-muted)', marginBottom: 10 }}>Tôi đang muốn...</p>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {MOODS.map(mood => (
            <button
              key={mood.key}
              onClick={() => handleMoodSelect(mood.key)}
              className={`mood-chip${activeMood === mood.key ? ' active' : ''}`}
            >
              {mood.emoji} {mood.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Conversational Input */}
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ background: 'white', border: '1px solid rgba(26,29,59,0.1)', borderRadius: 'var(--radius-lg)', padding: '6px', display: 'flex', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '10px 12px', color: 'var(--coral)', fontSize: '1.2rem' }}>✨</div>
          <input 
            value={q} 
            onChange={e => setQ(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleAiSearch()}
            type="text" 
            placeholder="Bạn đang tìm kiếm cảm giác gì hôm nay?" 
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9375rem', padding: '10px 0' }}
          />
          {q && <button onClick={() => { setQ(''); setAiResponse(''); }} style={{ padding: '10px', color: 'var(--gray-soft)', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>}
          <button onClick={handleAiSearch} disabled={isAiLoading} style={{ background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', opacity: isAiLoading ? 0.7 : 1 }}>
            {isAiLoading ? 'Đang nghĩ...' : 'Hỏi AI'}
          </button>
        </div>
        {aiResponse && (
          <div style={{ marginTop: 12, padding: '16px', background: 'linear-gradient(135deg, rgba(255,127,107,0.08), rgba(255,154,92,0.06))', border: '1px solid rgba(255,127,107,0.15)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--navy)' }}>
            <p style={{ fontWeight: 700, marginBottom: 8, color: 'var(--coral)', fontSize: '0.8125rem' }}>✨ HueViVu AI gợi ý</p>
            {renderAiMarkdown(aiResponse)}
          </div>
        )}
      </div>

      {/* AI Suggestion Bar */}
      {weather && (
        <div style={{ margin: '0 20px 12px', background: 'linear-gradient(135deg, rgba(255,127,107,0.06), rgba(255,154,92,0.04))', border: '1px solid rgba(255,127,107,0.12)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.1rem' }}>✨</span>
          <p style={{ flex: 1, fontSize: '0.8125rem', color: 'var(--navy)', lineHeight: 1.4 }}>
            {weather.condition_vi} {weather.temp}°C — {weather.condition_vi === 'Nắng đẹp' ? 'Thích hợp ghé Chùa Thiên Mụ lúc sáng sớm!' : 'Hôm nay lý tưởng để khám phá ẩm thực đường phố Huế!'}
          </p>
          <button style={{ padding: '6px 12px', background: 'var(--coral)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            Xem →
          </button>
        </div>
      )}

      {/* Weather Strip */}
      <WeatherWidget weather={weather} style={{ margin: '0 20px 16px' }} />

      {/* Filter chips */}
      <CategoryFilter 
        categories={CATEGORIES} 
        activeCategory={category} 
        onChange={setCategory} 
        style={{ marginBottom: 16 }} 
      />

      {/* Map Preview (decorative) */}
      <section className="section">
        <div style={{ height: 140, borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative', background: 'linear-gradient(135deg, #d4e8c2 0%, #a8d4a8 30%, #7fc4c4 60%, #4aa8c8 100%)' }}>
          {/* Decorative map pins */}
          {[
            { left: '25%', top: '40%', label: '🏛️', name: 'Hoàng Thành' },
            { left: '60%', top: '20%', label: '🛕', name: 'Thiên Mụ' },
            { left: '45%', top: '60%', label: '🛍️', name: 'Đông Ba' },
            { left: '15%', top: '65%', label: '🌊', name: 'Sông Hương' },
            { left: '75%', top: '55%', label: '🏛️', name: 'Lăng Tự Đức' },
          ].map(pin => (
            <div key={pin.name} style={{ position: 'absolute', left: pin.left, top: pin.top, transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ width: 32, height: 32, background: 'white', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ transform: 'rotate(45deg)', fontSize: '0.875rem' }}>{pin.label}</span>
              </div>
              <p style={{ fontSize: '0.5625rem', fontWeight: 600, color: 'var(--navy)', background: 'rgba(255,255,255,0.9)', padding: '1px 4px', borderRadius: 4, marginTop: 2, whiteSpace: 'nowrap' }}>{pin.name}</p>
            </div>
          ))}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, rgba(255,249,247,0.8) 100%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'white', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--navy)', boxShadow: 'var(--shadow-sm)' }}>
            📍 Huế, Việt Nam
          </div>
        </div>
      </section>

      {/* Places Grid */}
      <section className="section" style={{ marginBottom: 100 }}>
        <div className="section-header">
          <h2 className="section-title">
            {category === 'all' ? '✨ Tất cả địa điểm' : CATEGORIES.find(c => c.key === category)?.label ?? '🌟 Địa điểm'}
          </h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)' }}>{places.length} nơi</span>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 220, borderRadius: 'var(--radius-lg)' }} className="skeleton" />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {places.map(place => (
              <PlaceCard key={place.id} place={place} layout="grid" />
            ))}
            {places.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 20px', color: 'var(--navy-muted)' }}>
                <p className="animate-float" style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔍</p>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>
                  Huế còn nhiều góc nhỏ khác...
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--navy-muted)', lineHeight: 1.6, marginBottom: 16 }}>
                  AI có thể gợi ý thêm không? Chỉ cần nói cảm giác bạn muốn ở trên kia.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExploreInner />
    </Suspense>
  );
}
