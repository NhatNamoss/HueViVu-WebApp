import Link from 'next/link';

export default function NotFoundPage() {
  return <main style={{ padding: '48px 24px', maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
    <h1 style={{ fontSize: '1.5rem', marginBottom: 12 }}>Không tìm thấy trang</h1>
    <p style={{ marginBottom: 24 }}>Đường dẫn này có thể đã thay đổi. Về trang chủ để tìm địa điểm hoặc mở lịch trình của bạn.</p>
    <Link href="/" className="btn-primary">Về trang chủ</Link>
  </main>;
}
