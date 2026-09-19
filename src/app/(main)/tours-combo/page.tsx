'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const THEME_EMOJI: Record<string, string> = {
  classic: '🏛️', food: '🍜', nature: '🌿', culture: '🎭', photo: '📸',
  romantic: '💕', adventure: '🏔️', spiritual: '🛕', family: '👨‍👩‍👧', night: '🌙',
};
const DIFF_LABEL: Record<string, string> = { easy: '🟢 Dễ', moderate: '🟡 Vừa', hard: '🔴 Thử thách' };

function formatPrice(n: number) { return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n > 0 ? `${n}đ` : 'Miễn phí'; }

export default function TourComboPage() {
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTheme, setActiveTheme] = useState('all');

  useEffect(() => {
    fetch('/api/tours').then(r => r.json())
      .then((data: any[]) => setTours(data.filter(t => t.is_active)))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const featured = tours.filter(t => t.is_featured);
  const themes = [...new Set(tours.map(t => t.theme))];
  const filtered = activeTheme === 'all' ? tours : tours.filter(t => t.theme === activeTheme);

  return (
    <>
      {/* Hero */}
      <section style={{ padding: '20px 20px 0', position: 'relative' }}>
        <div style={{
          background: 'linear-gradient(135deg, #FF7F6B 0%, #FF9A5C 50%, #FFB199 100%)',
          borderRadius: 'var(--radius-xl)', padding: '32px 24px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.1em', marginBottom: 8 }}>COMBO TOUR HUẾ</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', lineHeight: 1.3, marginBottom: 8 }}>
            Trải nghiệm được<br />chọn lọc bởi người Huế
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
            Lộ trình hoàn hảo, không cần lên kế hoạch. Chỉ cần chọn và đi.
          </p>
          <div style={{ marginTop: 16, display: 'flex', gap: 12, fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)' }}>
            <span>🎯 {tours.length} combo</span>
            <span>⭐ Đánh giá 4.8+</span>
            <span>🔥 Hot</span>
          </div>
        </div>
      </section>

      {/* Featured carousel */}
      {featured.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">🔥 Được yêu thích nhất</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--coral)', fontWeight: 700, background: 'rgba(255,127,107,0.1)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>HOT</span>
          </div>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
            {featured.map(t => (
              <Link key={t.id} href={`/tours-combo/${t.id}`} style={{ flexShrink: 0, width: 280 }}>
                <div className="card" style={{ overflow: 'hidden', position: 'relative' }}>
                  <div style={{ height: 160, position: 'relative', overflow: 'hidden' }}>
                    <img src={t.cover_img} alt={t.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.target as any).src = '/assets/citadel.png'} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
                    {t.original_price > t.price && t.price > 0 && (
                      <span style={{ position: 'absolute', top: 10, left: 10, background: '#EF4444', color: 'white', padding: '3px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.6875rem', fontWeight: 700 }}>-{Math.round((1 - t.price / t.original_price) * 100)}%</span>
                    )}
                    <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12 }}>
                      <p style={{ color: 'white', fontWeight: 700, fontSize: '1rem', lineHeight: 1.3, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{t.title}</p>
                    </div>
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--navy-muted)', lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.short_desc || t.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, fontSize: '0.6875rem', color: 'var(--navy-muted)' }}>
                        <span>⏱️ {t.duration_hours}h</span>
                        <span>📍 {(t.place_ids || []).length} điểm</span>
                        <span>⭐ {t.rating}</span>
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--coral)', fontSize: '0.9375rem' }}>{formatPrice(t.price)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Theme filter */}
      <section style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          <button onClick={() => setActiveTheme('all')} style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'var(--font)', background: activeTheme === 'all' ? 'linear-gradient(135deg, var(--coral), var(--warm-orange))' : 'var(--card-bg)', color: activeTheme === 'all' ? 'white' : 'var(--navy)', boxShadow: activeTheme === 'all' ? 'var(--shadow-glow)' : 'var(--shadow-sm)' }}>🌟 Tất cả</button>
          {themes.map(th => (
            <button key={th} onClick={() => setActiveTheme(activeTheme === th ? 'all' : th)} style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'var(--font)', background: activeTheme === th ? 'linear-gradient(135deg, var(--coral), var(--warm-orange))' : 'var(--card-bg)', color: activeTheme === th ? 'white' : 'var(--navy)', boxShadow: activeTheme === th ? 'var(--shadow-glow)' : 'var(--shadow-sm)' }}>
              {THEME_EMOJI[th] || '🎯'} {th}
            </button>
          ))}
        </div>
      </section>

      {/* Tour cards grid */}
      <section className="section" style={{ marginBottom: 100 }}>
        <div className="section-header">
          <h2 className="section-title">🎯 {activeTheme === 'all' ? 'Tất cả combo' : `${THEME_EMOJI[activeTheme] || ''} ${activeTheme}`}</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)' }}>{filtered.length} tour</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: 200, borderRadius: 'var(--radius-lg)' }} className="skeleton" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--navy-muted)' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎭</p>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>Sắp có combo mới!</h3>
            <p style={{ fontSize: '0.875rem' }}>Đội ngũ đang chuẩn bị những trải nghiệm tuyệt vời cho bạn.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map(t => (
              <Link key={t.id} href={`/tours-combo/${t.id}`}>
                <div className="card" style={{ display: 'flex', gap: 14, padding: 0, overflow: 'hidden' }}>
                  <div style={{ width: 130, minHeight: 140, position: 'relative', flexShrink: 0 }}>
                    <img src={t.cover_img} alt={t.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.target as any).src = '/assets/citadel.png'} />
                    {t.original_price > t.price && t.price > 0 && (
                      <span style={{ position: 'absolute', top: 8, left: 8, background: '#EF4444', color: 'white', padding: '2px 6px', borderRadius: 'var(--radius-full)', fontSize: '0.625rem', fontWeight: 700 }}>-{Math.round((1 - t.price / t.original_price) * 100)}%</span>
                    )}
                  </div>
                  <div style={{ flex: 1, padding: '14px 14px 14px 0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--coral)', background: 'rgba(255,127,107,0.1)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>{THEME_EMOJI[t.theme]} {t.theme}</span>
                        <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--navy-muted)' }}>{DIFF_LABEL[t.difficulty]}</span>
                      </div>
                      <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--navy)', lineHeight: 1.3, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.title}</h3>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--navy-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.short_desc}</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 8, fontSize: '0.6875rem', color: 'var(--navy-muted)' }}>
                        <span>⏱️ {t.duration_hours}h</span>
                        <span>📍 {(t.place_ids || []).length}</span>
                        <span>⭐ {t.rating}</span>
                        {t.review_count > 0 && <span>({t.review_count})</span>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {t.original_price > t.price && t.price > 0 && <p style={{ fontSize: '0.625rem', color: 'var(--gray-soft)', textDecoration: 'line-through' }}>{formatPrice(t.original_price)}</p>}
                        <p style={{ fontWeight: 800, color: 'var(--coral)', fontSize: '1rem' }}>{formatPrice(t.price)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Social proof */}
      <section style={{ padding: '0 20px 100px' }}>
        <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius-xl)', padding: '20px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--navy)', fontWeight: 600, marginBottom: 4 }}>💬 &quot;Không cần suy nghĩ, chọn combo là xong!&quot;</p>
          <p style={{ fontSize: '0.6875rem', color: 'var(--navy-muted)' }}>— 1,200+ du khách đã trải nghiệm</p>
        </div>
      </section>
    </>
  );
}
