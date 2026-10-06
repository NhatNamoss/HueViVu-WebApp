'use client';
import Link from 'next/link';
import { useState, useCallback, useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

const categoryLabel: Record<string, string> = {
  heritage: 'DI TÍCH HUẾ',
  food: 'ẨM THỰC HUẾ',
  nature: 'THIÊN NHIÊN',
  temple: 'CHÙA CHIỀN',
  cafe: 'CÀ PHÊ HUẾ',
  market: 'CHỢ HUẾ',
  craft_village: 'LÀNG NGHỀ',
};

export type PlaceCardProps = {
  place: {
    id: string;
    name: string;
    category: string;
    rating: number;
    price: string;
    img: string;
    duration?: string;
    opening_status?: { status: 'open' | 'closing_soon' | 'closed' | 'unknown'; label: string };
  };
  layout?: 'horizontal' | 'grid';
};

/* ponytail: save state in localStorage; upgrade to API/DB when auth is ready */
function useSaved(id: string): [boolean, () => void] {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      const list: string[] = JSON.parse(localStorage.getItem('huevivu_saved') || '[]');
      setSaved(list.includes(id));
    } catch { /* noop */ }
  }, [id]);
  const toggle = useCallback(() => {
    setSaved(prev => {
      const list: string[] = JSON.parse(localStorage.getItem('huevivu_saved') || '[]');
      const next = !prev;
      localStorage.setItem('huevivu_saved', JSON.stringify(next ? [...list, id] : list.filter(x => x !== id)));
      return next;
    });
  }, [id]);
  return [saved, toggle];
}

export default function PlaceCard({ place, layout = 'grid' }: PlaceCardProps) {
  const [imgSrc, setImgSrc] = useState(place.img || '/assets/citadel.png');
  const [saved, toggleSave] = useSaved(place.id);
  const isHorizontal = layout === 'horizontal';

  const label = categoryLabel[place.category] || 'ĐỊA ĐIỂM';
  const cost = place.price || 'Chi phí tùy món';
  const opening = place.opening_status;

  return (
    <Link
      href={`/places/${place.id}`}
      onClick={() => trackEvent('view', { place_id: place.id, metadata: { surface: 'place_card', layout } })}
      className="place-card-link"
      style={isHorizontal ? { flexShrink: 0, width: 260 } : { display: 'block' }}
    >
      <div className="place-card">
        {/* ── Image ── */}
        <div className="place-card-img">
          <img
            src={imgSrc}
            alt={place.name}
            onError={() => setImgSrc('/assets/citadel.png')}
          />
          {/* Category badge — top left */}
          <span className="place-badge">{label}</span>
          {/* Save button — top right */}
          <button
            className="place-save-btn"
            aria-label={saved ? 'Bỏ lưu' : 'Lưu địa điểm'}
            onClick={e => { e.preventDefault(); e.stopPropagation(); toggleSave(); trackEvent(saved ? 'unsave' : 'save', { place_id: place.id }); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={saved ? 'var(--coral)' : 'none'} stroke={saved ? 'var(--coral)' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>

        {/* ── Info ── */}
        <div className="place-card-body">
          {/* Decorative Hue cloud motif */}
          <div className="place-card-motif" aria-hidden="true" />

          <div className="place-card-header">
            <h3 className="place-card-name">{place.name}</h3>
            <span className="place-card-rating">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--warm-orange)" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              {place.rating}
            </span>
          </div>

          <div className="place-card-meta">
            {place.duration && (
              <span className="place-card-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {place.duration}
              </span>
            )}
            <span className="place-card-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              {cost}
            </span>
            {opening && <span className="place-card-meta-item" style={{ color: opening.status === 'open' ? '#15803D' : opening.status === 'closing_soon' ? '#B45309' : opening.status === 'closed' ? '#B91C1C' : 'var(--navy-muted)', fontWeight: 700 }}>
              {opening.status === 'open' ? '●' : opening.status === 'closing_soon' ? '◐' : opening.status === 'closed' ? '○' : '·'} {opening.label}
            </span>}
          </div>

          <span className="place-card-cta">Khám phá địa điểm →</span>
        </div>
      </div>
    </Link>
  );
}
