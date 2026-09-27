'use client';
import { assets, scenes } from '../config';

export default function Scene5({ active }: { active: boolean }) {
  const cfg = scenes[4];
  /* 6 gallery images — THAY bằng ảnh Huế thật */
  const imgs = [
    assets.ngoMon, assets.daiNoi, assets.river,
    assets.food, assets.screenDiscover, assets.ngoMon,
  ];
  return (
    <div className={`sc-scene${active ? ' active' : ''}`}>
      <div className="sc5-gallery">
        {imgs.map((src, i) => (
          <img className="sc5-img" key={i} src={src} alt={`Huế ${i + 1}`} />
        ))}
      </div>
      <div className="sc5-overlay" />
      <p className="sc5-message">{cfg.texts.message}</p>
    </div>
  );
}
