'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type Activity = {
  time: string; name: string; type: string;
  duration: string; cost: string; description: string;
  ai_tip: string; location: string;
};

type Day = { day: number; theme: string; day_tip: string; activities: Activity[] };

type Trip = {
  id: string; title: string; summary: string; duration: number;
  companion: string; total_cost_estimate: string; ai_insight: string;
  highlights: string[]; itinerary: { days: Day[] }; is_shared: number;
  user_id: string; status: string;
};

const TYPE_EMOJI: Record<string, string> = {
  heritage: '🏛️', food: '🍜', nature: '🌿', temple: '🛕',
  cafe: '☕', market: '🛍️', experience: '🎭', craft_village: '🎨',
};

type ChatMsg = { role: 'user' | 'assistant'; content: string };

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customizeText, setCustomizeText] = useState('');
  const [customizing, setCustomizing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('hv_token') : null;

  useEffect(() => {
    const headers: any = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    fetch(`/api/trips/${params.id}`, { headers }).then(r => r.json()).then(data => {
      setTrip(data); setLoading(false);
    }).catch(() => setLoading(false));
  }, [params.id]);

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    const newMsgs = [...chatMessages, { role: 'user' as const, content: msg }];
    setChatMessages(newMsgs);
    setChatLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ message: msg, tripId: params.id, history: newMsgs.slice(-10) }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Xin lỗi, thử lại nhé!' }]);
    } catch { setChatMessages(prev => [...prev, { role: 'assistant', content: 'Đang gặp sự cố kết nối. Thử lại sau nhé!' }]); }
    finally { setChatLoading(false); }
  };

  const handleCustomize = async () => {
    if (!customizeText.trim() || customizing) return;
    setCustomizing(true);
    try {
      const res = await fetch(`/api/trips/${params.id}/customize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ instruction: customizeText }),
      });
      const data = await res.json();
      if (data.trip) {
        setTrip(prev => prev ? { ...prev, ...data.trip, itinerary: data.trip } : prev);
        setCustomizeOpen(false);
        setCustomizeText('');
      }
    } catch { }
    finally { setCustomizing(false); }
  };

  const handleShare = async () => {
    if (!token) return;
    await fetch(`/api/trips/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'share' }),
    });
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 3000);
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ height: 200, borderRadius: 'var(--radius-xl)', marginBottom: 16 }} className="skeleton" />
        <div style={{ height: 100, borderRadius: 'var(--radius-lg)', marginBottom: 12 }} className="skeleton" />
        <div style={{ height: 100, borderRadius: 'var(--radius-lg)' }} className="skeleton" />
      </div>
    );
  }

  if (!trip) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
      <p style={{ fontSize: '3rem' }}>😕</p>
      <p style={{ fontWeight: 600 }}>Không tìm thấy chuyến đi</p>
      <Link href="/trips" className="btn-primary">Xem tất cả chuyến đi</Link>
    </div>
  );

  const days = trip.itinerary?.days || [];

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,249,247,0.92)', backdropFilter: 'blur(20px)' }}>
        <button onClick={() => router.back()} className="header-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)' }}>Hành trình của bạn</span>
        <button className="header-btn" onClick={handleShare} title="Chia sẻ">
          {shareSuccess ? <span style={{ color: '#4CAF50', fontSize: '0.75rem' }}>✓</span> : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
          )}
        </button>
      </header>

      {/* Hero Card */}
      <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
        <img src="/assets/hero-hub.png" alt="Huế" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(26,29,59,0.3) 0%, rgba(26,29,59,0.75) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div className="ai-badge" style={{ marginBottom: 8, width: 'fit-content' }}>
            <span className="ai-badge-dot" />
            AI Generated
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: 8 }}>{trip.title}</h1>
          <div style={{ display: 'flex', gap: 16, fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)' }}>
            <span>📅 {trip.duration} ngày</span>
            <span>· {trip.companion}</span>
            {trip.total_cost_estimate && <span>· {trip.total_cost_estimate}</span>}
          </div>
        </div>
      </div>

      {/* AI Insight */}
      {trip.ai_insight && (
        <div style={{ margin: '16px 20px', background: 'rgba(255,127,107,0.06)', border: '1px solid rgba(255,127,107,0.15)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.1rem' }}>🧠</span>
          <p style={{ fontSize: '0.8125rem', color: 'var(--navy)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--coral)' }}>AI: </strong>{trip.ai_insight}
          </p>
        </div>
      )}

      {/* Highlights */}
      {trip.highlights?.length > 0 && (
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--navy-muted)', marginBottom: 8 }}>ĐIỂM NỔI BẬT</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {trip.highlights.map((h: string, i: number) => (
              <span key={i} style={{ padding: '5px 12px', background: 'rgba(255,127,107,0.08)', border: '1px solid rgba(255,127,107,0.15)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--coral)' }}>
                ✦ {h}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px', marginBottom: 20 }}>
        <button onClick={() => setChatOpen(true)} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          ✨ Hỏi AI
        </button>
        <button onClick={() => setCustomizeOpen(true)} style={{ flex: 1, padding: '11px', background: 'var(--card-bg)', color: 'var(--navy)', border: '1.5px solid rgba(26,29,59,0.08)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          🔧 Tuỳ chỉnh
        </button>
      </div>

      {/* Day tabs */}
      {days.length > 0 && (
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
            {days.map((d, i) => (
              <button key={i} onClick={() => setActiveDay(i)} style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 'var(--radius-full)', fontFamily: 'var(--font)', fontSize: '0.8125rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: activeDay === i ? 'linear-gradient(135deg, var(--coral), var(--warm-orange))' : 'var(--card-bg)', color: activeDay === i ? 'white' : 'var(--navy-muted)', boxShadow: activeDay === i ? '0 4px 12px rgba(255,127,107,0.25)' : 'none', transition: 'all 0.25s' }}>
                Ngày {d.day}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {days[activeDay] && (
        <div style={{ padding: '0 20px' }}>
          <div style={{ marginBottom: 12, padding: '12px 14px', background: 'var(--card-bg)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.6)' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>✦ {days[activeDay].theme}</p>
            {days[activeDay].day_tip && <p style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)', lineHeight: 1.5 }}>💡 {days[activeDay].day_tip}</p>}
          </div>

          <div className="timeline">
            {days[activeDay].activities?.map((act, i) => (
              <div key={i} className="tl-item">
                <div className="tl-time">{act.time}</div>
                <div className="tl-line">
                  <div className="tl-dot" />
                  {i < days[activeDay].activities.length - 1 && <div className="tl-connector" style={{ height: 'calc(100% - 28px)', background: 'linear-gradient(to bottom, rgba(255,127,107,0.25), rgba(255,154,92,0.08))' }} />}
                </div>
                <div className="tl-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: '1.25rem' }}>{TYPE_EMOJI[act.type] || '📍'}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)', lineHeight: 1.3 }}>{act.name}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--navy-muted)', marginTop: 2 }}>{act.type} · {act.duration}</p>
                    </div>
                    {act.cost && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--coral)', flexShrink: 0 }}>{act.cost}</span>}
                  </div>
                  {act.description && <p style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)', lineHeight: 1.5, marginBottom: 6 }}>{act.description}</p>}
                  {act.ai_tip && (
                    <div style={{ padding: '8px 10px', background: 'rgba(255,127,107,0.05)', borderRadius: 8, border: '1px solid rgba(255,127,107,0.1)' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--navy)', lineHeight: 1.4 }}>💡 <strong>Mẹo AI:</strong> {act.ai_tip}</p>
                    </div>
                  )}
                  {act.location && <p style={{ fontSize: '0.6875rem', color: 'var(--gray-soft)', marginTop: 6 }}>📍 {act.location}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Chat Modal */}
      {chatOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,29,59,0.6)', backdropFilter: 'blur(8px)' }} onClick={() => setChatOpen(false)} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--soft-white)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', padding: '0', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(26,29,59,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>✨</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--navy)' }}>HueViVu AI</p>
                  <p style={{ fontSize: '0.6875rem', color: '#4CAF50' }}>● Đang hoạt động</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--gray-soft)', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--navy-muted)' }}>
                  <p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>Xin chào! Mình là AI đồng hành của bạn cho chuyến đi này. Hỏi mình bất kỳ điều gì về lịch trình nhé! ✨</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12 }}>
                    {['Gợi ý buổi sáng', 'Quán ăn gần nhất', 'Thời tiết hôm nay'].map(q => (
                      <button key={q} onClick={() => setChatInput(q)} style={{ padding: '6px 12px', background: 'rgba(255,127,107,0.08)', border: '1px solid rgba(255,127,107,0.15)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--coral)', cursor: 'pointer' }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '82%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: msg.role === 'user' ? 'linear-gradient(135deg, var(--coral), var(--warm-orange))' : 'var(--card-bg)', color: msg.role === 'user' ? 'white' : 'var(--navy)', fontSize: '0.875rem', lineHeight: 1.5, boxShadow: 'var(--shadow-sm)' }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex' }}>
                  <div style={{ padding: '10px 14px', borderRadius: '18px 18px 18px 4px', background: 'var(--card-bg)' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gray-soft)', display: 'inline-block', animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(26,29,59,0.06)' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Hỏi AI về lịch trình..." style={{ flex: 1, padding: '12px 16px', background: 'var(--card-bg)', border: '1.5px solid rgba(26,29,59,0.08)', borderRadius: 'var(--radius-full)', fontFamily: 'var(--font)', fontSize: '0.9rem', outline: 'none', color: 'var(--navy)' }} />
                <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading} style={{ width: 44, height: 44, borderRadius: '50%', background: chatInput.trim() ? 'linear-gradient(135deg, var(--coral), var(--warm-orange))' : 'rgba(26,29,59,0.08)', border: 'none', cursor: chatInput.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={chatInput.trim() ? 'white' : 'var(--gray-soft)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customize Modal */}
      {customizeOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,29,59,0.6)', backdropFilter: 'blur(8px)' }} onClick={() => setCustomizeOpen(false)} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--soft-white)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', padding: '20px' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--navy)', marginBottom: 8 }}>🔧 Tuỳ chỉnh lịch trình</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--navy-muted)', marginBottom: 16, lineHeight: 1.5 }}>Nói với AI bạn muốn thay đổi gì — AI sẽ điều chỉnh toàn bộ lịch trình!</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {['Ít đi bộ hơn', 'Thêm ẩm thực', 'Lịch trình thư giãn hơn', 'Thêm điểm chụp ảnh', 'Giảm chi phí'].map(s => (
                <button key={s} onClick={() => setCustomizeText(s)} style={{ padding: '6px 12px', background: 'rgba(255,127,107,0.08)', border: '1px solid rgba(255,127,107,0.15)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--coral)', cursor: 'pointer' }}>{s}</button>
              ))}
            </div>
            <textarea value={customizeText} onChange={e => setCustomizeText(e.target.value)} placeholder="Mô tả chi tiết hơn (ví dụ: Tôi muốn buổi chiều tự do hơn...)" style={{ width: '100%', padding: '12px', background: 'var(--card-bg)', border: '1.5px solid rgba(26,29,59,0.08)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.9rem', outline: 'none', color: 'var(--navy)', resize: 'none', minHeight: 80, lineHeight: 1.5 }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button onClick={() => setCustomizeOpen(false)} className="btn-secondary" style={{ flex: 1 }}>Huỷ</button>
              <button onClick={handleCustomize} disabled={!customizeText.trim() || customizing} className="btn-primary" style={{ flex: 2, opacity: !customizeText.trim() ? 0.5 : 1 }}>
                {customizing ? '⏳ Đang tùy chỉnh...' : '✨ Áp dụng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
