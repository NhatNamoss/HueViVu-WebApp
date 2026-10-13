'use client';
import Link from 'next/link';

const contacts = [
  { number: '112', title: 'Tổng đài khẩn cấp', desc: 'Sự cố, thiên tai, thảm họa hoặc yêu cầu trợ giúp khẩn cấp. Hệ thống 112 kết nối tới 113, 114, 115.', tone: 'critical' },
  { number: '113', title: 'Công an', desc: 'Tình huống an ninh, nguy hiểm, mất cắp hoặc cần hỗ trợ của lực lượng công an.', tone: 'critical' },
  { number: '114', title: 'Cứu hỏa & cứu nạn', desc: 'Cháy, cứu nạn, cứu hộ và các tình huống cần lực lượng phòng cháy chữa cháy.', tone: 'critical' },
  { number: '115', title: 'Cấp cứu y tế', desc: 'Cấp cứu y tế. Trung tâm Cấp cứu 115 thành phố Huế là đầu mối cấp cứu ngoại viện.', tone: 'critical' },
  { number: '0234 382 8288', title: 'Hỗ trợ du lịch Huế', desc: 'Đường dây nóng của ngành Du lịch Huế để phản ánh, kiến nghị và cần hỗ trợ về hoạt động du lịch.', tone: 'travel' },
  { number: '0234 382 2305', title: 'Công an thành phố Huế', desc: 'Số trực ban được Công an thành phố Huế công bố.', tone: 'travel' },
];

export default function EmergencyPage() {
  return (
    <>
      <header className="page-header">
        <Link href="/" className="header-btn" aria-label="Về trang chủ">←</Link>
        <div style={{ textAlign: 'center' }}>
          <p className="section-eyebrow" style={{ marginBottom: 2 }}>HỖ TRỢ KHI CẦN</p>
          <h1 className="page-header-title">Trợ giúp khẩn cấp</h1>
        </div>
        <div style={{ width: 40 }} />
      </header>
      <main style={{ padding: '0 20px 100px' }}>
        <section style={{ marginBottom: 20, padding: 18, borderRadius: 24, background: 'linear-gradient(135deg, rgba(185,28,28,.10), rgba(255,154,92,.10))', border: '1px solid rgba(185,28,28,.12)' }}>
          <p style={{ fontSize: 22, marginBottom: 8 }}>🆘</p>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 6 }}>Đang nguy hiểm ngay lúc này?</h2>
          <p style={{ fontSize: '.82rem', lineHeight: 1.55, color: 'var(--navy-muted)' }}>Ưu tiên gọi số khẩn cấp phù hợp. HueViVu không thay thế cơ quan cứu hộ, y tế hoặc công an.</p>
        </section>
        <section style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
          {contacts.map(c => (
            <a key={c.number} href={'tel:' + c.number.replace(/[^0-9+]/g, '')} className="card" style={{ display: 'block', padding: 16, border: c.tone === 'critical' ? '1px solid rgba(185,28,28,.14)' : '1px solid rgba(255,127,107,.14)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 58, height: 58, flexShrink: 0, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.tone === 'critical' ? 'rgba(185,28,28,.10)' : 'rgba(255,127,107,.10)', color: c.tone === 'critical' ? '#B91C1C' : 'var(--coral)', fontWeight: 800, fontSize: c.number.length > 6 ? '.72rem' : '1.15rem', textAlign: 'center' }}>{c.number}</div>
                <div style={{ flex: 1 }}><h3 style={{ fontSize: '.92rem', fontWeight: 800, marginBottom: 4 }}>{c.title}</h3><p style={{ fontSize: '.75rem', lineHeight: 1.5, color: 'var(--navy-muted)' }}>{c.desc}</p></div>
                <span aria-hidden="true" style={{ fontSize: 20, color: 'var(--gray-soft)' }}>›</span>
              </div>
            </a>
          ))}
        </section>
        <section className="card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: '.9rem', fontWeight: 800, marginBottom: 8 }}>Khi gọi hỗ trợ, hãy nói rõ</h3>
          <ul style={{ paddingLeft: 20, margin: 0, color: 'var(--navy-muted)', fontSize: '.78rem', lineHeight: 1.7 }}><li>Vị trí hiện tại hoặc địa điểm gần nhất.</li><li>Chuyện gì đang xảy ra và có ai bị thương hay không.</li><li>Số điện thoại để lực lượng hỗ trợ liên hệ lại.</li></ul>
        </section>
        <p style={{ marginTop: 16, fontSize: '.68rem', lineHeight: 1.5, color: 'var(--gray-soft)' }}>Nguồn kiểm chứng: Cổng thông tin thành phố Huế, Công an thành phố Huế và Sở Văn hóa, Thể thao và Du lịch thành phố Huế. Thông tin khẩn cấp cần được kiểm tra lại khi triển khai chính thức.</p>
      </main>
    </>
  );
}
