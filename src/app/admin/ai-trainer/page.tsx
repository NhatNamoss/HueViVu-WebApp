'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AITrainerPage() {
  const [examples, setExamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chatbot' | 'live' | 'object'>('chatbot');

  const fetchExamples = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/training?source=${activeTab}`);
      const data = await res.json();
      setExamples(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamples();
  }, [activeTab]);

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa mẫu dữ liệu này?')) return;
    try {
      await fetch(`/api/training/${id}`, { method: 'DELETE' });
      setExamples(prev => prev.filter(e => e.id !== id));
      alert('Đã xóa thành công!');
    } catch (err) {
      alert('Xóa thất bại');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Trainer</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý dữ liệu huấn luyện cho Chatbot & Live</p>
        </div>
        <Link 
          href="/admin/ai-trainer/form"
          className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm Dữ liệu
        </Link>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('chatbot')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'chatbot' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Chatbot Training Data
        </button>
        <button
          onClick={() => setActiveTab('live')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'live' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Live Training Data
        </button>
        <button
          onClick={() => setActiveTab('object')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'object' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Nhận diện Vật phẩm (Object)
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Context</th>
                <th className="px-6 py-4 whitespace-nowrap">Output (Label)</th>
                <th className="px-6 py-4 whitespace-nowrap w-24">Reward</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : examples.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    Chưa có dữ liệu nào. Hãy thêm dữ liệu mới.
                  </td>
                </tr>
              ) : (
                examples.map((item) => (
                  <tr key={item.id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="line-clamp-2 max-w-xs">{item.context}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="line-clamp-2 max-w-md text-gray-800">{item.output}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">{item.reward}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link 
                          href={`/admin/ai-trainer/form?id=${item.id}`}
                          className="text-orange-600 hover:text-orange-800 font-medium"
                        >
                          Sửa
                        </Link>
                        <button 
                          onClick={() => handleDelete(item.id)}
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
