'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { authenticatedHeaders } from '@/lib/client-auth';

const TYPE_LABELS: Record<string, string> = {
  quality_gap: '🔍 Rà soát', coverage_gap: '📂 Bổ sung danh mục',
  user_feedback: '💬 Phản hồi', manual: '📝 Thủ công',
};

function parseChecklist(desc: string) {
  if (!desc) return [];
  return desc.split(/[·•\n]/).map(s => s.trim()).filter(Boolean);
}

export default function TaskTracker({ placeId }: { placeId?: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [open, setOpen] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState<Record<string, Set<number>>>({});

  const load = useCallback(() => {
    fetch('/api/admin/data-tasks?status=in_progress', { headers: authenticatedHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then((all: any[]) => setTasks(placeId ? all.filter((t: any) => t.place_id === placeId || !t.place_id) : all));
  }, [placeId]);
  useEffect(() => { load(); }, [load]);

  const toggleItem = (tid: string, i: number) => setChecked(p => {
    const s = new Set(p[tid] || []); s.has(i) ? s.delete(i) : s.add(i);
    return { ...p, [tid]: s };
  });

  const resolve = async (tid: string) => {
    const r = await fetch('/api/admin/data-tasks', { method: 'PUT', headers: authenticatedHeaders(true),
      body: JSON.stringify({ id: tid, status: 'resolved', resolution_note: note }) });
    if (r.ok) { setResolving(null); setNote(''); load(); }
  };

  if (!tasks.length) return null;

  return (<>
    <button onClick={() => setOpen(o => !o)} className="fixed bottom-4 right-4 z-40 w-12 h-12 bg-orange-500 text-white rounded-full shadow-lg flex items-center justify-center text-lg hover:bg-orange-600" title="Nhiệm vụ đang xử lý">
      ✅<span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{tasks.length}</span>
    </button>
    {open && <div className="fixed bottom-20 right-4 z-40 w-[380px] max-h-[70vh] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white flex items-center justify-between">
        <div><p className="font-bold text-sm">Nhiệm vụ đang xử lý</p><p className="text-[11px] opacity-80">{tasks.length} việc cần hoàn thành</p></div>
        <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-lg">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto divide-y">{tasks.map(task => {
        const items = parseChecklist(task.description);
        const done = checked[task.id] || new Set();
        const pct = items.length ? Math.round(done.size / items.length * 100) : 0;
        return <div key={task.id} className="p-3 space-y-2">
          <div className="flex items-start gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${task.priority === 'urgent' ? 'bg-red-100 text-red-700' : task.priority === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{task.priority}</span>
            <div className="flex-1 min-w-0"><p className="font-bold text-sm text-gray-900 leading-tight">{task.title}</p><p className="text-[11px] text-gray-400 mt-0.5">{TYPE_LABELS[task.task_type] || task.task_type}</p></div>
          </div>
          {task.place_name && task.place_id !== placeId && <Link href={`/admin/data-collector/edit/${task.place_id}`} className="text-xs text-orange-600 font-semibold block">📍 {task.place_name} →</Link>}
          {items.length > 0 && <div className="space-y-1">
            <div className="flex items-center gap-2"><div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} /></div><span className="text-[10px] font-semibold text-gray-500">{pct}%</span></div>
            {items.map((text, i) => <label key={i} className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 rounded p-1 -mx-1">
              <input type="checkbox" checked={done.has(i)} onChange={() => toggleItem(task.id, i)} className="mt-0.5 shrink-0" />
              <span className={done.has(i) ? 'line-through text-gray-400' : ''}>{text}</span>
            </label>)}
          </div>}
          {resolving === task.id ? <div className="space-y-2 pt-1">
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="w-full p-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-green-300" placeholder="Ghi chú kết quả: đã kiểm tra gì, sửa gì..." />
            <div className="flex gap-2"><button onClick={() => setResolving(null)} className="flex-1 py-1.5 border rounded-lg text-xs font-semibold">Hủy</button>
            <button disabled={note.trim().length < 10} onClick={() => resolve(task.id)} className="flex-1 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold disabled:opacity-40">Hoàn tất ✓</button></div>
          </div> : <button onClick={() => { setResolving(task.id); setNote(''); }} className="w-full py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100">Ghi kết quả & hoàn tất</button>}
        </div>;
      })}</div>
    </div>}
  </>);
}

