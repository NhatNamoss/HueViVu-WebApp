'use client';

import { useEffect, useState } from 'react';
import LoadingState from '@/components/ui/LoadingState';

export default function StartupLoading() {
  const [opening, setOpening] = useState(true);
  useEffect(() => {
    let firstFrame = 0; let secondFrame = 0;
    const ready = () => { firstFrame = requestAnimationFrame(() => { secondFrame = requestAnimationFrame(() => setOpening(false)); }); };
    if (document.readyState === 'complete') ready(); else window.addEventListener('load', ready, { once: true });
    return () => { window.removeEventListener('load', ready); cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, []);

  if (!opening) return null;
  // Included in the server HTML, so this remains useful while JS downloads.
  return <div className="hvv-startup-loading">
    <div className="hvv-startup-card">
      <span className="hvv-startup-brand">HUEVIVU</span>
      <LoadingState title="Đang mở HueViVu…" detail="Chuẩn bị không gian khám phá Huế cho bạn." />
      <div className="hvv-startup-help"><p>Nếu chờ lâu, hãy kiểm tra kết nối rồi thử tải lại.</p><a href="">Tải lại trang</a></div>
      <noscript><p>Hãy bật JavaScript trong trình duyệt để sử dụng HueViVu.</p></noscript>
    </div>
  </div>;
}
