'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  'Heritage (Di sản)',
  'Local Vibe (Nhịp sống địa phương)',
  'Nature (Thiên nhiên)',
  'Culinary (Ẩm thực)',
  'Cafe & Chill',
  'Art & Culture (Văn hóa nghệ thuật)'
];

const VIBE_OPTIONS = [
  'Lịch sử (Historic)', 'Lãng mạn (Romantic)', 'Yên bình (Peaceful)', 'Sầm uất (Bustling)',
  'Chuẩn địa phương (Local)', 'Phong cảnh đẹp (Scenic)', 'Hoài cổ (Retro)', 'Hiện đại (Modern)'
];

const TASTE_OPTIONS = [
  'Cay (Spicy)', 'Mặn mà (Savory)', 'Ngọt (Sweet)', 'Chua (Sour)',
  'Đắng (Bitter)', 'Béo ngậy (Rich)', 'Thanh đạm (Light)'
];

const ACCESSIBILITY_OPTIONS = [
  'Xe lăn (Toàn diện)', 'Xe lăn (Một phần)', 'Thân thiện xe đẩy trẻ em', 'Thân thiện người lớn tuổi'
];

const TIME_OPTIONS = [
  'Sáng sớm (Early Morning)', 'Sáng (Morning)', 'Chiều (Afternoon)',
  'Chiều muộn (Late Afternoon)', 'Tối (Evening)', 'Đêm (Night)'
];

export default function PlaceForm({ initialData = null }: { initialData?: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: CATEGORIES[0],
    description: '',
    address: '',
    price: 'Miễn phí',
    img: '',
    lat: '16.4637',
    lng: '107.5909',
    ai_insight: '',
    crowd_level: 'Trung bình',
    physical_level: 'Nhẹ nhàng (Dễ)',
    best_time: 'Cả ngày',
    authenticity: '3',
    vibe: [] as string[],
    taste_profile: [] as string[],
    accessibility: [] as string[],
    best_time_of_day: [] as string[],
    walking_distance: 'Tối thiểu (Minimal)',
    ideal_pacing: 'Thong thả (Leisurely)',
    noise_level: 'Vừa phải (Moderate)',
    dining_style: 'Không có',
    weather_dependent: false,
    highlights: '',
    tips: '',
    specialties: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        vibe: Array.isArray(initialData.vibe) ? initialData.vibe : [],
        taste_profile: Array.isArray(initialData.taste_profile) ? initialData.taste_profile : [],
        accessibility: Array.isArray(initialData.accessibility) ? initialData.accessibility : [],
        best_time_of_day: Array.isArray(initialData.best_time_of_day) ? initialData.best_time_of_day : [],
        highlights: Array.isArray(initialData.highlights) ? initialData.highlights.join(', ') : '',
        tips: Array.isArray(initialData.tips) ? initialData.tips.join(', ') : '',
        specialties: Array.isArray(initialData.specialties) ? initialData.specialties.join(', ') : '',
        weather_dependent: initialData.weather_dependent === '1' || initialData.weather_dependent === true
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleArrayChange = (field: string, value: string) => {
    setFormData(prev => {
      const arr = prev[field as keyof typeof formData] as string[];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...arr, value] };
      }
    });
  };

  const extractCoordinates = () => {
    if (!googleMapsUrl) return;
    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = googleMapsUrl.match(regex);
    if (match) {
      setFormData(prev => ({ ...prev, lat: match[1], lng: match[2] }));
      alert('Đã trích xuất tọa độ thành công!');
    } else {
      alert('Không tìm thấy tọa độ trong URL này.');
    }
  };

  const getMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            lat: position.coords.latitude.toString(),
            lng: position.coords.longitude.toString()
          }));
          alert('Đã lấy vị trí hiện tại thành công!');
        },
        () => alert('Không thể lấy vị trí hiện tại.')
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      highlights: formData.highlights.split(',').map(s => s.trim()).filter(Boolean),
      tips: formData.tips.split(',').map(s => s.trim()).filter(Boolean),
      specialties: formData.specialties.split(',').map(s => s.trim()).filter(Boolean)
    };

    try {
      const url = initialData ? `/api/places/${initialData.id}` : '/api/places';
      const method = initialData ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Có lỗi xảy ra khi lưu dữ liệu');
      
      alert('Lưu thành công!');
      router.push('/admin/data-collector');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-20">
      {/* 1. Thông tin cơ bản */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">1. Thông tin Cơ bản</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tên địa điểm *</label>
            <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500/50 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Danh mục *</label>
            <select name="category" value={formData.category} onChange={handleChange} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500/50 outline-none bg-white">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Mô tả ngắn</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500/50 outline-none"></textarea>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Địa chỉ</label>
            <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500/50 outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Giá cả (Text)</label>
            <input type="text" name="price" value={formData.price} onChange={handleChange} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500/50 outline-none" />
          </div>
        </div>
      </div>

      {/* 2. Hình ảnh & Bản đồ */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">2. Hình ảnh & Bản đồ</h2>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 border-dashed space-y-3">
          <p className="text-sm font-medium text-orange-600 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Công cụ lấy tọa độ nhanh
          </p>
          <div className="flex gap-2">
            <input type="text" placeholder="Dán link Google Maps vào đây..." value={googleMapsUrl} onChange={e => setGoogleMapsUrl(e.target.value)} className="flex-1 p-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-orange-500" />
            <button type="button" onClick={extractCoordinates} className="px-4 py-2 bg-white border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> Trích xuất
            </button>
            <button type="button" onClick={getMyLocation} className="px-4 py-2 bg-white border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> Lấy vị trí
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tải file Hình ảnh (Hoặc nhập URL)</label>
            <input type="text" name="img" placeholder="/assets/place.jpg" value={formData.img} onChange={handleChange} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500/50 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Vĩ độ (Latitude)</label>
            <input type="text" name="lat" value={formData.lat} onChange={handleChange} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500/50 outline-none bg-gray-50 font-mono" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Kinh độ (Longitude)</label>
            <input type="text" name="lng" value={formData.lng} onChange={handleChange} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500/50 outline-none bg-gray-50 font-mono" />
          </div>
        </div>
      </div>

      {/* 3. Khai báo cho AI */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-8">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">3. Khai báo cho AI (AI Metadata)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">AI Insight (Lời khuyên từ AI)</label>
            <textarea name="ai_insight" value={formData.ai_insight} onChange={handleChange} placeholder="Gợi ý gì cho người dùng khi đến đây?" rows={4} className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-orange-500/50 outline-none"></textarea>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Mức độ đông đúc</label>
              <select name="crowd_level" value={formData.crowd_level} onChange={handleChange} className="w-full p-2.5 border rounded-lg bg-white outline-none">
                <option value="Thấp">Thấp</option>
                <option value="Trung bình">Trung bình</option>
                <option value="Đông đúc">Đông đúc</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Thể lực yêu cầu</label>
              <select name="physical_level" value={formData.physical_level} onChange={handleChange} className="w-full p-2.5 border rounded-lg bg-white outline-none">
                <option value="Nhẹ nhàng (Dễ)">Nhẹ nhàng (Dễ)</option>
                <option value="Vừa phải">Vừa phải</option>
                <option value="Đòi hỏi thể lực">Đòi hỏi thể lực</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Độ chuẩn vị/Local (1-5)</label>
            <input type="number" min="1" max="5" name="authenticity" value={formData.authenticity} onChange={handleChange} className="w-full p-2.5 border rounded-lg outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Thời điểm tốt nhất</label>
            <select name="best_time" value={formData.best_time} onChange={handleChange} className="w-full p-2.5 border rounded-lg bg-white outline-none">
              <option value="Cả ngày">Cả ngày</option>
              <option value="Mùa nắng">Mùa nắng</option>
              <option value="Mùa mưa">Mùa mưa</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Vibe (Không khí)</label>
          <div className="flex flex-wrap gap-3">
            {VIBE_OPTIONS.map(v => (
              <label key={v} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-100">
                <input type="checkbox" checked={formData.vibe.includes(v)} onChange={() => handleArrayChange('vibe', v)} className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500" />
                {v}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Taste Profile (Hương vị)</label>
            <div className="grid grid-cols-2 gap-3">
              {TASTE_OPTIONS.map(t => (
                <label key={t} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-100">
                  <input type="checkbox" checked={formData.taste_profile.includes(t)} onChange={() => handleArrayChange('taste_profile', t)} className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500" />
                  {t}
                </label>
              ))}
            </div>
          </div>
          
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Tiếp cận (Accessibility)</label>
            <div className="grid grid-cols-2 gap-3">
              {ACCESSIBILITY_OPTIONS.map(a => (
                <label key={a} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-100">
                  <input type="checkbox" checked={formData.accessibility.includes(a)} onChange={() => handleArrayChange('accessibility', a)} className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500" />
                  {a}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Thời điểm tốt nhất trong ngày</label>
            <div className="grid grid-cols-2 gap-3">
              {TIME_OPTIONS.map(t => (
                <label key={t} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-100">
                  <input type="checkbox" checked={formData.best_time_of_day.includes(t)} onChange={() => handleArrayChange('best_time_of_day', t)} className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500" />
                  {t}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Độ ồn (Noise Level)</label>
              <select name="noise_level" value={formData.noise_level} onChange={handleChange} className="w-full p-2.5 border rounded-lg bg-white outline-none">
                <option value="Yên tĩnh (Quiet)">Yên tĩnh (Quiet)</option>
                <option value="Vừa phải (Moderate)">Vừa phải (Moderate)</option>
                <option value="Ồn ào (Loud)">Ồn ào (Loud)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Khoảng cách đi bộ</label>
              <select name="walking_distance" value={formData.walking_distance} onChange={handleChange} className="w-full p-2.5 border rounded-lg bg-white outline-none">
                <option value="Tối thiểu (Minimal)">Tối thiểu (Minimal)</option>
                <option value="Trung bình (Moderate)">Trung bình (Moderate)</option>
                <option value="Nhiều (Extensive)">Nhiều (Extensive)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nhịp độ tham quan (Ideal Pacing)</label>
              <select name="ideal_pacing" value={formData.ideal_pacing} onChange={handleChange} className="w-full p-2.5 border rounded-lg bg-white outline-none">
                <option value="Thong thả (Leisurely)">Thong thả (Leisurely)</option>
                <option value="Nhanh (Quick)">Nhanh (Quick)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Phong cách ăn uống (Dining Style)</label>
              <select name="dining_style" value={formData.dining_style} onChange={handleChange} className="w-full p-2.5 border rounded-lg bg-white outline-none">
                <option value="Không có">Không có</option>
                <option value="Quán vỉa hè (Street food)">Quán vỉa hè (Street food)</option>
                <option value="Nhà hàng bình dân (Casual)">Nhà hàng bình dân (Casual)</option>
                <option value="Sang trọng (Fine dining)">Sang trọng (Fine dining)</option>
              </select>
            </div>
          </div>
          <div className="pb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input type="checkbox" name="weather_dependent" checked={formData.weather_dependent} onChange={handleChange} className="w-5 h-5 text-orange-500 rounded border-gray-300 focus:ring-orange-500" />
              Phụ thuộc vào thời tiết (Ví dụ: ngoài trời)
            </label>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-dashed">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Highlights (Các điểm nổi bật) - Ngăn cách bằng dấu phẩy</label>
            <input type="text" name="highlights" value={formData.highlights} onChange={handleChange} placeholder="Ngọ Môn, Điện Thái Hòa..." className="w-full p-2.5 border rounded-lg outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tips (Mẹo vặt) - Ngăn cách bằng dấu phẩy</label>
            <input type="text" name="tips" value={formData.tips} onChange={handleChange} placeholder="Nên đi sớm, Nhớ mang ô..." className="w-full p-2.5 border rounded-lg outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Specialties (Đặc sản/Món chính) - Ngăn cách bằng dấu phẩy</label>
            <input type="text" name="specialties" value={formData.specialties} onChange={handleChange} placeholder="Bún bò, Bánh bèo..." className="w-full p-2.5 border rounded-lg outline-none" />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button disabled={loading} type="submit" className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50">
          {loading ? 'Đang lưu...' : 'Lưu Địa Điểm'}
        </button>
      </div>
    </form>
  );
}
