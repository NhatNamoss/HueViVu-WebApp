'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Trip = {
  id: string; title: string; summary: string; duration: number;
  companion: string; total_cost_estimate: string; status: string;
  created_at: string; ai_match_score: number; like_count: number;
};

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'past'>('active');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('hv_token');
    if (!token) { router.push('/onboarding'); return; }
    fetch('/api/trips', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { setTrips(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = trips.filter(t => {
    if (activeTab === 'active') return t.status === 'active';
    if (activeTab === 'upcoming') return t.status === 'upcoming';
    return t.status === 'past';
  });

  const statusColors: Record<string, string> = {
    active: '#4CAF50', upcoming: 'var(--coral)', past: 'var(--gray-soft)',
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="section-eyebrow" style={{ marginBottom: 2 }}>Hành trình của tôi</p>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 600, color: 'var(--navy)' }}>
            Mỗi chuyến đi, một <em style={{ color: 'var(--coral)' }}>kỷ niệm</em>
          </h1>
        </div>
        <Link href="/flow" className="header-btn" style={{ color: 'var(--coral)', background: 'rgba(255,127,107,0.08)', border: '1px solid rgba(255,127,107,0.2)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </Link>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 20px 0', borderBottom: '1px solid rgba(26,29,59,0.06)', marginBottom: 16 }}>
        {[
          { key: 'active', label: 'Đang diễn ra' },
          { key: 'upcoming', label: 'Sắp tới' },
          { key: 'past', label: 'Đã qua' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              flex: 1, padding: '10px 4px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.8125rem', fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? 'var(--coral)' : 'var(--navy-muted)',
              borderBottom: `2px solid ${activeTab === tab.key ? 'var(--coral)' : 'transparent'}`,
              marginBottom: -1, transition: 'all 0.2s', fontFamily: 'var(--font)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section style={{ padding: '0 20px', marginBottom: 100 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: 120, borderRadius: 'var(--radius-lg)' }} className="skeleton" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p className="animate-float" style={{ fontSize: '3rem', marginBottom: 16 }}>
              {activeTab === 'active' ? '🗺️' : activeTab === 'upcoming' ? '✨' : '💫'}
            </p>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--navy)', marginBottom: 8 }}>
              {activeTab === 'active'
                ? 'Chưa có hành trình nào đang diễn ra'
                : activeTab === 'upcoming'
                ? 'Chuyến đi tiếp theo của bạn đang chờ...'
                : 'Những kỷ niệm của bạn sẽ hiện ra ở đây'}
            </h3>
            <p style={{ color: 'var(--navy-muted)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: 20, maxWidth: 260, margin: '0 auto 20px' }}>
              {activeTab === 'active'
                ? 'Hãy để AI lên một lịch trình Huế đặc biệt riêng cho bạn.'
                : activeTab === 'upcoming'
                ? 'Đặt chuyến đi tiếp theo — chỉ vài câu trả lời, AI sẽ lộ trình cho bạn.'
                : 'Đây là nơi lưu giữ những chuyến đi đã qua của bạn.'}
            </p>
            {activeTab !== 'past' && (
              <Link href="/flow" className="btn-ripple" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 24px',
                background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))',
                color: 'white', borderRadius: 'var(--radius-full)',
                fontWeight: 700, fontSize: '0.9375rem',
                boxShadow: 'var(--shadow-glow)',
              }}>
                Lên kế hoạch với AI →
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {filtered.map(trip => (
              <Link key={trip.id} href={`/trips/${trip.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: '16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg, var(--peach-light), var(--cream))' }}>
                    <img src="/assets/hero-hub.png" alt="trip" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: statusColors[trip.status], display: 'inline-block',
                      }} className={trip.status === 'active' ? 'animate-heartbeat' : ''} />
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: statusColors[trip.status], letterSpacing: '0.05em' }}>
                        {trip.status === 'active' ? 'ĐANG DIỄN RA' : trip.status === 'upcoming' ? 'SẮP TỚI' : 'ĐÃ QUA'}
                      </span>
                    </div>
                    <h3 style={{
                      fontSize: '1rem', fontWeight: 600, color: 'var(--navy)', marginBottom: 4,
                      lineHeight: 1.3, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{trip.title}</h3>
                    <div style={{ display: 'flex', gap: 10, fontSize: '0.75rem', color: 'var(--navy-muted)' }}>
                      <span>📅 {trip.duration} ngày</span>
                      <span>· {trip.companion}</span>
                      {trip.total_cost_estimate && <span>· {trip.total_cost_estimate}</span>}
                    </div>
                    {trip.ai_match_score && (
                      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ height: 3, borderRadius: 2, background: 'rgba(26,29,59,0.08)', flex: 1, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${trip.ai_match_score}%`, background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--coral)' }}>{trip.ai_match_score}% AI match</span>
                      </div>
                    )}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
