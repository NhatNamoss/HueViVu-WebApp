'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PLACE_CATEGORIES, isFoodCategory } from '@/lib/place-taxonomy';
import { authenticatedHeaders } from '@/lib/client-auth';
import { emptyWeeklyHours, parseOpeningHours, WEEK_DAYS, weeklyHoursSummary, type DayKey, type WeeklyHours } from '@/lib/opening-hours';

const MEAL_TYPES = [
  ['', '— Không áp dụng —'], ['breakfast', '🌅 Ăn sáng'], ['lunch', '☀️ Ăn trưa'],
  ['dinner', '🌙 Ăn tối'], ['snack', '🧁 Ăn vặt'], ['any', '🕐 Bất kỳ'],
];
const VIBES = ['Lịch sử', 'Lãng mạn', 'Yên bình', 'Sầm uất', 'Chuẩn địa phương', 'Phong cảnh đẹp', 'Hoài cổ', 'Hiện đại'];
const ACCESSIBILITY = ['Xe lăn toàn diện', 'Xe lăn một phần', 'Xe đẩy trẻ em', 'Thân thiện người lớn tuổi'];
const TIMES = ['Sáng sớm', 'Sáng', 'Trưa', 'Chiều', 'Chiều muộn', 'Tối', 'Đêm'];

const emptyForm = {
  name: '', category: 'heritage', description: '', address: '', price: 'Miễn phí', img: '',
  lat: '16.4637', lng: '107.5909', phone: '', website: '', hours: '', hours_time: '', hours_note: '',
  opening_hours: emptyWeeklyHours() as WeeklyHours,
  ai_insight: '', rating: '4.5', popularity: '0.5', avg_visit_min: '90', meal_type: '', indoor: false,
  crowd_level: 'medium', physical_level: 'easy', best_time: 'all', authenticity: '3',
  vibe: [] as string[], taste_profile: [] as string[], accessibility: [] as string[], best_time_of_day: [] as string[],
  walking_distance: 'minimal', ideal_pacing: 'leisurely', noise_level: 'moderate', dining_style: '', weather_dependent: false,
  highlights: '', tips: '', specialties: '', tags: '',
  source_name: '', source_url: '', verification_status: 'draft', verified_by: '', verified_at: '', verification_notes: '',
  publication_status: 'draft', reverify_after_days: '90',
};

type FormState = typeof emptyForm;
type FieldProps = { label: string; name: keyof FormState; required?: boolean; hint?: string; type?: string; placeholder?: string };

function textList(value: unknown) {
  if (Array.isArray(value)) return value.join('\n');
  return typeof value === 'string' ? value : '';
}
function cleanText(value: unknown) { return String(value ?? '').trim(); }
function listValue(value: unknown) {
  return String(value ?? '').split(/\n|,/).map(item => item.trim()).filter(Boolean);
}

function normalizeFormState(data: any = {}): FormState {
  const merged: any = { ...emptyForm, ...data };
  for (const key of Object.keys(emptyForm) as (keyof FormState)[]) {
    if (typeof emptyForm[key] === 'string') merged[key] = String(data?.[key] ?? emptyForm[key]);
  }
  merged.vibe = Array.isArray(data?.vibe) ? data.vibe : [];
  merged.taste_profile = Array.isArray(data?.taste_profile) ? data.taste_profile : [];
  merged.accessibility = Array.isArray(data?.accessibility) ? data.accessibility : [];
  merged.best_time_of_day = Array.isArray(data?.best_time_of_day) ? data.best_time_of_day : [];
  merged.highlights = textList(data?.highlights);
  merged.tips = textList(data?.tips);
  merged.specialties = textList(data?.specialties);
  merged.tags = textList(data?.tags);
  merged.indoor = Boolean(data?.indoor);
  merged.weather_dependent = Boolean(data?.weather_dependent);
  merged.opening_hours = parseOpeningHours(data?.opening_hours, data?.hours_time);
  return merged as FormState;
}

export default function PlaceForm({ initialData = null }: { initialData?: any }) {
  const router = useRouter();
  const draftKey = `huevivu-place-draft:${initialData?.id || 'new'}`;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [mapsInput, setMapsInput] = useState('');
  const [currentRole, setCurrentRole] = useState('user');
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { headers: authenticatedHeaders() }).then(r => r.ok ? r.json() : null).then(user => setCurrentRole(user?.role || 'user')).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialData) {
      setForm(normalizeFormState({ ...initialData, publication_status: initialData.publication_status || 'published', reverify_after_days: initialData.reverify_after_days || 90 }));
      return;
    }
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try { setForm(normalizeFormState(JSON.parse(saved))); setMessage('Đã khôi phục bản nháp trên thiết bị này.'); } catch {}
    }
  }, [initialData, draftKey]);

  useEffect(() => {
    if (!initialData && form.name) localStorage.setItem(draftKey, JSON.stringify(form));
  }, [form, initialData, draftKey]);

  const set = (name: keyof FormState, value: any) => setForm(prev => ({ ...prev, [name]: value }));
  const toggle = (name: 'vibe' | 'accessibility' | 'best_time_of_day', value: string) => {
    setForm(prev => ({ ...prev, [name]: prev[name].includes(value) ? prev[name].filter(item => item !== value) : [...prev[name], value] }));
  };

  const quality = useMemo(() => {
    const checks = [
      ['Tên', cleanText(form.name)], ['Danh mục', form.category], ['Mô tả ≥60 ký tự', cleanText(form.description).length >= 60],
      ['Địa chỉ', cleanText(form.address)], ['Tọa độ', Number(form.lat) && Number(form.lng)], ['Ảnh', cleanText(form.img)],
      ['Giờ mở cửa', cleanText(form.hours) || cleanText(form.hours_time) || weeklyHoursSummary(form.opening_hours)], ['Nguồn', cleanText(form.source_name)],
      ['URL nguồn', cleanText(form.source_url)], ['Người kiểm chứng', cleanText(form.verified_by)],
      ['Điểm nổi bật', listValue(form.highlights).length], ['Mẹo thực tế', listValue(form.tips).length],
    ] as [string, any][];
    const missing = checks.filter(([, ok]) => !ok).map(([label]) => label);
    return { score: Math.round((checks.length - missing.length) / checks.length * 100), missing };
  }, [form]);

  const fieldClass = 'w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-300 bg-white';
  const Field = ({ label, name, required, hint, type = 'text', placeholder }: FieldProps) => (
    <label className="space-y-1.5 block">
      <span className="text-sm font-medium text-gray-700">{label}{required && ' *'}</span>
      <input required={required} type={type} name={name} value={String(form[name] ?? '')}
        onChange={event => set(name, event.target.value)} placeholder={placeholder} className={fieldClass} />
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </label>
  );

  const extractCoordinates = () => {
    const match = mapsInput.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
      || mapsInput.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/)
      || mapsInput.match(/^\s*(-?\d+\.\d+)\s*[, ]\s*(-?\d+\.\d+)\s*$/);
    if (!match) return setMessage('Không thấy tọa độ. Hãy dùng link Google Maps đầy đủ hoặc nhập “16.46, 107.59”.');
    set('lat', match[1]); set('lng', match[2]); setMessage('Đã trích xuất tọa độ. Hãy kiểm tra lại trước khi lưu.');
  };

  const setDayClosed = (day: DayKey, closed: boolean) => setForm(prev => ({ ...prev, opening_hours: { ...prev.opening_hours, [day]: closed ? [] : [{ open: '08:00', close: '17:00' }] } }));
  const updateInterval = (day: DayKey, index: number, field: 'open' | 'close', value: string) => setForm(prev => ({ ...prev, opening_hours: { ...prev.opening_hours, [day]: prev.opening_hours[day].map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) } }));
  const addInterval = (day: DayKey) => setForm(prev => ({ ...prev, opening_hours: { ...prev.opening_hours, [day]: [...prev.opening_hours[day], { open: '13:30', close: '17:00' }].slice(0, 3) } }));
  const removeInterval = (day: DayKey, index: number) => setForm(prev => ({ ...prev, opening_hours: { ...prev.opening_hours, [day]: prev.opening_hours[day].filter((_, itemIndex) => itemIndex !== index) } }));
  const copyMonday = () => setForm(prev => ({ ...prev, opening_hours: Object.fromEntries(WEEK_DAYS.map(day => [day.key, prev.opening_hours.mon.map(item => ({ ...item }))])) as WeeklyHours }));

  const checkDuplicates = async () => {
    if (!cleanText(form.name)) return setMessage('Nhập tên trước khi kiểm tra trùng.');
    setCheckingDuplicates(true); setMessage('');
    try { const response=await fetch('/api/places/check-duplicates',{method:'POST',headers:authenticatedHeaders(true),body:JSON.stringify({...form,id:initialData?.id})});const data=await response.json();setDuplicates(data.duplicates||[]);setMessage(data.duplicates?.length?`Tìm thấy ${data.duplicates.length} địa điểm cần so sánh.`:'Không phát hiện địa điểm trùng.'); }
    catch{setMessage('Không thể kiểm tra trùng lúc này.')}finally{setCheckingDuplicates(false)}
  };

  const submit = async (status: 'draft' | 'reviewed' | 'verified', publicationStatus?: 'draft' | 'published' | 'archived') => {
    if (!cleanText(form.name)) return setMessage('Cần nhập tên địa điểm.');
    if (status === 'verified' && quality.score < 80) return setMessage(`Chưa thể xác minh: còn thiếu ${quality.missing.join(', ')}.`);
    setSaving(true); setMessage('');
    const payload = {
      ...form, verification_status: status, publication_status: publicationStatus || form.publication_status, allow_duplicate: allowDuplicate,
      hours: form.hours || weeklyHoursSummary(form.opening_hours),
      rating: Number(form.rating), popularity: Number(form.popularity), avg_visit_min: Number(form.avg_visit_min),
      highlights: listValue(form.highlights), tips: listValue(form.tips), specialties: listValue(form.specialties), tags: listValue(form.tags),
      verified_at: status === 'verified' ? new Date().toISOString() : form.verified_at,
    };
    try {
      const response = await fetch(initialData ? `/api/places/${initialData.id}` : '/api/places', {
        method: initialData ? 'PUT' : 'POST', headers: authenticatedHeaders(true), body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) { if(data.duplicates)setDuplicates(data.duplicates); throw new Error(data.error || 'Không thể lưu địa điểm'); }
      localStorage.removeItem(draftKey);
      router.push('/admin/data-collector'); router.refresh();
    } catch (error: any) { setMessage(error.message); }
    finally { setSaving(false); }
  };

  const section = 'bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5';
  return (
    <form onSubmit={event => event.preventDefault()} className="space-y-6 pb-28">
      <div className="sticky top-16 z-10 bg-white/95 backdrop-blur border border-gray-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1">
            <div className="flex justify-between text-sm font-semibold"><span>Độ đầy đủ dữ liệu</span><span className={quality.score >= 80 ? 'text-green-600' : 'text-orange-600'}>{quality.score}%</span></div>
            <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-orange-400 to-green-500" style={{ width: `${quality.score}%` }} /></div>
            {quality.missing.length > 0 && <p className="text-xs text-gray-500 mt-2">Còn thiếu: {quality.missing.join(' · ')}</p>}
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={() => submit('draft')} className="px-4 py-2 border rounded-xl text-sm font-semibold">Lưu nháp</button>
            <button type="button" disabled={saving} onClick={() => submit('reviewed')} className="px-4 py-2 bg-amber-100 text-amber-800 rounded-xl text-sm font-semibold">Chờ duyệt</button>
            <button type="button" disabled={saving || quality.score < 80 || currentRole === 'collector'} onClick={() => submit('verified')} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40">✓ Xác minh</button>
            {currentRole==='admin'&&<button type="button" disabled={saving||quality.score<80} onClick={()=>submit('verified','published')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40">🚀 Xác minh & xuất bản</button>}
          </div>
        </div>
        {message && <p className="text-sm mt-3 px-3 py-2 bg-orange-50 text-orange-800 rounded-lg">{message}</p>}
      </div>

      <section className={section}>
        <div><h2 className="text-lg font-bold text-gray-900">1. Thông tin cốt lõi</h2><p className="text-sm text-gray-500">Thông tin người dùng nhìn thấy và thuật toán dùng trực tiếp.</p></div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Tên địa điểm" name="name" required />
          <label className="space-y-1.5"><span className="text-sm font-medium text-gray-700">Danh mục *</span><select value={form.category} onChange={e => set('category', e.target.value)} className={fieldClass}>{PLACE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}</select></label>
        </div>
        <label className="space-y-1.5 block"><span className="text-sm font-medium text-gray-700">Mô tả đã kiểm chứng *</span><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={5} className={fieldClass} placeholder="Mô tả điều nổi bật, phù hợp với ai và trải nghiệm thực tế. Tối thiểu 60 ký tự." /><span className="text-xs text-gray-400">{form.description.length}/60 ký tự tối thiểu</span></label>
        <div className="grid md:grid-cols-2 gap-4"><Field label="Địa chỉ" name="address" required /><Field label="Giá tham khảo" name="price" /></div>
        <div className="grid md:grid-cols-3 gap-4"><Field label="Số điện thoại" name="phone" /><Field label="Website" name="website" type="url" /><Field label="Ảnh đại diện" name="img" placeholder="/uploads/... hoặc https://..." /></div>
        <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
          <div className="border border-dashed border-orange-200 bg-orange-50/50 rounded-2xl p-4"><div className="flex items-center justify-between"><div><p className="font-semibold text-sm">Kiểm tra địa điểm trùng</p><p className="text-xs text-gray-500 mt-1">So sánh tên, điện thoại, website và tọa độ trong bán kính 80 m.</p></div><button type="button" onClick={checkDuplicates} disabled={checkingDuplicates} className="px-3 py-2 bg-white border rounded-lg text-sm font-semibold">{checkingDuplicates?'Đang kiểm tra…':'Kiểm tra'}</button></div>{duplicates.length>0&&<div className="mt-3 space-y-2">{duplicates.slice(0,5).map(item=><div key={item.id} className="p-3 bg-white border rounded-xl"><p className="font-semibold text-sm">{item.name}</p><p className="text-xs text-red-600 mt-1">{item.reasons.join(' · ')}</p><Link href={`/admin/data-collector/edit/${item.id}`} className="text-xs text-orange-600 font-semibold">Mở để so sánh →</Link></div>)}<label className="flex gap-2 text-xs text-gray-600"><input type="checkbox" checked={allowDuplicate} onChange={event=>setAllowDuplicate(event.target.checked)}/>Tôi đã so sánh và xác nhận đây là địa điểm khác.</label></div>}</div>
          <div className="bg-white border rounded-2xl overflow-hidden shadow-sm"><div className="h-32 bg-gray-100">{form.img?<img src={form.img} alt="Preview" className="w-full h-full object-cover" onError={event=>(event.currentTarget.style.display='none')}/>:<div className="h-full flex items-center justify-center text-gray-400 text-sm">Chưa có ảnh</div>}</div><div className="p-4"><p className="text-[10px] font-bold tracking-widest text-orange-500">PREVIEW TRÊN ỨNG DỤNG</p><p className="font-bold text-gray-900 mt-1">{form.name||'Tên địa điểm'}</p><p className="text-xs text-gray-500 mt-1 line-clamp-2">{form.description||'Mô tả sẽ hiển thị tại đây.'}</p><div className="flex justify-between text-xs mt-3"><span>{form.price||'Chưa có giá'}</span><span>⭐ {form.rating}</span></div></div></div>
        </div>
      </section>

      <section className={section}>
        <div><h2 className="text-lg font-bold text-gray-900">2. Vị trí và giờ hoạt động</h2><p className="text-sm text-gray-500">Dùng để tính đường, kiểm tra “đang mở” và điều chỉnh lịch.</p></div>
        <div className="flex flex-col md:flex-row gap-2 bg-orange-50 p-3 rounded-xl">
          <input value={mapsInput} onChange={e => setMapsInput(e.target.value)} className={`${fieldClass} flex-1`} placeholder="Dán link Maps đầy đủ hoặc tọa độ 16.46, 107.59" />
          <button type="button" onClick={extractCoordinates} className="px-4 py-2 bg-white border rounded-lg font-semibold text-sm">Lấy tọa độ</button>
        </div>
        <div className="grid md:grid-cols-2 gap-4"><Field label="Vĩ độ" name="lat" required /><Field label="Kinh độ" name="lng" required /></div>
        <div className="grid md:grid-cols-3 gap-4"><Field label="Giờ hiển thị" name="hours" placeholder="Tự sinh từ lịch tuần nếu để trống" /><Field label="Khung giờ cũ" name="hours_time" placeholder="07:00-17:30" /><Field label="Ghi chú giờ" name="hours_note" placeholder="Đóng quầy vé trước 30 phút" /></div>
        <div className="border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 flex items-center justify-between gap-3"><div><p className="font-semibold text-sm text-gray-800">Lịch mở cửa 7 ngày</p><p className="text-xs text-gray-500">Hỗ trợ nghỉ trưa hoặc nhiều ca trong ngày.</p></div><button type="button" onClick={copyMonday} disabled={!form.opening_hours.mon.length} className="text-xs font-semibold text-orange-600 disabled:opacity-40">Sao chép Thứ 2 cho cả tuần</button></div>
          <div className="divide-y">{WEEK_DAYS.map(day => {
            const intervals = form.opening_hours[day.key];
            return <div key={day.key} className="p-3 grid md:grid-cols-[100px_1fr] gap-3 items-start">
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={intervals.length > 0} onChange={event => setDayClosed(day.key, !event.target.checked)} />{day.label}</label>
              {intervals.length ? <div className="space-y-2">{intervals.map((interval, index) => <div key={index} className="flex items-center gap-2"><input type="time" value={interval.open} onChange={event => updateInterval(day.key, index, 'open', event.target.value)} className="p-2 border rounded-lg" /><span className="text-gray-400">đến</span><input type="time" value={interval.close} onChange={event => updateInterval(day.key, index, 'close', event.target.value)} className="p-2 border rounded-lg" />{intervals.length > 1 && <button type="button" onClick={() => removeInterval(day.key, index)} className="text-red-500 px-2">×</button>}</div>)}{intervals.length < 3 && <button type="button" onClick={() => addInterval(day.key)} className="text-xs font-semibold text-orange-600">+ Thêm ca</button>}</div> : <span className="text-sm text-gray-400">Đóng cửa</span>}
            </div>;
          })}</div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.indoor} onChange={e => set('indoor', e.target.checked)} /> Không gian trong nhà</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.weather_dependent} onChange={e => set('weather_dependent', e.target.checked)} /> Phụ thuộc thời tiết</label>
        </div>
      </section>

      <section className={section}>
        <div><h2 className="text-lg font-bold text-gray-900">3. Chất lượng cho bộ máy lập lịch</h2><p className="text-sm text-gray-500">Các trường này ảnh hưởng trực tiếp đến thứ tự gợi ý.</p></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Rating 1–5" name="rating" type="number" /><Field label="Độ phổ biến 0–1" name="popularity" type="number" />
          <Field label="Thời gian tham quan (phút)" name="avg_visit_min" type="number" />
          <label className="space-y-1.5"><span className="text-sm font-medium text-gray-700">Bữa ăn phù hợp</span><select disabled={!isFoodCategory(form.category)} value={form.meal_type} onChange={e => set('meal_type', e.target.value)} className={fieldClass}>{MEAL_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <label className="space-y-1.5"><span className="text-sm font-medium text-gray-700">Đông đúc</span><select value={form.crowd_level} onChange={e => set('crowd_level', e.target.value)} className={fieldClass}><option value="low">Thấp</option><option value="medium">Trung bình</option><option value="high">Đông</option></select></label>
          <label className="space-y-1.5"><span className="text-sm font-medium text-gray-700">Thể lực</span><select value={form.physical_level} onChange={e => set('physical_level', e.target.value)} className={fieldClass}><option value="easy">Dễ</option><option value="moderate">Vừa</option><option value="hard">Khó</option></select></label>
          <Field label="Độ bản địa 1–5" name="authenticity" type="number" />
        </div>
      </section>

      <section className={section}>
        <div><h2 className="text-lg font-bold text-gray-900">4. Ngữ cảnh và nội dung hướng dẫn</h2><p className="text-sm text-gray-500">Grounding cho AI, Live Guide và cá nhân hóa.</p></div>
        <label className="space-y-1.5 block"><span className="text-sm font-medium text-gray-700">AI insight</span><textarea value={form.ai_insight} onChange={e => set('ai_insight', e.target.value)} rows={3} className={fieldClass} placeholder="Một lời khuyên chính xác, thực tế và đặc trưng cho địa điểm." /></label>
        {[['vibe', 'Không khí', VIBES], ['accessibility', 'Khả năng tiếp cận', ACCESSIBILITY], ['best_time_of_day', 'Thời điểm tốt', TIMES]].map(([key, label, options]) => (
          <div key={key as string}><p className="text-sm font-medium text-gray-700 mb-2">{label as string}</p><div className="flex flex-wrap gap-2">{(options as string[]).map(option => <button type="button" key={option} onClick={() => toggle(key as any, option)} className={`px-3 py-2 rounded-lg border text-sm ${(form[key as 'vibe'] as string[]).includes(option) ? 'bg-orange-100 border-orange-400 text-orange-800' : 'bg-gray-50 border-gray-200'}`}>{option}</button>)}</div></div>
        ))}
        <div className="grid md:grid-cols-2 gap-4">
          <label className="space-y-1.5"><span className="text-sm font-medium text-gray-700">Điểm nổi bật — mỗi dòng một ý</span><textarea value={form.highlights} onChange={e => set('highlights', e.target.value)} rows={4} className={fieldClass} /></label>
          <label className="space-y-1.5"><span className="text-sm font-medium text-gray-700">Mẹo thực tế — mỗi dòng một ý</span><textarea value={form.tips} onChange={e => set('tips', e.target.value)} rows={4} className={fieldClass} /></label>
          <label className="space-y-1.5"><span className="text-sm font-medium text-gray-700">Đặc sản/món chính</span><textarea value={form.specialties} onChange={e => set('specialties', e.target.value)} rows={3} className={fieldClass} /></label>
          <label className="space-y-1.5"><span className="text-sm font-medium text-gray-700">Từ khóa tìm kiếm</span><textarea value={form.tags} onChange={e => set('tags', e.target.value)} rows={3} className={fieldClass} /></label>
        </div>
      </section>

      <section className={`${section} border-2 border-green-200`}>
        <div><h2 className="text-lg font-bold text-gray-900">5. Bằng chứng xác minh</h2><p className="text-sm text-gray-500">Không tự động thu thập. Người nhập chịu trách nhiệm đối chiếu nguồn và ghi rõ ghi chú.</p></div>
        <div className="grid md:grid-cols-2 gap-4"><Field label="Tên nguồn" name="source_name" required placeholder="Website chính thức / khảo sát tại chỗ" /><Field label="URL nguồn" name="source_url" type="url" placeholder="https://..." /></div>
        <div className="grid md:grid-cols-2 gap-4"><Field label="Người kiểm chứng" name="verified_by" required /><Field label="Lần xác minh gần nhất" name="verified_at" type="datetime-local" /></div>
        <div className="grid md:grid-cols-2 gap-4"><label className="space-y-1.5"><span className="text-sm font-medium text-gray-700">Chu kỳ kiểm tra lại</span><select value={form.reverify_after_days} onChange={event=>set('reverify_after_days',event.target.value)} className={fieldClass}><option value="30">30 ngày — dữ liệu biến động cao</option><option value="60">60 ngày</option><option value="90">90 ngày — mặc định</option></select></label><div className="p-3 bg-gray-50 rounded-xl"><p className="text-xs text-gray-500">Trạng thái xuất bản</p><p className="font-semibold mt-1">{form.publication_status==='published'?'🔵 Đang hiển thị trên ứng dụng':form.publication_status==='archived'?'⚫ Đã lưu trữ':'🟠 Chưa xuất bản'}</p>{currentRole==='admin'&&initialData&&<div className="flex gap-2 mt-2"><button type="button" onClick={()=>submit(form.verification_status as any,'published')} className="text-xs font-semibold text-blue-600">Xuất bản</button><button type="button" onClick={()=>submit(form.verification_status as any,'archived')} className="text-xs font-semibold text-gray-500">Lưu trữ</button></div>}</div></div>
        <label className="space-y-1.5 block"><span className="text-sm font-medium text-gray-700">Ghi chú kiểm chứng</span><textarea value={form.verification_notes} onChange={e => set('verification_notes', e.target.value)} rows={3} className={fieldClass} placeholder="Đã gọi điện xác nhận giờ mở cửa; giá vé kiểm tra tại quầy..." /></label>
      </section>
    </form>
  );
}
