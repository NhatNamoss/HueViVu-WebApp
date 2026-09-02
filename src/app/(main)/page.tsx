'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PlaceCard from '@/components/ui/PlaceCard';
import CategoryFilter from '@/components/ui/CategoryFilter';

type Place = {
  id: string; name: string; category: string;
  rating: number; price: string; img: string;
  vibe?: string; vibeClass?: string;
};

type Weather = {
  temp: number; condition_vi: string; condition_emoji: string;
};

// ─── Contextual messages by time of day + weather ───────────────
const getContextualHero = (hour: number, weather?: Weather | null) => {
  const isRaining = weather?.condition_vi?.toLowerCase().includes('mưa');

  if (isRaining) {
    return {
      eyebrow: 'Trời đang mưa',
      headline: 'Mưa Huế buồn mà đẹp...',
      sub: 'Một tô bún bò nóng hay một quán cà phê nghe nhạc Trịnh?',
      mood: '☔',
      cta: 'Gợi ý trong nhà',
      ctaHref: '/explore?cat=cafe',
      bg: 'linear-gradient(135deg, rgba(100,120,180,0.08), rgba(80,100,160,0.05))',
    };
  }
  if (hour >= 5 && hour < 10) {
    return {
      eyebrow: 'Sáng sớm yên bình',
      headline: 'Ánh sáng vàng đổ qua Đại Nội...',
      sub: 'Lúc này ít người nhất trong ngày. Bắt đầu hành trình từ đâu nhé?',
      mood: '🌅',
      cta: 'Địa điểm sáng sớm',
      ctaHref: '/explore?time=morning',
      bg: 'linear-gradient(135deg, rgba(255,180,100,0.1), rgba(255,127,107,0.07))',
    };
  }
  if (hour >= 10 && hour < 14) {
    return {
      eyebrow: 'Nắng ban mai',
      headline: 'Huế đang ở khoảnh khắc đẹp nhất...',
      sub: 'Thời điểm lý tưởng cho những di tích và ẩm thực trưa chuẩn vị cố đô.',
      mood: '🌞',
      cta: 'Ăn trưa ở đâu?',
      ctaHref: '/explore?cat=food',
      bg: 'linear-gradient(135deg, rgba(255,200,80,0.1), rgba(255,154,92,0.07))',
    };
  }
  if (hour >= 14 && hour < 18) {
    return {
      eyebrow: 'Chiều chậm rãi',
      headline: 'Hoàng hôn trên sông Hương đang đến...',
      sub: 'Một buổi chiều thư thả — cà phê, sách, hay dạo bộ bờ sông?',
      mood: '🌇',
      cta: 'Chiều nay đi đâu',
      ctaHref: '/explore?time=afternoon',
      bg: 'linear-gradient(135deg, rgba(255,127,107,0.1), rgba(200,100,80,0.06))',
    };
  }
  return {
    eyebrow: 'Đêm xuống rồi',
    headline: 'Huế về đêm có một vẻ riêng...',
    sub: 'Đèn lồng soi bóng sông Hương. Đêm nay muốn làm gì?',
    mood: '🌙',
    cta: 'Khám phá đêm Huế',
    ctaHref: '/explore?time=evening',
    bg: 'linear-gradient(135deg, rgba(91,50,86,0.1), rgba(50,30,70,0.07))',
  };
};

// ─── Day rhythm suggestions ──────────────────────────────────────
const dayRhythm = [
  { time: 'Sáng', emoji: '☕', suggestion: 'Trà cung đình hoặc cà phê góc vắng', href: '/explore?cat=cafe' },
  { time: 'Trưa', emoji: '🍜', suggestion: 'Bún bò, cơm hến, bánh bèo chuẩn vị', href: '/explore?cat=food' },
  { time: 'Chiều', emoji: '🏛️', suggestion: 'Di tích, lăng tẩm giờ vắng người', href: '/explore?cat=heritage' },
  { time: 'Tối', emoji: '🛶', suggestion: 'Thuyền rồng, chợ đêm, cầu Tràng Tiền', href: '/explore?time=evening' },
];

const categories = [
  { key: 'all', label: 'Tất cả', emoji: '' },
  { key: 'heritage', label: 'Di tích', emoji: '🏛️' },
  { key: 'food', label: 'Ẩm thực', emoji: '🍜' },
  { key: 'nature', label: 'Thiên nhiên', emoji: '🌿' },
  { key: 'temple', label: 'Chùa chiền', emoji: '🛕' },
  { key: 'cafe', label: 'Cà phê', emoji: '☕' },
  { key: 'market', label: 'Chợ', emoji: '🛍️' },
];

export default function HomePage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [hour, setHour] = useState(new Date().getHours());
  const [mounted, setMounted] = useState(false);
  const [userInitial, setUserInitial] = useState('H');

  useEffect(() => {
    setMounted(true);
    setHour(new Date().getHours());
    fetch('/api/weather').then(r => r.json()).then(setWeather).catch(() => {});
    fetch('/api/places').then(r => r.json()).then(setPlaces).catch(() => {});
    const token = localStorage.getItem('hv_token');
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(u => { if (u.name) setUserInitial(u.name[0].toUpperCase()); }).catch(() => {});
      fetch('/api/trips', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then((trips: any[]) => {
          const active = trips.find(t => t.status === 'active');
          if (active) setActiveTrip(active);
        }).catch(() => {});
    }
  }, []);

  const filtered = activeCategory === 'all' ? places : places.filter(p => p.category === activeCategory);
  const hero = getContextualHero(hour, weather);

  return (
    <>
      {/* ── Header ───────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '14px 20px',
        paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
        background: 'rgba(255,249,247,0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,127,107,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--coral)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>
            HueViVu
          </p>
          <h1 style={{
            fontSize: '1.375rem',
            fontWeight: 600,
            color: 'var(--navy)',
            lineHeight: 1.2,
          }}>
            Khám phá <em style={{ color: 'var(--coral)' }}>Cố đô</em>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {weather && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--card-bg)', padding: '7px 13px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(26,29,59,0.06)',
              fontSize: '0.8125rem', fontWeight: 600,
              animation: mounted ? 'textReveal 0.5s var(--ease-out) both' : undefined,
            }}>
              <span className="animate-float">{weather.condition_emoji}</span>
              <span style={{ color: 'var(--navy)' }}>{weather.temp}°C</span>
            </div>
          )}
          <Link href="/profile" style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: '0.875rem',
            boxShadow: '0 4px 12px rgba(255,127,107,0.3)',
          }}>{userInitial}</Link>
        </div>
      </header>

      {/* ── Contextual Hero ───────────────────────────────── */}
      <section className="section" style={{ marginTop: 20 }}>
        <div className="rhythm-card animate-text-reveal" style={{ background: hero.bg, position: 'relative', overflow: 'hidden' }}>
          {/* Decorative orb */}
          <div style={{
            position: 'absolute', top: -40, right: -40,
            width: 120, height: 120, borderRadius: '50%',
            background: 'rgba(255,127,107,0.08)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <p className="section-eyebrow">{hero.eyebrow}</p>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--navy)',
                lineHeight: 1.35,
                marginBottom: 6,
                }}>{hero.headline}</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--navy-muted)', lineHeight: 1.5, marginBottom: 14 }}>
                {hero.sub}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link href={hero.ctaHref}
                  className="btn-ripple"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 18px',
                    background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))',
                    color: 'white', borderRadius: 'var(--radius-full)',
                    fontSize: '0.8125rem', fontWeight: 700,
                    boxShadow: 'var(--shadow-glow)',
                    transition: 'all 0.3s var(--ease-out)',
                  }}>
                  {hero.cta} →
                </Link>
                <Link href="/flow"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 18px',
                    background: 'rgba(255,127,107,0.08)',
                    color: 'var(--coral)', borderRadius: 'var(--radius-full)',
                    fontSize: '0.8125rem', fontWeight: 600,
                    border: '1px solid rgba(255,127,107,0.2)',
                  }}>
                  Lên kế hoạch
                </Link>
              </div>
            </div>
            <span className="animate-float" style={{ fontSize: '2.5rem', marginLeft: 16, flexShrink: 0 }}>
              {hero.mood}
            </span>
          </div>
        </div>
      </section>

      {/* ── Active Trip ───────────────────────────────────── */}
      {activeTrip && (
        <section className="section animate-text-reveal-1">
          <Link href={`/trips/${activeTrip.id}`}>
            <div style={{
              background: 'linear-gradient(135deg, var(--navy), var(--navy-light))',
              borderRadius: 'var(--radius-lg)', padding: '18px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              boxShadow: '0 8px 32px rgba(26,29,59,0.2)',
              transition: 'all 0.3s var(--ease-out)',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CAF50', display: 'inline-block' }} className="animate-heartbeat" />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em' }}>ĐANG DIỄN RA</span>
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', marginBottom: 4 }}>
                  {activeTrip.title}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>
                  📅 {activeTrip.duration} ngày · {activeTrip.companion}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Tiếp theo</p>
                <span style={{ fontSize: '1.5rem' }}>→</span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ── AI Suggestion ─────────────────────────────────── */}
      <section className="section animate-text-reveal-2">
        <div className="ai-bubble" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: '1.125rem',
            boxShadow: '0 4px 12px rgba(255,127,107,0.25)',
          }}>
            <span className="animate-sparkle">✨</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--coral)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>HueViVu gợi ý</p>
              <span style={{ fontSize: '0.6875rem', color: 'var(--gray-soft)', background: 'rgba(26,29,59,0.05)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                theo thời tiết & giờ hiện tại
              </span>
            </div>
            <p style={{ fontSize: '0.9375rem', color: 'var(--navy)', lineHeight: 1.55, fontWeight: 500 }}>
              {weather?.condition_vi === 'Nắng đẹp' || weather?.condition_vi === 'Trời nắng'
                ? '"Trời nắng đẹp hôm nay — lý tưởng để ghé Chùa Thiên Mụ lúc sáng sớm, ít người và ánh sáng vàng rực để chụp ảnh."'
                : '"Hôm nay thích hợp khám phá ẩm thực trong nhà — thử Bún bò Bà Tuyết hoặc Bánh bèo hẻm Quan đi!"'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Day Rhythm ────────────────────────────────────── */}
      <section className="section animate-text-reveal-3">
        <div style={{ marginBottom: 12 }}>
          <p className="section-eyebrow">Nhịp của ngày</p>
          <h2 className="section-title" style={{ fontWeight: 700, fontSize: '1.0625rem' }}>
            Hôm nay tận hưởng gì?
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {dayRhythm.map((item, i) => {
            const isCurrentTime = (
              (item.time === 'Sáng' && hour >= 5 && hour < 10) ||
              (item.time === 'Trưa' && hour >= 10 && hour < 14) ||
              (item.time === 'Chiều' && hour >= 14 && hour < 18) ||
              (item.time === 'Tối' && (hour >= 18 || hour < 5))
            );
            return (
              <Link key={item.time} href={item.href}>
                <div style={{
                  background: isCurrentTime
                    ? 'linear-gradient(135deg, rgba(255,127,107,0.12), rgba(255,154,92,0.08))'
                    : 'var(--card-bg)',
                  border: isCurrentTime
                    ? '2px solid rgba(255,127,107,0.25)'
                    : '1px solid rgba(26,29,59,0.06)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.25s var(--ease-spring)',
                  position: 'relative',
                }}>
                  {isCurrentTime && (
                    <span style={{
                      position: 'absolute', top: 8, right: 10,
                      fontSize: '0.5625rem', fontWeight: 700,
                      color: 'var(--coral)', letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}>Bây giờ</span>
                  )}
                  <span style={{ fontSize: '1.625rem', display: 'block', marginBottom: 6 }}>{item.emoji}</span>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: isCurrentTime ? 'var(--coral)' : 'var(--navy-muted)', marginBottom: 3 }}>
                    {item.time}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--navy-muted)', lineHeight: 1.4 }}>
                    {item.suggestion}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Quick Actions ─────────────────────────────────── */}
      <section className="section animate-text-reveal-4">
        <div style={{ marginBottom: 12 }}>
          <h2 className="section-title">✨ AI có thể giúp gì?</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { icon: '📸', label: 'Xem live', href: '/live', color: 'rgba(255,127,107,0.1)' },
            { icon: '🗺️', label: 'Lên kế hoạch', href: '/flow', color: 'rgba(107,143,113,0.12)' },
            { icon: '🍜', label: 'Tìm quán ăn', href: '/explore?cat=food', color: 'rgba(245,158,11,0.1)' },
            { icon: '🏛️', label: 'Di sản', href: '/explore?cat=heritage', color: 'rgba(91,50,86,0.1)' },
          ].map(qa => (
            <Link key={qa.label} href={qa.href}>
              <div className="btn-ripple" style={{
                background: qa.color,
                border: '1px solid rgba(26,29,59,0.05)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 8px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.25s var(--ease-spring)',
              }}>
                <span style={{ fontSize: '1.5rem' }}>{qa.icon}</span>
                <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--navy)', lineHeight: 1.2 }}>{qa.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Category Filter ───────────────────────────────── */}
      <section style={{ marginBottom: 8 }}>
        <div style={{ padding: '0 20px', marginBottom: 10 }}>
          <h2 className="section-title">🔍 Khám phá theo tâm trạng</h2>
        </div>
        <CategoryFilter categories={categories} activeCategory={activeCategory} onChange={setActiveCategory} />
      </section>

      {/* ── Featured Places ───────────────────────────────── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">🔥 Địa điểm nổi bật</h2>
          <Link href="/explore" className="see-all">Xem tất cả</Link>
        </div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {filtered.slice(0, 6).map(place => (
            <PlaceCard key={place.id} place={place} layout="horizontal" />
          ))}
          {places.length === 0 && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ flexShrink: 0, width: 160, height: 200, borderRadius: 'var(--radius-lg)' }} className="skeleton" />
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="section" style={{ marginBottom: 100 }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))',
          borderRadius: 'var(--radius-xl)', padding: '28px 22px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-glow-lg)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <span className="animate-sparkle" style={{ fontSize: '2rem', display: 'block', marginBottom: 10 }}>✨</span>
          <h3 style={{
            fontSize: '1.25rem', fontWeight: 600,
            color: 'white', marginBottom: 8,
            }}>
            "Để AI lắng nghe và dệt nên chuyến đi của bạn"
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.82)', marginBottom: 18, lineHeight: 1.55 }}>
            Trả lời vài câu hỏi nhỏ. AI sẽ tạo lịch trình Huế hoàn toàn riêng cho bạn.
          </p>
          <Link href="/flow" className="btn-ripple" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'white', color: 'var(--coral)',
            padding: '13px 26px', borderRadius: 'var(--radius-full)',
            fontWeight: 700, fontSize: '0.9375rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}>
            Bắt đầu ngay →
          </Link>
        </div>
      </section>
    </>
  );
}
