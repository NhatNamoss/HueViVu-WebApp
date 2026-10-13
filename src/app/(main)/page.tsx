'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PlaceCard from '@/components/ui/PlaceCard';
import CategoryFilter from '@/components/ui/CategoryFilter';
import LoadingState from '@/components/ui/LoadingState';
import { buildTravelContext, isTravelTripActive, type TravelContext } from '@/lib/travel-context';
import { getHueClock } from '@/lib/travel-clock';
import WeatherWidget from '@/components/ui/WeatherWidget';
import { isWeatherUsable, unavailableWeather, type HueWeather } from '@/lib/hue-weather';

type Place = {
  id: string; name: string; category: string;
  rating: number; price: string; img: string;
  vibe?: string; vibeClass?: string;
};

type Weather = HueWeather;

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
  const [placesLoading, setPlacesLoading] = useState(true);
  const [placesError, setPlacesError] = useState('');
  const [retry, setRetry] = useState(0);
  const [weatherRetry, setWeatherRetry] = useState(0);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [serverContext, setServerContext] = useState<TravelContext | null>(null);
  const [companionLocation, setCompanionLocation] = useState<{ lat: number; lng: number; at: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [contextNotice, setContextNotice] = useState('');
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [hour, setHour] = useState(getHueClock().hour);
  const [mounted, setMounted] = useState(false);
  const [userInitial, setUserInitial] = useState('H');

  useEffect(() => {
    setMounted(true);
    setHour(getHueClock().hour);

    const token = localStorage.getItem('hv_token');
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(u => { if (u.name) setUserInitial(u.name[0].toUpperCase()); }).catch(() => {});
      fetch('/api/trips', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then((trips: any[]) => {
          const active = Array.isArray(trips) ? trips.find(t => isTravelTripActive({ id: t.id, status: t.status, startDate: t.start_date, duration: t.duration, startedAt: t.started_at })) : null;
          if (active) setActiveTrip(active);
        }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setPlacesLoading(true); setPlacesError('');
    fetch('/api/places', { signal: controller.signal })
      .then(async r => { if (!r.ok) throw new Error(); const data = await r.json(); if (!Array.isArray(data)) throw new Error(); return data; })
      .then(setPlaces)
      .catch(() => { if (!controller.signal.aborted) setPlacesError('Chưa tải được địa điểm. Kiểm tra mạng rồi thử lại.'); })
      .finally(() => { if (!controller.signal.aborted) setPlacesLoading(false); });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const token = localStorage.getItem('hv_token');
      try {
        const useLocation = companionLocation && Date.now() - companionLocation.at < 300000;
        const response = await fetch('/api/companion', { method: useLocation ? 'POST' : 'GET', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(useLocation ? { 'Content-Type': 'application/json' } : {}) }, ...(useLocation ? { body: JSON.stringify({ lat: companionLocation.lat, lng: companionLocation.lng }) } : {}), signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!cancelled) { setServerContext(data.context); setContextNotice(''); setWeather(data.weather || unavailableWeather()); }
      } catch { if (!cancelled) { setServerContext(null); setWeather(unavailableWeather()); setContextNotice('Chưa cập nhật được gợi ý. Đang dùng thông tin cơ bản.'); } }
    };
    refresh(); const interval = window.setInterval(refresh, 60000);
    const focus = () => { refresh(); }; window.addEventListener('focus', focus);
    return () => { cancelled = true; clearInterval(interval); window.removeEventListener('focus', focus); };
  }, [companionLocation, weatherRetry]);

  const findNearby = () => {
    if (!navigator.geolocation) { setContextNotice('Thiết bị chưa hỗ trợ vị trí. Bạn vẫn có thể xem gợi ý.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position => { setCompanionLocation({ lat: position.coords.latitude, lng: position.coords.longitude, at: Date.now() }); setLocating(false); }, () => { setContextNotice('Chưa có quyền vị trí. Gợi ý vẫn dựa trên giờ, thời tiết và sở thích.'); setLocating(false); }, { timeout: 8000, maximumAge: 60000 });
  };

  const filtered = activeCategory === 'all' ? places : places.filter(p => p.category === activeCategory);
  const travelContext = serverContext || buildTravelContext({ now: new Date(), weather: isWeatherUsable(weather) ? { condition: weather.condition, temp: weather.temp } : null, trip: activeTrip ? { id: String(activeTrip.id), status: activeTrip.status, startDate: activeTrip.start_date, duration: activeTrip.duration, startedAt: activeTrip.started_at, fatigue: activeTrip.fatigue } : null });
  const hero = travelContext.nextAction;

  return (
    <>
      {/* ── Header ───────────────────────────────────────── */}
      <header className="home-header" style={{
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
          <p className="home-brand-label" style={{ fontSize: '0.75rem', color: 'var(--coral)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>
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
          {isWeatherUsable(weather) && (
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

      <WeatherWidget weather={weather} onRetry={() => setWeatherRetry(n => n + 1)} style={{ margin: '12px 20px 0' }} />

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
                  📅 {activeTrip.duration} ngày · {({ solo: 'Một mình', couple: 'Cặp đôi', family: 'Gia đình', friends: 'Nhóm bạn' } as Record<string, string>)[activeTrip.companion] || 'Chuyến đi của bạn'}
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
                Giải thích đề xuất ở trên
              </span>
            </div>
            <button onClick={findNearby} disabled={locating} style={{ border: 'none', background: 'none', color: 'var(--coral)', fontSize: '.75rem', cursor: 'pointer', padding: '4px 0' }}>{locating ? 'Đang tìm vị trí…' : '📍 Gợi ý gần tôi'}</button>
            <p role="status" style={{ fontSize: '0.875rem', color: 'var(--navy-muted)', lineHeight: 1.55, fontWeight: 500 }}>
{contextNotice || hero.reason}
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
        <div className="day-rhythm-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {dayRhythm.map(item => {
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
        <div className="quick-actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
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
      <section style={{ padding: '0 20px', marginBottom: 22 }}>
        <Link href="/3d-demo" prefetch={false} style={{ display: 'block', padding: '18px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg,#f7ead7,#fcefe5)', border: '1px solid rgba(164,104,50,.15)', color: 'var(--navy)' }}>
          <p className="section-eyebrow">THAM QUAN TRƯỚC KHI ĐI</p>
          <h2 style={{ fontSize: '1.05rem', margin: '5px 0 7px', fontWeight: 750 }}>🎮 Dạo Ngọ Môn trong trò chơi 3D</h2>
          <p style={{ fontSize: '.8125rem', lineHeight: 1.55, color: 'var(--navy-muted)' }}>Đi bộ quanh mô hình, tìm 3 vòng sáng và nghe thuyết minh tiếng Việt. Thử khám phá công trình trước chuyến đi Huế.</p>
          <p style={{ marginTop: 12, color: '#a46832', fontSize: '.8125rem', fontWeight: 750 }}>Bắt đầu tham quan →</p>
        </Link>
      </section>
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
        {placesLoading && <div style={{ padding: '0 20px' }}><LoadingState compact title="Đang tải địa điểm…" detail="Bạn vẫn có thể tạo lịch trình hoặc thử tham quan 3D trong lúc chờ." /></div>}
        <div className="featured-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {placesError && <div role="alert"><p>{placesError}</p><button className="btn-secondary" onClick={() => setRetry(value => value + 1)}>Thử tải lại</button></div>}
          {!placesLoading && !placesError && filtered.length === 0 && <p>Chưa có địa điểm trong nhóm này. Hãy chọn nhóm khác hoặc tạo lịch trình để khám phá Huế.</p>}
          {filtered.slice(0, 6).map(place => (
            <PlaceCard key={place.id} place={place} layout="horizontal" />
          ))}
          {placesLoading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ flexShrink: 0, width: 160, height: 200, borderRadius: 'var(--radius-lg)' }} className="skeleton" />
          ))}
        </div>
      </section>

      {/* ── Combo Tours ───────────────────────────────────── */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">🎫 Combo Tour hot</h2>
          <Link href="/tours-combo" className="see-all">Xem tất cả</Link>
        </div>
        <Link href="/tours-combo" style={{ display: 'block' }}>
          <div className="card" style={{ overflow: 'hidden', position: 'relative' }}>
            <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #FF7F6B, #FFB199)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🎯</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>Lộ trình có sẵn — Chọn & Đi</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--navy-muted)', lineHeight: 1.5 }}>Combo tour do người Huế chọn lọc. Không cần lên kế hoạch.</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6"/></svg>
            </div>
          </div>
        </Link>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="section" style={{ marginBottom: 100 }}>
        <div style={{
          background: 'linear-gradient(145deg, #FFF8E8 0%, #FFE8D6 55%, #FFD4C7 100%)',
          borderRadius: 'var(--radius-xl)', padding: '24px 22px 22px',
          textAlign: 'left', border: '1px solid rgba(255,127,107,.2)',
          boxShadow: '0 14px 40px rgba(160,90,50,.14)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -52, right: -38, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,127,107,.13)' }} />
          <div style={{ position: 'absolute', top: '50%', left: -13, width: 26, height: 26, borderRadius: '50%', background: 'var(--soft-white)', transform: 'translateY(-50%)', borderRight: '1px solid rgba(255,127,107,.16)' }} />
          <div style={{ position: 'absolute', top: '50%', right: -13, width: 26, height: 26, borderRadius: '50%', background: 'var(--soft-white)', transform: 'translateY(-50%)', borderLeft: '1px solid rgba(255,127,107,.16)' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 'var(--radius-full)', background: 'rgba(255,127,107,.12)', color: 'var(--coral)', fontSize: '.67rem', fontWeight: 800, letterSpacing: '.08em' }}>🎟️ COUPON ƯU ĐÃI ĐỊA PHƯƠNG</span>
            <span style={{ fontSize: '1.8rem' }}>🏮</span>
          </div>
          <h3 style={{
            position: 'relative', fontSize: '1.35rem', fontWeight: 800,
            color: 'var(--navy)', marginBottom: 8, lineHeight: 1.35,
            }}>
            Để HueViVu dẫn bạn đi Huế
          </h3>
          <p style={{ position: 'relative', fontSize: '0.875rem', color: 'var(--navy-muted)', marginBottom: 16, lineHeight: 1.6 }}>
            HueViVu hứa sẽ mở khóa cho bạn những ưu đãi mà chỉ dân Huế mới có — được gợi ý theo đúng hành trình của bạn.
          </p>
          <div style={{ position: 'relative', borderTop: '1.5px dashed rgba(255,127,107,.35)', margin: '0 -4px 16px' }} />
          <Link href="/flow" className="btn-ripple" style={{
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', color: 'white',
            padding: '13px 20px', borderRadius: 'var(--radius-full)',
            fontWeight: 800, fontSize: '0.9rem',
            boxShadow: '0 7px 20px rgba(255,127,107,.28)',
          }}>
            Nhận coupon & bắt đầu hành trình →
          </Link>
          <p style={{ position: 'relative', margin: '10px 0 0', textAlign: 'center', fontSize: '.65rem', color: 'var(--navy-muted)' }}>Miễn phí tạo lịch trình · Ưu đãi xuất hiện khi có đối tác phù hợp</p>
        </div>
      </section>
    </>
  );
}
