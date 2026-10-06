'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { authenticatedHeaders } from '@/lib/client-auth';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [access, setAccess] = useState<'loading' | 'allowed' | 'denied'>('loading');
  const [role, setRole] = useState('user');
  useEffect(() => {
    fetch('/api/auth/me', { headers: authenticatedHeaders() })
      .then(async response => response.ok ? response.json() : null)
      .then(user => { const nextRole = user?.role || 'user'; setRole(nextRole); setAccess(['admin', 'reviewer', 'collector'].includes(nextRole) ? 'allowed' : 'denied'); })
      .catch(() => setAccess('denied'));
  }, []);

  if (access !== 'allowed') return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div className="max-w-md bg-white border rounded-2xl p-7 text-center shadow-sm">
      <div className="text-4xl mb-3">{access === 'loading' ? '⏳' : '🔐'}</div>
      <h1 className="text-xl font-bold text-gray-900">{access === 'loading' ? 'Đang kiểm tra quyền…' : 'Khu vực quản trị'}</h1>
      {access === 'denied' && <><p className="text-sm text-gray-500 mt-2">Bạn cần đăng nhập bằng tài khoản quản trị để truy cập dữ liệu nội bộ.</p><Link href="/onboarding" className="inline-block mt-5 px-5 py-2.5 bg-orange-500 text-white font-semibold rounded-xl">Đăng nhập</Link></>}
    </div>
  </div>;

  const routeAllowed = role === 'admin'
    || pathname.startsWith('/admin/data-collector')
    || pathname.startsWith('/admin/data-tasks')
    || (role === 'reviewer' && pathname.startsWith('/admin/audit'));
  if (!routeAllowed) return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6"><div className="max-w-md bg-white border rounded-2xl p-7 text-center shadow-sm"><div className="text-4xl mb-3">⛔</div><h1 className="text-xl font-bold">Không có quyền vào khu vực này</h1><p className="text-sm text-gray-500 mt-2">Role hiện tại: {role}. Hãy quay lại Data Collector.</p><Link href="/admin/data-collector" className="inline-block mt-5 px-5 py-2.5 bg-orange-500 text-white font-semibold rounded-xl">Về Data Collector</Link></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              HueViVu Admin
            </Link>
          </div>
          <nav className="flex gap-4">
            <Link href="/admin/data-collector" className="text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors">
              📍 Places
            </Link>
            <Link href="/admin/data-tasks" className="text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors">
              ✅ Tasks
            </Link>
            {role === 'admin' && <Link href="/admin/tours" className="text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors">
              🎫 Tours
            </Link>}
            {role === 'admin' && <Link href="/admin/ai-trainer" className="text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors">
              🤖 AI Trainer
            </Link>}
            {role === 'admin' && <Link href="/admin/feedback" className="text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors">
              💬 Feedback
            </Link>}
            {['admin', 'reviewer'].includes(role) && <Link href="/admin/audit" className="text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors">
              🧾 Audit
            </Link>}
            {role === 'admin' && <Link href="/admin/users" className="text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors">
              👥 Users
            </Link>}
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
