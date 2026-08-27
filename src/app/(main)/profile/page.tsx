'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hv_token');
    if (!token) {
      router.push('/onboarding');
      return;
    }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.error) router.push('/onboarding');
        else setUser(data);
        setLoading(false);
      })
      .catch(() => {
        router.push('/onboarding');
      });
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

  return (
    <>
      <header className="page-header" style={{ background: 'transparent', borderBottom: 'none' }}>
        <div style={{ width: 40 }} />
        <h1 className="page-header-title">Hồ sơ</h1>
        <button onClick={handleLogout} className="header-btn" style={{ border: 'none', background: 'rgba(255,127,107,0.08)', color: 'var(--coral)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </header>

      <section style={{ padding: '0 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'white', fontWeight: 700, boxShadow: 'var(--shadow-md)', flexShrink: 0 }}>
            {user.name?.[0]?.toUpperCase() || 'H'}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy)', marginBottom: 4 }}>{user.name}</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--navy-muted)', marginBottom: 8 }}>{user.email}</p>
            <div style={{ display: 'inline-block', padding: '4px 10px', background: 'rgba(26,29,59,0.05)', borderRadius: 'var(--radius-full)', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--navy)', letterSpacing: '0.05em' }}>
              LV. {user.level || 1} KHÁM PHÁ GIA
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '0 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="card" style={{ flex: 1, padding: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--coral)', marginBottom: 4 }}>{user.total_trips || 0}</p>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--navy-muted)' }}>CHUYẾN ĐI</p>
          </div>
          <div className="card" style={{ flex: 1, padding: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--coral)', marginBottom: 4 }}>{user.total_places || 0}</p>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--navy-muted)' }}>ĐIỂM ĐẾN</p>
          </div>
          <div className="card" style={{ flex: 1, padding: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--coral)', marginBottom: 4 }}>12</p>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--navy-muted)' }}>MÓN ĂN</p>
          </div>
        </div>
      </section>

      {/* AI Memory (Mock) */}
      <section style={{ padding: '0 20px', marginBottom: 24 }}>
        <h3 className="section-title" style={{ marginBottom: 12 }}>🧠 Trí nhớ của AI về bạn</h3>
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ padding: '6px 12px', background: 'rgba(26,29,59,0.04)', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', color: 'var(--navy)' }}>Thích cà phê muối</span>
            <span style={{ padding: '6px 12px', background: 'rgba(26,29,59,0.04)', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', color: 'var(--navy)' }}>Đi bộ nhiều</span>
            <span style={{ padding: '6px 12px', background: 'rgba(26,29,59,0.04)', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', color: 'var(--navy)' }}>Thích yên tĩnh buổi sáng</span>
            <span style={{ padding: '6px 12px', background: 'rgba(26,29,59,0.04)', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', color: 'var(--navy)' }}>Quan tâm lịch sử triều Nguyễn</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--navy-muted)', marginTop: 12, textAlign: 'center', fontStyle: 'italic' }}>AI sử dụng thông tin này để lên lịch trình tốt hơn cho bạn.</p>
        </div>
      </section>

      {/* Settings List */}
      <section style={{ padding: '0 20px', marginBottom: 100 }}>
        <h3 className="section-title" style={{ marginBottom: 12 }}>Cài đặt</h3>
        <div className="card" style={{ overflow: 'hidden' }}>
          {[
            { icon: '🌍', label: 'Ngôn ngữ', val: 'Tiếng Việt' },
            { icon: '🔔', label: 'Thông báo', val: 'Bật' },
            { icon: '🌙', label: 'Chế độ tối', val: 'Tắt' },
            { icon: '🛡️', label: 'Quyền riêng tư', val: '' },
            { icon: '💬', label: 'Góp ý & Hỗ trợ', val: '' },
          ].map((item, i) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: i < 4 ? '1px solid rgba(26,29,59,0.04)' : 'none', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--navy)' }}>{item.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {item.val && <span style={{ fontSize: '0.8125rem', color: 'var(--navy-muted)' }}>{item.val}</span>}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
