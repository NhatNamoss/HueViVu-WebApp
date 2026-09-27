'use client';
import { assets, scenes } from '../config';

export default function Scene1({ active }: { active: boolean }) {
  const cfg = scenes[0];
  return (
    <div className={`sc-scene${active ? ' active' : ''}`}>
      <div className="sc-bg sc1-bg" style={{ backgroundImage: `url(${assets.ngoMon})` }} />
      <div className="sc-bg-overlay sc1-overlay" />

      {/* Gate doors opening */}
      <div className="sc1-gate">
        <div className="sc1-door sc1-door-left" />
        <div className="sc1-door sc1-door-right" />
      </div>

      {/* Dragon trail */}
      <svg className="sc-dragon-svg" style={{ width: '100%', height: '100%', top: 0, left: 0 }} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="dragonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F47B20" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#FFAA55" />
            <stop offset="100%" stopColor="#F47B20" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <path
          className="sc-dragon-path"
          d="M600,700 C580,600 520,500 600,400 C680,300 750,350 700,250 C650,150 600,180 600,100"
        />
      </svg>

      <div className="sc1-content">
        <p className={`sc1-text${active ? ' show' : ''}`} style={{ animationDelay: '2.5s' }}>
          {cfg.texts.line1}
        </p>
        <p className={`sc1-text sc1-text-2${active ? ' show' : ''}`} style={{ animationDelay: '4s' }}>
          {cfg.texts.line2}
        </p>
      </div>
    </div>
  );
}
