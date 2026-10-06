'use client';

import { useEffect, useState } from 'react';
import { authenticatedHeaders } from '@/lib/client-auth';

const ROLE_LABELS: Record<string, string> = { user: 'Người dùng', collector: 'Collector', reviewer: 'Reviewer', admin: 'Admin' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  useEffect(() => { fetch('/api/admin/users', { headers: authenticatedHeaders() }).then(r => r.ok ? r.json() : []).then(setUsers); }, []);
  const changeRole = async (userId: string, role: string) => {
    setMessage('');
    const response = await fetch('/api/admin/users', { method: 'PUT', headers: authenticatedHeaders(true), body: JSON.stringify({ userId, role }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || 'Không thể đổi quyền');
    setUsers(prev => prev.map(user => user.id === userId ? { ...user, role } : user));
    setMessage('Đã cập nhật quyền và ghi audit log.');
  };
  return <div className="space-y-5">
    <div><p className="text-xs font-bold tracking-widest text-orange-500">PHÂN QUYỀN NỘI BỘ</p><h1 className="text-2xl font-bold text-gray-900 mt-1">Nhân sự dữ liệu</h1><p className="text-sm text-gray-500 mt-1">Collector nhập dữ liệu; Reviewer xác minh; Admin quản trị toàn hệ thống.</p></div>
    {message && <p className="p-3 bg-orange-50 text-orange-800 rounded-xl text-sm">{message}</p>}
    <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
      <table className="w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th className="p-3">Người dùng</th><th className="p-3">Email</th><th className="p-3">Quyền</th><th className="p-3">Mô tả</th></tr></thead>
      <tbody className="divide-y">{users.map(user => <tr key={user.id}><td className="p-3 font-semibold">{user.name}</td><td className="p-3 text-gray-500">{user.email}</td><td className="p-3"><select value={user.role || 'user'} onChange={event => changeRole(user.id, event.target.value)} className="p-2 border rounded-lg bg-white">{Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="p-3 text-xs text-gray-500">{user.role === 'collector' ? 'Nhập và gửi duyệt' : user.role === 'reviewer' ? 'Duyệt và xác minh' : user.role === 'admin' ? 'Toàn quyền' : 'Không có quyền admin'}</td></tr>)}</tbody></table>
    </div>
  </div>;
}
