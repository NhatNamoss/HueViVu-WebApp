'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authenticatedHeaders } from '@/lib/client-auth';

const STATUS_LABELS: Record<string,string>={open:'Chưa nhận',in_progress:'Đang xử lý',resolved:'Đã giải quyết',dismissed:'Bỏ qua'};
export default function DataTasksPage(){
  const router = useRouter();
  const [tasks,setTasks]=useState<any[]>([]);const[filter,setFilter]=useState('open');const[selected,setSelected]=useState<any|null>(null);const[note,setNote]=useState('');
  const load=useCallback(()=>fetch(`/api/admin/data-tasks?status=${filter}`,{headers:authenticatedHeaders()}).then(r=>r.ok?r.json():[]).then(setTasks),[filter]);
  useEffect(()=>{load()},[load]);
  const update=async(task:any,status:string)=>{const response=await fetch('/api/admin/data-tasks',{method:'PUT',headers:authenticatedHeaders(true),body:JSON.stringify({id:task.id,status,resolution_note:note||undefined})});if(response.ok){setSelected(null);setNote('');load();
    // After accepting a task, navigate to relevant workspace
    if(status==='in_progress'){
      if(task.place_id) router.push(`/admin/data-collector/edit/${task.place_id}`);
      else router.push('/admin/data-collector/add');
    }
  }};
  return <div className="space-y-5"><div><p className="text-xs font-bold tracking-widest text-orange-500">CÔNG VIỆC DỮ LIỆU</p><h1 className="text-2xl font-bold mt-1">Hàng đợi xác minh</h1><p className="text-sm text-gray-500 mt-1">Mỗi nhiệm vụ cần bằng chứng và kết luận của con người.</p></div>
    <div className="flex flex-wrap gap-2">{['open','in_progress','resolved','all'].map(value=><button key={value} onClick={()=>setFilter(value)} className={`px-3 py-2 rounded-full text-sm font-semibold border ${filter===value?'bg-orange-500 text-white border-orange-500':'bg-white text-gray-600'}`}>{value==='all'?'Tất cả':STATUS_LABELS[value]}</button>)}</div>
    <div className="grid lg:grid-cols-2 gap-3">{tasks.map(task=><div key={task.id} className="bg-white border rounded-2xl p-4 shadow-sm"><div className="flex items-start gap-3"><span className={`px-2 py-1 rounded-full text-[11px] font-bold ${task.priority==='urgent'?'bg-red-100 text-red-700':task.priority==='high'?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-600'}`}>{task.priority}</span><div className="flex-1"><p className="font-bold text-gray-900">{task.title}</p>{task.place_name&&<Link href={`/admin/data-collector/edit/${task.place_id}`} className="text-xs font-semibold text-orange-600">📍 {task.place_name}</Link>}<p className="text-sm text-gray-500 mt-2 leading-6">{task.description||'Chưa có mô tả chi tiết.'}</p></div></div><div className="flex gap-2 mt-4">{task.status==='open'&&<button onClick={()=>update(task,'in_progress')} className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-xl font-semibold text-sm">Nhận xử lý</button>}{task.status==='in_progress'&&<button onClick={()=>setSelected(task)} className="flex-1 py-2 bg-green-600 text-white rounded-xl font-semibold text-sm">Ghi kết quả</button>}<span className="px-3 py-2 bg-gray-50 rounded-xl text-xs text-gray-500">{STATUS_LABELS[task.status]}</span></div></div>)}{!tasks.length&&<div className="lg:col-span-2 text-center py-16 text-gray-400">Không có nhiệm vụ trong trạng thái này.</div>}</div>
    {selected&&<div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-4"><div className="bg-white rounded-3xl p-5 w-full max-w-md"><h2 className="text-lg font-bold">Kết quả xác minh</h2><p className="text-sm text-gray-500 mt-1">Ghi nguồn, cách kiểm tra và kết luận. Không dùng phỏng đoán của AI làm bằng chứng.</p><textarea value={note} onChange={e=>setNote(e.target.value)} rows={5} className="w-full mt-4 p-3 border rounded-xl" placeholder="Ví dụ: Đã gọi số chính thức lúc 14:30, xác nhận mở 07:00–17:00…"/><div className="grid grid-cols-2 gap-2 mt-4"><button onClick={()=>setSelected(null)} className="py-2 border rounded-xl font-semibold">Để sau</button><button disabled={note.trim().length<20} onClick={()=>update(selected,'resolved')} className="py-2 bg-green-600 text-white rounded-xl font-semibold disabled:opacity-40">Hoàn tất</button></div></div></div>}
  </div>
}
