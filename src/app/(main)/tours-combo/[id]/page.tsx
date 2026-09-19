'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const DIFF_LABEL: Record<string, string> = { easy: '🟢 Dễ', moderate: '🟡 Vừa', hard: '🔴 Thử thách' };
function formatPrice(n: number) { return n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : n > 0 ? `${n}đ` : 'Miễn phí'; }

export default function TourDetailPage() {
  const { id } = useParams();
  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tours/${id}`).then(r => r.json()).then(setTour).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--navy-muted)' }}>Đang tải...</div>;
  if (!tour) return <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--coral)' }}>Không tìm thấy tour</div>;

  const places = tour.places || [];
  const discount = tour.original_price > tour.price && tour.price > 0 ? Math.round((1 - tour.price / tour.original_price) * 100) : 0;

  return (
    <>
      {/* Cover */}
      <div style={{ position: 'relative', height: 240, overflow: 'hidden' }}>
        <img src={tour.cover_img} alt={tour.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.target as any).src = '/assets/citadel.png'} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />
        <Link href="/tours-combo" style={{ position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>←</Link>
        {discount > 0 && <span style={{ position: 'absolute', top: 16, right: 16, background: '#EF4444', color: 'white', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700 }}>-{discount}%</span>}
        <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}>
          <p style={{ fontSize: '1.375rem', fontWeight: 800, color: 'white', lineHeight: 1.3, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{tour.title}</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)' }}>
            <span>⏱️ {tour.duration_hours}h</span>
            <span>📍 {places.length} điểm</span>
            <span>⭐ {tour.rating}{tour.review_count > 0 ? ` (${tour.review_count})` : ''}</span>
            <span>{DIFF_LABEL[tour.difficulty]}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px', marginBottom: 100 }}>
        {/* Price */}
        <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            {discount > 0 && <p style={{ fontSize: '0.75rem', color: 'var(--gray-soft)', textDecoration: 'line-through' }}>{formatPrice(tour.original_price)}</p>}
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--coral)' }}>{formatPrice(tour.price)}</p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--navy-muted)' }}>/ người · tối đa {tour.max_people} người</p>
          </div>
          <button className="btn-primary btn-ripple" style={{ padding: '12px 24px', fontSize: '0.875rem' }}>Đặt ngay →</button>
        </div>

        {/* Description */}
        {tour.description && (
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>📖 Về combo này</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)', lineHeight: 1.7 }}>{tour.description}</p>
          </div>
        )}

        {/* Highlights */}
        {tour.highlights?.length > 0 && (
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>✨ Điểm nổi bật</h3>
            {tour.highlights.map((h: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.8125rem', color: 'var(--navy-muted)' }}>
                <span style={{ color: 'var(--coral)', flexShrink: 0 }}>•</span><span>{h}</span>
              </div>
            ))}
          </div>
        )}

        {/* Route / Places */}
        {places.length > 0 && (
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>🗺️ Lộ trình chi tiết</h3>
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom, var(--coral), var(--warm-orange))', borderRadius: 2 }} />
              {places.map((p: any, i: number) => (
                <div key={p.id} style={{ position: 'relative', marginBottom: i < places.length - 1 ? 20 : 0 }}>
                  <div style={{ position: 'absolute', left: -19, top: 2, width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5625rem', fontWeight: 800, color: 'white' }}>{i + 1}</div>
                  <Link href={`/places/${p.id}`} style={{ display: 'block' }}>
                    <div style={{ display: 'flex', gap: 12, padding: '10px 12px', background: 'rgba(255,127,107,0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,127,107,0.1)' }}>
                      <img src={p.img || '/assets/citadel.png'} alt={p.name} style={{ width: 56, height: 56, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }} onError={e => (e.target as any).src = '/assets/citadel.png'} />
                      <div>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 2 }}>{p.name}</p>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--navy-muted)' }}>⭐ {p.rating} · ⏱️ {p.avg_visit_min || 60} phút</p>
                        {p.description && <p style={{ fontSize: '0.6875rem', color: 'var(--gray-soft)', marginTop: 2, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>}
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Includes / Excludes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {tour.includes?.length > 0 && (
            <div className="card" style={{ padding: 14 }}>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>✅ Bao gồm</h4>
              {tour.includes.map((item: string, i: number) => (
                <p key={i} style={{ fontSize: '0.75rem', color: '#059669', marginBottom: 4 }}>✓ {item}</p>
              ))}
            </div>
          )}
          {tour.excludes?.length > 0 && (
            <div className="card" style={{ padding: 14 }}>
              <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>❌ Không gồm</h4>
              {tour.excludes.map((item: string, i: number) => (
                <p key={i} style={{ fontSize: '0.75rem', color: '#DC2626', marginBottom: 4 }}>✗ {item}</p>
              ))}
            </div>
          )}
        </div>

        {/* CTA bottom */}
        <div style={{ background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', borderRadius: 'var(--radius-xl)', padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white', marginBottom: 4 }}>Sẵn sàng khám phá?</p>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', marginBottom: 14 }}>Combo này phù hợp cho {tour.max_people} người · {tour.duration_hours} giờ trải nghiệm</p>
          <button className="btn-ripple" style={{ background: 'white', color: 'var(--coral)', padding: '13px 32px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '0.9375rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>Đặt combo ngay →</button>
        </div>
      </div>
    </>
  );
}
