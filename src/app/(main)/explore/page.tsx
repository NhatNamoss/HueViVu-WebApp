'use client';
import { useEffect, useState } from 'react';
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

export default function ExplorePage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  const [weather, setWeather] = useState<any>(null);
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

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
        <h1 className="page-header-title">Khám phá</h1>
        <button className="header-btn" aria-label="Map view">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
            <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
          </svg>
        </button>
      </header>

      {/* AI Conversational Input */}
      <div style={{ padding: '12px 20px' }}>
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
          <div style={{ marginTop: 12, padding: '16px', background: 'linear-gradient(135deg, rgba(255,127,107,0.08), rgba(255,154,92,0.06))', border: '1px solid rgba(255,127,107,0.15)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--navy)', lineHeight: 1.5 }}>
            <p><strong>HueViVu AI:</strong> {aiResponse}</p>
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
            {category === 'all' ? '✨ Tất cả địa điểm' : CATEGORIES.find(c => c.key === category)?.label}
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
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 20px', color: 'var(--navy-muted)' }}>
                <p style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</p>
                <p style={{ fontWeight: 600 }}>Không tìm thấy địa điểm</p>
                <p style={{ fontSize: '0.875rem', marginTop: 4 }}>Thử từ khóa khác hoặc danh mục khác</p>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
