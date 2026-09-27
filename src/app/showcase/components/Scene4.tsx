'use client';
import { assets, scenes, sampleItinerary } from '../config';

export default function Scene4({ active }: { active: boolean }) {
  const cfg = scenes[3];
  return (
    <div className={`sc-scene${active ? ' active' : ''}`}>
      <div className="sc-bg" style={{ background: 'radial-gradient(ellipse at 70% 40%, rgba(61,31,86,0.3) 0%, rgba(13,10,26,1) 60%)' }} />

      <div className="sc4-layout">
        <div className="sc4-chat">
          {/* User bubble */}
          <div className="sc4-bubble sc4-bubble-user">
            {cfg.texts.userPrompt}
          </div>

          {/* AI response */}
          <div className="sc4-bubble sc4-bubble-ai">
            <div style={{ fontWeight: 600, marginBottom: 8, color: 'rgba(255,255,255,0.95)' }}>
              ✨ {cfg.texts.title}
            </div>
            <div className="sc4-itinerary">
              {sampleItinerary.map((s, i) => (
                <div className="sc4-stop" key={i}>
                  <span className="sc4-stop-time">{s.time}</span>
                  <span className="sc4-stop-name">{s.place}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="sc4-note">{cfg.texts.note}</p>
        </div>

        <div className="sc4-phone-right">
          {/* THAY: screenshot trip/itinerary screen */}
          <img src={assets.screenTrip} alt="Trip itinerary screen" />
        </div>
      </div>
    </div>
  );
}
