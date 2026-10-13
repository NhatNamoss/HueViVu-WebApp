'use client';
import Link from 'next/link';
import { useState } from 'react';
import { getHueClock } from '@/lib/travel-clock';
import type { TripState, TripFatigue } from '@/lib/trip-state';

type Props = {
  dayIndex: number; completed: number; total: number; state: TripState | null;
  status: 'loading' | 'idle' | 'saving' | 'saved' | 'error'; error: string; conflict: boolean; needsLogin: boolean;
  pendingDescription?: string;
  canStart: boolean; startDate?: string;
  onStart: () => void; onStartToday: () => void; onFatigue: (fatigue: TripFatigue) => void; onRetry: () => void; onCancel: () => void; onRest: () => void; onNextDay: () => void; hasNextDay: boolean;
};

export default function TripProgressPanel(props: Props) {
  const [previewToday, setPreviewToday] = useState(false);
  const busy = ['loading', 'saving', 'error'].includes(props.status);
  return <section aria-label="Tiến độ chuyến đi" className="card" style={{ margin: '12px 20px', padding: 14 }}>
    <div className="trip-progress-heading"><h2>Ngày {props.dayIndex + 1}</h2><span>{props.completed}/{props.total} điểm đã đi</span></div>
    <progress className="trip-progress-bar" aria-label="Điểm đã hoàn thành" max={Math.max(props.total, 1)} value={props.completed} />
    <details className="quiet-details"><summary>Cách theo dõi</summary><p>Mở một điểm để đánh dấu đã đi. Các điểm đã hoàn thành được giữ khi điều chỉnh lịch.</p></details>
    {!props.state?.startedAt && (props.canStart
      ? <button className="btn btn-primary" disabled={busy || !props.state} onClick={props.onStart}>Bắt đầu chuyến đi</button>
      : <div>
        <p style={{ fontSize: '.78rem', lineHeight: 1.6, color: 'var(--navy-muted)' }}>{props.startDate ? `Lịch bắt đầu ngày ${props.startDate}. Tiến độ mở khi đến ngày đi.` : 'Chưa chọn ngày khởi hành.'}</p>
        {!props.startDate && !previewToday && <button className="mood-chip" disabled={busy || !props.state} onClick={() => setPreviewToday(true)}>Tôi bắt đầu hôm nay</button>}
        {!props.startDate && previewToday && <div role="region" aria-label="Xem trước ngày khởi hành" style={{ padding: 10, background: 'rgba(255,127,107,.06)', borderRadius: 10 }}>
          <p style={{ fontSize: '.8rem', lineHeight: 1.6 }}>Ngày khởi hành: chưa chọn → {getHueClock().date}. Giờ và điểm đến được giữ nguyên. Hãy kiểm tra giờ mở cửa hôm nay với địa điểm trước khi đi.</p>
          <button className="btn btn-primary" disabled={busy} onClick={props.onStartToday}>Xác nhận bắt đầu hôm nay</button>{' '}
          <button className="mood-chip" disabled={busy} onClick={() => setPreviewToday(false)}>Hủy chọn ngày</button>
        </div>}
      </div>)}
    {props.state?.startedAt && <>
      <p style={{ fontSize: '.78rem', marginBottom: 6 }}>Sức đi của bạn lúc này</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {([['fresh', 'Còn khỏe'], ['okay', 'Vừa sức'], ['tired', 'Đang mệt']] as const).map(([value, label]) => <button key={value} aria-pressed={props.state?.fatigue === value} disabled={busy || !props.canStart} onClick={() => props.onFatigue(value)} className={`mood-chip${props.state?.fatigue === value ? ' active' : ''}`}>{label}</button>)}
      </div>
      {props.state.fatigue === 'tired' && props.canStart && (getHueClock().minutes + 55 > 22 * 60
        ? <div role="status" style={{ marginTop: 10, fontSize: '.8rem', lineHeight: 1.6 }}>Đã gần cuối ngày. Hãy về nơi nghỉ thuận tiện; HueViVu không thêm hoạt động kéo lịch quá 22:00. {props.hasNextDay && <button className="mood-chip" disabled={busy} onClick={props.onNextDay}>Xem kế hoạch ngày mai</button>}</div>
        : <button className="btn btn-primary" disabled={busy} onClick={props.onRest} style={{ marginTop: 10 }}>Xem phương án nghỉ</button>)}
    </>}
    <p role="status" aria-live="polite" style={{ fontSize: '.78rem', marginBottom: 0, lineHeight: 1.6, color: props.error ? '#b91c1c' : 'var(--navy-muted)' }}>
      {props.status === 'loading' ? 'Đang tải tiến độ…' : props.status === 'saving' ? 'Đang lưu tiến độ…' : props.status === 'saved' ? '✓ Đã lưu tiến độ.' : props.error}
    </p>
    {props.status === 'error' && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
      {props.pendingDescription && <p style={{ width: '100%', margin: 0, fontSize: '.78rem' }}>Lựa chọn chưa lưu: {props.pendingDescription}</p>}
      {props.needsLogin ? <Link href="/onboarding">Đăng nhập lại</Link> : <button className="mood-chip" onClick={props.onRetry}>{props.conflict || !props.state ? 'Tải lại tiến độ' : 'Thử lưu lại'}</button>}
      {props.state && <button className="mood-chip" onClick={props.onCancel}>Bỏ thay đổi chưa lưu</button>}
    </div>}
  </section>;
}
