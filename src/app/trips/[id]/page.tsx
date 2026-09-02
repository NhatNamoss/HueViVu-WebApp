'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CinematicMap from '@/components/CinematicMap';

type Activity = {
  time: string; name: string; type: string;
  duration: string; cost: string; description: string;
  ai_tip: string; location: string; lat?: number; lng?: number;
};
type Day = { day: number; theme: string; day_tip: string; activities: Activity[] };
type Trip = {
  id: string; title: string; summary: string; duration: number;
  companion: string; total_cost_estimate: string; ai_insight: string;
  highlights: string[]; itinerary: { days: Day[] }; is_shared: number;
  user_id: string; status: string;
};
type Weather = {
  emoji: string; temp: number; vi: string;
  advisory: string; advisory_type: string;
  forecast?: { day: string; temp_max: number; temp_min: number; emoji: string; condition_vi: string }[];
};

const TYPE_EMOJI: Record<string, string> = {
  heritage: '🏛️', food: '🍜', nature: '🌿', temple: '🛕',
  cafe: '☕', market: '🛍️', experience: '🎭', craft_village: '🎨',
};
const EMERGENCY = [
  { label: 'Cấp cứu 115', phone: '115', icon: '🚑' },
  { label: 'Cảnh sát 113', phone: '113', icon: '🚨' },
  { label: 'Cứu hỏa 114', phone: '114', icon: '🚒' },
  { label: 'BV TW Huế', phone: '02343822325', icon: '🏥' },
];
const PACKING = [
  'Nón / mũ che nắng (Huế rất nóng)',
  'Giày thoải mái (nhiều nơi cần leo cầu thang)',
  'Thuốc chống say xe nếu đi xe máy',
  'Tiền mặt VND (chợ, đền thường không nhận thẻ)',
  'Sạc dự phòng (pin tốn khi dùng GPS)',
  'Áo khoác mỏng (buổi tối Huế se lạnh)',
];
const TIMES = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
type ChatMsg = { role: 'user' | 'assistant'; content: string };

function renderAiMarkdown(text: string) {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let key = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { out.push(<br key={key++} />); continue; }
    const isBullet = /^[-*•]\s+/.test(trimmed);
    const content = trimmed.replace(/^[-*•]\s+/, '');
    const parts = content.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p
    );
    if (isBullet) {
      out.push(<div key={key++} style={{ display: 'flex', gap: 5, marginBottom: 3 }}>
        <span style={{ color: 'var(--coral)', flexShrink: 0 }}>•</span>
        <span>{parts}</span>
      </div>);
    } else {
      out.push(<p key={key++} style={{ margin: '0 0 5px', lineHeight: 1.55 }}>{parts}</p>);
    }
  }
  return out;
}

function buildCopyText(trip: Trip): string {
  const lines: string[] = ['🗺️ ' + trip.title, trip.summary, ''];
  (trip.itinerary?.days || []).forEach(day => {
    lines.push('📅 Ngày ' + day.day + ': ' + day.theme);
    day.activities.forEach(a => lines.push('  ' + a.time + ' — ' + a.name + ' (' + a.duration + ') · ' + (a.cost || 'Miễn phí')));
    lines.push('');
  });
  lines.push('💰 Tổng chi phí dự kiến: ' + trip.total_cost_estimate);
  return lines.join('\n');
}

function WeatherBanner({ weather, onDismiss }: { weather: Weather; onDismiss: () => void }) {
  const bg = weather.advisory_type === 'warn'
    ? 'linear-gradient(135deg,rgba(239,68,68,0.09),rgba(239,68,68,0.04))'
    : weather.advisory_type === 'caution'
    ? 'linear-gradient(135deg,rgba(245,158,11,0.09),rgba(245,158,11,0.04))'
    : 'linear-gradient(135deg,rgba(34,197,94,0.09),rgba(34,197,94,0.04))';
  const border = weather.advisory_type === 'warn' ? 'rgba(239,68,68,0.22)'
    : weather.advisory_type === 'caution' ? 'rgba(245,158,11,0.22)' : 'rgba(34,197,94,0.22)';
  return (
    <div style={{ margin: '0 20px 12px', padding: '12px 14px', background: bg, borderRadius: 'var(--radius-md)', border: '1px solid ' + border, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{weather.emoji}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--navy)', margin: '0 0 2px' }}>{weather.temp}°C · {weather.vi}</p>
        <p style={{ fontSize: '0.775rem', color: 'var(--navy-muted)', margin: 0, lineHeight: 1.5 }}>{weather.advisory}</p>
      </div>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--navy-muted)', padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
  );
}

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(0);
  const [activeActivity, setActiveActivity] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'map'>('timeline');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customizeText, setCustomizeText] = useState('');
  const [customizing, setCustomizing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showPacking, setShowPacking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherDismissed, setWeatherDismissed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDayIdx, setEditDayIdx] = useState(0);
  const [editActIdx, setEditActIdx] = useState<number | null>(null);
  const [editAct, setEditAct] = useState<Partial<Activity>>({});
  const [saving, setSaving] = useState(false);
  // place search
  const [placeSearchOpen, setPlaceSearchOpen] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<any[]>([]);
  const [placeSelected, setPlaceSelected] = useState<any | null>(null);
  const [placeTime, setPlaceTime] = useState('10:00');
  const [placeAdding, setPlaceAdding] = useState(false);
  const [placeOk, setPlaceOk] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('hv_token') : null;

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = 'Bearer ' + token;
    fetch('/api/trips/' + params.id, { headers })
      .then(r => r.json()).then(data => { setTrip(data); setLoading(false); })
      .catch(() => setLoading(false));
    fetch('/api/weather')
      .then(r => r.json())
      .then(d => {
        if (d.temp) setWeather({
          emoji: d.condition_emoji || '🌤️', temp: d.temp,
          vi: d.condition_vi || '', advisory: d.advisory || '',
          advisory_type: d.advisory_type || 'good', forecast: d.forecast,
        });
      }).catch(() => {});
  }, [params.id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const persistRaw = useCallback(async (newTrip: Trip) => {
    setSaving(true);
    try {
      await fetch('/api/trips/' + params.id + '/save-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ itinerary: newTrip.itinerary }),
      });
    } catch {}
    finally { setSaving(false); }
  }, [params.id, token]);

  const searchPlaces = useCallback(async (q: string) => {
    if (!q.trim()) { setPlaceResults([]); return; }
    const res = await fetch('/api/places?q=' + encodeURIComponent(q)).then(r => r.json()).catch(() => []);
    setPlaceResults(Array.isArray(res) ? res.slice(0, 12) : []);
  }, []);

  const busyAt = (time: string) => {
    const acts = trip?.itinerary?.days?.[activeDay]?.activities || [];
    return acts.find((a: Activity) => {
      const [ah, am] = (a.time || '').split(':').map(Number);
      const [th, tm] = time.split(':').map(Number);
      return Math.abs((ah * 60 + am) - (th * 60 + tm)) < 30;
    });
  };

  const handleAddPlace = async () => {
    if (!placeSelected || placeAdding || busyAt(placeTime)) return;
    setPlaceAdding(true);
    try {
      const res = await fetch('/api/trips/' + params.id + '/add-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({
          dayIndex: activeDay,
          activity: {
            time: placeTime,
            name: placeSelected.name,
            type: placeSelected.category || 'heritage',
            duration: placeSelected.duration || '1 giờ',
            cost: placeSelected.price || 'Miễn phí',
            description: placeSelected.description || '',
            location: placeSelected.address || 'Huế',
            ai_tip: (placeSelected.tips?.[0]) || 'Địa điểm nổi tiếng tại Huế',
            lat: placeSelected.lat, lng: placeSelected.lng,
            place_id: placeSelected.id,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTrip(prev => prev ? { ...prev, itinerary: data.trip.itinerary ? JSON.parse(typeof data.trip.itinerary === 'string' ? data.trip.itinerary : JSON.stringify(data.trip.itinerary)) : prev.itinerary } : null);
        setPlaceOk(true);
        setTimeout(() => { setPlaceSearchOpen(false); setPlaceOk(false); setPlaceSelected(null); setPlaceQuery(''); setPlaceResults([]); }, 1800);
      } else {
        alert(data.error || 'Lỗi thêm địa điểm');
      }
    } catch { alert('Lỗi kết nối'); }
    finally { setPlaceAdding(false); }
  };

  const openEdit = (dayIdx: number, actIdx: number | null) => {
    setEditDayIdx(dayIdx); setEditActIdx(actIdx);
    if (actIdx !== null && trip) {
      setEditAct({ ...trip.itinerary.days[dayIdx].activities[actIdx] });
    } else {
      setEditAct({ time: '10:00', name: '', type: 'heritage', duration: '1 giờ', cost: 'Miễn phí', description: '', ai_tip: '', location: 'Huế' });
    }
    setEditOpen(true);
  };

  const confirmEdit = () => {
    if (!trip || !editAct.name?.trim()) return;
    const newTrip: Trip = JSON.parse(JSON.stringify(trip));
    const day = newTrip.itinerary.days[editDayIdx];
    if (editActIdx !== null) {
      day.activities[editActIdx] = { ...day.activities[editActIdx], ...editAct } as Activity;
    } else {
      day.activities.push(editAct as Activity);
    }
    day.activities.sort((a, b) => {
      const [ah, am] = (a.time || '').split(':').map(Number);
      const [bh, bm] = (b.time || '').split(':').map(Number);
      return (ah * 60 + am) - (bh * 60 + bm);
    });
    setTrip(newTrip); setEditOpen(false); persistRaw(newTrip);
  };

  const deleteActivity = (dayIdx: number, actIdx: number) => {
    if (!trip) return;
    const newTrip: Trip = JSON.parse(JSON.stringify(trip));
    newTrip.itinerary.days[dayIdx].activities.splice(actIdx, 1);
    setTrip(newTrip); setActiveActivity(null); persistRaw(newTrip);
  };

  const moveActivity = (dayIdx: number, actIdx: number, dir: -1 | 1) => {
    if (!trip) return;
    const newTrip: Trip = JSON.parse(JSON.stringify(trip));
    const acts = newTrip.itinerary.days[dayIdx].activities;
    const to = actIdx + dir;
    if (to < 0 || to >= acts.length) return;
    [acts[actIdx], acts[to]] = [acts[to], acts[actIdx]];
    setTrip(newTrip); setActiveActivity(to); persistRaw(newTrip);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim(); setChatInput('');
    const newMsgs: ChatMsg[] = [...chatMessages, { role: 'user', content: msg }];
    setChatMessages(newMsgs); setChatLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ message: msg, tripId: params.id, history: newMsgs.slice(-10) }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Xin lỗi, thử lại nhé!' }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Đang gặp sự cố kết nối. Thử lại sau nhé!' }]);
    } finally { setChatLoading(false); }
  };

  const handleCustomize = async () => {
    if (!customizeText.trim() || customizing) return;
    setCustomizing(true);
    try {
      const res = await fetch('/api/trips/' + params.id + '/customize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ instruction: customizeText }),
      });
      const data = await res.json();
      if (data.error) { alert('Lỗi: ' + data.error); return; }
      if (data.trip) {
        setTrip(prev => prev ? {
          ...prev, ...data.trip,
          itinerary: data.trip.days ? { days: data.trip.days } : prev.itinerary,
          highlights: data.trip.highlights || prev.highlights,
          ai_insight: data.trip.ai_insight || prev.ai_insight,
          total_cost_estimate: data.trip.total_cost_estimate || prev.total_cost_estimate,
        } : null);
        setCustomizeOpen(false); setCustomizeText(''); setActiveDay(0);
      }
    } catch { alert('Đang gặp sự cố kết nối. Thử lại sau nhé!'); }
    finally { setCustomizing(false); }
  };

  const handleShare = async () => {
    try {
      await fetch('/api/trips/' + params.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ action: 'share' }),
      });
      setShareSuccess(true);
      if (navigator.share) navigator.share({ title: trip?.title, url: window.location.href });
      else navigator.clipboard.writeText(window.location.href).catch(() => {});
    } catch {}
  };

  const handleCopy = () => {
    if (!trip) return;
    navigator.clipboard.writeText(buildCopyText(trip)).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const mapsUrl = (act: Activity) =>
    (act.lat && act.lng)
      ? 'https://www.google.com/maps/dir/?api=1&destination=' + act.lat + ',' + act.lng + '&travelmode=walking'
      : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(act.name + ' Hue Vietnam');

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 16, padding: '80px 20px 20px' }}>
      {[160, 80, 80, 80].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h, borderRadius: 'var(--radius-lg)' }} />
      ))}
    </div>
  );

  if (!trip || (trip as any).error) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <span style={{ fontSize: 48 }}>🗺️</span>
      <p style={{ color: 'var(--navy-muted)', fontWeight: 600 }}>Không tìm thấy lịch trình</p>
      <Link href="/trips" style={{ color: 'var(--coral)', fontWeight: 700 }}>← Quay lại</Link>
    </div>
  );

  const currentDay = trip.itinerary?.days?.[activeDay];
  const allActivities = currentDay?.activities || [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--soft-white)', paddingBottom: 100 }}>

      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,252,248,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(26,29,59,0.06)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(26,29,59,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trip.title}</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--navy-muted)', margin: 0 }}>
            {trip.duration} ngày · {trip.companion}
            {weather && <span style={{ marginLeft: 8 }}>{weather.emoji} {weather.temp}°C</span>}
            {saving && <span style={{ marginLeft: 6, color: 'var(--coral)', fontStyle: 'italic' }}>Đang lưu...</span>}
          </p>
        </div>
        <button onClick={handleShare} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: shareSuccess ? 'rgba(76,175,80,0.1)' : 'rgba(26,29,59,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: shareSuccess ? '#4CAF50' : 'var(--navy)', fontSize: 14 }}>
          {shareSuccess ? '✓' : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>}
        </button>
      </div>

      {/* Utility bar */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px', overflowX: 'auto' }}>
        {([
          { icon: '📋', label: copied ? '✓ Đã copy!' : 'Copy lịch trình', action: handleCopy },
          { icon: '🧳', label: 'Chuẩn bị gì?', action: () => setShowPacking(true) },
          { icon: '🚨', label: 'Khẩn cấp', action: () => setShowEmergency(true) },
          { icon: '🤖', label: 'Tuỳ chỉnh AI', action: () => setCustomizeOpen(true) },
        ] as { icon: string; label: string; action: () => void }[]).map(btn => (
          <button key={btn.label} onClick={btn.action} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'white', border: '1px solid rgba(26,29,59,0.08)', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--navy)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', whiteSpace: 'nowrap' }}>
            <span>{btn.icon}</span>{btn.label}
          </button>
        ))}
      </div>

      {/* Weather banner */}
      {weather && !weatherDismissed && <WeatherBanner weather={weather} onDismiss={() => setWeatherDismissed(true)} />}

      {/* Summary */}
      <div style={{ margin: '0 20px 16px', padding: '16px', background: 'linear-gradient(135deg,var(--coral),var(--warm-orange))', borderRadius: 'var(--radius-lg)', color: 'white' }}>
        <p style={{ fontSize: '0.8rem', opacity: 0.88, margin: '0 0 8px', lineHeight: 1.5 }}>{trip.summary}</p>
        <div style={{ display: 'flex', gap: 16 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>💰 {trip.total_cost_estimate}</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>📅 {trip.duration} ngày</span>
        </div>
      </div>

      {trip.highlights?.length > 0 && (
        <div style={{ margin: '0 20px 12px', padding: '12px 16px', background: 'linear-gradient(135deg,rgba(255,127,107,0.07),rgba(255,154,92,0.07))', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,127,107,0.12)' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--coral)', marginBottom: 6, letterSpacing: '0.05em' }}>ĐIỂM NỔI BẬT</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {trip.highlights.map(h => (
              <span key={h} style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--navy)', background: 'white', padding: '3px 10px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(26,29,59,0.08)' }}>📍 {h}</span>
            ))}
          </div>
        </div>
      )}

      {trip.ai_insight && (
        <div style={{ margin: '0 20px 12px', padding: '12px 16px', background: 'rgba(212,175,55,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(212,175,55,0.15)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>✨</span>
          <p style={{ fontSize: '0.8125rem', color: 'var(--navy)', lineHeight: 1.5, margin: 0 }}>{trip.ai_insight}</p>
        </div>
      )}

      {/* Day tabs */}
      <div style={{ display: 'flex', overflowX: 'auto', padding: '0 20px', borderBottom: '1px solid rgba(26,29,59,0.06)' }}>
        {(trip.itinerary?.days || []).map((day, i) => (
          <button key={i} onClick={() => { setActiveDay(i); setActiveActivity(null); }}
            style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: `2.5px solid ${activeDay === i ? 'var(--coral)' : 'transparent'}`, cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.8125rem', fontWeight: activeDay === i ? 700 : 500, color: activeDay === i ? 'var(--coral)' : 'var(--navy-muted)', whiteSpace: 'nowrap', transition: 'all 0.2s', marginBottom: -1 }}>
            Ngày {day.day}
          </button>
        ))}
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', margin: '12px 20px', background: 'rgba(26,29,59,0.05)', borderRadius: 'var(--radius-full)', padding: 3 }}>
        {(['timeline', 'map'] as const).map(mode => (
          <button key={mode} onClick={() => setViewMode(mode)} style={{ flex: 1, padding: '9px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.8125rem', fontWeight: 600, borderRadius: 'var(--radius-full)', background: viewMode === mode ? 'white' : 'transparent', color: viewMode === mode ? 'var(--navy)' : 'var(--navy-muted)', boxShadow: viewMode === mode ? '0 1px 6px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>
            {mode === 'timeline' ? '📅 Lịch trình' : '🗺️ Bản đồ'}
          </button>
        ))}
      </div>

      {viewMode === 'map' && (
        <div style={{ margin: '0 20px 16px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: 380, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
          <CinematicMap activities={allActivities} activeIndex={activeActivity ?? undefined} />
        </div>
      )}
      {viewMode === 'timeline' && currentDay && (
        <div style={{ padding: '0 20px' }}>
          <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', margin: '0 0 4px' }}>{currentDay.theme}</h2>
              {currentDay.day_tip && <p style={{ fontSize: '0.8rem', color: 'var(--navy-muted)', lineHeight: 1.5, margin: 0 }}>💡 {currentDay.day_tip}</p>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => { setPlaceSelected(null); setPlaceQuery(''); setPlaceResults([]); setPlaceTime('10:00'); setPlaceSearchOpen(true); }} style={{ padding: '7px 12px', background: 'linear-gradient(135deg,var(--coral),var(--warm-orange))', border: 'none', borderRadius: 'var(--radius-full)', fontSize: '0.78rem', fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                🔍 Tìm địa điểm
              </button>
              <button onClick={() => openEdit(activeDay, null)} style={{ padding: '7px 12px', background: 'rgba(255,127,107,0.08)', border: '1px solid rgba(255,127,107,0.2)', borderRadius: 'var(--radius-full)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--coral)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                ✏️
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {allActivities.map((act, i) => {
              const isOpen = activeActivity === i;
              return (
                <div key={i} style={{ display: 'flex' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, flexShrink: 0 }}>
                    <div onClick={() => setActiveActivity(isOpen ? null : i)} style={{ width: 38, height: 38, borderRadius: '50%', background: isOpen ? 'linear-gradient(135deg,var(--coral),var(--warm-orange))' : 'white', border: `2px solid ${isOpen ? 'transparent' : 'rgba(255,127,107,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, cursor: 'pointer', zIndex: 1 }}>{TYPE_EMOJI[act.type] || '📍'}</div>
                    {i < allActivities.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 20, background: 'rgba(255,127,107,0.15)', margin: '4px 0' }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 16 }}>
                    <button onClick={() => setActiveActivity(isOpen ? null : i)} style={{ width: '100%', textAlign: 'left', background: isOpen ? 'white' : 'transparent', border: `1.5px solid ${isOpen ? 'rgba(255,127,107,0.15)' : 'transparent'}`, borderRadius: 'var(--radius-md)', padding: '10px 14px', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.25s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--coral)' }}>{act.time}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--navy-muted)' }}>{act.duration}</span>
                      </div>
                      <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--navy)', margin: '0 0 2px' }}>{act.name}</p>
                      {act.location && <p style={{ fontSize: '0.75rem', color: 'var(--navy-muted)', margin: 0 }}>📍 {act.location}</p>}
                    </button>
                    {isOpen && (
                      <div style={{ background: 'white', borderRadius: '0 0 var(--radius-md) var(--radius-md)', padding: '0 14px 14px', border: '1.5px solid rgba(255,127,107,0.15)', borderTop: 'none', marginTop: -4 }}>
                        {act.description && <p style={{ fontSize: '0.85rem', color: 'var(--navy-muted)', lineHeight: 1.6, margin: '12px 0 10px', paddingTop: 12, borderTop: '1px solid rgba(26,29,59,0.06)' }}>{act.description}</p>}
                        {act.ai_tip && (
                          <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: 12 }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--navy)', margin: 0 }}>✨ {act.ai_tip}</p>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--navy-muted)' }}>Chi phí</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: act.cost ? 'var(--navy)' : '#4CAF50' }}>{act.cost || 'Miễn phí'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <a href={mapsUrl(act)} target="_blank" rel="noreferrer" style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", background: "linear-gradient(135deg,var(--coral),var(--warm-orange))", color: "white", borderRadius: "var(--radius-full)", fontWeight: 700, fontSize: "0.8125rem", textDecoration: "none" }}>🗺️ Chỉ đường</a>
                          <button onClick={() => openEdit(activeDay, i)} style={{ flex: 1, padding: '10px', background: 'rgba(26,29,59,0.05)', border: '1px solid rgba(26,29,59,0.1)', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '0.8rem', color: 'var(--navy)', cursor: 'pointer', fontFamily: 'var(--font)' }}>✏️</button>
                          <button onClick={() => { if (confirm('Xóa hoạt động này?')) deleteActivity(activeDay, i); }} style={{ flex: 1, padding: '10px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '0.8rem', color: '#EF4444', cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑️</button>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {i > 0 && <button onClick={() => moveActivity(activeDay, i, -1)} style={{ flex: 1, padding: '6px', background: 'transparent', border: '1px solid rgba(26,29,59,0.08)', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--navy-muted)', cursor: 'pointer', fontFamily: 'var(--font)' }}>↑ Lên</button>}
                          {i < allActivities.length - 1 && <button onClick={() => moveActivity(activeDay, i, 1)} style={{ flex: 1, padding: '6px', background: 'transparent', border: '1px solid rgba(26,29,59,0.08)', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--navy-muted)', cursor: 'pointer', fontFamily: 'var(--font)' }}>↓ Xuống</button>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {allActivities.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--navy-muted)' }}>
                <p style={{ fontSize: '2rem', marginBottom: 8 }}>📭</p>
                <p style={{ fontWeight: 600, marginBottom: 12 }}>Ngày này chưa có hoạt động</p>
                <button onClick={() => openEdit(activeDay, null)} style={{ padding: '10px 20px', background: 'var(--coral)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>+ Thêm ngay</button>
              </div>
            )}
          </div>
        </div>
      )}
      <button onClick={() => setChatOpen(v => !v)} style={{ position: 'fixed', bottom: 84, right: 20, width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,var(--coral),var(--warm-orange))', border: 'none', boxShadow: '0 4px 20px rgba(255,127,107,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, zIndex: 40 }}>
        {chatOpen ? '×' : '💬'}
      </button>
      {chatOpen && (
        <div style={{ position: 'fixed', bottom: 148, right: 16, width: 'min(360px, calc(100vw - 32px))', height: 420, background: 'white', borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', zIndex: 40, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(26,29,59,0.06)', background: 'linear-gradient(135deg,var(--coral),var(--warm-orange))', color: 'white' }}>
            <p style={{ fontWeight: 700, margin: 0, fontSize: '0.9375rem' }}>🤖 Hỗ Trợ Du Lịch Huế</p>
            <p style={{ fontSize: '0.75rem', margin: 0, opacity: 0.88 }}>Hỏi bất cứ điều gì về lịch trình!</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chatMessages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--navy-muted)', paddingTop: 24 }}>
                <p style={{ fontSize: '2rem', marginBottom: 8 }}>👋</p>
                <p style={{ fontSize: '0.85rem' }}>Chào! Tôi có thể giúp gì cho chuyến đi của bạn?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                  {['Thời tiết hôm nay thế nào?','Nên ăn gì ở Huế?','Hướng dẫn đến Kinh Thành'].map(q => (
                    <button key={q} onClick={() => { setChatInput(q); }} style={{ padding: '6px 12px', background: 'rgba(255,127,107,0.07)', border: '1px solid rgba(255,127,107,0.2)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', color: 'var(--coral)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '82%', padding: '8px 12px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.role === 'user' ? 'linear-gradient(135deg,var(--coral),var(--warm-orange))' : 'rgba(26,29,59,0.05)', color: msg.role === 'user' ? 'white' : 'var(--navy)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  {msg.role === 'assistant' ? renderAiMarkdown(msg.content) : msg.content}
                </div>
              </div>
            ))}
            {chatLoading && <div style={{ display: 'flex', gap: 4, padding: '8px 12px', width: 'fit-content' }}>{[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--coral)', animation: 'bounce 1s ease infinite', animationDelay: i * 0.2 + 's' }} />)}</div>}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(26,29,59,0.06)', display: 'flex', gap: 8 }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder='Nhập câu hỏi...' style={{ flex: 1, padding: '9px 14px', border: '1.5px solid rgba(26,29,59,0.1)', borderRadius: 'var(--radius-full)', fontFamily: 'var(--font)', fontSize: '0.875rem', outline: 'none', background: 'rgba(26,29,59,0.03)', color: 'var(--navy)' }} />
            <button onClick={sendChat} disabled={chatLoading} style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,var(--coral),var(--warm-orange))', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}
      {showEmergency && (
        <div onClick={() => setShowEmergency(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 'var(--radius-xl)', padding: '20px 20px 32px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', margin: 0 }}>🚨 Số Khẩn Cấp</h3>
              <button onClick={() => setShowEmergency(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--navy-muted)' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {EMERGENCY.map(e => (
                <a key={e.phone} href={'tel:' + e.phone} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)', textDecoration: 'none' }}>
                  <span style={{ fontSize: 24 }}>{e.icon}</span>
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--navy)', margin: 0, fontSize: '0.9rem' }}>{e.label}</p>
                    <p style={{ color: '#EF4444', fontWeight: 700, margin: 0, fontSize: '1rem' }}>{e.phone}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
      {showPacking && (
        <div onClick={() => setShowPacking(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 'var(--radius-xl)', padding: '20px 20px 32px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', margin: 0 }}>🧳 Cần Chuẩn Bị Gì?</h3>
              <button onClick={() => setShowPacking(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--navy-muted)' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PACKING.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(26,29,59,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(26,29,59,0.06)' }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>✓</span>
                  <p style={{ fontSize: '0.875rem', color: 'var(--navy)', margin: 0 }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {customizeOpen && (
        <div onClick={() => setCustomizeOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'white', borderRadius: 'var(--radius-xl)', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', margin: 0 }}>🤖 Tuỳ Chỉnh AI</h3>
              <button onClick={() => setCustomizeOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--navy-muted)' }}>×</button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--navy-muted)', marginBottom: 12 }}>Mô tả những thay đổi bạn muốn AI thực hiện:</p>
            <textarea value={customizeText} onChange={e => setCustomizeText(e.target.value)} rows={3} placeholder='Ví dụ: Thêm bữa ăn sáng chợ Đông Ba...' style={{ width: '100%', padding: '10px 14px', border: '1.5px solid rgba(26,29,59,0.12)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.875rem', resize: 'none', outline: 'none', boxSizing: 'border-box', color: 'var(--navy)' }} />
            <button onClick={handleCustomize} disabled={customizing || !customizeText.trim()} style={{ width: '100%', marginTop: 12, padding: '12px', background: customizing ? 'rgba(26,29,59,0.1)' : 'linear-gradient(135deg,var(--coral),var(--warm-orange))', color: customizing ? 'var(--navy-muted)' : 'white', border: 'none', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '0.9375rem', cursor: customizing ? 'wait' : 'pointer', fontFamily: 'var(--font)' }}>
              {customizing ? '🔄 Đang xử lý...' : '🚀 Tuỳ Chỉnh Ngay'}
            </button>
          </div>
        </div>
      )}
      {editOpen && (
        <div onClick={() => setEditOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'white', borderRadius: 'var(--radius-xl)', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', margin: 0 }}>{editActIdx !== null ? '✏️ Sửa Hoạt Động' : '+ Thêm Hoạt Động'}</h3>
              <button onClick={() => setEditOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--navy-muted)' }}>×</button>
            </div>
            {([
              { label: 'Tên hoạt động *', key: 'name', type: 'text', placeholder: 'Ví dụ: Thăm Kinh Thành Huế', },
              { label: 'Giờ bắt đầu', key: 'time', type: 'select', placeholder: '', options: TIMES, },
              { label: 'Loại', key: 'type', type: 'select', placeholder: '', options: Object.keys(TYPE_EMOJI), },
              { label: 'Thời gian', key: 'duration', type: 'text', placeholder: 'Ví dụ: 2 giờ', },
              { label: 'Chi phí', key: 'cost', type: 'text', placeholder: 'Miễn phí / 50.000 VND', },
              { label: 'Địa điểm', key: 'location', type: 'text', placeholder: 'Tên đường / phường', },
              { label: 'Mô tả', key: 'description', type: 'textarea', placeholder: 'Mô tả ngắn...', },
              { label: 'Tips AI', key: 'ai_tip', type: 'text', placeholder: 'Lời khuyên hữiu ích...', },
            ] as any[]).map(field => (
              <div key={field.key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy-muted)', marginBottom: 4 }}>{field.label}</label>
                {field.type === 'select' ? (
                  <select value={(editAct as any)[field.key] || ''} onChange={e => setEditAct(p => ({ ...p, [field.key]: e.target.value }))} style={{ width: '100%', padding: '9px 14px', border: '1.5px solid rgba(26,29,59,0.12)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.875rem', outline: 'none', background: 'white', color: 'var(--navy)' }}>
                    {field.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea value={(editAct as any)[field.key] || ''} onChange={e => setEditAct(p => ({ ...p, [field.key]: e.target.value }))} rows={2} placeholder={field.placeholder} style={{ width: '100%', padding: '9px 14px', border: '1.5px solid rgba(26,29,59,0.12)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.875rem', resize: 'none', outline: 'none', boxSizing: 'border-box', color: 'var(--navy)' }} />
                ) : (
                  <input value={(editAct as any)[field.key] || ''} onChange={e => setEditAct(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} style={{ width: '100%', padding: '9px 14px', border: '1.5px solid rgba(26,29,59,0.12)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', color: 'var(--navy)' }} />
                )}
              </div>
            ))}
            <button onClick={confirmEdit} disabled={!editAct.name?.trim()} style={{ width: '100%', marginTop: 8, padding: '12px', background: editAct.name?.trim() ? 'linear-gradient(135deg,var(--coral),var(--warm-orange))' : 'rgba(26,29,59,0.1)', color: editAct.name?.trim() ? 'white' : 'var(--navy-muted)', border: 'none', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '0.9375rem', cursor: editAct.name?.trim() ? 'pointer' : 'not-allowed', fontFamily: 'var(--font)' }}>
              {editActIdx !== null ? 'Lưu Thay Đổi' : 'Thêm Hoạt Động'}
            </button>
          </div>
        </div>
      )}

      {/* Place Search bottom sheet */}
      {placeSearchOpen && (
        <div onClick={() => setPlaceSearchOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: 'white', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', padding: '20px', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
            {placeOk ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, padding: '32px 0' }}>
                <span style={{ fontSize: 48 }}>✅</span>
                <p style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '1rem', margin: 0 }}>Đã thêm vào lịch trình!</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--navy-muted)', margin: 0 }}>{placeSelected?.name}</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', margin: 0 }}>🔍 Thêm địa điểm — Ngày {activeDay + 1}</h3>
                  <button onClick={() => setPlaceSearchOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--navy-muted)' }}>×</button>
                </div>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <input
                    autoFocus
                    value={placeQuery}
                    onChange={e => { setPlaceQuery(e.target.value); searchPlaces(e.target.value); }}
                    placeholder="Tìm: bún bò, Kinh Thành, cà phê..."
                    style={{ width: '100%', padding: '11px 14px 11px 40px', border: '1.5px solid rgba(26,29,59,0.15)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: 'var(--navy)' }}
                  />
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>🔍</span>
                </div>
                {!placeSelected && placeResults.length === 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {([['🏛️','heritage'],['🍜','food'],['☕','cafe'],['🌿','nature'],['🛕','temple'],['🎨','craft_village']] as [string,string][]).map(([icon, cat]) => (
                      <button key={cat} onClick={() => { setPlaceQuery(cat); searchPlaces(cat); }} style={{ padding: '6px 12px', background: 'rgba(26,29,59,0.05)', border: '1px solid rgba(26,29,59,0.1)', borderRadius: 'var(--radius-full)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--navy)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        {icon} {cat}
                      </button>
                    ))}
                  </div>
                )}
                {!placeSelected && (
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {placeResults.map((p: any) => (
                      <button key={p.id} onClick={() => setPlaceSelected(p)} style={{ display: 'flex', gap: 12, padding: '10px 12px', background: 'rgba(26,29,59,0.02)', border: '1.5px solid rgba(26,29,59,0.08)', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', alignItems: 'center' }}>
                        {p.img ? <img src={p.img} alt={p.name} style={{ width: 52, height: 52, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }} /> : <span style={{ width: 52, height: 52, borderRadius: 'var(--radius-sm)', background: 'rgba(255,127,107,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{TYPE_EMOJI[p.category] || '📍'}</span>}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--navy)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--navy-muted)', margin: '0 0 4px' }}>{p.address || 'Huế'}</p>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {p.rating && <span style={{ fontSize: '0.72rem', color: '#F59E0B', fontWeight: 700 }}>⭐ {p.rating}</span>}
                            {p.price && <span style={{ fontSize: '0.72rem', color: 'var(--navy-muted)' }}>💰 {p.price}</span>}
                            {p.duration && <span style={{ fontSize: '0.72rem', color: 'var(--navy-muted)' }}>⏱ {p.duration}</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: 18, flexShrink: 0, opacity: 0.5 }}>›</span>
                      </button>
                    ))}
                    {placeQuery && placeResults.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--navy-muted)', fontSize: '0.85rem' }}>Không tìm thấy địa điểm phù hợp</div>
                    )}
                  </div>
                )}
                {placeSelected && (
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <button onClick={() => setPlaceSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--coral)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', padding: '0 0 10px', fontFamily: 'var(--font)' }}>← Chọn lại</button>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16, padding: '12px', background: 'rgba(255,127,107,0.05)', borderRadius: 'var(--radius-md)', border: '1.5px solid rgba(255,127,107,0.15)' }}>
                      {placeSelected.img ? <img src={placeSelected.img} alt={placeSelected.name} style={{ width: 56, height: 56, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }} /> : <span style={{ width: 56, height: 56, background: 'rgba(255,127,107,0.1)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{TYPE_EMOJI[placeSelected.category] || '📍'}</span>}
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)', margin: '0 0 2px' }}>{placeSelected.name}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--navy-muted)', margin: '0 0 4px' }}>{placeSelected.address || 'Huế'}</p>
                        {placeSelected.description && <p style={{ fontSize: '0.75rem', color: 'var(--navy-muted)', margin: 0, lineHeight: 1.4 }}>{placeSelected.description.slice(0, 80)}{placeSelected.description.length > 80 ? '...' : ''}</p>}
                      </div>
                    </div>
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>CHỌN GIỜ GHÉ THĂM</p>
                    {(trip?.itinerary?.days?.[activeDay]?.activities?.length ?? 0) > 0 && (
                      <div style={{ marginBottom: 10, padding: '8px 12px', background: 'rgba(26,29,59,0.03)', borderRadius: 'var(--radius-sm)', fontSize: '0.73rem', color: 'var(--navy-muted)' }}>
                        <p style={{ fontWeight: 700, margin: '0 0 4px' }}>📅 Ngày {activeDay + 1} đã có:</p>
                        {(trip?.itinerary?.days?.[activeDay]?.activities || []).map((a, ai) => <p key={ai} style={{ margin: '2px 0' }}>• {a.time} — {a.name}</p>)}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                      {TIMES.map(t => {
                        const busy = busyAt(t);
                        return (
                          <button key={t} onClick={() => !busy && setPlaceTime(t)} disabled={!!busy} style={{ padding: '7px 13px', background: placeTime === t ? 'var(--coral)' : busy ? 'rgba(26,29,59,0.03)' : 'white', color: placeTime === t ? 'white' : busy ? 'rgba(26,29,59,0.25)' : 'var(--navy)', border: `1.5px solid ${placeTime === t ? 'var(--coral)' : busy ? 'rgba(26,29,59,0.06)' : 'rgba(26,29,59,0.12)'}`, borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                            {busy ? '🔒' : ''}{t}
                          </button>
                        );
                      })}
                    </div>
                    {busyAt(placeTime) && <p style={{ fontSize: '0.75rem', color: '#EF4444', marginBottom: 12 }}>⚠️ Giờ này gần với &quot;{busyAt(placeTime)?.name}&quot; — chọn giờ khác</p>}
                    <button onClick={handleAddPlace} disabled={placeAdding || !!busyAt(placeTime)} style={{ width: '100%', padding: '13px', background: (!placeAdding && !busyAt(placeTime)) ? 'linear-gradient(135deg,var(--coral),var(--warm-orange))' : 'rgba(26,29,59,0.1)', color: (!placeAdding && !busyAt(placeTime)) ? 'white' : 'var(--navy-muted)', border: 'none', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '0.9375rem', cursor: (!placeAdding && !busyAt(placeTime)) ? 'pointer' : 'not-allowed', fontFamily: 'var(--font)' }}>
                      {placeAdding ? '⏳ Đang thêm...' : `✅ Thêm vào ${placeTime} · Ngày ${activeDay + 1}`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

