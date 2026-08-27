'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PlaceCard from '@/components/ui/PlaceCard';
import CategoryFilter from '@/components/ui/CategoryFilter';

type Place = {
  id: string; name: string; category: string;
  rating: number; price: string; img: string;
};

type Weather = {
  temp: number; condition_vi: string; condition_emoji: string;
};

export default function HomePage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [greeting, setGreeting] = useState('Xin chào!');

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Chào buổi sáng ☀️');
    else if (h < 17) setGreeting('Chào buổi chiều 🌤️');
    else setGreeting('Chào buổi tối 🌙');

    // Fetch weather
    fetch('/api/weather').then(r => r.json()).then(setWeather).catch(() => {});

    // Fetch places
    fetch('/api/places').then(r => r.json()).then(setPlaces).catch(() => {});

    // Fetch active trip
    const token = localStorage.getItem('hv_token');
    if (token) {
      fetch('/api/trips', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then((trips: any[]) => {
          const active = trips.find(t => t.status === 'active');
          if (active) setActiveTrip(active);
        }).catch(() => {});
    }
  }, []);

  const filtered = activeCategory === 'all' ? places : places.filter(p => p.category === activeCategory);

  const categories = [
    { key: 'all', label: 'Tất cả', emoji: '' },
    { key: 'heritage', label: 'Di tích', emoji: '🏛️' },
    { key: 'food', label: 'Ẩm thực', emoji: '🍜' },
    { key: 'nature', label: 'Thiên nhiên', emoji: '🌿' },
    { key: 'temple', label: 'Chùa chiền', emoji: '🛕' },
    { key: 'cafe', label: 'Cà phê', emoji: '☕' },
    { key: 'market', label: 'Chợ', emoji: '🛍️' },
  ];

  return (
    <>
      {/* Header */}
      <header className="page-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)', fontWeight: 500 }}>{greeting}</p>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              Khám phá <span style={{ background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Huế</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {weather && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--card-bg)', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(26,29,59,0.06)', fontSize: '0.8125rem', fontWeight: 600 }}>
                <span>{weather.condition_emoji}</span>
                <span style={{ color: 'var(--navy)' }}>{weather.temp}°C</span>
              </div>
            )}
            <Link href="/profile" style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
              H
            </Link>
          </div>
        </div>
        {/* Search */}
        <div className="search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-soft)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input type="text" placeholder="Tìm địa điểm, ẩm thực, trải nghiệm..." />
        </div>
      </header>

      {/* Active Trip */}
      {activeTrip && (
        <section className="section" style={{ marginTop: 16 }}>
          <Link href={`/trips/${activeTrip.id}`}>
            <div style={{ background: 'linear-gradient(135deg, var(--navy), var(--navy-light))', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 32px rgba(26,29,59,0.2)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CAF50', display: 'inline-block', boxShadow: '0 0 6px #4CAF50' }} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>ĐANG HOẠT ĐỘNG</span>
                </div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'white', marginBottom: 4 }}>{activeTrip.title}</h3>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>📅 {activeTrip.duration} ngày · {activeTrip.companion}</p>
              </div>
              <div style={{ width: 60, height: 60, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0 }}>
                <img src="/assets/hero-hub.png" alt="trip" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* AI Welcome */}
      <section className="section">
        <div style={{ background: 'linear-gradient(135deg, rgba(255,127,107,0.08), rgba(255,154,92,0.06))', border: '1px solid rgba(255,127,107,0.15)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem' }}>✨</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--coral)', letterSpacing: '0.04em', marginBottom: 4 }}>AI GỢI Ý HÔM NAY</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--navy)', lineHeight: 1.5 }}>
                {weather?.condition_vi === 'Nắng đẹp'
                  ? 'Trời nắng đẹp hôm nay — thời điểm vàng để ghé Chùa Thiên Mụ lúc sáng sớm, ít người và ánh sáng đẹp để chụp ảnh. 🌅'
                  : 'Hôm nay thích hợp khám phá ẩm thực trong nhà — thử Bún bò Bà Tuyết hoặc Bánh bèo hẻm Quan đi! 🍜'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingLeft: 48 }}>
            <Link href="/explore" style={{ padding: '7px 14px', background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', color: 'white', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Khám phá →
            </Link>
            <Link href="/flow" style={{ padding: '7px 14px', background: 'rgba(255,127,107,0.08)', color: 'var(--coral)', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(255,127,107,0.2)', cursor: 'pointer' }}>
              Lên kế hoạch
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="section">
        <h2 className="section-title" style={{ marginBottom: 12 }}>✨ AI có thể giúp gì?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { icon: '🗺️', label: 'Lên kế hoạch', href: '/flow' },
            { icon: '🍜', label: 'Tìm quán ăn', href: '/explore?cat=food' },
            { icon: '🏛️', label: 'Văn hóa', href: '/explore?cat=heritage' },
            { icon: '📸', label: 'Chụp ảnh', href: '/explore?cat=nature' },
          ].map(qa => (
            <Link key={qa.label} href={qa.href}>
              <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(26,29,59,0.06)', borderRadius: 'var(--radius-md)', padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center', cursor: 'pointer', transition: 'all 0.25s' }}>
                <span style={{ fontSize: '1.5rem' }}>{qa.icon}</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--navy)' }}>{qa.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section style={{ marginBottom: 16 }}>
        <div className="section-header" style={{ padding: '0 20px', marginBottom: 10 }}>
          <h2 className="section-title">🔍 Khám phá theo danh mục</h2>
        </div>
        <CategoryFilter 
          categories={categories} 
          activeCategory={activeCategory} 
          onChange={setActiveCategory} 
        />
      </section>

      {/* Featured Places */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">🔥 Địa điểm nổi bật</h2>
          <Link href="/explore" className="see-all">Xem tất cả</Link>
        </div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {(filtered.slice(0, 6)).map(place => (
            <PlaceCard key={place.id} place={place} layout="horizontal" />
          ))}
          {places.length === 0 && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ flexShrink: 0, width: 160, height: 200, borderRadius: 'var(--radius-lg)' }} className="skeleton" />
          ))}
        </div>
      </section>

      {/* CTA — Plan Trip */}
      <section className="section" style={{ marginBottom: 100 }}>
        <div style={{ background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', borderRadius: 'var(--radius-xl)', padding: '24px 20px', textAlign: 'center', boxShadow: '0 12px 40px rgba(255,127,107,0.35)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <p style={{ fontSize: '1.5rem', marginBottom: 8 }}>✨</p>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'white', marginBottom: 8, letterSpacing: '-0.02em' }}>Để AI lên lịch trình cho bạn</h3>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)', marginBottom: 16, lineHeight: 1.5 }}>Trả lời 9 câu hỏi nhỏ, AI sẽ tạo lịch trình Huế cá nhân hóa hoàn toàn miễn phí.</p>
          <Link href="/flow" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: 'var(--coral)', padding: '12px 24px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '0.9375rem' }}>
            Bắt đầu ngay →
          </Link>
        </div>
      </section>
    </>
  );
}
