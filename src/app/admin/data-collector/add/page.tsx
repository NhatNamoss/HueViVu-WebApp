import PlaceForm from '@/components/admin/PlaceForm';

export default function AddPlacePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Thêm Địa Điểm Mới</h1>
        <p className="text-sm text-gray-500 mt-1">Công cụ nhập liệu nội bộ cho hệ thống AI HueViVu</p>
      </div>
      
      <PlaceForm />
    </div>
  );
}
