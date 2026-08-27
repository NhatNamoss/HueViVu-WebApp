'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type JournalEntry = {
  id: string; trip_id: string; time_str: string; place_name: string;
  content: string; mood: string; is_private: number; created_at: string;
};

export default function JournalPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({ content: '', mood: 'happy', place_name: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('hv_token');
    if (!token) { router.push('/onboarding'); return; }

    fetch('/api/journal', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => {
        setEntries(Array.isArray(data) ? data : []);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!newEntry.content.trim()) return;
    setSubmitting(true);
    const token = localStorage.getItem('hv_token');
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newEntry)
      });
      const data = await res.json();
      if (data.id) {
        setEntries(prev => [data, ...prev]);
        setIsAdding(false);
        setNewEntry({ content: '', mood: 'happy', place_name: '' });
      }
    } catch {}
    finally { setSubmitting(false); }
  };

  const moodEmoji: Record<string, string> = {
    happy: '😊', relaxed: '😌', excited: '🤩', thoughtful: '🤔', tired: '😴'
  };

  return (
    <>
      <header className="page-header">
        <h1 className="page-header-title">Nhật ký</h1>
        <button onClick={() => setIsAdding(true)} className="header-btn" style={{ background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', color: 'white', border: 'none' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </header>

      <section style={{ padding: '0 20px', marginBottom: 100 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: 120, borderRadius: 'var(--radius-lg)' }} className="skeleton" />
            ))}
          </div>
        ) : entries.length === 0 && !isAdding ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: '3rem', marginBottom: 12 }}>✍️</p>
            <h3 style={{ fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Chưa có nhật ký nào</h3>
            <p style={{ color: 'var(--navy-muted)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: 20 }}>
              Hãy ghi lại những khoảnh khắc, cảm xúc đáng nhớ trong chuyến đi Huế của bạn.
            </p>
            <button onClick={() => setIsAdding(true)} className="btn-primary" style={{ display: 'inline-flex' }}>
              Viết nhật ký mới
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
            {/* Add New Entry Form */}
            {isAdding && (
              <div className="card" style={{ padding: '16px', border: '2px solid var(--coral)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Viết nhật ký mới</h3>
                
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                  {Object.keys(moodEmoji).map(mood => (
                    <button key={mood} onClick={() => setNewEntry({ ...newEntry, mood })} style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: newEntry.mood === mood ? 'rgba(255,127,107,0.1)' : 'var(--soft-white)', border: newEntry.mood === mood ? '2px solid var(--coral)' : '1px solid rgba(26,29,59,0.1)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      {moodEmoji[mood]}
                    </button>
                  ))}
                </div>
                
                <input value={newEntry.place_name} onChange={e => setNewEntry({ ...newEntry, place_name: e.target.value })} placeholder="Địa điểm (ví dụ: Chùa Thiên Mụ)" style={{ width: '100%', padding: '12px 14px', background: 'var(--soft-white)', border: '1px solid rgba(26,29,59,0.1)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.875rem', marginBottom: 12, outline: 'none' }} />
                
                <textarea value={newEntry.content} onChange={e => setNewEntry({ ...newEntry, content: e.target.value })} placeholder="Bạn đang nghĩ gì?" style={{ width: '100%', padding: '12px 14px', background: 'var(--soft-white)', border: '1px solid rgba(26,29,59,0.1)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.875rem', marginBottom: 12, outline: 'none', resize: 'none', minHeight: 100 }} />
                
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setIsAdding(false)} className="btn-secondary" style={{ flex: 1, padding: '10px' }}>Huỷ</button>
                  <button onClick={handleSubmit} disabled={submitting || !newEntry.content.trim()} className="btn-primary" style={{ flex: 2, padding: '10px', opacity: !newEntry.content.trim() ? 0.5 : 1 }}>
                    {submitting ? 'Đang lưu...' : 'Lưu nhật ký'}
                  </button>
                </div>
              </div>
            )}

            {/* Entries List */}
            {entries.map(entry => (
              <div key={entry.id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.5rem' }}>{moodEmoji[entry.mood] || '😊'}</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--navy)' }}>
                        {new Date(entry.created_at).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      {entry.place_name && <p style={{ fontSize: '0.75rem', color: 'var(--coral)', fontWeight: 600 }}>📍 {entry.place_name}</p>}
                    </div>
                  </div>
                  {entry.trip_id && (
                    <Link href={`/trips/${entry.trip_id}`} style={{ padding: '4px 10px', background: 'rgba(26,29,59,0.05)', borderRadius: 'var(--radius-full)', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--navy)' }}>
                      Xem lịch trình
                    </Link>
                  )}
                </div>
                <p style={{ fontSize: '0.9375rem', color: 'var(--navy-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {entry.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
