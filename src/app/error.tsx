'use client';

import Link from 'next/link';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main style={{ padding: '48px 24px', maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
    <h1 style={{ fontSize: '1.5rem', marginBottom: 12 }}>Chưa mở được trang này</h1>
    <p style={{ marginBottom: 24 }}>HueViVu đang gặp sự cố. Hãy thử tải lại trang; nếu vẫn chưa được, bạn có thể quay về trang chủ để tiếp tục khám phá.</p>
    <button onClick={reset} className="btn-primary" style={{ width: '100%', marginBottom: 12 }}>Thử tải lại</button>
    <Link href="/" className="btn-secondary">Về trang chủ</Link>
  </main>;
}
