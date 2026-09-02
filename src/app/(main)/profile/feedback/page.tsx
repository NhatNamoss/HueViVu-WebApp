'use client';
import { useState } from 'react';
import Link from 'next/link';

const TOPICS = [
  { key: 'bug', label: '🐛 Báo lỗi', desc: 'Ứng dụng bị lỗi hoặc không hoạt động' },
  { key: 'feature', label: '💡 Đề xuất tính năng', desc: 'Ý tưởng cải thiện ứng dụng' },
  { key: 'content', label: '📍 Địa điểm / Nội dung', desc: 'Thiếu địa điểm, thông tin sai' },
  { key: 'ai', label: '🤖 Phản hồi AI', desc: 'Lịch trình AI chưa phù hợp' },
  { key: 'privacy', label: '🛡️ Quyền riêng tư', desc: 'Câu hỏi về dữ liệu cá nhân' },
  { key: 'other', label: '💬 Khác', desc: 'Câu hỏi hoặc góp ý khác' },
];

const FAQS = [
  { q: 'Làm sao thay đổi lịch trình AI đã tạo?', a: 'Vào trang chuyến đi → nhấn ✏️ bên cạnh hoạt động để sửa, hoặc dùng chatbot AI để yêu cầu thay đổi bằng ngôn ngữ tự nhiên.' },
  { q: 'Ứng dụng có hoạt động offline không?', a: 'Các lịch trình đã tải sẽ hiển thị offline. Tính năng AI, tìm kiếm và thời tiết cần kết nối internet.' },
  { q: 'Làm sao thêm địa điểm vào chuyến đi?', a: 'Trong trang chuyến đi, nhấn nút "🔍 Tìm địa điểm" ở mỗi ngày để tìm kiếm và thêm địa điểm với giờ tự chọn.' },
  { q: 'Dữ liệu cá nhân có được bảo mật không?', a: 'Có. Xem trang Quyền riêng tư để biết chi tiết về cách chúng tôi xử lý dữ liệu.' },
  { q: 'Làm sao xóa tài khoản?', a: 'Gửi yêu cầu xóa tài khoản qua form này với chủ đề "Quyền riêng tư" và chúng tôi xử lý trong 3-5 ngày làm việc.' },
];

function BackHeader() {
  return (
    <header className="page-header">
      <Link href="/profile" className="header-btn" style={{ border: 'none', background: 'rgba(26,29,59,0.05)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </Link>
      <div style={{ textAlign: 'center' }}>
        <p className="section-eyebrow" style={{ marginBottom: 2 }}>CÀI ĐẶT</p>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--navy)' }}>💬 Góp ý & Hỗ trợ</h1>
      </div>
      <div style={{ width: 40 }} />
    </header>
  );
}

export default function FeedbackPage() {
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(0);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!topic || !message.trim()) return;
    setSending(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, message, email, rating }),
      });
    } catch {}
    setSending(false);
    setSent(true);
  };

  if (sent) {
    return (
      <>
        <BackHeader />
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div className="animate-float" style={{ fontSize: '3.5rem', marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Đã nhận phản hồi!</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--navy-muted)', lineHeight: 1.6, marginBottom: 28 }}>
            Cảm ơn bạn đã góp ý. Chúng tôi sẽ xem xét và phản hồi qua email trong 1-3 ngày làm việc.
          </p>
          <Link href="/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 24px', background: 'linear-gradient(135deg,var(--coral),var(--warm-orange))', color: 'white', borderRadius: 'var(--radius-full)', fontWeight: 700, textDecoration: 'none' }}>
            Quay lại hồ sơ
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <BackHeader />

      {/* FAQ accordion */}
      <section style={{ padding: '8px 20px', marginBottom: 4 }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>❓ Câu hỏi thường gặp</h3>
        <div className="card" style={{ overflow: 'hidden' }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? '1px solid rgba(26,29,59,0.05)' : 'none' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, textAlign: 'left', fontFamily: 'var(--font)' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--navy)', flex: 1 }}>{faq.q}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: openFaq === i ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}><path d="M9 18l6-6-6-6"/></svg>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 16px 14px' }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)', lineHeight: 1.6, margin: 0 }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Form */}
      <section style={{ padding: '0 20px', marginBottom: 120 }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>📝 Gửi phản hồi</h3>

        {/* Topic grid */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy-muted)', marginBottom: 8 }}>Chủ đề *</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TOPICS.map(t => (
              <button key={t.key} onClick={() => setTopic(t.key)} style={{ padding: '10px 12px', border: `1.5px solid ${topic === t.key ? 'var(--coral)' : 'rgba(26,29,59,0.1)'}`, borderRadius: 'var(--radius-md)', background: topic === t.key ? 'rgba(255,127,107,0.08)' : 'var(--card-bg)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: topic === t.key ? 'var(--coral)' : 'var(--navy)', margin: '0 0 2px' }}>{t.label}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--navy-muted)', margin: 0, lineHeight: 1.3 }}>{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Star rating */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy-muted)', marginBottom: 8 }}>Đánh giá trải nghiệm</p>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => setRating(s)} style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', opacity: s <= rating ? 1 : 0.3, transition: 'opacity 0.15s', padding: '4px' }}>⭐</button>
            ))}
            {rating > 0 && <span style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)', marginLeft: 4 }}>{['','Rất tệ','Tệ','Bình thường','Tốt','Rất tốt!'][rating]}</span>}
          </div>
        </div>

        {/* Message */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy-muted)', marginBottom: 6 }}>Nội dung *</p>
          <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 500))} placeholder="Mô tả chi tiết vấn đề hoặc góp ý của bạn..." rows={5} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid rgba(26,29,59,0.12)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.875rem', resize: 'none', outline: 'none', boxSizing: 'border-box', color: 'var(--navy)', lineHeight: 1.5 }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--navy-muted)', marginTop: 4, textAlign: 'right' }}>{message.length}/500</p>
        </div>

        {/* Email optional */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy-muted)', marginBottom: 6 }}>Email phản hồi <span style={{ fontWeight: 400 }}>(tuỳ chọn)</span></p>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" style={{ width: '100%', padding: '11px 14px', border: '1.5px solid rgba(26,29,59,0.12)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', color: 'var(--navy)' }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--navy-muted)', marginTop: 4 }}>Để chúng tôi có thể phản hồi trực tiếp</p>
        </div>

        <button onClick={handleSubmit} disabled={!topic || !message.trim() || sending} style={{ width: '100%', padding: '14px', fontFamily: 'var(--font)', fontWeight: 700, fontSize: '0.9375rem', border: 'none', borderRadius: 'var(--radius-full)', cursor: (!topic || !message.trim()) ? 'not-allowed' : 'pointer', background: (!topic || !message.trim()) ? 'rgba(26,29,59,0.1)' : 'linear-gradient(135deg,var(--coral),var(--warm-orange))', color: (!topic || !message.trim()) ? 'var(--navy-muted)' : 'white', transition: 'all 0.2s' }}>
          {sending ? '⏳ Đang gửi...' : '📨 Gửi phản hồi'}
        </button>

        <p style={{ fontSize: '0.75rem', color: 'var(--navy-muted)', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
          Hoặc liên hệ: <a href="mailto:support@huevivu.app" style={{ color: 'var(--coral)', fontWeight: 600 }}>support@huevivu.app</a>
        </p>
      </section>
    </>
  );
}
