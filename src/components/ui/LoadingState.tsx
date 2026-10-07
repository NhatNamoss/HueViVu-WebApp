export default function LoadingState({ title = 'Đang mở trang cho bạn…', detail = 'HueViVu đang chuẩn bị nội dung. Bạn chờ một chút nhé.', compact = false }: { title?: string; detail?: string; compact?: boolean }) {
  return <div className={`hvv-loading-state ${compact ? 'hvv-loading-compact' : ''}`} role="status" aria-live="polite" aria-busy="true">
    <span className="hvv-loading-spinner" aria-hidden="true" />
    <div><p className="hvv-loading-title">{title}</p><p className="hvv-loading-detail">{detail}</p>{!compact && <p className="hvv-loading-recovery">Nếu chờ lâu, hãy kiểm tra kết nối rồi <a href="">thử tải lại trang</a>.</p>}</div>
  </div>;
}
