import React from 'react';

export type CategoryFilterProps = {
  categories: { key: string; label: string; emoji?: string }[];
  activeCategory: string;
  onChange: (key: string) => void;
  style?: React.CSSProperties;
};

export default function CategoryFilter({ categories, activeCategory, onChange, style }: CategoryFilterProps) {
  return (
    <div className="filter-chips" style={style}>
      {categories.map(cat => (
        <button
          key={cat.key}
          className={`filter-chip ${activeCategory === cat.key ? 'active' : ''}`}
          onClick={() => onChange(cat.key)}
        >
          {cat.emoji ? `${cat.emoji} ${cat.label}` : cat.label}
        </button>
      ))}
    </div>
  );
}
