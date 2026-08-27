'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type FeedTrip = {
  id: string; title: string; summary: string; duration: number;
  companion: string; total_cost_estimate: string; highlights: string[];
  like_count: number; owner_name: string; liked: boolean; saved: boolean;
  created_at: string; ai_match_score: number;
};

export default function CommunityPage() {
  const [feed, setFeed] = useState<FeedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const token = localStorage.getItem('hv_token');
    fetch('/api/feed', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json()).then(data => {
        setFeed(Array.isArray(data) ? data : []);
        const m: Record<string, boolean> = {};
        (Array.isArray(data) ? data : []).forEach((t: FeedTrip) => { m[t.id] = t.liked; });
        setLikedMap(m);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  const handleLike = async (tripId: string) => {
    const token = localStorage.getItem('hv_token');
    setLikedMap(prev => ({ ...prev, [tripId]: !prev[tripId] }));
    setFeed(prev => prev.map(t => t.id === tripId ? { ...t, like_count: t.liked ? t.like_count - 1 : t.like_count + 1 } : t));
    await fetch(`/api/feed/${tripId}/like`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  };

  return (
    <>
      <header className="page-header">
        <h1 className="page-header-title">Cộng đồng</h1>
        <div className="ai-badge"><span className="ai-badge-dot" />Live</div>
      </header>

      {/* AI Banner */}
      <div style={{ margin: '8px 20px 16px', background: 'linear-gradient(135deg, var(--navy), var(--navy-light))', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em', marginBottom: 4 }}>CỘNG ĐỒNG HUEVIVU</p>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'white', marginBottom: 4 }}>Khám phá hành trình của nhau ✨</p>
        <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>Những lịch trình được AI tạo và chia sẻ bởi cộng đồng du lịch Huế.</p>
      </div>

      {/* Feed */}
      <section style={{ padding: '0 20px', marginBottom: 100 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 160, borderRadius: 'var(--radius-lg)' }} className="skeleton" />
            ))}
          </div>
        ) : feed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: '3rem', marginBottom: 12 }}>🌐</p>
            <h3 style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Chưa có lịch trình được chia sẻ</h3>
            <p style={{ color: 'var(--navy-muted)', fontSize: '0.875rem', marginBottom: 20 }}>Hãy là người đầu tiên chia sẻ hành trình Huế của bạn!</p>
            <Link href="/flow" className="btn-primary" style={{ display: 'inline-flex' }}>✨ Tạo & chia sẻ</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {feed.map(trip => (
              <div key={trip.id} style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', padding: '16px', boxShadow: 'var(--shadow-sm)', border: '1px solid rgba(255,255,255,0.6)' }}>
                {/* User & Meta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                    {trip.owner_name?.[0]?.toUpperCase() || 'H'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--navy)' }}>{trip.owner_name || 'Khách du lịch'}</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--gray-soft)' }}>{new Date(trip.created_at).toLocaleDateString('vi-VN')}</p>
                  </div>
                  {trip.ai_match_score && (
                    <div style={{ padding: '4px 10px', background: 'rgba(255,127,107,0.08)', borderRadius: 'var(--radius-full)', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--coral)' }}>✨ {trip.ai_match_score}%</div>
                  )}
                </div>

                <Link href={`/trips/${trip.id}`} style={{ textDecoration: 'none' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 6, lineHeight: 1.3 }}>{trip.title}</h3>
                  {trip.summary && <p style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)', lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{trip.summary}</p>}

                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--navy-muted)' }}>📅 {trip.duration} ngày</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--navy-muted)' }}>· {trip.companion}</span>
                    {trip.total_cost_estimate && <span style={{ fontSize: '0.75rem', color: 'var(--navy-muted)' }}>· {trip.total_cost_estimate}</span>}
                  </div>

                  {trip.highlights?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {trip.highlights.slice(0, 3).map((h: string, i: number) => (
                        <span key={i} style={{ padding: '3px 10px', background: 'rgba(26,29,59,0.04)', borderRadius: 'var(--radius-full)', fontSize: '0.6875rem', fontWeight: 500, color: 'var(--navy)' }}>✦ {h}</span>
                      ))}
                    </div>
                  )}
                </Link>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 10, borderTop: '1px solid rgba(26,29,59,0.05)' }}>
                  <button onClick={() => handleLike(trip.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: likedMap[trip.id] ? 'var(--coral)' : 'var(--gray-soft)', fontFamily: 'var(--font)', fontWeight: 600, fontSize: '0.875rem', padding: 0, transition: 'all 0.2s' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={likedMap[trip.id] ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                    {trip.like_count}
                  </button>
                  <Link href={`/trips/${trip.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--navy-muted)', fontWeight: 600, fontSize: '0.875rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Xem lịch trình
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
