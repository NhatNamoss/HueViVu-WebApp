import Link from 'next/link';
import { useState } from 'react';

const categoryEmoji: Record<string, string> = {
  heritage: '🏛️', food: '🍜', nature: '🌿', temple: '🛕', cafe: '☕', market: '🛍️', craft_village: '🎨',
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
  };
  layout?: 'horizontal' | 'grid';
};

export default function PlaceCard({ place, layout = 'grid' }: PlaceCardProps) {
  const [imgSrc, setImgSrc] = useState(place.img || '/assets/citadel.png');

  const isHorizontal = layout === 'horizontal';

  return (
    <Link href={`/places/${place.id}`} style={isHorizontal ? { flexShrink: 0, width: 160 } : { display: 'block' }}>
      <div className="place-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div 
          className="place-card-img" 
          style={{ 
            width: '100%', 
            aspectRatio: isHorizontal ? '1' : '4/3',
            maxHeight: isHorizontal ? 130 : 160,
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <img 
            src={imgSrc} 
            alt={place.name} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            onError={() => setImgSrc('/assets/citadel.png')} 
          />
          <span className="place-badge" style={{ position: 'absolute', top: 8, right: 8 }}>
            {categoryEmoji[place.category] || '📍'}
          </span>
        </div>
        <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 4, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {place.name}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--navy-muted)', marginTop: 'auto' }}>
            <span style={{ fontWeight: 600, color: 'var(--warm-orange)' }}>⭐ {place.rating}</span>
            <span style={{ color: 'var(--coral)', fontWeight: 700 }}>{place.price}</span>
          </div>
          {place.duration && (
            <p style={{ fontSize: '0.6875rem', color: 'var(--gray-soft)', marginTop: 4 }}>⏱ {place.duration}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
