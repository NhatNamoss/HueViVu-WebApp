'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import './showcase.css';
import { scenes, totalDurationMs } from './config';
import Scene1 from './components/Scene1';
import Scene2 from './components/Scene2';
import Scene3 from './components/Scene3';
import Scene4 from './components/Scene4';
import Scene5 from './components/Scene5';
import Scene6 from './components/Scene6';

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const SceneComponents = [Scene1, Scene2, Scene3, Scene4, Scene5, Scene6];

export default function ShowcasePage() {
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef(0);
  const elapsedRef = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);

  /* Preload key images */
  useEffect(() => {
    const imgs = ['/assets/ngomon.png', '/assets/dainoi.png', '/assets/river.png', '/assets/food.png', '/assets/screen-discover.png'];
    let count = 0;
    imgs.forEach(src => {
      const img = new Image();
      img.onload = img.onerror = () => { count++; if (count >= imgs.length) setLoaded(true); };
      img.src = src;
    });
    const t = setTimeout(() => setLoaded(true), 4000); // fallback
    return () => clearTimeout(t);
  }, []);

  /* Auto-start when loaded */
  useEffect(() => {
    if (loaded && !playing && elapsed === 0) {
      const t = setTimeout(() => setPlaying(true), 600);
      return () => clearTimeout(t);
    }
  }, [loaded, playing, elapsed]);

  /* Animation loop */
  const tick = useCallback((now: number) => {
    const dt = now - startRef.current;
    const next = elapsedRef.current + dt;
    if (next >= totalDurationMs) {
      setElapsed(totalDurationMs);
      setPlaying(false);
      return;
    }
    setElapsed(next);
    startRef.current = now;
    elapsedRef.current = next;
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (playing) {
      startRef.current = performance.now();
      elapsedRef.current = elapsed;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Determine active scene */
  const activeIdx = scenes.findIndex((s, i) => {
    const next = scenes[i + 1];
    return elapsed >= s.startMs && (!next || elapsed < next.startMs);
  });

  /* Controls */
  const togglePlay = () => setPlaying(p => !p);
  const restart = () => { setElapsed(0); elapsedRef.current = 0; setPlaying(true); };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ms = pct * totalDurationMs;
    setElapsed(ms);
    elapsedRef.current = ms;
  };

  const pct = (elapsed / totalDurationMs) * 100;

  return (
    <div className="showcase-root">
      {/* Loader */}
      <div className={`sc-loader${loaded ? ' hidden' : ''}`}>
        <div className="sc-loader-bar"><div className="sc-loader-fill" /></div>
        <div className="sc-loader-text">Đang chuẩn bị trải nghiệm...</div>
      </div>

      {/* Viewport */}
      <div className="sc-viewport">
        {SceneComponents.map((Comp, i) => (
          <Comp key={i} active={activeIdx === i} />
        ))}
      </div>

      {/* Controls */}
      <div className="sc-controls">
        {/* Play/Pause */}
        <button onClick={togglePlay} aria-label={playing ? 'Tạm dừng' : 'Phát'}>
          {playing ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>

        {/* Restart */}
        <button onClick={restart} aria-label="Xem lại">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
        </button>

        {/* Progress */}
        <div className="sc-progress-track" ref={trackRef} onClick={seek}>
          <div className="sc-progress-fill" style={{ width: `${pct}%` }} />
        </div>

        {/* Time */}
        <span className="sc-time">{fmt(elapsed)}</span>
      </div>
    </div>
  );
}
