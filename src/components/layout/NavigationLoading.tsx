'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const routeKey = (pathname: string, search: string) => `${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}?${new URLSearchParams(search).toString()}`;
type Pending = { href: string; key: string };

export default function NavigationLoading() {
  const pathname = usePathname(); const search = useSearchParams().toString();
  const committedKey = routeKey(pathname, search);
  const current = useRef(committedKey);
  const request = useRef<Pending | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const start = (value: string) => {
      try {
        const target = new URL(value, window.location.href);
        if (target.origin !== window.location.origin) return;
        const key = routeKey(target.pathname, target.search);
        if (key === current.current) { request.current = null; setPending(null); setSlow(false); if (timer.current) clearTimeout(timer.current); delete document.documentElement.dataset.hvvPendingNavigation; return; }
        const next = { href: target.href, key };
        request.current = next; setPending(next); setSlow(false);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => { if (request.current === next) setSlow(true); }, 12000);
      } catch { /* Invalid destinations must not interfere with navigation. */ }
    };
    // Router callbacks run inside React's navigation transition. Schedule the
    // indicator outside that transition so it paints before the new page.
    const onStart = (event: Event) => { const value = (event as CustomEvent<unknown>).detail; if (typeof value === 'string') queueMicrotask(() => start(value)); };
    window.addEventListener('huevivu:navigation-start', onStart);
    const early = document.documentElement.dataset.hvvPendingNavigation;
    if (early) start(early);
    return () => { window.removeEventListener('huevivu:navigation-start', onStart); if (timer.current) clearTimeout(timer.current); };
  }, []);

  useEffect(() => {
    current.current = committedKey;
    // A later navigation must not be cleared by an earlier route committing.
    if (request.current?.key !== committedKey) return;
    request.current = null; setPending(null); setSlow(false);
    delete document.documentElement.dataset.hvvPendingNavigation;
    if (timer.current) clearTimeout(timer.current);
  }, [committedKey]);

  if (!pending) return null;
  return <div className="hvv-navigation-loading" role="status" aria-live="polite" aria-busy="true">
    <div className="hvv-navigation-track" aria-hidden="true"><i /></div>
    <div className="hvv-navigation-message"><span className="hvv-loading-spinner" aria-hidden="true" /><span>{slow ? 'Trang mở chậm hơn thường lệ. Kiểm tra kết nối của bạn nhé.' : 'Đang mở trang…'}</span>{slow && <a href={pending.href}>Thử mở lại</a>}</div>
  </div>;
}
