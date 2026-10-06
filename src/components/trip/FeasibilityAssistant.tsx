'use client';

type Props = {
  feasibility: any; activeDay: number; expanded: boolean; onToggle: () => void;
  onPreview: () => void; previewing: boolean; preview: any | null;
  onApply: () => void; applying: boolean; onCancelPreview: () => void;
};

function overview(feasibility: any) {
  const issues = feasibility.days?.flatMap((day: any) => day.issues || []) || [];
  const conflicts = issues.filter((issue: any) => issue.code === 'time_conflict').length;
  const closed = issues.filter((issue: any) => issue.code === 'closed').length;
  if (feasibility.score === 0) return { title: 'Lịch trình đang quá dày để đi thoải mái', detail: `Có ${feasibility.error_count || conflicts} xung đột lớn. Bạn có thể phải chạy vội, đến trễ hoặc bỏ dở một số điểm.`, tone: 'risk' };
  if (closed) return { title: 'Một số điểm có thể đóng cửa khi bạn đến', detail: `HueViVu tìm thấy ${closed} điểm chưa khớp giờ mở cửa.`, tone: 'risk' };
  if (conflicts) return { title: 'Bạn chưa có đủ thời gian giữa các điểm', detail: `${conflicts} chặng chưa tính đủ thời gian tham quan, nghỉ và di chuyển.`, tone: 'risk' };
  if (feasibility.score < 85) return { title: 'Lịch trình có thể đi, nhưng sẽ hơi vội', detail: `Có ${feasibility.issue_count} điều nên chỉnh để chuyến đi nhẹ nhàng hơn.`, tone: 'caution' };
  return { title: 'Lịch trình đã sẵn sàng để đi', detail: 'Thời gian tham quan, nghỉ và di chuyển đang ở mức hợp lý.', tone: 'good' };
}

export default function FeasibilityAssistant({ feasibility, activeDay, expanded, onToggle, onPreview, previewing, preview, onApply, applying, onCancelPreview }: Props) {
  const copy = overview(feasibility);
  const color = copy.tone === 'good' ? '#15803D' : copy.tone === 'caution' ? '#B45309' : '#B91C1C';
  const background = copy.tone === 'good' ? 'rgba(34,197,94,.07)' : copy.tone === 'caution' ? 'rgba(245,158,11,.08)' : 'rgba(239,68,68,.07)';
  const dayIssues = feasibility.days?.[activeDay]?.issues || [];
  return <section style={{ margin: '0 20px 12px' }}>
    <div style={{ padding: 14, background, border: `1px solid ${color}25`, borderRadius: 'var(--radius-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
        <div style={{ width: 44, height: 44, borderRadius: 15, background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(26,29,59,.06)' }}><strong style={{ color, fontSize: '.95rem' }}>{feasibility.score}</strong><span style={{ fontSize: '.52rem', color: 'var(--gray-soft)' }}>/100</span></div>
        <div style={{ flex: 1 }}><p style={{ margin: 0, fontWeight: 800, fontSize: '.9rem', color: 'var(--navy)', lineHeight: 1.35 }}>{copy.title}</p><p style={{ margin: '4px 0 0', fontSize: '.75rem', color: 'var(--navy-muted)', lineHeight: 1.5 }}>{copy.detail}</p></div>
      </div>
      {feasibility.score < 85 && !preview && <button onClick={onPreview} disabled={previewing} style={{ width: '100%', marginTop: 12, padding: '11px 14px', border: 'none', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg,var(--coral),var(--warm-orange))', color: 'white', fontWeight: 800, cursor: 'pointer', opacity: previewing ? .65 : 1 }}>{previewing ? 'HueViVu đang tìm phương án dễ đi hơn…' : '✨ Để HueViVu sắp xếp lại'}</button>}
      <button onClick={onToggle} style={{ width: '100%', marginTop: 8, padding: 7, border: 'none', background: 'transparent', color: 'var(--navy-muted)', fontSize: '.72rem', fontWeight: 650, cursor: 'pointer' }}>{expanded ? 'Ẩn giải thích' : `Vì sao HueViVu đánh giá như vậy? (${feasibility.issue_count})`}</button>
    </div>

    {preview && <div style={{ marginTop: 8, padding: 14, background: 'white', border: '1px solid rgba(255,127,107,.2)', borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 24px rgba(26,29,59,.08)' }}>
      <p style={{ margin: 0, fontSize: '.7rem', fontWeight: 800, letterSpacing: '.06em', color: 'var(--coral)' }}>PHƯƠNG ÁN HUEVIVU ĐỀ XUẤT</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' }}><span style={{ padding: '7px 10px', borderRadius: 10, background: 'rgba(239,68,68,.07)', color: '#B91C1C', fontWeight: 800 }}>{feasibility.score}</span><span style={{ color: 'var(--gray-soft)' }}>→</span><span style={{ padding: '7px 10px', borderRadius: 10, background: 'rgba(34,197,94,.09)', color: '#15803D', fontWeight: 800 }}>{preview.feasibility?.score}</span><span style={{ fontSize: '.75rem', color: 'var(--navy-muted)' }}>điểm hợp lý</span></div>
      <div style={{ maxHeight: 180, overflowY: 'auto' }}>{(preview.changes || []).slice(0, 8).map((change: string, index: number) => <p key={index} style={{ margin: '6px 0', fontSize: '.76rem', color: 'var(--navy)', lineHeight: 1.45 }}>✓ {change}</p>)}</div>
      {!preview.changes?.length && <p style={{ fontSize: '.76rem', color: 'var(--navy-muted)' }}>HueViVu chưa tìm thấy thay đổi tự động đủ an toàn. Bạn có thể dùng “Tình huống” để đổi điểm cụ thể.</p>}
      {preview.unresolved?.length > 0 && <div style={{ marginTop: 9, padding: 9, background: 'rgba(245,158,11,.08)', borderRadius: 9 }}><p style={{ margin: 0, fontSize: '.72rem', fontWeight: 700, color: '#92400E' }}>Còn {preview.unresolved.length} việc cần kiểm tra thủ công</p></div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 8, marginTop: 12 }}><button onClick={onCancelPreview} disabled={applying} style={{ padding: 10, border: '1px solid rgba(26,29,59,.1)', borderRadius: 'var(--radius-full)', background: 'white', color: 'var(--navy)', fontWeight: 700 }}>Giữ lịch cũ</button><button onClick={onApply} disabled={applying || !preview.changes?.length} style={{ padding: 10, border: 'none', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg,var(--coral),var(--warm-orange))', color: 'white', fontWeight: 800, opacity: applying || !preview.changes?.length ? .5 : 1 }}>{applying ? 'Đang áp dụng…' : 'Áp dụng phương án này'}</button></div>
    </div>}

    {expanded && !preview && <div style={{ marginTop: 8, padding: 12, background: 'white', border: '1px solid rgba(26,29,59,.08)', borderRadius: 'var(--radius-md)' }}>
      <p style={{ margin: '0 0 8px', fontSize: '.72rem', color: 'var(--navy-muted)', lineHeight: 1.45 }}>HueViVu tính cả thời gian bạn ở lại mỗi điểm, nghỉ ngắn và di chuyển—không chỉ nhìn giờ bắt đầu.</p>
      {dayIssues.map((issue: any, index: number) => <div key={index} style={{ padding: '10px 0', borderTop: index ? '1px solid rgba(26,29,59,.06)' : 'none' }}><div style={{ display: 'flex', gap: 8 }}><span>{issue.severity === 'error' ? '🔴' : '🟠'}</span><div><p style={{ margin: 0, fontSize: '.79rem', fontWeight: 750, color: 'var(--navy)' }}>{issue.title || issue.message}</p><p style={{ margin: '3px 0', fontSize: '.74rem', color: 'var(--navy-muted)', lineHeight: 1.45 }}>{issue.message}</p><p style={{ margin: 0, fontSize: '.72rem', color: 'var(--coral)', lineHeight: 1.4 }}>Gợi ý: {issue.recommendation || 'Để HueViVu tự sắp xếp lại.'}</p></div></div></div>)}
      {!dayIssues.length && <p style={{ margin: 0, color: '#15803D', fontSize: '.78rem', fontWeight: 700 }}>✓ Ngày {activeDay + 1} đang có nhịp độ hợp lý.</p>}
      <p style={{ margin: '9px 0 0', paddingTop: 9, borderTop: '1px solid rgba(26,29,59,.06)', fontSize: '.7rem', color: 'var(--navy-muted)' }}>Ngày {activeDay + 1}: khoảng {feasibility.days?.[activeDay]?.total_km || 0} km di chuyển · {feasibility.days?.[activeDay]?.walking_km || 0} km đi bộ</p>
    </div>}
  </section>;
}
