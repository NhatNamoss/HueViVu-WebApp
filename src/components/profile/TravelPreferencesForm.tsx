'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PLACE_CATEGORIES } from '@/lib/place-taxonomy';
import { DEFAULT_PREFERENCES, type TravelPreferences } from '@/lib/travel-preferences';

export default function TravelPreferencesForm() {
  const [value, setValue] = useState<TravelPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch('/api/profile/preferences', { headers: { Authorization: `Bearer ${localStorage.getItem('hv_token') || ''}` }, signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { setValue(data); setLoaded(true); })
      .catch(() => { if (!controller.signal.aborted) setError('Chưa tải được sở thích. Hãy thử lại.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(''); setError('');
    try {
      const response = await fetch('/api/profile/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('hv_token') || ''}` }, body: JSON.stringify(value) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Chưa lưu được sở thích. Hãy thử lại.'); return; }
      setValue(data); setMessage('Đã lưu. Khám phá sẽ ưu tiên sở thích của bạn.');
    } catch { setError('Chưa lưu được sở thích. Kiểm tra kết nối rồi thử lại; lựa chọn của bạn vẫn được giữ.'); }
    finally { setSaving(false); }
  }
  return <section style={{ padding: '0 20px', marginBottom: 20 }}>
    <h3 className="section-title" style={{ marginBottom: 12 }}>Sở thích du lịch</h3>
    <form className="card" style={{ padding: 16 }} onSubmit={save}>
      <p style={{ color: 'var(--navy-muted)', fontSize: '.82rem', marginBottom: 12 }}>Bạn tự chọn sở thích để sắp xếp địa điểm trong Khám phá. Các bộ lọc tìm kiếm vẫn được giữ.</p>
      {loading && <p role="status">Đang tải sở thích…</p>}
      <fieldset disabled={loading || saving || !loaded} style={{ border: 0, padding: 0, margin: 0 }} onChange={() => setMessage('')}>
        <legend style={{ fontWeight: 600, marginBottom: 8 }}>Bạn muốn trải nghiệm gì?</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          {PLACE_CATEGORIES.map(category => <label key={category.value} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: 'var(--soft-white)', borderRadius: 8 }}>
            <input type="checkbox" checked={value.categories.includes(category.value)} onChange={event => setValue(current => ({ ...current, categories: event.target.checked ? [...current.categories, category.value] : current.categories.filter(item => item !== category.value) }))} />
            {category.emoji} {category.label}
          </label>)}
        </div>
        <label style={{ display: 'grid', gap: 8, marginBottom: 16 }}>Nhịp đi
          <select value={value.pacing} onChange={event => setValue(current => ({ ...current, pacing: event.target.value as TravelPreferences['pacing'] }))} style={{ padding: 10, borderRadius: 8, border: '1px solid var(--gray-soft)' }}>
            <option value="relaxed">Thong thả — ưu tiên thời lượng ngắn</option><option value="balanced">Cân bằng</option><option value="packed">Nhiều trải nghiệm</option>
          </select>
        </label>
        <label style={{ display: 'flex', gap: 8, marginBottom: 16 }}><input type="checkbox" checked={value.indoorPreferred} onChange={event => setValue(current => ({ ...current, indoorPreferred: event.target.checked }))} />Ưu tiên không gian trong nhà</label>
        <button type="submit" className="btn-primary" style={{ width: '100%' }}>{saving ? 'Đang lưu…' : 'Lưu sở thích'}</button>
      </fieldset>
      {error && <p role="alert" style={{ marginTop: 12, color: '#9A3412' }}>{error}</p>}
      {!loaded && !loading && <button type="button" onClick={() => setRetry(current => current + 1)}>Thử tải lại</button>}
      {message && <p role="status" style={{ marginTop: 12, color: '#166534' }}>{message} <Link href="/explore">Xem địa điểm →</Link></p>}
    </form>
  </section>;
}
