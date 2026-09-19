'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import TourForm from '@/components/admin/TourForm';

export default function EditTourPage() {
  const { id } = useParams();
  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tours/${id}`).then(r => r.json()).then(setTour).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-gray-500">Đang tải...</div>;
  if (!tour) return <div className="text-center py-20 text-red-500">Không tìm thấy combo tour</div>;

  return <TourForm initialData={tour} tourId={id as string} />;
}
