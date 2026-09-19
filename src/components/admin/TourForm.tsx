'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const THEMES = [
  { value: 'classic', label: '🏛️ Di sản Cổ điển' },
  { value: 'food', label: '🍜 Ẩm thực Huế' },
  { value: 'nature', label: '🌿 Thiên nhiên' },
  { value: 'culture', label: '🎭 Văn hóa Sâu' },
  { value: 'photo', label: '📸 Chụp ảnh' },
  { value: 'romantic', label: '💕 Lãng mạn' },
  { value: 'adventure', label: '🏔️ Phiêu lưu' },
  { value: 'spiritual', label: '🛕 Tâm linh' },
  { value: 'family', label: '👨‍👩‍👧 Gia đình' },
  { value: 'night', label: '🌙 Về đêm' },
];

const DIFFICULTIES = [
  { value: 'easy', label: '🟢 Dễ dàng' },
  { value: 'moderate', label: '🟡 Vừa phải' },
  { value: 'hard', label: '🔴 Thử thách' },
];

type TourFormProps = { initialData?: any; tourId?: string };

export default function TourForm({ initialData, tourId }: TourFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [places, setPlaces] = useState<any[]>([]);
  const [placeSearch, setPlaceSearch] = useState('');
  const [form, setForm] = useState({
    title: '', slug: '', description: '', short_desc: '', theme: 'classic',
    duration_hours: 8, price: 0, original_price: 0, cover_img: '/assets/citadel.png',
    gallery: [] as string[], place_ids: [] as string[],
    highlights: [] as string[], includes: [] as string[], excludes: [] as string[],
    difficulty: 'easy', max_people: 10, rating: 4.8, review_count: 0,
    tags: [] as string[], is_featured: false, is_active: true, sort_order: 0,
  });
  const [newHighlight, setNewHighlight] = useState('');
  const [newInclude, setNewInclude] = useState('');
  const [newExclude, setNewExclude] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newGallery, setNewGallery] = useState('');

  useEffect(() => { fetch('/api/places').then(r => r.json()).then(setPlaces).catch(() => {}); }, []);
  useEffect(() => {
    if (!initialData) return;
    setForm(prev => ({ ...prev, ...initialData,
      gallery: initialData.gallery || [], place_ids: initialData.place_ids || [],
      highlights: initialData.highlights || [], includes: initialData.includes || [],
      excludes: initialData.excludes || [], tags: initialData.tags || [],
      is_featured: !!initialData.is_featured, is_active: initialData.is_active !== 0,
    }));
  }, [initialData]);

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const addList = (k: string, val: string, reset: () => void) => { if (!val.trim()) return; setForm(prev => ({ ...prev, [k]: [...(prev as any)[k], val.trim()] })); reset(); };
  const rmList = (k: string, i: number) => setForm(prev => ({ ...prev, [k]: (prev as any)[k].filter((_: any, idx: number) => idx !== i) }));
  const autoSlug = (t: string) => { set('title', t); if (!tourId) set('slug', t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); };

  const handleSubmit = async () => {
    if (!form.title) { alert('Nhập tên combo tour'); return; }
    if (form.place_ids.length === 0) { alert('Chọn ít nhất 1 địa điểm'); return; }
    setSaving(true);
    try {
      const res = await fetch(tourId ? `/api/tours/${tourId}` : '/api/tours',
        { method: tourId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      router.push('/admin/tours');
    } catch { alert('Lưu thất bại'); } finally { setSaving(false); }
  };

  const selectedPlaces = form.place_ids.map(id => places.find(p => p.id === id)).filter(Boolean);
  const availablePlaces = places.filter(p => !form.place_ids.includes(p.id) && (!placeSearch || p.name.toLowerCase().includes(placeSearch.toLowerCase())));
  const addPlace = (id: string) => set('place_ids', [...form.place_ids, id]);
  const removePlace = (id: string) => set('place_ids', form.place_ids.filter((x: string) => x !== id));
  const movePlace = (i: number, dir: -1 | 1) => { const a = [...form.place_ids]; const j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set('place_ids', a); };
  const totalMin = selectedPlaces.reduce((s: number, p: any) => s + (p?.avg_visit_min || 60), 0);

  const ic = 'w-full p-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-300';
  const lc = 'block text-sm font-semibold text-gray-700 mb-1.5';
  const sc = 'bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{tourId ? 'Sửa Combo Tour' : 'Tạo Combo Tour'}</h1>
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">← Quay lại</button>
      </div>
      {/* Basic */}
      <div className={sc}>
        <h2 className="text-base font-bold text-gray-800">📋 Thông tin cơ bản</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><label className={lc}>Tên combo *</label><input className={ic} value={form.title} onChange={e => autoSlug(e.target.value)} /></div>
          <div><label className={lc}>Slug</label><input className={ic} value={form.slug} onChange={e => set('slug', e.target.value)} /></div>
          <div><label className={lc}>Theme</label><select className={ic} value={form.theme} onChange={e => set('theme', e.target.value)}>{THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div className="md:col-span-2"><label className={lc}>Mô tả ngắn</label><input className={ic} value={form.short_desc} onChange={e => set('short_desc', e.target.value)} maxLength={150} /></div>
          <div className="md:col-span-2"><label className={lc}>Mô tả chi tiết</label><textarea className={ic} value={form.description} onChange={e => set('description', e.target.value)} rows={4} /></div>
        </div>
      </div>
      {/* Pricing */}
      <div className={sc}>
        <h2 className="text-base font-bold text-gray-800">💰 Giá & Chi tiết</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><label className={lc}>Giá</label><input type="number" className={ic} value={form.price} onChange={e => set('price', +e.target.value)} /></div>
          <div><label className={lc}>Giá gốc</label><input type="number" className={ic} value={form.original_price} onChange={e => set('original_price', +e.target.value)} /></div>
          <div><label className={lc}>Giờ</label><input type="number" step="0.5" className={ic} value={form.duration_hours} onChange={e => set('duration_hours', +e.target.value)} /></div>
          <div><label className={lc}>Max</label><input type="number" className={ic} value={form.max_people} onChange={e => set('max_people', +e.target.value)} /></div>
          <div><label className={lc}>Độ khó</label><select className={ic} value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>{DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
          <div><label className={lc}>Rating</label><input type="number" step="0.1" className={ic} value={form.rating} onChange={e => set('rating', +e.target.value)} /></div>
          <div><label className={lc}>Reviews</label><input type="number" className={ic} value={form.review_count} onChange={e => set('review_count', +e.target.value)} /></div>
          <div><label className={lc}>Thứ tự</label><input type="number" className={ic} value={form.sort_order} onChange={e => set('sort_order', +e.target.value)} /></div>
        </div>
        {form.original_price > form.price && form.price > 0 && <p className="text-sm text-green-600 font-medium">🏷️ Giảm {Math.round((1 - form.price / form.original_price) * 100)}%</p>}
        <div className="flex gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)} className="accent-orange-500 w-4 h-4" />⭐ Nổi bật</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="accent-green-500 w-4 h-4" />🟢 Hoạt động</label>
        </div>
      </div>
      {/* Cover */}
      <div className={sc}>
        <h2 className="text-base font-bold text-gray-800">🖼️ Hình ảnh</h2>
        <label className={lc}>Ảnh bìa</label>
        <input className={ic} value={form.cover_img} onChange={e => set('cover_img', e.target.value)} />
        {form.cover_img && <img src={form.cover_img} alt="" className="mt-2 h-32 rounded-lg object-cover" onError={e => (e.target as any).style.display='none'} />}
        <label className={lc}>Gallery</label>
        <div className="flex gap-2"><input className={ic+' flex-1'} value={newGallery} onChange={e => setNewGallery(e.target.value)} placeholder="URL" onKeyDown={e => e.key==='Enter'&&(e.preventDefault(),addList('gallery',newGallery,()=>setNewGallery('')))} /><button type="button" onClick={() => addList('gallery',newGallery,()=>setNewGallery(''))} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">+</button></div>
        <div className="flex gap-2 mt-2 flex-wrap">{form.gallery.map((u,i)=>(<div key={i} className="relative group"><img src={u} alt="" className="h-16 w-16 rounded-lg object-cover"/><button onClick={()=>rmList('gallery',i)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100">×</button></div>))}</div>
      </div>
      {/* Place Picker */}
      <div className={sc}>
        <h2 className="text-base font-bold text-gray-800">📍 Lộ trình ({form.place_ids.length} điểm · ~{Math.round(totalMin/60*10)/10}h)</h2>
        {selectedPlaces.length > 0 && <div className="space-y-2">
          {selectedPlaces.map((p: any, i: number) => (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-orange-50/50 border border-orange-100 rounded-xl">
              <span className="w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                <p className="text-xs text-gray-500">{p.category} · ⭐{p.rating} · ⏱️{p.avg_visit_min||60}m</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={()=>movePlace(i,-1)} disabled={i===0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20">↑</button>
                <button onClick={()=>movePlace(i,1)} disabled={i===selectedPlaces.length-1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20">↓</button>
                <button onClick={()=>removePlace(p.id)} className="p-1 text-red-400 hover:text-red-600">✕</button>
              </div>
            </div>
          ))}
        </div>}
        <input className={ic} value={placeSearch} onChange={e => setPlaceSearch(e.target.value)} placeholder="🔍 Tìm và thêm địa điểm..." />
        {placeSearch && <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
          {availablePlaces.slice(0,15).map(p => (
            <button key={p.id} onClick={()=>{addPlace(p.id);setPlaceSearch('');}} className="w-full text-left p-2.5 hover:bg-orange-50 flex items-center gap-3 text-sm">
              <span className="font-medium text-gray-800">{p.name}</span>
              <span className="text-xs text-gray-400 ml-auto">{p.category}</span>
            </button>
          ))}
          {availablePlaces.length===0 && <p className="p-3 text-sm text-gray-400 text-center">Không tìm thấy</p>}
        </div>}
      </div>
      {/* Content */}
      <div className={sc}>
        <h2 className="text-base font-bold text-gray-800">✨ Nội dung & Tags</h2>
        {(['highlights','includes','excludes','tags'] as const).map(field => {
          const cfg = { highlights: { label: 'Điểm nổi bật', icon: '✨', bg: 'bg-orange-50 border-orange-200 text-orange-700', btn: 'text-orange-400', st: newHighlight, setSt: setNewHighlight },
            includes: { label: 'Bao gồm', icon: '✅', bg: 'bg-green-50 border-green-200 text-green-700', btn: 'text-green-400', st: newInclude, setSt: setNewInclude },
            excludes: { label: 'Không bao gồm', icon: '❌', bg: 'bg-red-50 border-red-200 text-red-600', btn: 'text-red-400', st: newExclude, setSt: setNewExclude },
            tags: { label: 'Tags', icon: '#', bg: 'bg-blue-50 border-blue-200 text-blue-700', btn: 'text-blue-400', st: newTag, setSt: setNewTag },
          }[field];
          return (<div key={field}>
            <label className={lc}>{cfg.label}</label>
            <div className="flex gap-2"><input className={ic+' flex-1'} value={cfg.st} onChange={e=>cfg.setSt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),addList(field,cfg.st,()=>cfg.setSt('')))} /><button type="button" onClick={()=>addList(field,cfg.st,()=>cfg.setSt(''))} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">+</button></div>
            <div className="flex flex-wrap gap-2 mt-2">{(form[field] as string[]).map((v,i)=>(
              <span key={i} className={`px-3 py-1.5 border rounded-full text-xs font-medium flex items-center gap-1.5 ${cfg.bg}`}>{cfg.icon} {v} <button onClick={()=>rmList(field,i)} className={`${cfg.btn} hover:text-red-500`}>×</button></span>
            ))}</div>
          </div>);
        })}
      </div>
      {/* Submit */}
      <div className="flex gap-3">
        <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:shadow-lg disabled:opacity-50">{saving ? '⏳ Lưu...' : tourId ? '💾 Cập nhật' : '🚀 Tạo Combo'}</button>
        <button onClick={() => router.back()} className="px-6 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Hủy</button>
      </div>
    </div>
  );
}
