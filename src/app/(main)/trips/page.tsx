'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Trip = {
  id: string; title: string; summary: string; duration: number;
  companion: string; total_cost_estimate: string; status: string;
  created_at: string; start_date?: string; ai_match_score: number; like_count: number;
};

const COMPANION_LABELS: Record<string, string> = { solo: 'Một mình', couple: 'Cặp đôi', family: 'Gia đình', friends: 'Nhóm bạn' };
const STATUS_META: Record<string, { label: string; color: string; background: string }> = {
  active: { label: 'Đang đi', color: '#15803D', background: 'rgba(34,197,94,.1)' },
  upcoming: { label: 'Sắp tới', color: '#C2410C', background: 'rgba(255,127,107,.11)' },
  past: { label: 'Đã hoàn thành', color: '#6B6E8A', background: 'rgba(26,29,59,.06)' },
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
  }, [router]);

  const filtered = trips.filter(t => {
    if (activeTab === 'active') return t.status === 'active';
    if (activeTab === 'upcoming') return t.status === 'upcoming';
    return t.status === 'past';
  });

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
          { key: 'active', label: 'Đang đi' },
          { key: 'upcoming', label: 'Sắp tới' },
          { key: 'past', label: 'Đã xong' },
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
            {tab.label} <span style={{ marginLeft: 3, opacity: .65 }}>{trips.filter(trip => trip.status === tab.key).length}</span>
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
                <article className="card" style={{ padding: '16px', display: 'grid', gridTemplateColumns: '72px minmax(0,1fr) 20px', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'linear-gradient(135deg, var(--peach-light), var(--cream))' }}>
                    <img src="/assets/hero-hub.png" alt="trip" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'inline-flex', marginBottom: 7, padding: '3px 8px', borderRadius: 999, background: STATUS_META[trip.status]?.background, color: STATUS_META[trip.status]?.color, fontSize: '.66rem', fontWeight: 800 }}>{STATUS_META[trip.status]?.label}</span>
                    <h3 style={{
                      fontSize: '1rem', fontWeight: 750, color: 'var(--navy)', marginBottom: 6,
                      lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>{trip.title}</h3>
                    <p style={{ margin: 0, fontSize: '.75rem', color: 'var(--navy-muted)', lineHeight: 1.5 }}>{trip.duration} ngày · {COMPANION_LABELS[trip.companion] || trip.companion}{trip.start_date ? ` · ${new Date(`${trip.start_date}T00:00:00`).toLocaleDateString('vi-VN')}` : ''}</p>
                    {trip.total_cost_estimate && <p style={{ margin: '3px 0 0', fontSize: '.75rem', fontWeight: 700, color: 'var(--coral)' }}>Dự kiến {trip.total_cost_estimate}</p>}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
