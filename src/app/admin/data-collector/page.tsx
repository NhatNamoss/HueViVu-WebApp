'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { getCategoryMeta, PLACE_CATEGORIES } from '@/lib/place-taxonomy';
import { authenticatedHeaders } from '@/lib/client-auth';

const STATUS_META: Record<string, { label: string; style: string }> = {
  draft: { label: 'Bản nháp', style: 'bg-gray-100 text-gray-700' },
  reviewed: { label: 'Chờ duyệt', style: 'bg-amber-100 text-amber-800' },
  verified: { label: 'Đã xác minh', style: 'bg-green-100 text-green-800' },
};

function parseCsv(text: string) {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { cell += '"'; index++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[index + 1] === '\n') index++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  const headers = (rows.shift() || []).map(item => item.replace(/^\uFEFF/, ''));
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

export default function DataCollectorPage() {
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [quality, setQuality] = useState('all');
  const [publication, setPublication] = useState('all');
  const [qualityData, setQualityData] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [syncingTasks, setSyncingTasks] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchPlaces = async () => {
    setLoading(true);
    try { const response = await fetch('/api/places?scope=admin', { headers: authenticatedHeaders() }); setPlaces(response.ok ? await response.json() : []); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchPlaces(); fetch('/api/admin/data-quality',{headers:authenticatedHeaders()}).then(r=>r.ok?r.json():null).then(setQualityData); }, []);

  const stats = useMemo(() => {
    const verified = places.filter(p => p.verification_status === 'verified').length;
    const needsWork = places.filter(p => Number(p.completeness_score) < 80).length;
    const stale = places.filter(p => {
      if (!p.verified_at) return false;
      return Date.now() - new Date(p.verified_at).getTime() > 1000 * 60 * 60 * 24 * 90;
    }).length;
    const average = places.length ? Math.round(places.reduce((sum, p) => sum + Number(p.completeness_score || 0), 0) / places.length) : 0;
    const issues = places.filter(p => p.quality_issues?.length).length;
    return { verified, needsWork, stale, average, issues };
  }, [places]);

  const filtered = places.filter(place => {
    const query = search.trim().toLowerCase();
    if (query && !`${place.name} ${place.address} ${place.source_name}`.toLowerCase().includes(query)) return false;
    if (category !== 'all' && place.category !== category) return false;
    if (status !== 'all' && (place.verification_status || 'draft') !== status) return false;
    if (quality === 'incomplete' && Number(place.completeness_score) >= 80) return false;
    if (quality === 'stale' && !place.needs_reverification) return false;
    if (quality === 'issues' && !place.quality_issues?.length) return false;
    if (quality === 'reverify' && !place.needs_reverification) return false;
    if (publication !== 'all' && place.publication_status !== publication) return false;
    return true;
  });

  const handleDelete = async (place: any) => {
    if (!confirm(`Xóa “${place.name}”? Hành động này không thể hoàn tác.`)) return;
    const response = await fetch(`/api/places/${place.id}`, { method: 'DELETE', headers: authenticatedHeaders() });
    if (response.ok) setPlaces(prev => prev.filter(item => item.id !== place.id));
    else alert('Không thể xóa địa điểm.');
  };

  const handleExport = async () => {
    const response = await fetch('/api/places/export', { headers: authenticatedHeaders() });
    if (!response.ok) return alert('Không thể xuất dữ liệu.');
    const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = `huevivu-places-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  const handleImport = async (file?: File) => {
    if (!file) return; setImporting(true); setImportResult(null);
    try { const rows = parseCsv(await file.text()); const response = await fetch('/api/places/import',{method:'POST',headers:authenticatedHeaders(true),body:JSON.stringify({rows})}); const data=await response.json(); if(!response.ok)throw new Error(data.error||'Import thất bại'); setImportResult(data); await fetchPlaces(); }
    catch(error:any){setImportResult({error:error.message})} finally{setImporting(false);if(fileRef.current)fileRef.current.value=''}
  };
  const syncTasks = async () => { setSyncingTasks(true); const response=await fetch('/api/admin/data-tasks/sync',{method:'POST',headers:authenticatedHeaders()});const data=await response.json();setImportResult(response.ok?{taskMessage:`Đã tạo ${data.created} nhiệm vụ mới từ khoảng trống dữ liệu.`}:{error:data.error||'Không thể tạo nhiệm vụ'});setSyncingTasks(false); };

  const card = 'bg-white border border-gray-100 rounded-2xl p-4 shadow-sm';
  if (loading) return <div className="text-center py-20 text-gray-500">Đang kiểm tra kho dữ liệu…</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div><p className="text-xs font-bold tracking-widest text-orange-500 uppercase">Kho dữ liệu đã kiểm chứng</p><h1 className="text-2xl font-bold text-gray-900 mt-1">Data Collector</h1><p className="text-sm text-gray-500 mt-1">Nhập thủ công, lưu nguồn và theo dõi chất lượng từng địa điểm.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={handleExport} className="px-4 py-3 bg-white border text-gray-700 font-semibold rounded-xl">↓ Xuất CSV</button><button onClick={()=>fileRef.current?.click()} disabled={importing} className="px-4 py-3 bg-white border text-gray-700 font-semibold rounded-xl disabled:opacity-50">{importing?'Đang kiểm tra…':'↑ Nhập CSV'}</button><input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={event=>handleImport(event.target.files?.[0])}/><Link href="/admin/data-collector/add" className="px-5 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl shadow-sm">+ Thu thập địa điểm</Link></div>
      </header>

      {importResult && <div className={`p-4 rounded-2xl border ${importResult.error?'bg-red-50 text-red-700':'bg-green-50 text-green-800'}`}>{importResult.error?<p>{importResult.error}</p>:<p className="font-semibold">{importResult.taskMessage||`Import hoàn tất: ${importResult.created} tạo mới · ${importResult.skipped} bỏ qua · ${importResult.errors} lỗi`}</p>}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={card}><p className="text-xs text-gray-500">Tổng địa điểm</p><p className="text-2xl font-bold mt-1">{places.length}</p></div>
        <div className={card}><p className="text-xs text-gray-500">Đã xác minh</p><p className="text-2xl font-bold text-green-600 mt-1">{stats.verified}</p></div>
        <div className={card}><p className="text-xs text-gray-500">Cần bổ sung</p><p className="text-2xl font-bold text-orange-600 mt-1">{stats.needsWork}</p>{stats.issues > 0 && <p className="text-xs text-red-500 mt-1">{stats.issues} điểm cần rà soát taxonomy</p>}</div>
        <div className={card}><p className="text-xs text-gray-500">Chất lượng trung bình</p><p className="text-2xl font-bold text-blue-600 mt-1">{stats.average}%</p>{stats.stale > 0 && <p className="text-xs text-red-500 mt-1">{stats.stale} nguồn quá 90 ngày</p>}</div>
      </div>

      {qualityData && <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className={card}><div className="flex items-center justify-between mb-3"><div><p className="font-bold text-gray-900">Độ phủ danh mục</p><p className="text-xs text-gray-500">Danh mục bằng 0 sẽ khiến AI không thể đáp ứng đúng sở thích.</p></div><div className="flex gap-2"><button onClick={syncTasks} disabled={syncingTasks} className="text-xs font-semibold text-blue-600 disabled:opacity-40">{syncingTasks?'Đang tạo…':'Tạo nhiệm vụ'}</button><Link href="/admin/data-tasks" className="text-xs font-semibold text-orange-600">Mở hàng đợi →</Link></div></div><div className="grid grid-cols-2 md:grid-cols-3 gap-2">{qualityData.coverage.map((item:any)=><button key={item.value} onClick={()=>setCategory(item.value)} className={`p-3 rounded-xl border text-left ${item.total===0?'bg-red-50 border-red-200':'bg-gray-50 border-gray-100'}`}><p className="text-sm font-semibold">{item.emoji} {item.label}</p><p className={`text-xs mt-1 ${item.total===0?'text-red-600':'text-gray-500'}`}>{item.total===0?'Chưa có dữ liệu':`${item.verified}/${item.total} đã xác minh`}</p></button>)}</div></div>
        <div className={card}><p className="font-bold text-gray-900 mb-3">Khoảng trống cần xử lý</p><div className="space-y-2 text-sm">{Object.entries(qualityData.missing).map(([field,count])=><div key={field} className="flex justify-between"><span className="text-gray-500">Thiếu {field}</span><strong className={Number(count)>0?'text-orange-600':'text-green-600'}>{String(count)}</strong></div>)}<div className="flex justify-between pt-2 border-t"><span className="text-gray-500">Cần tái xác minh</span><strong className="text-red-600">{qualityData.needs_reverification}</strong></div><div className="flex justify-between"><span className="text-gray-500">Chưa xuất bản</span><strong>{qualityData.unpublished}</strong></div></div></div>
      </div>}

      <div className={`${card} space-y-3`}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên, địa chỉ hoặc nguồn xác minh…" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-300" />
        <div className="flex flex-wrap gap-2">
          <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-2 border rounded-lg text-sm bg-white"><option value="all">Tất cả danh mục</option>{PLACE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}</select>
          <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm bg-white"><option value="all">Tất cả trạng thái</option><option value="draft">Bản nháp</option><option value="reviewed">Chờ duyệt</option><option value="verified">Đã xác minh</option></select>
          <select value={quality} onChange={e => setQuality(e.target.value)} className="px-3 py-2 border rounded-lg text-sm bg-white"><option value="all">Mọi mức chất lượng</option><option value="incomplete">Dưới 80%</option><option value="issues">Cần rà soát taxonomy</option><option value="stale">Nguồn quá 90 ngày</option></select>
          <select value={publication} onChange={e=>setPublication(e.target.value)} className="px-3 py-2 border rounded-lg text-sm bg-white"><option value="all">Mọi trạng thái xuất bản</option><option value="published">Đang xuất bản</option><option value="draft">Chưa xuất bản</option><option value="archived">Đã lưu trữ</option></select>
          <button onClick={()=>setQuality('reverify')} className={`px-3 py-2 border rounded-lg text-sm ${quality==='reverify'?'bg-red-50 border-red-300 text-red-700':'bg-white'}`}>⏰ Tái xác minh</button>
          <span className="ml-auto text-sm text-gray-500 self-center">{filtered.length} kết quả</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b text-gray-600"><tr><th className="px-4 py-3">Địa điểm</th><th className="px-4 py-3">Danh mục</th><th className="px-4 py-3">Chất lượng</th><th className="px-4 py-3">Xác minh</th><th className="px-4 py-3">Xuất bản</th><th className="px-4 py-3">Nguồn</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
            <tbody className="divide-y">
              {filtered.map(place => {
                const meta = getCategoryMeta(place.category);
                const statusMeta = STATUS_META[place.verification_status || 'draft'];
                const score = Number(place.completeness_score || 0);
                return <tr key={place.id} className="hover:bg-orange-50/30">
                  <td className="px-4 py-3"><p className="font-semibold text-gray-900 max-w-[260px] truncate">{place.name}</p><p className="text-xs text-gray-400 max-w-[260px] truncate">{place.address || 'Chưa có địa chỉ'}</p></td>
                  <td className="px-4 py-3 whitespace-nowrap">{meta ? `${meta.emoji} ${meta.label}` : place.category}{place.quality_issues?.length > 0 && <p className="text-[11px] text-red-500 mt-1 max-w-[190px] whitespace-normal">⚠ {place.quality_issues[0]}</p>}</td>
                  <td className="px-4 py-3 min-w-[150px]"><div className="flex items-center gap-2"><div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${score}%` }} /></div><span className="text-xs font-semibold">{score}%</span></div></td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusMeta.style}`}>{statusMeta.label}</span>{place.verified_at && <p className="text-[11px] text-gray-400 mt-1">{new Date(place.verified_at).toLocaleDateString('vi-VN')}</p>}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${place.publication_status==='published'?'bg-blue-100 text-blue-700':place.publication_status==='archived'?'bg-gray-200 text-gray-600':'bg-orange-100 text-orange-700'}`}>{place.publication_status==='published'?'Đang hiển thị':place.publication_status==='archived'?'Lưu trữ':'Chưa xuất bản'}</span>{place.needs_reverification&&<p className="text-[11px] text-red-500 mt-1">Cần kiểm tra lại</p>}</td>
                  <td className="px-4 py-3 max-w-[180px]"><p className="truncate text-xs font-medium">{place.source_name || 'Chưa có nguồn'}</p>{place.verified_by && <p className="truncate text-[11px] text-gray-400">bởi {place.verified_by}</p>}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap"><Link href={`/admin/data-collector/edit/${place.id}`} className="text-orange-600 font-semibold mr-3">Sửa</Link><button onClick={() => handleDelete(place)} className="text-red-500 font-semibold">Xóa</button></td>
                </tr>;
              })}
              {!filtered.length && <tr><td colSpan={7} className="text-center py-16 text-gray-400">Không có địa điểm phù hợp bộ lọc.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
