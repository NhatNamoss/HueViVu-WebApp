'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DataCollectorPage() {
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchPlaces();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa địa điểm này?')) return;
    try {
      await fetch(`/api/places/${id}`, { method: 'DELETE' });
      setPlaces(prev => prev.filter(p => p.id !== id));
      alert('Đã xóa thành công!');
    } catch (err) {
      alert('Xóa thất bại');
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Địa điểm</h1>
          <p className="text-sm text-gray-500 mt-1">Công cụ nhập liệu nội bộ cho hệ thống AI HueViVu</p>
        </div>
        <Link 
          href="/admin/data-collector/add"
          className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm Địa Điểm Mới
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Tên địa điểm</th>
                <th className="px-6 py-4 whitespace-nowrap">Danh mục</th>
                <th className="px-6 py-4 whitespace-nowrap">Đánh giá</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {places.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    Chưa có dữ liệu nào. Hãy thêm địa điểm mới.
                  </td>
                </tr>
              ) : (
                places.map((place) => (
                  <tr key={place.id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{place.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs">{place.category}</span>
                    </td>
                    <td className="px-6 py-4 flex items-center gap-1">
                      <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      {place.rating}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link 
                          href={`/admin/data-collector/edit/${place.id}`}
                          className="text-orange-600 hover:text-orange-800 font-medium"
                        >
                          Sửa
                        </Link>
                        <button 
                          onClick={() => handleDelete(place.id)}
                          className="text-red-500 hover:text-red-700 font-medium"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
