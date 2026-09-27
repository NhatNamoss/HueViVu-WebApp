'use client';
import { assets, scenes } from '../config';

export default function Scene6({ active }: { active: boolean }) {
  const cfg = scenes[5];
  return (
    <div className={`sc-scene${active ? ' active' : ''}`}>
      <div className="sc-bg" style={{ backgroundImage: `url(${assets.ngoMon})` }} />
      <div className="sc-bg-overlay" style={{
        background: 'radial-gradient(ellipse at 50% 60%, rgba(13,10,26,0.75) 0%, rgba(13,10,26,0.95) 100%)',
      }} />

      {/* Dragon final flourish */}
      <svg className="sc-dragon-svg" style={{ width: '100%', height: '100%', top: 0, left: 0 }} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="dragonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F47B20" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#FFAA55" />
            <stop offset="100%" stopColor="#F47B20" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <path
          className="sc-dragon-path"
          d="M200,600 C300,500 400,550 500,450 C600,350 650,400 600,300 C550,200 600,150 700,200 C800,250 750,300 800,350"
          style={{ strokeDasharray: 700, strokeDashoffset: 700 }}
        />
      </svg>

      <div className="sc6-wrap">
        {/* THAY: logo thật */}
        <img className="sc6-logo" src={assets.logo} alt="HueViVu logo" />
        <div className="sc6-brand">HueViVu</div>
        <div className="sc6-tagline">{cfg.texts.tagline}</div>
        <a className="sc6-cta" href={cfg.texts.ctaUrl}>{cfg.texts.cta}</a>
      </div>
    </div>
  );
}
