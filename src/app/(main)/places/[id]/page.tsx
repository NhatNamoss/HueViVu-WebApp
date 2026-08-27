'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PlaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [place, setPlace] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/places/${params.id}`)
      .then(r => r.json())
      .then(data => { setPlace(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ height: 300, borderRadius: 'var(--radius-xl)', marginBottom: 16 }} className="skeleton" />
        <div style={{ height: 100, borderRadius: 'var(--radius-lg)' }} className="skeleton" />
      </div>
    );
  }

  if (!place || place.error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
        <p style={{ fontSize: '3rem' }}>😕</p>
        <p style={{ fontWeight: 600 }}>Không tìm thấy địa điểm</p>
        <Link href="/explore" className="btn-primary">Quay lại Khám phá</Link>
      </div>
    );
  }

  const categoryEmoji: Record<string, string> = {
    heritage: '🏛️', food: '🍜', nature: '🌿', temple: '🛕', cafe: '☕', market: '🛍️', craft_village: '🎨',
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header Image */}
      <div style={{ position: 'relative', height: 320, overflow: 'hidden' }}>
        <img src={place.img || '/assets/citadel.png'} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).src = '/assets/citadel.png'; }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(26,29,59,0.3) 0%, rgba(26,29,59,0.1) 40%, rgba(26,29,59,0.8) 100%)' }} />
        
        {/* Top Nav */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 20px', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.4)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <button style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.4)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          </button>
        </div>

        {/* Title */}
        <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
          <div style={{ display: 'inline-block', padding: '4px 10px', background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', borderRadius: 'var(--radius-full)', fontSize: '0.6875rem', fontWeight: 700, color: 'white', marginBottom: 8, letterSpacing: '0.05em' }}>
            {categoryEmoji[place.category]} {place.category.toUpperCase()}
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 6 }}>{place.name}</h1>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)' }}>
            <span>⭐ {place.rating} ({place.rating_count})</span>
            <span>📍 Huế</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>
        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div className="card" style={{ padding: '14px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: '1.25rem' }}>💰</span>
            <div>
              <p style={{ fontSize: '0.6875rem', color: 'var(--navy-muted)', fontWeight: 600 }}>CHI PHÍ</p>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--navy)' }}>{place.price}</p>
            </div>
          </div>
          <div className="card" style={{ padding: '14px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: '1.25rem' }}>⏱️</span>
            <div>
              <p style={{ fontSize: '0.6875rem', color: 'var(--navy-muted)', fontWeight: 600 }}>THỜI GIAN</p>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--navy)' }}>{place.duration}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 24 }}>
          <h3 className="section-title">Giới thiệu</h3>
          <p style={{ fontSize: '0.9375rem', color: 'var(--navy-muted)', lineHeight: 1.6, marginTop: 8 }}>{place.description}</p>
        </div>

        {/* Location */}
        <div style={{ marginBottom: 24 }}>
          <h3 className="section-title">Vị trí</h3>
          <div className="card" style={{ padding: '12px', marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'rgba(26,29,59,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              📍
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--navy)' }}>{place.address}</p>
          </div>
        </div>

        {/* Highlights */}
        {place.highlights?.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 className="section-title">Điểm nổi bật</h3>
            <ul style={{ paddingLeft: 20, marginTop: 8, color: 'var(--navy-muted)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              {place.highlights.map((h: string, i: number) => <li key={i} style={{ marginBottom: 6 }}>{h}</li>)}
            </ul>
          </div>
        )}

        {/* AI Tips */}
        {place.tips?.length > 0 && (
          <div style={{ background: 'rgba(255,127,107,0.06)', border: '1px solid rgba(255,127,107,0.15)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--coral)', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
              ✨ Lời khuyên từ AI
            </h3>
            <ul style={{ paddingLeft: 20, color: 'var(--navy)', fontSize: '0.875rem', lineHeight: 1.6 }}>
              {place.tips.map((t: string, i: number) => <li key={i} style={{ marginBottom: 6 }}>{t}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
