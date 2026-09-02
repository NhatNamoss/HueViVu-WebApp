'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AITrainerFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  const [formData, setFormData] = useState({
    source: 'chatbot',
    user_profile: '{"budget": "medium", "style": "chill"}',
    context: '',
    output: '',
    reward: '1.0',
    image_url: ''
  });

  useEffect(() => {
    if (id) {
      fetch(`/api/training/${id}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setFormData({
              source: data.source || 'chatbot',
              user_profile: data.user_profile || '',
              context: data.context || '',
              output: data.output || '',
              reward: data.reward?.toString() || '1.0',
              image_url: data.image_url || ''
            });
          }
        })
        .finally(() => setInitialLoading(false));
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = id ? `/api/training/${id}` : '/api/training';
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Có lỗi xảy ra khi lưu dữ liệu');
      
      alert('Lưu thành công!');
      router.push('/admin/ai-trainer');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <div className="py-20 text-center">Đang tải...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{id ? 'Sửa dữ liệu Training' : 'Thêm dữ liệu Training'}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Dữ liệu này sẽ được dùng để fine-tune AI theo phương pháp RLHF.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Loại dữ liệu (Source)</label>
            <select name="source" value={formData.source} onChange={handleChange} className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-orange-500/50">
              <option value="chatbot">Chatbot (Tin nhắn chat)</option>
              <option value="live">Live (Hành trình, Gợi ý địa điểm)</option>
              <option value="object">Nhận diện Vật phẩm (Object/Di tích)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Reward (Điểm đánh giá: 0.0 - 1.0)</label>
            <input 
              type="number" step="0.1" min="0" max="1" 
              name="reward" value={formData.reward} onChange={handleChange} 
              className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500/50" 
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">User Profile (JSON hoặc văn bản)</label>
          <textarea 
            name="user_profile" value={formData.user_profile} onChange={handleChange} rows={2}
            className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500/50 font-mono text-sm"
            placeholder='{"budget": "medium", "style": "chill"}'
          ></textarea>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Context (Ngữ cảnh / Tên vật phẩm cần nhận diện)</label>
          <textarea 
            name="context" value={formData.context} onChange={handleChange} rows={4} required
            className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500/50"
            placeholder="Ví dụ: Tìm quán bún bò ngon... HOẶC Tên vật phẩm: Cửu Đỉnh, Ngai Vàng..."
          ></textarea>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Expected Output (Câu trả lời chuẩn của AI)</label>
          <textarea 
            name="output" value={formData.output} onChange={handleChange} rows={6} required
            className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500/50"
            placeholder="Ví dụ: Bạn có thể thử quán Bún Bò O Cương ở 6 Nguyễn Trường Tộ..."
          ></textarea>
        </div>

        {formData.source === 'object' && (
          <div className="space-y-2 p-4 bg-orange-50 rounded-lg border border-orange-100">
            <label className="text-sm font-medium text-orange-800 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Hình ảnh Vật phẩm (Dành cho nhận diện qua Vision AI)
            </label>
            <input 
              type="text" name="image_url" value={formData.image_url} onChange={handleChange}
              className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500/50 bg-white"
              placeholder="Nhập đường dẫn URL của hình ảnh..."
            />
            {formData.image_url && (
              <div className="mt-2">
                <img src={formData.image_url} alt="Preview" className="h-32 rounded object-cover border" />
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={() => router.back()} className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 font-medium rounded-xl transition-colors">
            Hủy
          </button>
          <button disabled={loading} type="submit" className="px-8 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50">
            {loading ? 'Đang lưu...' : (id ? 'Cập nhật' : 'Thêm mới')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AITrainerFormPage() {
  return (
    <Suspense fallback={null}>
      <AITrainerFormInner />
    </Suspense>
  );
}
