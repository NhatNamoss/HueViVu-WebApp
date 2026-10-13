'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CinematicMap from '@/components/CinematicMap';
import GoogleTripMap from './GoogleTripMap';
import { getHueClock, scheduledMinutes } from '@/lib/travel-clock';
import { routeGuidance, nearestRouteProgress, routeDistanceMeters, validRoutePoint, type RoutePoint, type TripRoute } from '@/lib/navigation-route';

type Activity = { name: string; time?: string; lat?: number; lng?: number; place_id?: string; type?: string };
type Fix = RoutePoint & { accuracy: number; at: number };
type Props = {
  tripId: string; dayIndex: number; itinerarySnapshot: string; activities: Activity[];
  completedIndexes: number[]; token: string | null; canStartNavigation: boolean; initialTargetIndex?: number | null;
  onLocation: (location: RoutePoint | null) => void; onMarkDone: (index: number) => void;
  onRouteMeasured: (route: TripRoute | null) => void; onReviewSchedule: () => void;
};
type Config = { provider: 'google' | 'valhalla'; routingAvailable: boolean; modes: Array<'WALK' | 'DRIVE'>; canNavigate: boolean };

function startIndex(activities: Activity[], completed: number[]) {
  return activities.findIndex((_, index) => !completed.includes(index));
}

export default function TripNavigation({ tripId, dayIndex, itinerarySnapshot, activities, completedIndexes, token, canStartNavigation, initialTargetIndex,
  onLocation, onMarkDone, onRouteMeasured, onReviewSchedule }: Props) {
  const [config, setConfig] = useState<Config | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(() => initialTargetIndex !== null && initialTargetIndex !== undefined && !completedIndexes.includes(initialTargetIndex) ? initialTargetIndex : Math.max(0, startIndex(activities, completedIndexes)));
  const [mode, setMode] = useState<'WALK' | 'DRIVE'>('WALK');
  const [routeRecord, setRouteRecord] = useState<{ route: TripRoute; dayIndex: number; scope: 'day' | 'point' } | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [navigating, setNavigating] = useState(false);
  const [guiding, setGuiding] = useState(false);
  const [fix, setFix] = useState<Fix | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const [follow, setFollow] = useState(false);
  const [arrival, setArrival] = useState(false);
  const epoch = useRef(0), requestController = useRef<AbortController | null>(null);
  const lastSampleAt = useRef(0);
  const lastRequestAt = useRef(0), offRouteCount = useRef(0), arrivalCount = useRef(0);
  const onLocationRef = useRef(onLocation), onRouteMeasuredRef = useRef(onRouteMeasured);
  onLocationRef.current = onLocation;
  onRouteMeasuredRef.current = onRouteMeasured;
  const completedKey = completedIndexes.join(',');
  const currentRoute = routeRecord && routeRecord.dayIndex === dayIndex && routeRecord.route.itinerarySnapshot === itinerarySnapshot
    && routeRecord.route.mode === mode && (routeRecord.scope === 'day' || (routeRecord.route.destinationIndex === selectedIndex && !completedIndexes.includes(selectedIndex)))
    ? routeRecord.route : null;
  const usableFix = fix && clock - fix.at < 60_000 && fix.accuracy <= 80 ? fix : null;

  useEffect(() => {
    if (!navigating) return;
    const timer = window.setInterval(() => setClock(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, [navigating]);
  useEffect(() => { if (navigating && !usableFix) onLocationRef.current(null); }, [navigating, usableFix]);

  useEffect(() => {
    const controller = new AbortController();
    setConfig(null); setRouteRecord(null); setMessage('');
    fetch(`/api/trips/${tripId}/route`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Chưa tải được cấu hình bản đồ.'); return response.json(); })
      .then(data => { if (!controller.signal.aborted) setConfig(data); })
      .catch(() => { if (!controller.signal.aborted) setMessage('Chưa tải được bản đồ hành trình. Hãy kiểm tra mạng rồi mở lại.'); });
    return () => controller.abort();
  }, [tripId, token]);

  const requestRoute = useCallback(async (scope: 'day' | 'point', targetIndex: number, origin?: RoutePoint, overrideMode?: 'WALK' | 'DRIVE') => {
    if (!config?.canNavigate || !config.routingAvailable || !token || !activities[targetIndex] || !origin) return;
    requestController.current?.abort();
    const controller = new AbortController(); requestController.current = controller;
    const currentEpoch = ++epoch.current;
    lastRequestAt.current = Date.now(); setRouteBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/trips/${tripId}/route`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dayIndex, targetIndex, mode: overrideMode || mode, scope, ...(origin ? { origin: { lat: origin.lat, lng: origin.lng } } : {}) }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]) });
      const data = await response.json().catch(() => ({}));
      if (currentEpoch !== epoch.current || controller.signal.aborted) return;
      if (!response.ok || !data.route) throw new Error(data.error || 'Chưa lấy được tuyến đường.');
      const route = data.route as TripRoute;
      if (route.itinerarySnapshot !== itinerarySnapshot || route.destinationIndex !== targetIndex || route.mode !== (overrideMode || mode)) throw new Error('Lịch vừa thay đổi. Hãy tải lại hành trình.');
      setRouteRecord({ route, dayIndex, scope });
      if (scope === 'point' && origin && route.provider === 'google') onRouteMeasuredRef.current(route);
      else onRouteMeasuredRef.current(null);
    } catch (reason) {
      if (currentEpoch === epoch.current && !controller.signal.aborted) {
        setRouteRecord(null); onRouteMeasuredRef.current(null);
        setMessage(reason instanceof Error && reason.name === 'Error' ? reason.message : 'Chưa lấy được tuyến. Hãy kiểm tra mạng rồi thử lại.');
      }
    } finally { if (currentEpoch === epoch.current) setRouteBusy(false); }
  }, [config?.canNavigate, config?.routingAvailable, token, tripId, dayIndex, mode, itinerarySnapshot, activities]);

  useEffect(() => {
    const completed = completedKey ? completedKey.split(',').map(Number) : [];
    setSelectedIndex(initialTargetIndex !== null && initialTargetIndex !== undefined && !completed.includes(initialTargetIndex) ? initialTargetIndex : Math.max(0, startIndex(activities, completed)));
    epoch.current++; requestController.current?.abort();
    setRouteRecord(null); setRouteBusy(false); setArrival(false); setGuiding(false); offRouteCount.current = 0; arrivalCount.current = 0; lastSampleAt.current = 0;
    lastRequestAt.current = 0;
  }, [tripId, dayIndex, itinerarySnapshot, completedKey, initialTargetIndex, activities]);

  useEffect(() => {
    if (!navigating) return;
    if (!navigator.geolocation) { setMessage('Thiết bị chưa hỗ trợ vị trí. Hãy mở Google Maps để chỉ đường.'); setNavigating(false); return; }
    const watch = navigator.geolocation.watchPosition(position => {
      const point = validRoutePoint({ lat: position.coords.latitude, lng: position.coords.longitude });
      if (!point) { setFix(null); onLocationRef.current(null); setMessage('Vị trí hiện tại nằm ngoài khu vực hỗ trợ chỉ đường ở Huế.'); return; }
      const accuracy = Number(position.coords.accuracy);
      if (!Number.isFinite(accuracy) || accuracy <= 0 || Date.now() - position.timestamp > 60_000) { setFix(null); onLocationRef.current(null); setMessage('Vị trí chưa đủ mới để chỉ đường.'); return; }
      setFix({ ...point, accuracy, at: position.timestamp });
      setMessage(previous => previous.startsWith('Vị trí') || previous.startsWith('Đang chờ vị trí') ? '' : previous);
      onLocationRef.current(accuracy <= 80 ? point : null);
    }, failure => {
      if (failure.code === 1) { setMessage('Chưa có quyền vị trí. Hãy cho phép vị trí trong trình duyệt rồi bấm Chỉ đường lại.'); setNavigating(false); }
      else { setFix(null); onLocationRef.current(null); setMessage('Đang chờ vị trí chính xác hơn. Lịch và tuyến dự kiến vẫn được giữ.'); }
    }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 12000 });
    const onVisibility = () => { if (document.hidden) { setNavigating(false); setMessage('Đã dừng theo dõi khi rời trang. Bấm Bắt đầu đi để tiếp tục.'); } };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { navigator.geolocation.clearWatch(watch); document.removeEventListener('visibilitychange', onVisibility); };
  }, [navigating, tripId, dayIndex]);

  useEffect(() => {
    if (!navigating) { setFix(null); setGuiding(false); onLocationRef.current(null); onRouteMeasuredRef.current(null); }
  }, [navigating]);

  useEffect(() => {
    const currentFix = fix && Date.now() - fix.at < 60_000 && fix.accuracy <= 80 ? fix : null;
    if (!navigating || !currentFix || (completedKey ? completedKey.split(',').map(Number).includes(selectedIndex) : false)) return;
    const destination = validRoutePoint(activities[selectedIndex]);
    if (destination && currentFix.accuracy <= 50 && routeDistanceMeters(currentFix, destination) < 20) {
      if (lastSampleAt.current !== currentFix.at) { lastSampleAt.current = currentFix.at; arrivalCount.current++; }
      if (arrivalCount.current >= 2) setArrival(true);
      return;
    }
    if (!currentRoute || routeRecord?.scope !== 'point') {
      if (Date.now() - lastRequestAt.current >= 30_000) void requestRoute('point', selectedIndex, currentFix);
      return;
    }
    const progress = nearestRouteProgress(currentRoute.points, currentFix);
    if (!progress) return;
    if (!guiding || lastSampleAt.current === currentFix.at) return;
    lastSampleAt.current = currentFix.at;
    if (progress.offRouteMeters > Math.max(90, currentFix.accuracy * 2)) offRouteCount.current++;
    else offRouteCount.current = 0;
    if (offRouteCount.current >= 2 && Date.now() - lastRequestAt.current >= 60_000) {
      offRouteCount.current = 0; setMessage('Bạn có thể đã lệch tuyến. Đang tính lại chặng đang đi.');
      void requestRoute('point', selectedIndex, currentFix);
    }
    if (destination && currentFix.accuracy <= 50 && routeDistanceMeters(currentFix, destination) < Math.max(35, currentFix.accuracy * 1.5)) arrivalCount.current++;
    else arrivalCount.current = 0;
    if (arrivalCount.current >= 2) setArrival(true);
  }, [fix, navigating, guiding, selectedIndex, currentRoute, routeRecord?.scope, activities, completedKey, requestRoute]);

  useEffect(() => () => { epoch.current += 1; requestController.current?.abort(); onLocationRef.current(null); onRouteMeasuredRef.current(null); }, []);
  useEffect(() => { setNavigating(false); setFix(null); onLocationRef.current(null); onRouteMeasuredRef.current(null); }, [tripId, dayIndex]);

  const chooseTarget = (index: number) => {
    epoch.current++; requestController.current?.abort(); setRouteBusy(false);
    setSelectedIndex(index); setRouteRecord(null); setArrival(false); setGuiding(false); setMessage(''); lastSampleAt.current = 0; lastRequestAt.current = 0;
    const origin = navigating && usableFix ? usableFix : undefined;
    if (origin) void requestRoute('point', index, origin);
  };
  const stop = () => { epoch.current++; requestController.current?.abort(); setRouteBusy(false); setNavigating(false); setGuiding(false); setFix(null); setRouteRecord(null); setFollow(false); setArrival(false); onLocationRef.current(null); onRouteMeasuredRef.current(null); setMessage('Đã dừng chỉ đường.'); };
  const remaining = navigating && usableFix && currentRoute ? routeGuidance(currentRoute, usableFix) : null;
  const remainingMinutes = remaining && currentRoute ? Math.max(1, Math.ceil(currentRoute.durationSeconds * (1 - remaining.fraction) / 60)) : null;
  const expected = scheduledMinutes(activities[selectedIndex]?.time);
  const lateByRoute = currentRoute?.provider === 'google' && remainingMinutes && expected !== null && getHueClock().minutes + remainingMinutes > expected + 10;
  const mapsLink = activities[selectedIndex] && validRoutePoint(activities[selectedIndex])
    ? `https://www.google.com/maps/dir/?api=1&destination=${activities[selectedIndex].lat},${activities[selectedIndex].lng}&travelmode=${mode === 'DRIVE' ? 'driving' : 'walking'}` : null;
  const provider = config?.provider || 'valhalla';
  const begin = () => { setMessage(''); setNavigating(true); setGuiding(false); setFollow(true); lastRequestAt.current = 0; };
  const mapActivities = useMemo(() => currentRoute ? activities.flatMap((activity, index) => index === selectedIndex ? [{ ...activity, itineraryIndex: index }] : []) : activities, [currentRoute, activities, selectedIndex]);

  return <section aria-label="Chỉ đường trong hành trình" style={{ margin: '0 20px 16px' }}>
    <div className="card" style={{ padding: '12px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: '.87rem' }}>{guiding ? `Đến ${activities[selectedIndex]?.name}` : 'Từ vị trí của bạn đến điểm tiếp theo'}</strong>
      </div>
      {!guiding && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        <label style={{ flex: '1 1 180px', fontSize: '.75rem' }}>Điểm đến
          <select aria-label="Chọn điểm đến" value={selectedIndex} onChange={event => chooseTarget(Number(event.target.value))} style={{ display: 'block', width: '100%', minHeight: 44, marginTop: 4, padding: '8px 10px', border: '1px solid rgba(26,29,59,.15)', borderRadius: 10, background: 'white' }}>
            {activities.map((activity, index) => <option key={index} value={index} disabled={completedIndexes.includes(index)}>{index + 1}. {activity.name}</option>)}
          </select>
        </label>
        <label style={{ flex: '0 1 120px', fontSize: '.75rem' }}>Di chuyển
          <select aria-label="Chế độ di chuyển" value={mode} onChange={event => { const nextMode = event.target.value as 'WALK' | 'DRIVE'; setMode(nextMode); setGuiding(false); setRouteRecord(null); if (navigating && usableFix) void requestRoute('point', selectedIndex, usableFix, nextMode); }} style={{ display: 'block', width: '100%', minHeight: 44, marginTop: 4, padding: '8px 10px', border: '1px solid rgba(26,29,59,.15)', borderRadius: 10, background: 'white' }}>
            <option value="WALK">Đi bộ</option>{config?.modes.includes('DRIVE') && <option value="DRIVE">Ô tô</option>}
          </select>
        </label>
      </div>}
      {config?.canNavigate && !navigating && <p style={{ margin: '8px 0 0', fontSize: '.72rem', lineHeight: 1.4, color: 'var(--navy-muted)' }}>Chỉ đường dùng GPS hiện tại và gửi vị trí tới {provider === 'google' ? 'Google Routes' : 'Valhalla'} để tìm đường. Bạn có thể dừng bất cứ lúc nào.</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {config?.canNavigate && (navigating ? <>
          {currentRoute && usableFix && !guiding && <button className="btn-primary" onClick={() => { setGuiding(true); setFollow(true); }} style={{ minHeight: 44, padding: '8px 16px', fontSize: '.8rem' }}>Bắt đầu</button>}
          {guiding && <button className="mood-chip" onClick={() => setGuiding(false)} style={{ minHeight: 44 }}>Đổi điểm đến</button>}
          <button className="mood-chip" onClick={stop} style={{ minHeight: 44 }}>Dừng chỉ đường</button>
        </> : <button className="btn-primary" disabled={!canStartNavigation || !config.routingAvailable || !activities.some((_, index) => !completedIndexes.includes(index))} onClick={begin} style={{ minHeight: 44, padding: '8px 16px', fontSize: '.8rem' }}>Chỉ đường</button>)}
        {mapsLink && !guiding && <a href={mapsLink} target="_blank" rel="noreferrer" className="mood-chip" style={{ minHeight: 44, textDecoration: 'none' }}>Mở Google Maps</a>}
      </div>
      {config && !config.canNavigate && <p style={{ marginTop: 8, fontSize: '.76rem' }}>Lịch chia sẻ chỉ hiển thị điểm đến. Hãy mở lịch của bạn để dùng chỉ đường.</p>}
      {config && !config.routingAvailable && <p role="status" style={{ marginTop: 8, fontSize: '.76rem' }}>Dịch vụ tuyến chưa được cấu hình. Bạn có thể mở Google Maps để đi tới điểm này.</p>}
      {config?.canNavigate && !canStartNavigation && <p style={{ marginTop: 8, fontSize: '.76rem', color: 'var(--navy-muted)' }}>Theo dõi vị trí mở khi chuyến đã bắt đầu và bạn đang xem đúng ngày đi.</p>}
      {navigating && <p role="status" style={{ marginTop: 8, fontSize: '.77rem', color: 'var(--navy-muted)' }}>{fix ? !usableFix ? 'Đang chờ GPS mới và chính xác hơn…' : `GPS ±${Math.round(fix.accuracy)} m` : 'Đang lấy vị trí hiện tại…'} {fix && !follow && <button onClick={() => setFollow(true)} className="mood-chip" style={{ minHeight: 44 }}>Về vị trí của tôi</button>}</p>}
      {routeBusy && <p role="status" style={{ marginTop: 8, fontSize: '.76rem' }}>Đang tính tuyến…</p>}
      {message && <p role="status" style={{ marginTop: 8, fontSize: '.76rem', lineHeight: 1.5, color: '#9A3412' }}>{message} {navigating && usableFix && <button className="mood-chip" onClick={() => void requestRoute('point', selectedIndex, usableFix)} style={{ minHeight: 44 }}>Thử lại</button>}</p>}
    </div>

    {guiding && remaining && usableFix && <div role="status" aria-label="Hướng dẫn đang đi" style={{ padding: '14px 16px', marginBottom: 8, borderRadius: 16, background: '#166534', color: 'white' }}>
      <strong style={{ display: 'block', fontSize: '1rem', lineHeight: 1.4 }}>{remaining.nextInstruction && remaining.turnMeters !== null && remaining.turnMeters < 80 ? `Sau ${Math.round(remaining.turnMeters)} m` : remaining.instruction}</strong>
      {remaining.nextInstruction && remaining.turnMeters !== null && <p style={{ margin: '6px 0 0', fontSize: '.8rem' }}>{remaining.turnMeters < 80 ? remaining.nextInstruction : `Sau ${Math.round(remaining.turnMeters)} m: ${remaining.nextInstruction}`}</p>}
    </div>}

    <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', height: 'min(52dvh, 420px)', minHeight: 280, background: '#F1F0EB' }}>
      {config?.provider === 'google' && config.canNavigate
        ? <GoogleTripMap activities={activities} route={currentRoute?.provider === 'google' ? currentRoute : null} position={fix} accuracy={fix?.accuracy || null} selectedIndex={selectedIndex} onSelect={chooseTarget} />
        : <CinematicMap activities={mapActivities} route={currentRoute?.provider !== 'google' ? currentRoute : null} activeIndex={currentRoute ? 0 : selectedIndex} userLocation={fix} completedIndexes={currentRoute ? [] : completedIndexes} onSelect={(index: number) => chooseTarget(currentRoute ? selectedIndex : index)} follow={guiding && follow} onPan={() => setFollow(false)} />}
    </div>
    {activities.some(activity => !validRoutePoint(activity)) && <p style={{ fontSize: '.76rem', marginTop: 8, color: 'var(--navy-muted)' }}>Một số điểm chưa có tọa độ; HueViVu không đặt ghim hoặc vẽ đường giả cho những điểm này.</p>}
    {arrival && <div className="card" role="status" style={{ padding: '12px 14px', marginTop: 10, fontSize: '.78rem' }}>Bạn đang gần {activities[selectedIndex]?.name}. <button className="mood-chip" onClick={() => { onMarkDone(selectedIndex); setArrival(false); setGuiding(false); arrivalCount.current = 0; lastRequestAt.current = 0; }} style={{ minHeight: 44 }}>Xác nhận đã đến</button></div>}
    {currentRoute && <div className="card" style={{ padding: '12px 14px', marginTop: 10 }}>
      <p style={{ margin: 0, fontWeight: 700, fontSize: '.83rem' }}>Đến {activities[currentRoute.destinationIndex]?.name || 'điểm đã chọn'}</p>
      <p style={{ margin: '5px 0', fontSize: '1rem', fontWeight: 700 }}>{remainingMinutes ?? Math.ceil(currentRoute.durationSeconds / 60)} phút · {((remaining?.remainingMeters ?? currentRoute.distanceMeters) / 1000).toFixed(1)} km</p>
      <p style={{ margin: 0, fontSize: '.72rem', color: 'var(--navy-muted)' }}>{currentRoute.provider === 'google' ? 'Google Routes' : 'Valhalla · OpenStreetMap'} · Thời gian dự kiến, có thể thay đổi khi đi.</p>
      {lateByRoute && <button className="mood-chip" onClick={onReviewSchedule} style={{ minHeight: 44, marginTop: 8 }}>Có thể trễ giờ — xem phương án đổi lịch</button>}
      {currentRoute.arrivalStatus && <p style={{ marginTop: 8, fontSize: '.77rem', color: currentRoute.arrivalStatus.status === 'closed' ? '#9A3412' : 'var(--navy-muted)' }}>Đến nơi theo tuyến: {currentRoute.arrivalStatus.label}{currentRoute.arrivalStatus.checkedAt ? ` · kiểm tra ${new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' }).format(new Date(currentRoute.arrivalStatus.checkedAt))}` : ''}</p>}
    </div>}
  </section>;
}
