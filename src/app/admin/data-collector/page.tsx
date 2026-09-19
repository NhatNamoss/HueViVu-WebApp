'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const CAT_LABELS: Record<string, string> = {
  heritage: '🏛️ Di tích', temple: '🛕 Chùa', food: '🍜 Ẩm thực', cafe: '☕ Cafe',
  nature: '🌿 Thiên nhiên', market: '🛍️ Chợ', craft_village: '🏘️ Làng nghề',
  art: '🎨 Nghệ thuật', architecture: '🏗️ Kiến trúc', experience: '🎭 Trải nghiệm',
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🧁', any: '🕐',
};

export default function DataCollectorPage() {
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('all');
  const [filterQuality, setFilterQuality] = useState<'all' | 'missing'>('all');
  const [search, setSearch] = useState('');

  const fetchPlaces = async () => {
    try {
      const res = await fetch('/api/places');
      const data = await res.json();
      setPlaces(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlaces(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa địa điểm này?')) return;
    try {
      await fetch(`/api/places/${id}`, { method: 'DELETE' });
      setPlaces(prev => prev.filter(p => p.id !== id));
    } catch { alert('Xóa thất bại'); }
  };

  const cats = places.reduce((acc, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc; }, {} as Record<string, number>);
  const missingQ = places.filter(p => p.popularity === 0.5 && p.avg_visit_min === 90).length;
  const missingM = places.filter(p => ['food', 'market'].includes(p.category) && !p.meal_type).length;

  const filtered = places.filter(p => {
    if (filterCat !== 'all' && p.category !== filterCat) return false;
    if (filterQuality === 'missing' && !(p.popularity === 0.5 && p.avg_visit_min === 90)) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Địa điểm</h1>
          <p className="text-sm text-gray-500 mt-1">
            {places.length} địa điểm
            {missingQ > 0 && <span className="text-orange-600 ml-1">· {missingQ} thiếu quality</span>}
            {missingM > 0 && <span className="text-red-500 ml-1">· {missingM} food thiếu meal_type</span>}
          </p>
        </div>
        <Link href="/admin/data-collector/add"
          className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-xl hover:shadow-lg transition-all flex items-center gap-2">
          + Thêm Địa Điểm
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([cat, cnt]) => (
          <button key={cat} onClick={() => setFilterCat(filterCat === cat ? 'all' : cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterCat === cat ? 'bg-orange-100 border-orange-400 text-orange-700' : 'bg-white border-gray-200 text-gray-600'}`}>
            {CAT_LABELS[cat] || cat} ({cnt})
          </button>
        ))}
        <button onClick={() => setFilterQuality(filterQuality === 'missing' ? 'all' : 'missing')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterQuality === 'missing' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-white border-gray-200 text-gray-600'}`}>
          ⚠️ Thiếu quality ({missingQ})
        </button>
      </div>

      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên..."
        className="w-full sm:w-80 p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-300 text-sm" />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
              <tr>
                <th className="px-4 py-3">Tên</th>
                <th className="px-4 py-3">Danh mục</th>
                <th className="px-4 py-3 text-center">⭐</th>
                <th className="px-4 py-3 text-center">🔥</th>
                <th className="px-4 py-3 text-center">⏱️</th>
                <th className="px-4 py-3">🍽️</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => {
                const isDef = p.popularity === 0.5 && p.avg_visit_min === 90;
                return (
                  <tr key={p.id} className={`hover:bg-orange-50/30 ${isDef ? 'bg-yellow-50/50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{p.name}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-100 rounded text-xs">{CAT_LABELS[p.category] || p.category}</span></td>
                    <td className="px-4 py-3 text-center">{p.rating}</td>
                    <td className="px-4 py-3 text-center"><span className={`text-xs font-mono ${p.popularity >= 0.8 ? 'text-green-600 font-bold' : p.popularity >= 0.6 ? 'text-blue-600' : 'text-gray-400'}`}>{p.popularity}</span></td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">{p.avg_visit_min}m</td>
                    <td className="px-4 py-3">{p.meal_type ? <span className="text-xs">{MEAL_LABELS[p.meal_type] || p.meal_type}</span> : ['food','market'].includes(p.category) ? <span className="text-xs text-red-400">⚠️</span> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/data-collector/edit/${p.id}`} className="text-orange-600 hover:text-orange-800 font-medium text-xs mr-2">Sửa</Link>
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 font-medium text-xs">Xóa</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
