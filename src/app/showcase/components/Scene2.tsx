'use client';
import { assets, scenes } from '../config';

export default function Scene2({ active }: { active: boolean }) {
  const cfg = scenes[1];
  return (
    <div className={`sc-scene${active ? ' active' : ''}`}>
      <div className="sc-bg" style={{ background: 'radial-gradient(ellipse at 50% 60%, rgba(61,31,86,0.4) 0%, rgba(13,10,26,1) 70%)' }} />

      <div className="sc2-wrap">
        <div style={{ position: 'relative' }}>
          {/* Dragon trail wrapping phone */}
          <svg className="sc2-dragon-trail" viewBox="0 0 320 560" style={{ width: 320, height: 560 }}>
            <defs>
              <linearGradient id="dg2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F47B20" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#FFAA55" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <path
              className="sc-dragon-path"
              d="M40,520 C20,400 60,300 40,200 C20,100 80,40 160,30 C240,20 300,100 280,200 C260,300 300,400 280,520"
              style={{ strokeDasharray: 800, strokeDashoffset: 800 }}
            />
          </svg>
          <div className="sc2-phone">
            {/* THAY: screenshot màn hình chính ứng dụng */}
            <img src={assets.screenDiscover} alt="HueViVu app screenshot" />
          </div>
        </div>

        <div className="sc2-brand">
          <div className="sc2-logo-text">{cfg.texts.brand}</div>
          <div className="sc2-tagline">{cfg.texts.tagline}</div>
        </div>
      </div>
    </div>
  );
}
