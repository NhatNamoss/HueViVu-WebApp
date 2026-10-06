'use client';

import { useEffect, useState } from 'react';
import { authenticatedHeaders } from '@/lib/client-auth';

const ACTION_META: Record<string, { label: string; color: string }> = {
  create: { label: 'Tạo mới', color: 'bg-blue-100 text-blue-700' },
  update: { label: 'Cập nhật', color: 'bg-amber-100 text-amber-700' },
  verify: { label: 'Xác minh', color: 'bg-green-100 text-green-700' },
  delete: { label: 'Xóa', color: 'bg-red-100 text-red-700' },
  role_change: { label: 'Đổi quyền', color: 'bg-purple-100 text-purple-700' },
};

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/audit', { headers: authenticatedHeaders() })
      .then(response => response.ok ? response.json() : [])
      .then(setLogs).finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="py-20 text-center text-gray-500">Đang tải nhật ký…</div>;
  return <div className="space-y-5">
    <div><p className="text-xs font-bold tracking-widest text-orange-500">MINH BẠCH DỮ LIỆU</p><h1 className="text-2xl font-bold text-gray-900 mt-1">Nhật ký thay đổi</h1><p className="text-sm text-gray-500 mt-1">Theo dõi ai đã tạo, sửa, xác minh hoặc xóa dữ liệu.</p></div>
    <div className="bg-white rounded-2xl border shadow-sm divide-y overflow-hidden">
      {logs.map(log => {
        const meta = ACTION_META[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700' };
        return <div key={log.id} className="p-4">
          <button onClick={() => setExpanded(expanded === log.id ? null : log.id)} className="w-full text-left flex items-center gap-3">
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${meta.color}`}>{meta.label}</span>
            <span className="flex-1 min-w-0"><span className="block font-semibold text-gray-900 truncate">{log.entity_type}: {log.after_data?.name || log.before_data?.name || log.entity_id}</span><span className="block text-xs text-gray-400 mt-1">{log.actor_name || log.actor_id || 'Hệ thống'} · {new Date(log.created_at + 'Z').toLocaleString('vi-VN')}</span></span>
            <span className="text-gray-400">{expanded === log.id ? '⌃' : '⌄'}</span>
          </button>
          {expanded === log.id && <div className="mt-3 grid md:grid-cols-2 gap-3 text-xs">
            <pre className="bg-red-50 text-red-900 rounded-xl p-3 overflow-auto max-h-72">{JSON.stringify(log.before_data, null, 2) || 'Không có dữ liệu trước'}</pre>
            <pre className="bg-green-50 text-green-900 rounded-xl p-3 overflow-auto max-h-72">{JSON.stringify(log.after_data, null, 2) || 'Không có dữ liệu sau'}</pre>
            {log.note && <p className="md:col-span-2 bg-gray-50 rounded-lg p-3 text-gray-600">Ghi chú: {log.note}</p>}
          </div>}
        </div>;
      })}
      {!logs.length && <div className="py-16 text-center text-gray-400">Chưa có thay đổi nào được ghi nhận.</div>}
    </div>
  </div>;
}
