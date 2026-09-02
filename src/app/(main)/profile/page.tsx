'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const VIBE_TAGS = [
  { label: '☕ Cà phê muối', color: 'rgba(245,158,11,0.12)', textColor: '#92400E' },
  { label: '🚶 Đi bộ nhiều', color: 'rgba(107,143,113,0.12)', textColor: '#166534' },
  { label: '🌅 Yên tĩnh buổi sáng', color: 'rgba(99,102,241,0.1)', textColor: '#3730A3' },
  { label: '🏗️ Triều Nguyễn', color: 'rgba(255,127,107,0.1)', textColor: '#9A3412' },
  { label: '🍜 Ẩm thực đường phố', color: 'rgba(255,154,92,0.12)', textColor: '#B45309' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hv_token');
    if (!token) { router.push('/onboarding'); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.error) router.push('/onboarding');
        else setUser(data);
        setLoading(false);
      })
      .catch(() => router.push('/onboarding'));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('hv_token');
    router.push('/onboarding');
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%' }} className="skeleton" />
          <div style={{ flex: 1 }}>
            <div style={{ height: 24, width: '60%', borderRadius: 4, marginBottom: 8 }} className="skeleton" />
            <div style={{ height: 16, width: '40%', borderRadius: 4 }} className="skeleton" />
          </div>
        </div>
        <div style={{ height: 100, borderRadius: 'var(--radius-lg)', marginBottom: 24 }} className="skeleton" />
        <div style={{ height: 200, borderRadius: 'var(--radius-lg)' }} className="skeleton" />
      </div>
    );
  }

  if (!user) return null;
  const initial = user.name?.[0]?.toUpperCase() || 'H';

  return (
    <>
      <header className="page-header" style={{ background: 'transparent', borderBottom: 'none' }}>
        <div style={{ width: 40 }} />
        <div style={{ textAlign: 'center' }}>
          <p className="section-eyebrow" style={{ marginBottom: 2 }}>TÀI KHOẢN</p>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--navy)' }}>Hồ sơ</h1>
        </div>
        <button onClick={handleLogout} className="header-btn" style={{ border: 'none', background: 'rgba(255,127,107,0.08)', color: 'var(--coral)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </header>

      <section style={{ padding: '8px 20px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.25rem', color: 'white', fontWeight: 800, boxShadow: 'var(--shadow-glow-lg)' }}>
              {initial}
            </div>
            <div style={{ position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: '50%', background: '#4CAF50', border: '2.5px solid var(--soft-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: 'white', fontWeight: 800 }}>✓</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--navy)', marginBottom: 2 }}>{user.name}</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)', marginBottom: 10 }}>{user.email}</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', background: 'linear-gradient(135deg, rgba(255,127,107,0.1), rgba(255,154,92,0.08))', border: '1px solid rgba(255,127,107,0.2)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--coral)' }}>
              🌊 Warm Wanderer · Lv.{user.level || 1}
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '0 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { value: user.total_trips || 0, label: 'CHUYẾN ĐI', icon: '✈️' },
            { value: user.total_places || 0, label: 'ĐỊA ĐIỂM', icon: '📍' },
            { value: user.food_count || 0, label: 'MÓN ĂN', icon: '🍜' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ flex: 1, padding: '14px 10px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.25rem', marginBottom: 4 }}>{stat.icon}</p>
              <p style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--coral)', marginBottom: 2, lineHeight: 1 }}>{stat.value}</p>
              <p style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--navy-muted)', letterSpacing: '0.07em' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '0 20px', marginBottom: 20 }}>
        <h3 className="section-title" style={{ marginBottom: 12 }}>🧠 AI nhớ về bạn</h3>
        <div className="card" style={{ padding: '16px' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)', marginBottom: 12, lineHeight: 1.5 }}>
            AI dùng những điều này để cá nhân hóa lịch trình
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {VIBE_TAGS.map(tag => (
              <span key={tag.label} style={{ padding: '6px 12px', background: tag.color, borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', fontWeight: 600, color: tag.textColor }}>
                {tag.label}
              </span>
            ))}
          </div>
          <Link href="/flow" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--coral)' }}>
            ✨ Cập nhật sở thích với AI
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </Link>
        </div>
      </section>

      <section style={{ padding: '0 20px', marginBottom: 100 }}>
        <h3 className="section-title" style={{ marginBottom: 12 }}>Cài đặt</h3>
        <div className="card" style={{ overflow: 'hidden' }}>
          {[
            { icon: '🌍', label: 'Ngôn ngữ', val: 'Tiếng Việt', href: '' },
            { icon: '🔔', label: 'Thông báo', val: 'Bật', href: '' },
            { icon: '🌙', label: 'Chế độ tối', val: 'Tắt', href: '' },
            { icon: '🛡️', label: 'Quyền riêng tư', val: '', href: '/profile/privacy' },
            { icon: '💬', label: 'Góp ý & Hỗ trợ', val: '', href: '/profile/feedback' },
          ].map((item, i, arr) => (
            item.href ? (
              <Link key={item.label} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(26,29,59,0.05)' : 'none', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.125rem' }}>{item.icon}</span>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--navy)' }}>{item.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {item.val && <span style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)' }}>{item.val}</span>}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
              </Link>
            ) : (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(26,29,59,0.05)' : 'none', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.125rem' }}>{item.icon}</span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--navy)' }}>{item.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item.val && <span style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)' }}>{item.val}</span>}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>
            )
          ))}
        </div>
      </section>
    </>
  );
}

