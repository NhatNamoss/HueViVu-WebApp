'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type TripDay = { day: number; theme: string; activities: { time: string; name: string; lat?: number; lng?: number }[] };
type Trip = { id: string; title: string; duration: number; itinerary: { days: TripDay[] } };

function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const HUE_LAT = 16.4637, HUE_LNG = 107.5909;
const TIMES = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

export default function PlaceDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [place, setPlace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [selTrip, setSelTrip] = useState<Trip | null>(null);
  const [selDay, setSelDay] = useState(0);
  const [selTime, setSelTime] = useState('10:00');
  const [adding, setAdding] = useState(false);
  const [addOk, setAddOk] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('hv_token') : null;

  useEffect(() => {
    fetch(`/api/places/${id}`)
      .then(r => r.json())
      .then(d => { setPlace(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!addOpen || !token) return;
    fetch('/api/trips', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json())
      .then(d => {
        const list: Trip[] = Array.isArray(d) ? d : (d.trips || []);
        setTrips(list.slice(0, 8));
        if (list.length) setSelTrip(list[0]);
      }).catch(() => {});
  }, [addOpen, token]);

  const busyAt = (time: string) => selTrip?.itinerary?.days?.[selDay]?.activities?.find(a => {
    const [ah, am] = a.time.split(':').map(Number);
    const [th, tm] = time.split(':').map(Number);
    return Math.abs((ah * 60 + am) - (th * 60 + tm)) < 30;
  });
  const conflict = busyAt(selTime);

  const refAct = selTrip?.itinerary?.days?.[0]?.activities?.[0] as any;
  const far = place && selTrip ? distKm(refAct?.lat || HUE_LAT, refAct?.lng || HUE_LNG, place.lat || HUE_LAT, place.lng || HUE_LNG) : 0;

  const handleAdd = async () => {
    if (!selTrip || adding || conflict) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/trips/${selTrip.id}/add-place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          dayIndex: selDay,
          activity: {
            time: selTime, name: place.name, type: place.category,
            duration: place.duration || '1 giờ', cost: place.price || 'Miễn phí',
            description: place.description || '', location: place.address || 'Huế',
            ai_tip: 'Được thêm từ Khám phá',
            lat: place.lat, lng: place.lng, place_id: place.id,
          },
        }),
      });
      if (res.ok) { setAddOk(true); setTimeout(() => { setAddOpen(false); setAddOk(false); }, 2000); }
      else { const e = await res.json(); alert(e.error || 'Lỗi'); }
    } catch { alert('Sự cố kết nối. Thử lại!'); }
    finally { setAdding(false); }
  };

  if (loading) return (
    <div style={{ padding: '20px' }}>
      <div style={{ height: 300, borderRadius: 'var(--radius-xl)', marginBottom: 16 }} className="skeleton" />
      <div style={{ height: 100, borderRadius: 'var(--radius-lg)' }} className="skeleton" />
    </div>
  );

  if (!place || place.error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
      <p style={{ fontSize: '3rem' }}>😕</p>
      <p style={{ fontWeight: 600 }}>Không tìm thấy địa điểm</p>
      <Link href="/explore" className="btn-primary">Quay lại Khám phá</Link>
    </div>
  );

  const EMOJI: Record<string, string> = { heritage:'🏛️', food:'🍜', nature:'🌿', temple:'🛕', cafe:'☕', market:'🛍️', craft_village:'🎨' };


  return (
    <div style={{ paddingBottom: 120 }}>
      {/* Header */}
      <div style={{ position: 'relative', height: 320, overflow: 'hidden' }}>
        <img src={place.img || '/assets/citadel.png'} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).src = '/assets/citadel.png'; }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(26,29,59,0.3) 0%, rgba(26,29,59,0.1) 40%, rgba(26,29,59,0.8) 100%)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 20px', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.4)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' Hue Vietnam')}`} target="_blank" rel="noreferrer" style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 18 }}>🗺️</a>
        </div>
        <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
          <div style={{ display: 'inline-block', padding: '4px 10px', background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', borderRadius: 'var(--radius-full)', fontSize: '0.6875rem', fontWeight: 700, color: 'white', marginBottom: 8 }}>
            {EMOJI[place.category] || '📍'} {(place.category || '').toUpperCase()}
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: 6 }}>{place.name}</h1>
          <div style={{ display: 'flex', gap: 12, fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)' }}>
            <span>⭐ {place.rating} ({place.rating_count})</span><span>📍 Huế</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div className="card" style={{ padding: '14px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: '1.25rem' }}>💰</span>
            <div><p style={{ fontSize: '0.6875rem', color: 'var(--navy-muted)', fontWeight: 600 }}>CHI PHÍ</p><p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--navy)' }}>{place.price}</p></div>
          </div>
          <div className="card" style={{ padding: '14px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: '1.25rem' }}>⏱️</span>
            <div><p style={{ fontSize: '0.6875rem', color: 'var(--navy-muted)', fontWeight: 600 }}>THỜI GIAN</p><p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--navy)' }}>{place.duration}</p></div>
          </div>
        </div>
        {place.description && <div style={{ marginBottom: 24 }}><h3 className="section-title">Giới thiệu</h3><p style={{ fontSize: '0.9375rem', color: 'var(--navy-muted)', lineHeight: 1.6, marginTop: 8 }}>{place.description}</p></div>}
        {place.address && <div style={{ marginBottom: 24 }}><h3 className="section-title">Vị trí</h3><div className="card" style={{ padding: '12px', marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}><div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'rgba(26,29,59,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📍</div><p style={{ fontSize: '0.875rem', color: 'var(--navy)' }}>{place.address}</p></div></div>}
        {place.highlights?.length > 0 && <div style={{ marginBottom: 24 }}><h3 className="section-title">Điểm nổi bật</h3><ul style={{ paddingLeft: 20, marginTop: 8, color: 'var(--navy-muted)', fontSize: '0.9375rem', lineHeight: 1.6 }}>{place.highlights.map((h: string, i: number) => <li key={i} style={{ marginBottom: 6 }}>{h}</li>)}</ul></div>}
        {place.tips?.length > 0 && <div style={{ background: 'rgba(255,127,107,0.06)', border: '1px solid rgba(255,127,107,0.15)', borderRadius: 'var(--radius-md)', padding: '16px' }}><h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--coral)', marginBottom: 8 }}>✨ Lời khuyên từ AI</h3><ul style={{ paddingLeft: 20, color: 'var(--navy)', fontSize: '0.875rem', lineHeight: 1.6 }}>{place.tips.map((t: string, i: number) => <li key={i} style={{ marginBottom: 6 }}>{t}</li>)}</ul></div>}
      </div>

      {/* Sticky CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px 28px', background: 'var(--soft-white)', borderTop: '1px solid rgba(26,29,59,0.08)', display: 'flex', gap: 10, zIndex: 30 }}>
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat || HUE_LAT},${place.lng || HUE_LNG}&travelmode=walking`} target="_blank" rel="noreferrer" className="btn-secondary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>🗺️ Chỉ đường</a>
        <button onClick={() => setAddOpen(true)} className="btn-primary" style={{ flex: 2 }}>➕ Thêm vào lịch trình</button>
      </div>

      {/* Add-to-trip bottom sheet */}
      {addOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,29,59,0.55)', backdropFilter: 'blur(8px)' }} onClick={() => setAddOpen(false)} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--soft-white)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', padding: '20px 20px 40px', maxHeight: '90vh', overflowY: 'auto' }}>
            {addOk ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ fontSize: '3rem', marginBottom: 8 }}>✅</p>
                <h3 style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '1.125rem' }}>Đã thêm vào lịch trình!</h3>
                <p style={{ color: 'var(--navy-muted)', fontSize: '0.875rem', marginTop: 4 }}>Mở lịch trình để xem chi tiết</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--navy)', margin: 0 }}>➕ Thêm vào lịch trình</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--navy-muted)', margin: '3px 0 0' }}>{place.name}</p>
                  </div>
                  <button onClick={() => setAddOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: 'var(--navy-muted)', lineHeight: 1 }}>×</button>
                </div>
                {far > 5 && (
                  <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)', marginBottom: 14 }}>
                    <p style={{ fontSize: '0.8rem', color: '#92400E', margin: 0, lineHeight: 1.5 }}>⚠️ Địa điểm cách lịch trình ~<strong>{far.toFixed(1)}km</strong>. Cân nhắc thời gian di chuyển.</p>
                  </div>
                )}
                {!token ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <p style={{ color: 'var(--navy-muted)', fontSize: '0.875rem', marginBottom: 12 }}>Đăng nhập để thêm vào lịch trình</p>
                    <Link href="/auth/login" className="btn-primary">Đăng nhập</Link>
                  </div>
                ) : trips.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <p style={{ color: 'var(--navy-muted)', fontSize: '0.875rem', marginBottom: 12 }}>Bạn chưa có lịch trình nào</p>
                    <Link href="/flow" className="btn-primary">Tạo lịch trình mới</Link>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy)', display: 'block', marginBottom: 6, letterSpacing: '0.04em' }}>CHỌN LỊCH TRÌNH</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {trips.map(t => (
                          <button key={t.id} onClick={() => { setSelTrip(t); setSelDay(0); }} style={{ padding: '12px 14px', background: selTrip?.id === t.id ? 'rgba(255,127,107,0.08)' : 'white', border: `1.5px solid ${selTrip?.id === t.id ? 'var(--coral)' : 'rgba(26,29,59,0.1)'}`, borderRadius: 'var(--radius-md)', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            <p style={{ fontWeight: 700, color: 'var(--navy)', margin: 0, fontSize: '0.9rem' }}>{t.title}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--navy-muted)', margin: '3px 0 0' }}>{t.duration} ngày</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {selTrip && (
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy)', display: 'block', marginBottom: 6, letterSpacing: '0.04em' }}>CHỌN NGÀY</label>
                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                          {(selTrip.itinerary?.days || []).map((d, di) => (
                            <button key={di} onClick={() => setSelDay(di)} style={{ flexShrink: 0, padding: '8px 14px', background: selDay === di ? 'var(--coral)' : 'white', color: selDay === di ? 'white' : 'var(--navy)', border: `1.5px solid ${selDay === di ? 'var(--coral)' : 'rgba(26,29,59,0.1)'}`, borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                              Ngày {d.day}{d.activities?.length > 0 && <span style={{ marginLeft: 4, fontSize: '0.7rem', opacity: 0.75 }}>({d.activities.length})</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selTrip && (
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy)', display: 'block', marginBottom: 6, letterSpacing: '0.04em' }}>THỜI ĐIỂM GHÉ THĂM</label>
                        {(selTrip.itinerary?.days?.[selDay]?.activities?.length ?? 0) > 0 && (
                          <div style={{ marginBottom: 8, padding: '8px 12px', background: 'rgba(26,29,59,0.03)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--navy-muted)' }}>
                            <p style={{ fontWeight: 700, margin: '0 0 4px' }}>📅 Ngày {selDay + 1} đã có:</p>
                            {selTrip.itinerary!.days[selDay].activities.map((a, ai) => <p key={ai} style={{ margin: '2px 0' }}>• {a.time} — {a.name}</p>)}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {TIMES.map(t => {
                            const busy = busyAt(t);
                            return (
                              <button key={t} onClick={() => !busy && setSelTime(t)} disabled={!!busy} style={{ padding: '6px 12px', background: selTime === t ? 'var(--coral)' : busy ? 'rgba(26,29,59,0.03)' : 'white', color: selTime === t ? 'white' : busy ? 'rgba(26,29,59,0.25)' : 'var(--navy)', border: `1px solid ${selTime === t ? 'var(--coral)' : busy ? 'rgba(26,29,59,0.06)' : 'rgba(26,29,59,0.1)'}`, borderRadius: 'var(--radius-full)', fontSize: '0.78rem', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                                {busy ? '🔒 ' : ''}{t}
                              </button>
                            );
                          })}
                        </div>
                        {conflict && <p style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: 6 }}>⚠️ Gần với &quot;{conflict.name}&quot; — chọn giờ khác</p>}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setAddOpen(false)} className="btn-secondary" style={{ flex: 1 }}>Huỷ</button>
                      <button onClick={handleAdd} disabled={!selTrip || adding || !!conflict} className="btn-primary" style={{ flex: 2, opacity: (!selTrip || !!conflict) ? 0.5 : 1 }}>
                        {adding ? '⏳ Đang thêm...' : '✅ Xác nhận thêm'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
