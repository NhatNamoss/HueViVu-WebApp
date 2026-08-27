'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'intro' | 'login' | 'register'>('intro');
  const [email, setEmail] = useState('demo@huevivu.app');
  const [password, setPassword] = useState('123456');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDemo = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('hv_token', data.token);
        router.push('/');
      } else { setError(data.error); setLoading(false); }
    } catch { setError('Lỗi kết nối'); setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login' ? { email, password } : { name, email, password };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('hv_token', data.token);
        router.push('/');
      } else { setError(data.error); setLoading(false); }
    } catch { setError('Lỗi kết nối'); setLoading(false); }
  };

  if (mode === 'intro') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--soft-white)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <img src="/assets/hero-hub.png" alt="Huế" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 0%, var(--soft-white) 90%, var(--soft-white) 100%)' }} />
        </div>
        <div style={{ padding: '0 32px 40px', textAlign: 'center', position: 'relative', zIndex: 10, marginTop: '-120px' }}>
          <div className="ai-badge" style={{ marginBottom: 20 }}>
            <span className="ai-badge-dot" />AI Travel Companion
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: 16 }}>
            Khám phá Huế<br />
            <span style={{ background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Theo cách của bạn</span>
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--navy-muted)', lineHeight: 1.6, marginBottom: 40, padding: '0 10px' }}>
            Trải nghiệm văn hóa Cố Đô với lịch trình cá nhân hóa hoàn toàn từ AI.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => setMode('register')} className="btn-primary" style={{ width: '100%' }}>Bắt đầu trải nghiệm</button>
            <button onClick={() => setMode('login')} className="btn-secondary" style={{ width: '100%' }}>Đã có tài khoản</button>
            <button onClick={handleDemo} style={{ background: 'none', border: 'none', color: 'var(--coral)', fontSize: '0.875rem', fontWeight: 600, padding: '12px', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              Trải nghiệm nhanh (Demo)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--soft-white)', display: 'flex', flexDirection: 'column', padding: '24px', position: 'relative' }}>
      <button onClick={() => setMode('intro')} style={{ position: 'absolute', top: 24, left: 24, background: 'var(--card-bg)', border: '1px solid rgba(26,29,59,0.06)', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 400, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: '20px', background: 'linear-gradient(135deg, var(--coral), var(--warm-orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'white', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(255,127,107,0.3)' }}>✨</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>{mode === 'login' ? 'Mừng bạn trở lại' : 'Tạo tài khoản'}</h2>
          <p style={{ color: 'var(--navy-muted)', fontSize: '0.9375rem' }}>{mode === 'login' ? 'Tiếp tục hành trình khám phá Huế' : 'Bắt đầu hành trình của riêng bạn'}</p>
        </div>

        {error && <div style={{ padding: '12px', background: 'rgba(255,0,0,0.06)', border: '1px solid rgba(255,0,0,0.15)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', color: '#c0392b', textAlign: 'center', marginBottom: 20 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>Tên của bạn</label>
              <input value={name} onChange={e => setName(e.target.value)} required type="text" placeholder="Nguyễn Văn A" style={{ width: '100%', padding: '14px 16px', background: 'var(--card-bg)', border: '1.5px solid rgba(26,29,59,0.08)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.9375rem', color: 'var(--navy)', outline: 'none' }} />
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="email@example.com" style={{ width: '100%', padding: '14px 16px', background: 'var(--card-bg)', border: '1.5px solid rgba(26,29,59,0.08)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.9375rem', color: 'var(--navy)', outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>Mật khẩu</label>
            <input value={password} onChange={e => setPassword(e.target.value)} required type="password" placeholder="••••••••" style={{ width: '100%', padding: '14px 16px', background: 'var(--card-bg)', border: '1.5px solid rgba(26,29,59,0.08)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.9375rem', color: 'var(--navy)', outline: 'none' }} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: 8, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Đang xử lý...' : (mode === 'login' ? 'Đăng nhập' : 'Đăng ký')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.875rem', color: 'var(--navy-muted)' }}>
          {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ background: 'none', border: 'none', color: 'var(--coral)', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', padding: 0 }}>
            {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </p>
      </div>
    </div>
  );
}
