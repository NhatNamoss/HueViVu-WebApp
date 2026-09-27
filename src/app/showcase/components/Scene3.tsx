'use client';
import { assets, scenes, samplePlaces } from '../config';

export default function Scene3({ active }: { active: boolean }) {
  const cfg = scenes[2];
  return (
    <div className={`sc-scene${active ? ' active' : ''}`}>
      <div className="sc-bg" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(61,31,86,0.3) 0%, rgba(13,10,26,1) 60%)' }} />

      <p className="sc3-title">{cfg.texts.title}</p>

      <div className="sc3-layout">
        <div className="sc3-phone-side">
          {/* THAY: screenshot explore screen */}
          <img src={assets.screenExplore} alt="Explore screen" />
        </div>

        <div className="sc3-cards">
          {samplePlaces.map((p, i) => (
            <div className="sc3-card" key={i}>
              {/* THAY: ảnh địa điểm thật */}
              <img className="sc3-card-img" src={p.img} alt={p.name} />
              <div className="sc3-card-body">
                <div className="sc3-card-tag">{p.tag}</div>
                <div className="sc3-card-name">{p.name}</div>
                <div className="sc3-card-desc">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dragon connecting places */}
      <svg className="sc-dragon-svg" style={{ width: '100%', height: '100%', top: 0, left: 0, opacity: 0.3 }} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <path
          className="sc-dragon-path"
          d="M300,400 C400,350 500,450 600,400 C700,350 800,450 900,400"
          style={{ stroke: 'rgba(244,123,32,0.4)', strokeDasharray: 400, strokeDashoffset: 400 }}
        />
      </svg>
    </div>
  );
}
