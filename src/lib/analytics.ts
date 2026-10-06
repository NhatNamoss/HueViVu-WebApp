'use client';

export function getSessionId() {
  let id = localStorage.getItem('hv_session_id');
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, '');
    localStorage.setItem('hv_session_id', id);
  }
  return id;
}

export function trackEvent(event_type: string, data: {
  place_id?: string; trip_id?: string; value?: number; metadata?: Record<string, unknown>;
} = {}) {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem('hv_token');
  void fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ event_type, sessionId: getSessionId(), ...data }),
    keepalive: true,
  }).catch(() => {});
}
