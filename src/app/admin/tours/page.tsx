'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const THEME_LABELS: Record<string, string> = {
  classic: '🏛️ Cổ điển', food: '🍜 Ẩm thực', nature: '🌿 Thiên nhiên',
  culture: '🎭 Văn hóa', photo: '📸 Ảnh', romantic: '💕 Lãng mạn',
  adventure: '🏔️ Phiêu lưu', spiritual: '🛕 Tâm linh', family: '👨‍👩‍👧 Gia đình', night: '🌙 Đêm',
};

export default function AdminToursPage() {
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch('/api/tours').then(r => r.json()).then(setTours).catch(() => {}).finally(() => setLoading(false)); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa combo tour này?')) return;
    await fetch(`/api/tours/${id}`, { method: 'DELETE' });
    setTours(prev => prev.filter(t => t.id !== id));
  };

  const toggleFeatured = async (tour: any) => {
    await fetch(`/api/tours/${tour.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...tour, is_featured: !tour.is_featured }) });
    setTours(prev => prev.map(t => t.id === tour.id ? { ...t, is_featured: !t.is_featured } : t));
  };

  const toggleActive = async (tour: any) => {
    await fetch(`/api/tours/${tour.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...tour, is_active: !tour.is_active }) });
    setTours(prev => prev.map(t => t.id === tour.id ? { ...t, is_active: !t.is_active } : t));
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Đang tải...</div>;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Combo Tours</h1>
          <p className="text-sm text-gray-500 mt-1">{tours.length} combo · {tours.filter(t => t.is_featured).length} nổi bật · {tours.filter(t => t.is_active).length} hoạt động</p>
        </div>
        <Link href="/admin/tours/add" className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-xl hover:shadow-lg transition-all">+ Tạo Combo</Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-700 font-medium border-b">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Tên combo</th>
              <th className="px-4 py-3">Theme</th>
              <th className="px-4 py-3 text-center">Điểm</th>
              <th className="px-4 py-3 text-center">Giá</th>
              <th className="px-4 py-3 text-center">⭐</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tours.map((t, i) => (
              <tr key={t.id} className={`hover:bg-orange-50/30 ${!t.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{t.is_featured ? '⭐ ' : ''}{t.title}</td>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-100 rounded text-xs">{THEME_LABELS[t.theme] || t.theme}</span></td>
                <td className="px-4 py-3 text-center text-xs">{(t.place_ids || []).length} 📍</td>
                <td className="px-4 py-3 text-center text-xs font-mono">{t.price > 0 ? `${(t.price / 1000).toFixed(0)}K` : 'Free'}</td>
                <td className="px-4 py-3 text-center text-xs">{t.rating}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleActive(t)} className={`px-2 py-0.5 rounded-full text-xs ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{t.is_active ? 'ON' : 'OFF'}</button>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => toggleFeatured(t)} className="text-yellow-500 hover:text-yellow-700 text-xs">{t.is_featured ? '★' : '☆'}</button>
                  <Link href={`/admin/tours/edit/${t.id}`} className="text-orange-600 hover:text-orange-800 text-xs font-medium">Sửa</Link>
                  <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Xóa</button>
                </td>
              </tr>
            ))}
            {tours.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Chưa có combo nào. Tạo combo đầu tiên!</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
