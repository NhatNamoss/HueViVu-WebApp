export default function MainLoading() {
  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-xl)' }} />
      <div className="skeleton" style={{ height: 24, width: '60%', borderRadius: 8 }} />
      <div className="skeleton" style={{ height: 16, width: '40%', borderRadius: 6 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
        <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />
      </div>
    </div>
  );
}
