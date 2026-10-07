'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameInput } from './NgoMonScene';
import { TOUR_SOURCE, TOUR_STOPS } from './tour-stops';
import './ngo-mon-game.css';

const Scene = dynamic(() => import('./NgoMonScene'), { ssr: false });

export default function NgoMonGame() {
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loading, setLoading] = useState({ percent: 0, message: 'Đang mở không gian Ngọ Môn…' });
  const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  const [detail, setDetail] = useState({ percent: 0, failed: false });
  const [overview, setOverview] = useState(false);
  const [nearby, setNearby] = useState<number | null>(null); const [distance, setDistance] = useState(0);
  const [routeHint, setRouteHint] = useState('');
  const [visited, setVisited] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [voice, setVoice] = useState<'loading' | 'playing' | 'paused' | 'ended' | 'error'>('loading');
  const [audioProgress, setAudioProgress] = useState(0);
  const [notice, setNotice] = useState(''); const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const story = useRef<HTMLElement | null>(null);
  const input = useRef<GameInput>({ forward: 0, right: 0, reset: 0, guide: 0, autoWalk: false, overview: false, paused: false });
  const [autoWalking, setAutoWalking] = useState(false);
  const [held, setHeld] = useState('');
  input.current.overview = overview;
  input.current.paused = selected !== null || status !== 'ready';
  const next = [0, 1, 2].find(index => !visited.has(index)) ?? null;

  const release = useCallback(() => { input.current.forward = 0; input.current.right = 0; input.current.autoWalk = false; setAutoWalking(false); setHeld(''); }, []);
  const showNotice = (message: string) => {
    setNotice(message); if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 4200);
  };
  useEffect(() => {
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', release);
    return () => {
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', release);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      if (audio.current) { audio.current.onplay = null; audio.current.onplaying = null; audio.current.onwaiting = null; audio.current.onpause = null; audio.current.onended = null; audio.current.onerror = null; audio.current.ontimeupdate = null; audio.current.pause(); audio.current.src = ''; }
    };
  }, [release]);

  const playNarration = (index: number) => {
    if (audio.current) { audio.current.onplay = null; audio.current.onplaying = null; audio.current.onwaiting = null; audio.current.onpause = null; audio.current.onended = null; audio.current.onerror = null; audio.current.ontimeupdate = null; audio.current.pause(); audio.current.src = ''; }
    const recording = new Audio(`/audio/ngo-mon/${TOUR_STOPS[index].id}.mp3`);
    audio.current = recording; setVoice('loading'); setAudioProgress(0);
    recording.onplaying = () => setVoice('playing');
    recording.onwaiting = () => setVoice('loading');
    recording.onpause = () => { if (!recording.ended) setVoice('paused'); };
    recording.onended = () => { setVoice('ended'); setAudioProgress(100); };
    recording.onerror = () => setVoice('error');
    recording.ontimeupdate = () => { if (Number.isFinite(recording.duration) && recording.duration > 0) setAudioProgress(Math.round(recording.currentTime / recording.duration * 100)); };
    void recording.play().catch(() => setVoice('error'));
  };
  const openStop = (index: number) => {
    release(); input.current.paused = true; setSelected(index);
    setVisited(previous => new Set([...previous, index])); playNarration(index);
  };
  const closeStop = useCallback(() => { audio.current?.pause(); setSelected(null); release(); }, [release]);
  useEffect(() => {
    if (selected === null || !story.current) return;
    const previousFocus = document.activeElement;
    const panel = story.current;
    panel.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeStop(); }
      if (event.key !== 'Tab') return;
      const targets = Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]'));
      const first = targets[0]; const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus(); };
  }, [selected, closeStop]);
  const retryScene = () => { release(); setStatus('loading'); setError(''); setDetail({ percent: 0, failed: false }); setNearby(null); setRetry(value => value + 1); };
  const movementButton = (name: string, label: string, axis: 'forward' | 'right', value: number) => <button
    className={`nm-move ${held === name ? 'nm-held' : ''}`} aria-label={label}
    disabled={overview || status !== 'ready' || selected !== null}
    onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); input.current[axis] = value; setHeld(name); }}
    onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
    onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); input.current[axis] = value; setHeld(name); } }}
    onKeyUp={release} onBlur={release}>{name}</button>;

  return <main className="nm-game">
    {!started ? <section className="nm-intro">
      <div className="nm-intro-art" style={{ backgroundImage: 'url(/assets/citadel.png)' }} />
      <div className="nm-intro-card">
        <span className="nm-eyebrow">HUEVIVU · THAM QUAN 3D</span>
        <h1>Dạo bước qua Ngọ Môn</h1>
        <p>Một chuyến tham quan nhỏ như trò chơi: đi bộ quanh công trình, tìm 3 vòng sáng và nghe câu chuyện bằng tiếng Việt.</p>
        <ol><li>Kéo cảnh để nhìn quanh; giữ W A S D, phím mũi tên hoặc nút đi bộ trên màn hình.</li><li>Vòng xanh dẫn lối quanh tường. Đi đến điểm màu cam để mở thuyết minh.</li><li>Khám phá đủ 3 điểm để hoàn thành chuyến tham quan.</li></ol>
        <p className="nm-scope">Chưa quen điều khiển? Bấm “Tự đi theo lối” để tới từng điểm, có thể dừng bất cứ lúc nào. Bản này mới tái hiện khu Ngọ Môn.</p>
        <button className="nm-primary" onClick={() => { setStarted(true); setStatus('loading'); }}>Bắt đầu tham quan</button>
        <Link className="nm-link" href="/explore">Quay về khám phá Huế</Link>
      </div>
    </section> : <>
      <Scene input={input} retry={retry} visited={visited}
        onReady={() => setStatus('ready')} onError={message => { release(); setError(message); setStatus('error'); }}
        onLoading={(percent, message) => setLoading(previous => previous.percent === percent && previous.message === message ? previous : { percent, message })}
        onDetail={(percent, failed = false) => setDetail(previous => previous.percent === percent && previous.failed === failed ? previous : { percent, failed })}
        onNearby={(index, meters, hint) => { setNearby(index); setDistance(Math.round(meters)); setRouteHint(hint); }}
        onSelect={openStop} onNotice={showNotice} onAutoStop={() => setAutoWalking(false)} />
      <header className="nm-header">
        <Link className="nm-icon" href="/explore" aria-label="Rời tham quan, về khám phá">←</Link>
        <div><h1>Ngọ Môn</h1><span>{visited.size}/3 điểm đã khám phá</span></div>
        <button className="nm-small" disabled={status !== 'ready'} onClick={() => { release(); setOverview(value => !value); }}>{overview ? 'Đi bộ' : 'Toàn cảnh'}</button>
        <button className="nm-icon" disabled={status !== 'ready'} aria-label="Về điểm bắt đầu" onClick={() => { release(); setOverview(false); input.current.reset++; showNotice('Đã trở về điểm bắt đầu. Các điểm đã khám phá vẫn được giữ.'); }}>↺</button>
      </header>

      {status === 'ready' && <>
        <div className="nm-goal">
          {next !== null ? <><strong>Điểm {next + 1}: {TOUR_STOPS[next].title}</strong><span>{routeHint || TOUR_STOPS[next].hint} · Còn khoảng {distance} m</span></> : <><strong>Đã khám phá đủ 3 điểm 🎉</strong><span>Bạn có thể tiếp tục dạo quanh, nghe lại thuyết minh hoặc về khám phá Huế.</span></>}
          <small>{detail.failed ? <button onClick={retryScene}>Cảnh rõ hơn chưa tải được · Thử lại</button> : detail.percent < 100 ? `Bạn đã có thể đi bộ · Cảnh rõ hơn đang tải ${detail.percent}%` : 'Cảnh rõ hơn đã sẵn sàng'}</small>
        </div>
        <div className="nm-instructions">{overview ? 'Kéo để xoay toàn cảnh; cuộn hoặc chụm hai ngón để xem gần hơn.' : 'Kéo để nhìn · Giữ nút / W A S D để đi · Vòng xanh dẫn lối, điểm cam mở thuyết minh'}</div>
        {!overview && <>
          <div className="nm-dpad" aria-label="Điều khiển đi bộ">
            <div>{movementButton('↑', 'Đi về phía trước', 'forward', 1)}</div>
            <div>{movementButton('←', 'Đi sang trái', 'right', -1)}{movementButton('↓', 'Đi lùi', 'forward', -1)}{movementButton('→', 'Đi sang phải', 'right', 1)}</div>
          </div>
          <div className="nm-action">
            {next !== null && <button className="nm-secondary nm-auto" onClick={() => { if (autoWalking) { release(); showNotice('Đã dừng đi tự động. Bạn có thể tiếp tục tự điều khiển.'); } else { release(); input.current.guide++; input.current.autoWalk = true; setAutoWalking(true); showNotice('Đang đi theo lối tham quan. Bấm Dừng đi hoặc tự điều khiển để dừng.'); } }}>{autoWalking ? 'Dừng đi' : 'Tự đi theo lối'}</button>}
            {nearby !== null && (!visited.has(nearby) || next === null) ? <button className="nm-primary" onClick={() => openStop(nearby)}>🔊 Nghe: {TOUR_STOPS[nearby].title}</button>
              : <button className="nm-secondary" onClick={() => { input.current.guide++; showNotice('Đã hướng về vòng sáng. Nếu gặp tường, hãy đi vòng sang bên.'); }}>Nhìn về điểm tiếp theo</button>}
            {nearby !== null && visited.has(nearby) && next !== null && <button className="nm-repeat" onClick={() => openStop(nearby)}>Nghe lại điểm vừa ghé</button>}
          </div>
        </>}
      </>}
      {notice && status === 'ready' && <p className="nm-notice" role="status">{notice}</p>}

      {status !== 'ready' && <div className="nm-cover"><section className="nm-panel" aria-live="polite">
        <span className="nm-eyebrow">THAM QUAN NGỌ MÔN</span>
        <h2>{status === 'error' ? 'Chưa mở được chuyến tham quan' : loading.message}</h2>
        {status === 'error' ? <><p>{error}</p><button className="nm-primary" onClick={retryScene}>Tải lại cảnh tham quan</button></> : <>
          <div className="nm-progress" role="progressbar" aria-label="Mở cảnh tham quan" aria-valuenow={loading.percent} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${loading.percent}%` }} /></div>
          <p>{loading.percent}% · Cảnh nhẹ sẽ mở trước để bạn bắt đầu đi bộ, rồi hình ảnh rõ hơn tiếp tục tải.</p>
        </>}
        <Link className="nm-link" href="/explore">Về khám phá địa điểm</Link>
      </section></div>}

      {selected !== null && <div className="nm-cover nm-story-cover"><section ref={story} className="nm-panel nm-story" role="dialog" aria-modal="true" aria-labelledby="nm-story-title">
        <div className="nm-story-top"><span className="nm-eyebrow">ĐIỂM {selected + 1} / 3</span><button className="nm-icon" aria-label="Đóng thuyết minh, tiếp tục đi bộ" onClick={closeStop}>×</button></div>
        <h2 id="nm-story-title">{TOUR_STOPS[selected].title}</h2><p>{TOUR_STOPS[selected].text}</p>
        <div className="nm-voice" role="status">{voice === 'playing' ? '🔊 Đang đọc bằng tiếng Việt' : voice === 'loading' ? 'Đang mở giọng đọc…' : voice === 'error' ? 'Chưa phát được giọng đọc. Bấm nghe lại; bạn vẫn có thể đọc nội dung bên trên.' : voice === 'paused' ? 'Đã tạm dừng giọng đọc' : 'Đã đọc xong'}</div>
        <div className="nm-progress"><i style={{ width: `${audioProgress}%` }} /></div>
        <div className="nm-story-buttons">
          <button className="nm-secondary" onClick={() => { if (voice === 'playing') audio.current?.pause(); else if (voice === 'paused') void audio.current?.play().catch(() => setVoice('error')); else playNarration(selected); }}>{voice === 'playing' ? 'Tạm dừng' : voice === 'paused' ? 'Đọc tiếp' : 'Nghe lại'}</button>
          <button className="nm-primary" onClick={() => { closeStop(); if (visited.size < 3) { input.current.guide++; showNotice('Đã hướng về vòng sáng tiếp theo. Hãy đi vòng qua công trình nếu gặp vật cản.'); } }}>{visited.size === 3 ? 'Tiếp tục dạo quanh' : 'Đi đến điểm tiếp theo'}</button>
        </div>
        <a className="nm-link" href={TOUR_SOURCE} target="_blank" rel="noreferrer">Nguồn thông tin: Cục Di sản văn hóa</a>
      </section></div>}
    </>}
  </main>;
}
