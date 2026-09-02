'use client';
import Link from 'next/link';

const SECTIONS = [
  {
    title: 'Dữ liệu chúng tôi thu thập',
    icon: '📋',
    items: [
      { label: 'Thông tin tài khoản', detail: 'Tên, email — dùng để đăng nhập và cá nhân hóa trải nghiệm.' },
      { label: 'Lịch trình & hành trình', detail: 'Các chuyến đi AI tạo ra và bạn chỉnh sửa — lưu trữ cục bộ trên server của ứng dụng.' },
      { label: 'Sở thích du lịch', detail: 'Style, vibe, món ăn yêu thích từ onboarding — dùng để AI gợi ý phù hợp hơn.' },
      { label: 'Lịch sử trò chuyện AI', detail: 'Tin nhắn với HueViVu AI được lưu tạm để duy trì ngữ cảnh hội thoại.' },
    ],
  },
  {
    title: 'Chúng tôi KHÔNG thu thập',
    icon: '🚫',
    items: [
      { label: 'Vị trí GPS thời gian thực', detail: 'Ứng dụng không theo dõi vị trí của bạn khi dùng.' },
      { label: 'Thông tin thanh toán', detail: 'Chúng tôi không xử lý bất kỳ giao dịch tài chính nào.' },
      { label: 'Dữ liệu bên thứ ba', detail: 'Không chia sẻ dữ liệu với quảng cáo hoặc bên thứ ba.' },
      { label: 'Danh bạ / camera', detail: 'Không yêu cầu quyền truy cập thiết bị nhạy cảm.' },
    ],
  },
  {
    title: 'Cách chúng tôi dùng dữ liệu',
    icon: '🎯',
    items: [
      { label: 'Cá nhân hóa AI', detail: 'Sở thích của bạn giúp AI đề xuất lịch trình, địa điểm phù hợp hơn.' },
      { label: 'Cải thiện ứng dụng', detail: 'Dữ liệu ẩn danh giúp chúng tôi hiểu tính năng nào hữu ích nhất.' },
      { label: 'Bảo mật tài khoản', detail: 'Email dùng để xác thực và khôi phục tài khoản khi cần.' },
    ],
  },
  {
    title: 'Quyền của bạn',
    icon: '✅',
    items: [
      { label: 'Xem dữ liệu', detail: 'Bạn có thể xem tất cả dữ liệu cá nhân qua ứng dụng bất kỳ lúc nào.' },
      { label: 'Chỉnh sửa thông tin', detail: 'Cập nhật tên, email trong phần cài đặt tài khoản.' },
      { label: 'Xóa tài khoản', detail: 'Gửi yêu cầu xóa toàn bộ dữ liệu qua mục Góp ý & Hỗ trợ.' },
      { label: 'Xuất dữ liệu', detail: 'Yêu cầu xuất lịch trình và dữ liệu cá nhân dạng file qua mục Hỗ trợ.' },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <header className="page-header">
        <Link href="/profile" className="header-btn" style={{ border: 'none', background: 'rgba(26,29,59,0.05)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </Link>
        <div style={{ textAlign: 'center' }}>
          <p className="section-eyebrow" style={{ marginBottom: 2 }}>CÀI ĐẶT</p>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--navy)' }}>🛡️ Quyền riêng tư</h1>
        </div>
        <div style={{ width: 40 }} />
      </header>

      <section style={{ padding: '8px 20px 0' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(99,102,241,0.04))', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 20 }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--navy)', lineHeight: 1.6, margin: 0 }}>
            HueViVu coi trọng quyền riêng tư của bạn. Dữ liệu được lưu trữ an toàn và chỉ dùng để cải thiện trải nghiệm của bạn. Chúng tôi không bán dữ liệu cho bất kỳ ai.
          </p>
        </div>
      </section>

      {SECTIONS.map(section => (
        <section key={section.title} style={{ padding: '0 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: '1.125rem' }}>{section.icon}</span>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--navy)', margin: 0 }}>{section.title}</h3>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {section.items.map((item, i) => (
              <div key={item.label} style={{ padding: '14px 16px', borderBottom: i < section.items.length - 1 ? '1px solid rgba(26,29,59,0.05)' : 'none' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--navy)', marginBottom: 3 }}>{item.label}</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)', lineHeight: 1.5, margin: 0 }}>{item.detail}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section style={{ padding: '0 20px', marginBottom: 120 }}>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)', marginBottom: 12, lineHeight: 1.5 }}>
            Có câu hỏi về quyền riêng tư? Liên hệ chúng tôi
          </p>
          <Link href="/profile/feedback" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'linear-gradient(135deg,var(--coral),var(--warm-orange))', color: 'white', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}>
            💬 Liên hệ hỗ trợ
          </Link>
        </div>
      </section>
    </>
  );
}
