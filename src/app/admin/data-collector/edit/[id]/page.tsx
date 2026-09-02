'use client';

import { useEffect, useState } from 'react';
import PlaceForm from '@/components/admin/PlaceForm';

export default function EditPlacePage({ params }: { params: { id: string } }) {
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlace = async () => {
      try {
        const res = await fetch(`/api/places/${params.id}`);
        if (!res.ok) throw new Error('Không tìm thấy địa điểm');
        const data = await res.json();
        
        // Ensure some arrays are parsed if they come as string
        const parsedData = { ...data };
        const arrayFields = ['vibe', 'taste_profile', 'accessibility', 'best_time_of_day', 'specialties'];
        arrayFields.forEach(field => {
          if (typeof parsedData[field] === 'string') {
            try {
              parsedData[field] = JSON.parse(parsedData[field]);
            } catch {
              parsedData[field] = [];
            }
          }
        });

        setInitialData(parsedData);
      } catch (err) {
        console.error(err);
        alert('Có lỗi xảy ra khi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    fetchPlace();
  }, [params.id]);

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>;
  }

  if (!initialData) {
    return <div className="text-center py-20 text-red-500">Không tìm thấy địa điểm</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sửa Địa Điểm</h1>
        <p className="text-sm text-gray-500 mt-1">Cập nhật thông tin cho {initialData.name}</p>
      </div>
      
      <PlaceForm initialData={initialData} />
    </div>
  );
}
