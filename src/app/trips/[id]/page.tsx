'use client';
import { useHueWeather } from '@/components/ui/useHueWeather';
import WeatherWidget from '@/components/ui/WeatherWidget';
import { useWeatherTripImpact } from '@/components/trip/useWeatherTripImpact';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import TripNavigation from '@/components/trip/TripNavigation';
import { itineraryFingerprint, type RoutePoint, type TripRoute } from '@/lib/navigation-route';
import { trackEvent } from '@/lib/analytics';
import FeasibilityAssistant from '@/components/trip/FeasibilityAssistant';
import { cacheTrip, readCachedTrip, removeCachedTrip } from '@/lib/offline-trip-cache';
import { getDayProgress, activityKeys } from '@/lib/trip-state';
import { getHueClock, tripDayIndex } from '@/lib/travel-clock';
import TripProgressPanel from '@/components/trip/TripProgressPanel';
import type { TripState, TripStatePatch } from '@/lib/trip-state';

type Activity = {
  time: string; name: string; type: string;
  duration: string; cost: string; description: string;
  ai_tip: string; location: string; lat?: number; lng?: number;
  place_id?: string;
};
type Day = { day: number; theme: string; day_tip: string; activities: Activity[] };
type Trip = {
  id: string; title: string; summary: string; duration: number;
  companion: string; total_cost_estimate: string; ai_insight: string;
  highlights: string[]; itinerary: { days: Day[] }; is_shared: number;
  user_id: string; status: string; start_date?: string;
};
type Weather = {
  emoji: string; temp: number; vi: string;
  advisory: string; advisory_type: string;
  forecast?: { day: string; temp_max: number; temp_min: number; emoji: string; condition_vi: string }[];
};

const TYPE_EMOJI: Record<string, string> = {
  heritage: '🏛️', food: '🍜', nature: '🌿', temple: '🛕',
  cafe: '☕', market: '🛍️', experience: '🎭', craft_village: '🎨',
};
const EMERGENCY = [
  { label: 'Cấp cứu 115', phone: '115', icon: '🚑' },
  { label: 'Cảnh sát 113', phone: '113', icon: '🚨' },
  { label: 'Cứu hỏa 114', phone: '114', icon: '🚒' },
  { label: 'BV TW Huế', phone: '02343822325', icon: '🏥' },
];
const PACKING = [
  'Nón / mũ che nắng (Huế rất nóng)',
  'Giày thoải mái (nhiều nơi cần leo cầu thang)',
  'Thuốc chống say xe nếu đi xe máy',
  'Tiền mặt VND (chợ, đền thường không nhận thẻ)',
  'Sạc dự phòng (pin tốn khi dùng GPS)',
  'Áo khoác mỏng (buổi tối Huế se lạnh)',
];
const TIMES = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
type ChatProposal = { instruction: string; itinerary: any; summary: string[]; expectedItinerary: string; expectedStateUpdatedAt: string | null };
type ChatMsg = { role: 'user' | 'assistant'; content: string; proposal?: ChatProposal; applied?: boolean };

// Haversine distance (km)
function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function renderAiMarkdown(text: string) {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let key = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { out.push(<br key={key++} />); continue; }
    const isBullet = /^[-*•]\s+/.test(trimmed);
    const content = trimmed.replace(/^[-*•]\s+/, '');
    const parts = content.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p
    );
    if (isBullet) {
      out.push(<div key={key++} style={{ display: 'flex', gap: 5, marginBottom: 3 }}>
        <span style={{ color: 'var(--coral)', flexShrink: 0 }}>•</span>
        <span>{parts}</span>
      </div>);
    } else {
      out.push(<p key={key++} style={{ margin: '0 0 5px', lineHeight: 1.55 }}>{parts}</p>);
    }
  }
  return out;
}

function buildCopyText(trip: Trip): string {
  const lines: string[] = ['🗺️ ' + trip.title, trip.summary, ''];
  (trip.itinerary?.days || []).forEach(day => {
    lines.push('📅 Ngày ' + day.day + ': ' + day.theme);
    day.activities.forEach(a => lines.push('  ' + a.time + ' — ' + a.name + ' (' + a.duration + ') · ' + (a.cost || 'Miễn phí')));
    lines.push('');
  });
  lines.push('💰 Tổng chi phí dự kiến: ' + trip.total_cost_estimate);
  return lines.join('\n');
}

function WeatherBanner({ weather, onDismiss }: { weather: Weather; onDismiss: () => void }) {
  const bg = weather.advisory_type === 'warn'
    ? 'linear-gradient(135deg,rgba(239,68,68,0.09),rgba(239,68,68,0.04))'
    : weather.advisory_type === 'caution'
    ? 'linear-gradient(135deg,rgba(245,158,11,0.09),rgba(245,158,11,0.04))'
    : 'linear-gradient(135deg,rgba(34,197,94,0.09),rgba(34,197,94,0.04))';
  const border = weather.advisory_type === 'warn' ? 'rgba(239,68,68,0.22)'
    : weather.advisory_type === 'caution' ? 'rgba(245,158,11,0.22)' : 'rgba(34,197,94,0.22)';
  return (
    <div className="trip-weather-banner" style={{ margin: '0 20px 8px', padding: '8px 12px', background: bg, borderRadius: 'var(--radius-md)', border: '1px solid ' + border, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{weather.emoji}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--navy)', margin: '0 0 2px' }}>{weather.temp}°C · {weather.vi}</p>
        <p style={{ fontSize: '0.775rem', color: 'var(--navy-muted)', margin: 0, lineHeight: 1.5 }}>{weather.advisory}</p>
      </div>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--navy-muted)', padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
  );
}

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [offlineSavedAt, setOfflineSavedAt] = useState<number | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [activeActivity, setActiveActivity] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'map'>('timeline');
  const [chatOpen, setChatOpen] = useState(false);
  const chatToolbarRef = useRef<HTMLDivElement>(null);
  const tripViewControlsRef = useRef<HTMLDivElement>(null);
  const [chatEntryVisible, setChatEntryVisible] = useState(true);
  useEffect(() => {
    if (loading || !trip?.id) return;
    if (!('IntersectionObserver' in window)) { setChatEntryVisible(false); return; }
    const targets = [chatToolbarRef.current, tripViewControlsRef.current].filter((target): target is HTMLDivElement => !!target);
    const visible = new Map<Element, boolean>(targets.map(target => [target, false]));
    let cancelled = false;
    const observer = new IntersectionObserver(entries => {
      if (cancelled) return;
      entries.forEach(entry => visible.set(entry.target, entry.isIntersecting));
      setChatEntryVisible([...visible.values()].some(Boolean));
    });
    targets.forEach(target => observer.observe(target));
    return () => { cancelled = true; observer.disconnect(); };
  }, [loading, trip?.id]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customizeText, setCustomizeText] = useState('');
  const [customizing, setCustomizing] = useState(false);
  const [adaptOpen, setAdaptOpen] = useState(false);
  const [adapting, setAdapting] = useState(false);
  const [adaptError, setAdaptError] = useState('');
  const [delayMinutes, setDelayMinutes] = useState(45);
  const [feasibility, setFeasibility] = useState<any | null>(null);
  const [showFeasibility, setShowFeasibility] = useState(false);
  const [optimizingFeasibility, setOptimizingFeasibility] = useState(false);
  const [previewingFeasibility, setPreviewingFeasibility] = useState(false);
  const [optimizationPreview, setOptimizationPreview] = useState<any | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showPacking, setShowPacking] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { weather: weatherData, usableWeather, refreshWeather, clock: weatherClock } = useHueWeather();
  const weather: Weather | null = usableWeather ? { emoji: usableWeather.condition_emoji, temp: usableWeather.temp, vi: usableWeather.condition_vi, advisory: usableWeather.advisory, advisory_type: usableWeather.advisory_type, forecast: usableWeather.forecast } : null;
  const [weatherDismissed, setWeatherDismissed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDayIdx, setEditDayIdx] = useState(0);
  const [editActIdx, setEditActIdx] = useState<number | null>(null);
  const [editAct, setEditAct] = useState<Partial<Activity>>({});
  const [saving, setSaving] = useState(false);
  // Realtime tracking
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [measuredRoute, setMeasuredRoute] = useState<TripRoute | null>(null);
  const locationNotice = '';
  const [tripState, setTripState] = useState<TripState | null>(null);
  useEffect(() => { setMeasuredRoute(null); }, [params.id, activeDay, trip?.itinerary, tripState?.updatedAt]);
  const [progressStatus, setProgressStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [progressError, setProgressError] = useState('');
  const [progressConflict, setProgressConflict] = useState(false);
  const [progressNeedsLogin, setProgressNeedsLogin] = useState(false);
  const progressSavingRef = useRef(false);
  const progressEpochRef = useRef(0);
  const pendingProgressRef = useRef<(TripStatePatch & { startTodayIfMissing?: boolean }) | null>(null);
  const [tourToast, setTourToast] = useState<string | null>(null);
  const lastNotifiedRef = useRef<string>('');
  const notifiedWeatherRef = useRef('');
  // place search
  const [placeSearchOpen, setPlaceSearchOpen] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<any[]>([]);
  const [placeSelected, setPlaceSelected] = useState<any | null>(null);
  const [placeTime, setPlaceTime] = useState('10:00');
  const [smartPlacement, setSmartPlacement] = useState(true);
  const [placeSuggestion, setPlaceSuggestion] = useState<any | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [placeAdding, setPlaceAdding] = useState(false);
  const [placeOk, setPlaceOk] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('hv_token') : null;
  const weatherImpact = useWeatherTripImpact(trip, tripState, activeDay, usableWeather, token, progressStatus === 'loading' || progressStatus === 'saving' || progressStatus === 'error', weatherClock);

  const loadTripState = useCallback(async () => {
    const epoch = ++progressEpochRef.current;
    setProgressStatus('loading'); setProgressError(''); setProgressConflict(false); setProgressNeedsLogin(false);
    pendingProgressRef.current = null;
    try {
      const response = await fetch('/api/trips/' + params.id + '/state', { headers: token ? { Authorization: 'Bearer ' + token } : {}, signal: AbortSignal.timeout(8000) });
      const data = await response.json().catch(() => ({ error: 'Máy chủ chưa trả được tiến độ. Hãy thử lại.' }));
      if (epoch !== progressEpochRef.current) return;
      if (!response.ok || !data.state) {
        setProgressNeedsLogin(response.status === 401);
        throw new Error(response.status === 401 ? 'Phiên sử dụng đã hết hạn. Hãy đăng nhập lại để lưu tiến độ.' : data.error || 'Chưa tải được tiến độ.');
      }
      setTripState(data.state); setActiveDay(data.state.dayIndex); setProgressStatus('idle');
    } catch (error) {
      if (epoch !== progressEpochRef.current) return;
      setProgressStatus('error'); setProgressError(error instanceof Error && error.name === 'Error' ? error.message : 'Chưa tải được tiến độ. Kiểm tra mạng rồi thử lại.');
    }
  }, [params.id, token]);

  useEffect(() => {
    loadTripState();
    return () => { progressEpochRef.current += 1; };
  }, [loadTripState]);

  const saveTripProgress = async (patch: TripStatePatch & { startTodayIfMissing?: boolean }) => {
    if (!tripState || !token || progressSavingRef.current) return;
    const epoch = progressEpochRef.current;
    progressSavingRef.current = true;
    pendingProgressRef.current = { dayIndex: activeDay, ...patch };
    setProgressStatus('saving'); setProgressError(''); setProgressConflict(false); setProgressNeedsLogin(false);
    try {
      const response = await fetch('/api/trips/' + params.id + '/state', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ ...pendingProgressRef.current, expectedUpdatedAt: tripState.updatedAt, expectedActivityKeys: activityKeys(trip?.itinerary.days[patch.dayIndex ?? activeDay]?.activities || []) }), signal: AbortSignal.timeout(8000),
      });
      const data = await response.json().catch(() => ({ error: 'Máy chủ chưa trả được tiến độ. Hãy thử lại.' }));
      if (epoch !== progressEpochRef.current) return;
      if (!response.ok || !data.state) {
        setProgressConflict(response.status === 409); setProgressNeedsLogin(response.status === 401);
        throw new Error(response.status === 401 ? 'Phiên sử dụng đã hết hạn. Hãy đăng nhập lại để lưu tiến độ.' : data.error || 'Chưa lưu được tiến độ.');
      }
      setTripState(data.state); setActiveDay(data.state.dayIndex); pendingProgressRef.current = null; setProgressStatus('saved');
      if (data.startDate) setTrip(previous => previous ? { ...previous, start_date: data.startDate } : previous);
    } catch (error) {
      if (epoch !== progressEpochRef.current) return;
      setProgressStatus('error'); setProgressError(error instanceof Error && error.name === 'Error' ? error.message : 'Chưa lưu được tiến độ. Kiểm tra mạng rồi thử lại; lựa chọn vẫn được giữ.');
    } finally { progressSavingRef.current = false; }
  };

  const selectTripDay = (dayIndex: number) => {
    if (progressSavingRef.current) return;
    setActiveDay(dayIndex); setActiveActivity(null);
    if (tripState) saveTripProgress({ dayIndex });
  };

  const toggleActivityDone = (index: number) => {
    if (!tripState || !trip) return;
    const activities = trip.itinerary.days[activeDay]?.activities || [];
    const progress = getDayProgress(tripState, activeDay, activities);
    const completed = progress.completedActivityIndexes.includes(index)
      ? progress.completedActivityIndexes.filter(value => value !== index) : [...progress.completedActivityIndexes, index];
    const next = activities.findIndex((_, i) => !completed.includes(i));
    saveTripProgress({ dayIndex: activeDay, completedActivityIndexes: completed, currentActivityIndex: next < 0 ? null : next,
    });
  };

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = 'Bearer ' + token;
    fetch('/api/trips/' + params.id, { headers })
      .then(async r => {
        if (!r.ok) {
          if ([401, 403, 404].includes(r.status)) {
            removeCachedTrip(String(params.id));
            setLoadError(r.status === 401 ? 'Phiên sử dụng đã hết hạn. Hãy đăng nhập lại.' : 'Lịch trình không còn tồn tại hoặc bạn không có quyền xem.');
            return null;
          }
          throw new Error('Không tải được lịch trình');
        }
        return r.json();
      }).then(data => {
        setTrip(data); setLoading(false);
      })
      .catch(() => {
        const cached = readCachedTrip<Trip>(String(params.id));
        if (cached?.data) {
          window.location.replace('/offline.html?trip=' + encodeURIComponent(String(params.id)));
          return;
        }
        setLoadError('Chưa tải được lịch trình và chưa có bản lưu trên máy. Hãy kết nối mạng rồi thử lại.');
        setLoading(false);
      });

  }, [params.id, token]);

  useEffect(() => {
    setOfflineSavedAt(trip?.id && cacheTrip(String(params.id), trip) ? Date.now() : null);
  }, [trip, params.id, token]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  useEffect(() => {
    if (!trip?.itinerary) return;
    fetch(`/api/trips/${params.id}/validate`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(response => response.ok ? response.json() : null).then(setFeasibility).catch(() => {});
  }, [trip?.itinerary, params.id, token]);

  // ── Tour notifications: schedule + geofence ──
  useEffect(() => {
    if (!trip || !tripState?.startedAt || trip.status !== 'active' || tripDayIndex(trip.start_date) !== activeDay) return;
    const all = trip.itinerary?.days?.[activeDay]?.activities || [];
    const completed = getDayProgress(tripState, activeDay, all).completedActivityIndexes;
    const activities = all.filter((_, i) => !completed.includes(i));
    if (activities.length === 0) return;

    const checkTour = () => {
      const now = new Date();
      const nowMin = getHueClock(now).minutes;

      for (const act of activities) {
        const [h, m] = (act.time || '').split(':').map(Number);
        if (isNaN(h)) continue;
        const actMin = h * 60 + (m || 0);
        const diff = actMin - nowMin;
        const key = `schedule-${act.name}-${act.time}`;

        // 15 phút trước hoạt động
        if (diff > 0 && diff <= 15 && lastNotifiedRef.current !== key) {
          lastNotifiedRef.current = key;
          setTourToast(`⏰ ${diff} phút nữa: ${act.name}`);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('HueViVu', { body: `⏰ ${diff} phút nữa: ${act.name}`, icon: '/icon-192x192.png' });
          }
        }

        // Trễ lịch > 15 phút
        if (diff < -15 && diff > -60 && lastNotifiedRef.current !== `late-${key}`) {
          lastNotifiedRef.current = `late-${key}`;
          setTourToast(`⚠️ Trễ ${Math.abs(diff)} phút: ${act.name} — cân nhắc bỏ qua?`);
        }

        // Geofence: đến gần điểm (< 200m)
        if (userLocation && act.lat && act.lng) {
          const d = haversine(userLocation.lat, userLocation.lng, act.lat, act.lng);
          const geoKey = `arrived-${act.name}`;
          if (d < 0.2 && lastNotifiedRef.current !== geoKey) {
            lastNotifiedRef.current = geoKey;
            setTourToast(`📍 Bạn đã đến ${act.name}!`);
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('HueViVu', { body: `📍 Bạn đã đến ${act.name}!`, icon: '/icon-192x192.png' });
            }
          }
        }
      }
    };

    checkTour();
    const interval = setInterval(checkTour, 30_000); // Check mỗi 30s
    return () => clearInterval(interval);
  }, [trip, activeDay, userLocation, tripState]);

  useEffect(() => {
    if (!usableWeather) { notifiedWeatherRef.current = ''; return; }
    const key = usableWeather.condition + '|' + usableWeather.temp;
    if (notifiedWeatherRef.current && notifiedWeatherRef.current !== key) {
      setWeatherDismissed(false);
      setTourToast('Thời tiết thành phố Huế thay đổi: ' + usableWeather.temp + '°C — ' + usableWeather.condition_vi);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('HueViVu — Thời tiết Huế', { body: usableWeather.advisory, icon: '/icon-192x192.png' });
      }
    }
    notifiedWeatherRef.current = key;
  }, [usableWeather]);

  const persistRaw = useCallback(async (newTrip: Trip) => {
    setSaving(true);
    try {
      await fetch('/api/trips/' + params.id + '/save-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ itinerary: newTrip.itinerary }),
      });
    } catch {}
    finally { setSaving(false); }
  }, [params.id, token]);

  const searchPlaces = useCallback(async (q = '', category = '') => {
    const search = new URLSearchParams();
    if (q.trim()) search.set('q', q.trim());
    if (category) search.set('category', category);
    const res = await fetch('/api/places?' + search.toString()).then(r => r.json()).catch(() => []);
    if (!Array.isArray(res)) { setPlaceResults([]); return; }
    const currentActivities = trip?.itinerary?.days?.[activeDay]?.activities || [];
    const usedIds = new Set((trip?.itinerary?.days || []).flatMap(day => day.activities || []).map(activity => activity.place_id).filter(Boolean));
    const ranked = res
      .filter((place: any) => !usedIds.has(place.id))
      .map((place: any) => {
        const distances = currentActivities
          .filter(activity => activity.lat && activity.lng && place.lat && place.lng)
          .map(activity => haversine(Number(activity.lat), Number(activity.lng), Number(place.lat), Number(place.lng)));
        return { ...place, route_distance_km: distances.length ? Math.min(...distances) : null };
      })
      .sort((a: any, b: any) => (a.route_distance_km ?? 999) - (b.route_distance_km ?? 999) || (b.rating || 0) - (a.rating || 0));
    setPlaceResults(ranked.slice(0, 14));
  }, [trip, activeDay]);

  const selectPlace = async (place: any) => {
    setPlaceSelected(place); setSmartPlacement(true); setPlaceSuggestion(null); setSuggestionLoading(true);
    try {
      const response = await fetch(`/api/trips/${params.id}/place-suggestion?dayIndex=${activeDay}&placeId=${encodeURIComponent(place.id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const suggestion = await response.json();
      setPlaceSuggestion(suggestion);
      if (suggestion.feasible && suggestion.time) setPlaceTime(suggestion.time);
    } catch {
      setPlaceSuggestion({ feasible: false, reason: 'Chưa thể tính vị trí chèn. Bạn vẫn có thể tự chọn giờ.' });
      setSmartPlacement(false);
    } finally { setSuggestionLoading(false); }
  };

  const busyAt = (time: string) => {
    const acts = trip?.itinerary?.days?.[activeDay]?.activities || [];
    return acts.find((a: Activity) => {
      const [ah, am] = (a.time || '').split(':').map(Number);
      const [th, tm] = time.split(':').map(Number);
      return Math.abs((ah * 60 + am) - (th * 60 + tm)) < 30;
    });
  };

  const handleAddPlace = async () => {
    if (!placeSelected || placeAdding || (smartPlacement ? !placeSuggestion?.feasible : !!busyAt(placeTime))) return;
    setPlaceAdding(true);
    try {
      const res = await fetch('/api/trips/' + params.id + '/add-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({
          dayIndex: activeDay,
          placeId: placeSelected.id,
          smartInsert: smartPlacement,
          activity: {
            time: smartPlacement ? placeSuggestion?.time : placeTime,
            name: placeSelected.name,
            type: placeSelected.category || 'heritage',
            duration: placeSelected.duration || '1 giờ',
            cost: placeSelected.price || 'Miễn phí',
            description: placeSelected.description || '',
            location: placeSelected.address || 'Huế',
            ai_tip: (placeSelected.tips?.[0]) || 'Địa điểm nổi tiếng tại Huế',
            lat: placeSelected.lat, lng: placeSelected.lng,
            place_id: placeSelected.id,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTrip(prev => prev ? { ...prev, itinerary: data.trip.itinerary ? JSON.parse(typeof data.trip.itinerary === 'string' ? data.trip.itinerary : JSON.stringify(data.trip.itinerary)) : prev.itinerary } : null);
        setPlaceOk(true);
        setTimeout(() => { setPlaceSearchOpen(false); setPlaceOk(false); setPlaceSelected(null); setPlaceSuggestion(null); setPlaceQuery(''); setPlaceResults([]); }, 1800);
      } else {
        alert(data.error || 'Lỗi thêm địa điểm');
      }
    } catch { alert('Lỗi kết nối'); }
    finally { setPlaceAdding(false); }
  };

  const openEdit = (dayIdx: number, actIdx: number | null) => {
    setEditDayIdx(dayIdx); setEditActIdx(actIdx);
    if (actIdx !== null && trip) {
      setEditAct({ ...trip.itinerary.days[dayIdx].activities[actIdx] });
    } else {
      setEditAct({ time: '10:00', name: '', type: 'heritage', duration: '1 giờ', cost: 'Miễn phí', description: '', ai_tip: '', location: 'Huế' });
    }
    setEditOpen(true);
  };

  const confirmEdit = () => {
    if (!trip || !editAct.name?.trim()) return;
    const newTrip: Trip = JSON.parse(JSON.stringify(trip));
    const day = newTrip.itinerary.days[editDayIdx];
    if (editActIdx !== null) {
      day.activities[editActIdx] = { ...day.activities[editActIdx], ...editAct } as Activity;
    } else {
      day.activities.push(editAct as Activity);
    }
    day.activities.sort((a, b) => {
      const [ah, am] = (a.time || '').split(':').map(Number);
      const [bh, bm] = (b.time || '').split(':').map(Number);
      return (ah * 60 + am) - (bh * 60 + bm);
    });
    setTrip(newTrip); setEditOpen(false); persistRaw(newTrip);
  };

  const deleteActivity = (dayIdx: number, actIdx: number) => {
    if (!trip) return;
    const newTrip: Trip = JSON.parse(JSON.stringify(trip));
    newTrip.itinerary.days[dayIdx].activities.splice(actIdx, 1);
    setTrip(newTrip); setActiveActivity(null); persistRaw(newTrip);
  };

  const moveActivity = (dayIdx: number, actIdx: number, dir: -1 | 1) => {
    if (!trip) return;
    const newTrip: Trip = JSON.parse(JSON.stringify(trip));
    const acts = newTrip.itinerary.days[dayIdx].activities;
    const to = actIdx + dir;
    if (to < 0 || to >= acts.length) return;
    [acts[actIdx], acts[to]] = [acts[to], acts[actIdx]];
    setTrip(newTrip); setActiveActivity(to); persistRaw(newTrip);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim(); setChatInput('');
    const newMsgs: ChatMsg[] = [...chatMessages, { role: 'user', content: msg }];
    setChatMessages(newMsgs); setChatLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ message: msg, tripId: params.id, dayIndex: activeDay, history: newMsgs.slice(-10) }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.ok ? (data.reply || 'Chưa có câu trả lời. Hãy thử lại.') : (data.error || 'Chưa gửi được câu hỏi. Hãy thử lại.'), proposal: res.ok ? data.proposal || undefined : undefined }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Đang gặp sự cố kết nối. Thử lại sau nhé!' }]);
    } finally { setChatLoading(false); }
  };

  const applyChatProposal = async (messageIndex: number, proposal: ChatProposal) => {
    if (customizing) return;
    setCustomizing(true);
    try {
      const response = await fetch('/api/trips/' + params.id + '/customize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ instruction: proposal.instruction, proposal: proposal.itinerary, expectedItinerary: proposal.expectedItinerary, expectedStateUpdatedAt: proposal.expectedStateUpdatedAt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể áp dụng thay đổi');
      if (data.trip) {
        setTrip(prev => prev ? {
          ...prev, ...data.trip,
          itinerary: data.trip.days ? { days: data.trip.days } : prev.itinerary,
          highlights: data.trip.highlights || prev.highlights,
          ai_insight: data.trip.ai_insight || prev.ai_insight,
          total_cost_estimate: data.trip.total_cost_estimate || prev.total_cost_estimate,
        } : null);
        if (data.feasibility) setFeasibility(data.feasibility);
        setChatMessages(prev => prev.map((item, index) => index === messageIndex ? { ...item, applied: true } : item));
        setTourToast('✓ Đã áp dụng thay đổi từ trợ lý AI');
        loadTripState();
      }
    } catch (error: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: error.message || 'Không thể áp dụng thay đổi.' }]);
    } finally { setCustomizing(false); }
  };

  const handleCustomize = async () => {
    if (!customizeText.trim() || customizing) return;
    setCustomizing(true);
    try {
      const res = await fetch('/api/trips/' + params.id + '/customize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ instruction: customizeText, preview: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể tạo phương án.');
      setChatMessages(previous => [...previous, { role: 'assistant', content: 'Xem phương án trước khi xác nhận.', proposal: { instruction: customizeText, itinerary: data.proposal, summary: ['Phương án điều chỉnh theo yêu cầu của bạn.'], expectedItinerary: data.expectedItinerary, expectedStateUpdatedAt: data.expectedStateUpdatedAt } }]);
      setCustomizeOpen(false); setChatOpen(true);
    } catch { alert('Đang gặp sự cố kết nối. Thử lại sau nhé!'); }
    finally { setCustomizing(false); }
  };

  const [adaptPreview, setAdaptPreview] = useState<any>(null);
  const adaptPreviewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (adaptPreview && adaptOpen) {
      adaptPreviewRef.current?.scrollIntoView({ block: 'start' });
      adaptPreviewRef.current?.focus({ preventScroll: true });
    }
  }, [adaptPreview, adaptOpen]);
  const [autoReplanLoading, setAutoReplanLoading] = useState(false);
  const replanEpochRef = useRef(0);
  useEffect(() => {
    replanEpochRef.current += 1;
    setAdaptPreview(null); setAutoReplanLoading(false);
  }, [params.id, activeDay, trip?.itinerary, tripState?.updatedAt]);

  const checkAutomaticReplan = async (weatherOnly = false) => {
    if (!trip || autoReplanLoading) return;
    const epoch = ++replanEpochRef.current;
    setAutoReplanLoading(true); setAdaptError('');
    try {
      const response = await fetch('/api/trips/' + params.id + '/replan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ dayIndex: activeDay, activityIndex: activeActivity, lat: userLocation?.lat, lng: userLocation?.lng, delayMinutes, ...(measuredRoute?.provider === 'google' && measuredRoute.itinerarySnapshot === itineraryFingerprint(trip.itinerary) && Date.now() - Date.parse(measuredRoute.computedAt) < 120000 ? { routeTargetIndex: measuredRoute.destinationIndex } : {}), ...(weatherOnly ? { trigger: 'weather' } : {}) }), signal: AbortSignal.timeout(12000),
      });
      const data = await response.json().catch(() => ({ error: 'Máy chủ chưa trả được phương án. Hãy thử lại.' }));
      if (epoch !== replanEpochRef.current) return;
      if (!response.ok || !data.decision) throw new Error(data.error || 'Chưa kiểm tra được lịch. Hãy thử lại.');
      if (data.changed === false) { setAdaptPreview(null); setAdaptError(data.message || data.decision?.reason || 'Lịch hiện tại chưa cần thay đổi.'); return; }
      setAdaptPreview({ ...data, before: JSON.parse(data.expectedItinerary).days[data.decision.dayIndex], dayIndex: data.decision.dayIndex, input: data.input });
    } catch (error: any) { if (epoch === replanEpochRef.current) setAdaptError(error instanceof Error && error.name === 'Error' ? error.message : 'Chưa chuẩn bị được phương án. Kiểm tra mạng rồi thử lại; lịch hiện tại vẫn được giữ.'); }
    finally { if (epoch === replanEpochRef.current) setAutoReplanLoading(false); }
  };

  const applyAdaptation = async (scenario: 'late' | 'rain' | 'hungry' | 'tired' | 'closed', confirmed = false) => {
    if (!trip || adapting) return;
    if (scenario === 'closed' && activeActivity === null) {
      setAdaptError('Hãy mở một hoạt động đang đóng cửa trước khi chọn phương án này.'); return;
    }
    setAdapting(true); setAdaptError('');
    const now = new Date();
    const currentTime = getHueClock(now).time;
    try {
      const response = await fetch(`/api/trips/${params.id}/adapt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(confirmed && adaptPreview ? { ...adaptPreview.input, preview: false, expectedItinerary: adaptPreview.expectedItinerary, expectedStateUpdatedAt: adaptPreview.expectedStateUpdatedAt } : { scenario, dayIndex: activeDay, activityIndex: activeActivity, delayMinutes, currentTime, lat: userLocation?.lat, lng: userLocation?.lng, preview: true }),
      });
      const data = await response.json().catch(() => ({ error: 'Máy chủ chưa trả được phương án. Hãy thử lại.' }));
      if (!response.ok || !data.itinerary) throw new Error(data.error || 'Chưa chuẩn bị được phương án. Hãy thử lại.');
      if (data.changed === false) { setAdaptPreview(null); setAdaptError(data.message); return; }
      if (!confirmed) {
        setAdaptPreview({ ...data, before: trip.itinerary.days[activeDay], dayIndex: activeDay, input: { scenario, dayIndex: activeDay, activityIndex: activeActivity, delayMinutes, currentTime, lat: userLocation?.lat, lng: userLocation?.lng } });
        return;
      }
      setAdaptPreview(null);
      setTrip(prev => prev ? { ...prev, itinerary: data.itinerary, ai_insight: `⚡ ${data.changes.join('. ')}` } : null);
      loadTripState();
      setTourToast(`⚡ ${data.changes.join(' · ')}`); setAdaptOpen(false); setActiveActivity(null);
      trackEvent('trip_adapted', { trip_id: String(params.id), metadata: { scenario, day: activeDay + 1, changes: data.changes } });
    } catch (error: any) { setAdaptError(error instanceof Error && error.name === 'Error' ? error.message : 'Chưa chuẩn bị được phương án. Kiểm tra mạng rồi thử lại; lịch hiện tại vẫn được giữ.'); }
    finally { setAdapting(false); }
  };

  const previewFeasibilityOptimization = async () => {
    if (!trip || previewingFeasibility) return;
    setPreviewingFeasibility(true);
    try {
      const response = await fetch(`/api/trips/${params.id}/optimize`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ preview: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể tối ưu lịch trình');
      setOptimizationPreview(data); setShowFeasibility(false);
    } catch (error: any) { setTourToast(`⚠️ ${error.message}`); }
    finally { setPreviewingFeasibility(false); }
  };

  const applyFeasibilityOptimization = async () => {
    if (!trip || optimizingFeasibility) return;
    setOptimizingFeasibility(true);
    try {
      const response = await fetch(`/api/trips/${params.id}/optimize`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ preview: false }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể áp dụng phương án');
      setTrip(prev => prev ? { ...prev, itinerary: data.itinerary, ai_insight: data.changes?.length ? `Đã tối ưu ${data.changes.length} thay đổi` : prev.ai_insight } : null);
      setFeasibility(data.feasibility); setShowFeasibility(true); setOptimizationPreview(null);
      setTourToast(data.changes?.length ? `✓ Đã tối ưu ${data.changes.length} thay đổi · Điểm mới ${data.feasibility.score}` : 'Lịch hiện tại chưa có thay đổi tự động phù hợp');
      trackEvent('trip_feasibility_optimized', { trip_id: String(params.id), value: data.feasibility.score, metadata: { changes: data.changes, unresolved: data.unresolved } });
    } catch (error: any) { setTourToast(`⚠️ ${error.message}`); }
    finally { setOptimizingFeasibility(false); }
  };

  const handleShare = async () => {
    try {
      await fetch('/api/trips/' + params.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ action: 'share' }),
      });
      setShareSuccess(true);
      if (navigator.share) navigator.share({ title: trip?.title, url: window.location.href });
      else navigator.clipboard.writeText(window.location.href).catch(() => {});
    } catch {}
  };

  const handleCopy = () => {
    if (!trip) return;
    navigator.clipboard.writeText(buildCopyText(trip)).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 16, padding: '80px 20px 20px' }}>
      {[160, 80, 80, 80].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h, borderRadius: 'var(--radius-lg)' }} />
      ))}
    </div>
  );

  if (!trip || (trip as any).error) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <span style={{ fontSize: 48 }}>🗺️</span>
      <p style={{ color: 'var(--navy-muted)', fontWeight: 600, padding: '0 20px', textAlign: 'center' }}>{loadError || 'Không tìm thấy lịch trình'}</p>
      <button onClick={() => window.location.reload()} className="btn btn-primary">Thử tải lại</button>
      <Link href="/trips" style={{ color: 'var(--coral)', fontWeight: 700 }}>← Quay lại</Link>
    </div>
  );

  const currentDay = trip.itinerary?.days?.[activeDay];
  const allActivities = currentDay?.activities || [];
  const progress = tripState ? getDayProgress(tripState, activeDay, allActivities) : { completedActivityIndexes: [], currentActivityIndex: null };
  const todayIndex = tripDayIndex(trip.start_date);
  const canStart = trip.status === 'active' && todayIndex !== null && todayIndex >= 0 && todayIndex < trip.itinerary.days.length;
  const canTrack = canStart && activeDay <= (todayIndex ?? -1) && Boolean(tripState?.startedAt) && !['loading', 'saving', 'error'].includes(progressStatus);


  const progressPanel = (!trip.is_shared || tripState) ? <TripProgressPanel
        dayIndex={activeDay} completed={progress.completedActivityIndexes.length} total={allActivities.length}
        state={tripState} status={progressStatus} error={progressError} conflict={progressConflict} needsLogin={progressNeedsLogin}
        pendingDescription={pendingProgressRef.current?.startTodayIfMissing ? 'bắt đầu chuyến đi hôm nay' : pendingProgressRef.current?.fatigue ? ({ fresh: 'còn khỏe', okay: 'vừa sức', tired: 'đang mệt' } as Record<string, string>)[pendingProgressRef.current.fatigue] : pendingProgressRef.current?.completedActivityIndexes ? `đã đi ${pendingProgressRef.current.completedActivityIndexes.length} điểm ngày ${activeDay + 1}` : pendingProgressRef.current?.dayIndex !== undefined ? `xem ngày ${pendingProgressRef.current.dayIndex + 1}` : undefined}
        canStart={canStart} startDate={trip.start_date}
        onStart={() => saveTripProgress({ startedAt: new Date().toISOString() })}
        onStartToday={() => saveTripProgress({ dayIndex: 0, startTodayIfMissing: true })}
        onFatigue={fatigue => saveTripProgress({ fatigue })}
        onRetry={() => progressConflict ? window.location.reload() : !pendingProgressRef.current ? loadTripState() : saveTripProgress(pendingProgressRef.current)}
        onCancel={() => { pendingProgressRef.current = null; if (tripState) setActiveDay(tripState.dayIndex); setProgressError(''); setProgressStatus('idle'); }}
        onRest={() => { setAdaptOpen(true); checkAutomaticReplan(); }}
        hasNextDay={activeDay < trip.itinerary.days.length - 1}
        onNextDay={() => selectTripDay(activeDay + 1)}
      /> : null;

  return (
    <div className="trip-page-shell" style={{ minHeight: '100vh', background: 'var(--soft-white)', paddingBottom: 100 }}>

      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,252,248,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(26,29,59,0.06)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => router.back()} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(26,29,59,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trip.title}</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--navy-muted)', margin: 0 }}>
            {trip.duration} ngày · {({ solo: 'Một mình', couple: 'Cặp đôi', family: 'Gia đình', friends: 'Nhóm bạn' } as Record<string, string>)[trip.companion] || 'Chuyến đi của bạn'}
            {weather && <span style={{ marginLeft: 8 }}>{weather.emoji} {weather.temp}°C</span>}
            {saving && <span style={{ marginLeft: 6, color: 'var(--coral)', fontStyle: 'italic' }}>Đang lưu...</span>}
          </p>
        </div>
        <button onClick={handleShare} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: shareSuccess ? 'rgba(76,175,80,0.1)' : 'rgba(26,29,59,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: shareSuccess ? '#4CAF50' : 'var(--navy)', fontSize: 14 }}>
          {shareSuccess ? '✓' : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>}
        </button>
      </div>

      {/* Primary actions: one clear editing path, one situational path, utilities on demand. */}
      {offlineSavedAt && <div role="status" style={{ padding: '4px 20px', fontSize: '.75rem', lineHeight: 1.6, color: 'var(--navy-muted)' }}>
        ✓ Bản offline · {new Date(offlineSavedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}.{' '}
        <a href={'/offline.html?trip=' + encodeURIComponent(String(params.id))} style={{ color: 'var(--coral)', fontWeight: 700 }}>Xem bản lưu</a>
      </div>}
      {!offlineSavedAt && !trip.is_shared && <p role="status" style={{ margin: '10px 20px', fontSize: '.78rem', lineHeight: 1.6, color: 'var(--navy-muted)' }}>
        Chưa lưu được lịch trên máy. Hãy cho phép trình duyệt lưu dữ liệu và <button onClick={() => window.location.reload()} style={{ border: 'none', background: 'none', padding: 0, color: 'var(--coral)', textDecoration: 'underline', cursor: 'pointer' }}>tải lại lịch</button> trước khi đi để có bản đọc khi mất mạng.
      </p>}
      <div ref={chatToolbarRef} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr .85fr', gap: 8, padding: '5px 20px 9px' }}>
        <button onClick={() => setChatOpen(true)} className="trip-compact-control" style={{ padding: '7px 8px', fontSize: '.78rem', whiteSpace: 'nowrap', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,var(--coral),var(--warm-orange))', color: 'white', fontWeight: 750, cursor: 'pointer' }}>🤖 Hỏi AI</button>
        <button onClick={() => { setAdaptError(''); setAdaptOpen(true); }} className="trip-compact-control" style={{ padding: '7px 8px', fontSize: '.78rem', whiteSpace: 'nowrap', border: '1px solid rgba(255,127,107,.22)', borderRadius: 12, background: 'rgba(255,127,107,.08)', color: 'var(--coral)', fontWeight: 750, cursor: 'pointer' }}>⚡ Đổi lịch</button>
        <button onClick={() => setToolsOpen(value => !value)} className="trip-compact-control" style={{ padding: '7px 8px', fontSize: '.78rem', whiteSpace: 'nowrap', border: '1px solid rgba(26,29,59,.09)', borderRadius: 12, background: 'white', color: 'var(--navy)', fontWeight: 700, cursor: 'pointer' }}>••• Thêm</button>
      </div>
      {toolsOpen && <div style={{ margin: '0 20px 12px', padding: 10, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, background: 'white', border: '1px solid rgba(26,29,59,.08)', borderRadius: 'var(--radius-md)' }}>
        <button onClick={handleCopy} style={{ padding: 9, border: 'none', background: 'rgba(26,29,59,.04)', borderRadius: 10, fontSize: '.75rem', fontWeight: 650 }}>{copied ? '✓ Đã sao chép' : '📋 Sao chép'}</button>
        <button onClick={() => setShowPacking(true)} style={{ padding: 9, border: 'none', background: 'rgba(26,29,59,.04)', borderRadius: 10, fontSize: '.75rem', fontWeight: 650 }}>🧳 Chuẩn bị</button>
        <button onClick={() => setShowEmergency(true)} style={{ padding: 9, border: 'none', background: 'rgba(239,68,68,.06)', color: '#B91C1C', borderRadius: 10, fontSize: '.75rem', fontWeight: 650 }}>🚨 Khẩn cấp</button>
      </div>}

      <WeatherWidget compact weather={weatherData} onRetry={refreshWeather} style={{ margin: '0 20px 8px' }} />
      {(weatherImpact.decision || weatherImpact.error) && <section aria-label="Thời tiết ảnh hưởng lịch trình" className="card trip-weather-impact" style={{ margin: '0 20px 8px', padding: '10px 12px' }}>
        {weatherImpact.decision ? <>
          <h2 style={{ fontSize: '.83rem', margin: 0 }}>{weatherImpact.decision.signals.includes('rain') ? 'Mưa ảnh hưởng phần lịch chưa đi' : 'Trời nóng, bạn nên cân nhắc nghỉ'}</h2>
          <p style={{ fontSize: '.78rem', lineHeight: 1.4, margin: '4px 0 8px', color: 'var(--navy-muted)' }}>{weatherImpact.decision.reason}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button className="btn-primary trip-compact-control" disabled={autoReplanLoading || adapting} onClick={() => { setAdaptOpen(true); setAdaptPreview(null); void checkAutomaticReplan(true); }}>Xem phương án</button>
            <button className="mood-chip trip-compact-control" onClick={weatherImpact.dismiss}>Giữ lịch hiện tại</button>
          </div>
        </> : <p role="status" style={{ fontSize: '.8rem', lineHeight: 1.6 }}>{weatherImpact.error} <button className="mood-chip" onClick={weatherImpact.retry}>Thử kiểm tra lại</button></p>}
      </section>}
      {/* Weather banner */}
      <details className="quiet-details trip-notes"><summary>Lưu ý chuyến đi</summary><p>Giờ đi và chi phí là dự kiến. Xác nhận giờ mở cửa và giá trước khi đi. <Link href="/profile/feedback">Báo thông tin chưa đúng</Link></p></details>
      {weather && !weatherDismissed && !weatherImpact.decision && <WeatherBanner weather={weather} onDismiss={() => setWeatherDismissed(true)} />}

      {feasibility && <FeasibilityAssistant compact
        feasibility={feasibility}
        activeDay={activeDay}
        measuredRoute={measuredRoute?.provider === 'google' && measuredRoute.itinerarySnapshot === itineraryFingerprint(trip.itinerary) ? measuredRoute : null}
        userLocation={userLocation} activities={allActivities}
        onReviewRoute={() => { setAdaptOpen(true); void checkAutomaticReplan(); }}
        expanded={showFeasibility}
        onToggle={() => setShowFeasibility(value => !value)}
        onPreview={previewFeasibilityOptimization}
        previewing={previewingFeasibility}
        preview={optimizationPreview}
        onApply={applyFeasibilityOptimization}
        applying={optimizingFeasibility}
        onCancelPreview={() => setOptimizationPreview(null)}
      />}

      {/* Tour toast notification */}
      {tourToast && (
        <div style={{ margin: '0 20px 12px', padding: '12px 14px', background: 'linear-gradient(135deg,rgba(59,130,246,0.08),rgba(59,130,246,0.03))', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', gap: 10, alignItems: 'center', animation: 'fadeIn 0.3s ease' }}>
          <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--navy)', lineHeight: 1.4 }}>{tourToast}</span>
          <button onClick={() => setTourToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--navy-muted)', padding: 0, flexShrink: 0 }}>×</button>
        </div>
      )}

      {/* Realtime distance to next activity */}
      {userLocation && (() => {
        const acts = trip.itinerary?.days?.[activeDay]?.activities || [];
        const now = new Date();
        const nowMin = getHueClock(now).minutes;
        const next = acts.find(a => {
          const [h, m] = (a.time || '').split(':').map(Number);
          return !isNaN(h) && (h * 60 + (m || 0)) >= nowMin && a.lat && a.lng;
        });
        if (!next || !next.lat || !next.lng) return null;
        const dist = haversine(userLocation.lat, userLocation.lng, next.lat, next.lng);
        return (
          <div style={{ margin: '0 20px 12px', padding: '10px 14px', background: 'rgba(59,130,246,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🧭</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy)', margin: '0 0 2px' }}>
                {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`} → {next.name}
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--navy-muted)', margin: 0 }}>{next.time} · {next.duration}</p>
            </div>
          </div>
        );
      })()}

      {/* Compact overview; details are progressive disclosure instead of separate cards. */}
      <section className="trip-overview-compact" style={{ margin: '0 20px 8px', padding: '8px 12px', background: 'white', border: '1px solid rgba(26,29,59,.08)', borderRadius: 'var(--radius-lg)' }}>
        <button className="trip-compact-control" aria-expanded={overviewOpen} onClick={() => setOverviewOpen(value => !value)} style={{ width: '100%', padding: 0, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer' }}>
          <span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, background: 'rgba(255,127,107,.1)' }}>🧭</span>
          <span style={{ flex: 1 }}><span style={{ display: 'block', fontWeight: 750, color: 'var(--navy)', fontSize: '.8rem' }}>Tổng quan chuyến đi</span><span style={{ display: 'block', marginTop: 1, color: 'var(--navy-muted)', fontSize: '.72rem' }}>{trip.duration} ngày · Dự kiến {trip.total_cost_estimate}</span></span>
          <span style={{ color: 'var(--navy-muted)' }}>{overviewOpen ? '⌃' : '⌄'}</span>
        </button>
        {overviewOpen && <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(26,29,59,.06)' }}>
          <p style={{ fontSize: '.8rem', color: 'var(--navy-muted)', lineHeight: 1.55, margin: 0 }}>{trip.summary}</p>
          {trip.highlights?.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>{trip.highlights.map(highlight => <span key={highlight} style={{ fontSize: '.72rem', fontWeight: 650, color: 'var(--navy)', background: 'rgba(26,29,59,.04)', padding: '4px 8px', borderRadius: 999 }}>📍 {highlight}</span>)}</div>}
          {trip.ai_insight && <p style={{ margin: '10px 0 0', padding: '9px 11px', background: 'rgba(212,175,55,.06)', borderRadius: 10, color: 'var(--navy)', fontSize: '.76rem', lineHeight: 1.5 }}>✨ {trip.ai_insight}</p>}
        </div>}
      </section>

      {/* Day tabs */}
      <div aria-label="Ngày trong hành trình" style={{ display: 'flex', overflowX: 'auto', padding: '0 20px', borderBottom: '1px solid rgba(26,29,59,0.06)' }}>
        {(trip.itinerary?.days || []).map((day, i) => (
          <button className="trip-compact-control" key={i} onClick={() => selectTripDay(i)} disabled={Boolean(token) && (progressStatus === 'loading' || progressStatus === 'saving' || progressStatus === 'error')}
            style={{ padding: '8px 14px', background: 'none', border: 'none', borderBottom: `2.5px solid ${activeDay === i ? 'var(--coral)' : 'transparent'}`, cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.8125rem', fontWeight: activeDay === i ? 700 : 500, color: activeDay === i ? 'var(--coral)' : 'var(--navy-muted)', whiteSpace: 'nowrap', transition: 'all 0.2s', marginBottom: -1 }}>
            Ngày {day.day}
          </button>
        ))}
      </div>

      {/* View toggle */}
      <div ref={tripViewControlsRef} aria-label="Chế độ xem hành trình" style={{ display: 'flex', margin: '6px 20px', background: 'rgba(26,29,59,0.05)', borderRadius: 'var(--radius-full)', padding: 3 }}>
        {(['timeline', 'map'] as const).map(mode => (
          <button className="trip-compact-control" aria-pressed={viewMode === mode} key={mode} onClick={() => setViewMode(mode)} style={{ flex: 1, padding: '7px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.8125rem', fontWeight: 600, borderRadius: 'var(--radius-full)', background: viewMode === mode ? 'white' : 'transparent', color: viewMode === mode ? 'var(--navy)' : 'var(--navy-muted)', boxShadow: viewMode === mode ? '0 1px 6px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>
            {mode === 'timeline' ? '📅 Lịch trình' : '🗺️ Bản đồ'}
          </button>
        ))}
      </div>

      {viewMode === 'timeline' && progressPanel}
      {viewMode === 'map' && <TripNavigation
        tripId={String(params.id)} dayIndex={activeDay} itinerarySnapshot={itineraryFingerprint(trip.itinerary)}
        activities={allActivities} completedIndexes={progress.completedActivityIndexes} token={token} initialTargetIndex={activeActivity}
        canStartNavigation={canTrack && activeDay === todayIndex}
        onLocation={(point: RoutePoint | null) => setUserLocation(point)}
        onMarkDone={toggleActivityDone} onRouteMeasured={setMeasuredRoute}
        onReviewSchedule={() => { setAdaptOpen(true); void checkAutomaticReplan(); }}
      />}
      {viewMode === 'map' && progressPanel}

      {viewMode === 'timeline' && currentDay && (
        <div style={{ padding: '0 20px' }}>
          <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', margin: '0 0 4px' }}>{currentDay.theme}</h2>
              {currentDay.day_tip && <p style={{ fontSize: '0.8rem', color: 'var(--navy-muted)', lineHeight: 1.5, margin: 0 }}>💡 {currentDay.day_tip}</p>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => { setPlaceSelected(null); setPlaceSuggestion(null); setSmartPlacement(true); setPlaceQuery(''); setPlaceTime('10:00'); setPlaceSearchOpen(true); searchPlaces(); }} style={{ padding: '7px 12px', background: 'linear-gradient(135deg,var(--coral),var(--warm-orange))', border: 'none', borderRadius: 'var(--radius-full)', fontSize: '0.78rem', fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                ＋ Chèn điểm phù hợp
              </button>
              <button onClick={() => openEdit(activeDay, null)} style={{ padding: '7px 12px', background: 'rgba(255,127,107,0.08)', border: '1px solid rgba(255,127,107,0.2)', borderRadius: 'var(--radius-full)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--coral)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                ✏️
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {allActivities.map((act, i) => {
              const isOpen = activeActivity === i;
              const isDone = progress.completedActivityIndexes.includes(i);
              return (
                <div key={i} style={{ display: 'flex' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, flexShrink: 0 }}>
                    <div onClick={() => setActiveActivity(isOpen ? null : i)} style={{ width: 38, height: 38, borderRadius: '50%', background: isOpen ? 'linear-gradient(135deg,var(--coral),var(--warm-orange))' : 'white', border: `2px solid ${isOpen ? 'transparent' : 'rgba(255,127,107,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, cursor: 'pointer', zIndex: 1 }}>{TYPE_EMOJI[act.type] || '📍'}</div>
                    {i < allActivities.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 20, background: 'rgba(255,127,107,0.15)', margin: '4px 0' }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 16 }}>
                    <button onClick={() => setActiveActivity(isOpen ? null : i)} style={{ width: '100%', textAlign: 'left', background: isOpen ? 'white' : 'transparent', border: `1.5px solid ${isOpen ? 'rgba(255,127,107,0.15)' : 'transparent'}`, borderRadius: 'var(--radius-md)', padding: '10px 14px', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.25s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--coral)' }}>{act.time}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--navy-muted)' }}>{act.duration}</span>
                      </div>
                      <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--navy)', margin: '0 0 2px' }}>{act.name}{isDone && <span style={{ marginLeft: 8, fontSize: '.72rem', color: '#166534' }}>✓ Đã đi</span>}</p>
                      {act.location && <p style={{ fontSize: '0.75rem', color: 'var(--navy-muted)', margin: 0 }}>📍 {act.location}</p>}
                    </button>
                    {isOpen && (
                      <div style={{ background: 'white', borderRadius: '0 0 var(--radius-md) var(--radius-md)', padding: '0 14px 14px', border: '1.5px solid rgba(255,127,107,0.15)', borderTop: 'none', marginTop: -4 }}>
                        {act.description && <p style={{ fontSize: '0.85rem', color: 'var(--navy-muted)', lineHeight: 1.6, margin: '12px 0 10px', paddingTop: 12, borderTop: '1px solid rgba(26,29,59,0.06)' }}>{act.description}</p>}
                        {act.ai_tip && (
                          <div style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: 12 }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--navy)', margin: 0 }}>✨ {act.ai_tip}</p>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--navy-muted)' }}>Chi phí</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: act.cost ? 'var(--navy)' : '#4CAF50' }}>{act.cost || 'Miễn phí'}</span>
                        </div>
                        {tripState && <button aria-pressed={isDone} disabled={!canTrack} onClick={() => toggleActivityDone(i)} style={{ width: '100%', marginBottom: 10, padding: 10, borderRadius: 12, border: '1px solid #b6cec0', color: '#166534', background: isDone ? '#eaf4ed' : 'white', cursor: canTrack ? 'pointer' : 'not-allowed', opacity: canTrack ? 1 : .6 }}>
                          {isDone ? 'Bỏ đánh dấu đã đi' : 'Đánh dấu đã đi xong'}
                        </button>}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <button onClick={() => { setActiveActivity(i); setViewMode('map'); }} style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", background: "linear-gradient(135deg,var(--coral),var(--warm-orange))", color: "white", borderRadius: "var(--radius-full)", fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer", border: "none" }}>🗺️ Chỉ đường trong app</button>
                          <button onClick={() => openEdit(activeDay, i)} style={{ flex: 1, padding: '10px', background: 'rgba(26,29,59,0.05)', border: '1px solid rgba(26,29,59,0.1)', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '0.8rem', color: 'var(--navy)', cursor: 'pointer', fontFamily: 'var(--font)' }}>✏️</button>
                          <button onClick={() => { if (confirm('Xóa hoạt động này?')) deleteActivity(activeDay, i); }} style={{ flex: 1, padding: '10px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '0.8rem', color: '#EF4444', cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑️</button>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {i > 0 && <button onClick={() => moveActivity(activeDay, i, -1)} style={{ flex: 1, padding: '6px', background: 'transparent', border: '1px solid rgba(26,29,59,0.08)', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--navy-muted)', cursor: 'pointer', fontFamily: 'var(--font)' }}>↑ Lên</button>}
                          {i < allActivities.length - 1 && <button onClick={() => moveActivity(activeDay, i, 1)} style={{ flex: 1, padding: '6px', background: 'transparent', border: '1px solid rgba(26,29,59,0.08)', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--navy-muted)', cursor: 'pointer', fontFamily: 'var(--font)' }}>↓ Xuống</button>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {allActivities.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--navy-muted)' }}>
                <p style={{ fontSize: '2rem', marginBottom: 8 }}>📭</p>
                <p style={{ fontWeight: 600, marginBottom: 12 }}>Ngày này chưa có hoạt động</p>
                <button onClick={() => openEdit(activeDay, null)} style={{ padding: '10px 20px', background: 'var(--coral)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>+ Thêm ngay</button>
              </div>
            )}
          </div>
        </div>
      )}
      <button aria-label={chatOpen ? "Đóng trợ lý" : "Mở trợ lý"} onClick={() => setChatOpen(v => !v)} style={{ position: 'fixed', bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', right: 'max(20px, calc((100vw - 720px) / 2 + 20px))', width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,var(--coral),var(--warm-orange))', border: 'none', boxShadow: '0 4px 20px rgba(255,127,107,0.4)', cursor: 'pointer', display: chatOpen || !chatEntryVisible ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', fontSize: 22, zIndex: 40 }}>
        {chatOpen ? '×' : '💬'}
      </button>
      {chatOpen && (
        <div style={{ position: 'fixed', bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))', right: 'max(16px, calc((100vw - 720px) / 2 + 16px))', width: 'min(360px, calc(100vw - 32px))', height: 'min(480px, calc(100dvh - 180px))', background: 'white', borderRadius: 'var(--radius-xl)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', zIndex: 60, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(26,29,59,0.06)', background: 'linear-gradient(135deg,var(--coral),var(--warm-orange))', color: 'white' }}>
            <p style={{ fontWeight: 700, margin: 0, fontSize: '0.9375rem' }}>🤖 Trợ lý lịch trình</p>
            <p style={{ fontSize: '0.75rem', margin: 0, opacity: 0.88 }}>Chỉnh lịch sau khi bạn xác nhận.</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chatMessages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--navy-muted)', paddingTop: 24 }}>
                <p style={{ fontSize: '2rem', marginBottom: 8 }}>👋</p>
                <p style={{ fontSize: '0.85rem' }}>Chào! Tôi có thể giúp gì cho chuyến đi của bạn?</p>

              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '82%', padding: '8px 12px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.role === 'user' ? 'linear-gradient(135deg,var(--coral),var(--warm-orange))' : 'rgba(26,29,59,0.05)', color: msg.role === 'user' ? 'white' : 'var(--navy)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  {msg.role === 'assistant' ? renderAiMarkdown(msg.content) : msg.content}
                  {msg.proposal && (
                    <div style={{ marginTop: 10, padding: 10, background: 'white', border: '1px solid rgba(255,127,107,.2)', borderRadius: 12 }}>
                      <p style={{ margin: '0 0 6px', fontSize: '.72rem', fontWeight: 800, color: 'var(--coral)' }}>BẢN XEM TRƯỚC</p>
                      {msg.proposal.summary.map(item => <p key={item} style={{ margin: '3px 0', fontSize: '.75rem', lineHeight: 1.4 }}>• {item}</p>)}
                      <button onClick={() => applyChatProposal(i, msg.proposal!)} disabled={customizing || msg.applied} style={{ width: '100%', marginTop: 8, padding: '8px 10px', border: 'none', borderRadius: 999, background: msg.applied ? 'rgba(34,197,94,.12)' : 'linear-gradient(135deg,var(--coral),var(--warm-orange))', color: msg.applied ? '#15803D' : 'white', fontWeight: 700, cursor: msg.applied ? 'default' : 'pointer' }}>
                        {msg.applied ? '✓ Đã áp dụng' : customizing ? 'Đang áp dụng…' : 'Xác nhận thay đổi'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && <div style={{ display: 'flex', gap: 4, padding: '8px 12px', width: 'fit-content' }}>{[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--coral)', animation: 'bounce 1s ease infinite', animationDelay: i * 0.2 + 's' }} />)}</div>}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-question-picker">
            <label htmlFor="trip-chat-question">Hỏi nhanh</label>
            <select id="trip-chat-question" value="" disabled={chatLoading} onChange={event => { if (event.target.value) setChatInput(event.target.value); }}>
              <option value="" disabled>Chọn câu hỏi gợi ý…</option>
              <optgroup label="Trong chuyến đi">
                {['Tiếp theo tôi đi đâu?', 'Hôm nay còn những điểm nào?', 'Tôi đang mệt, nên nghỉ ở đâu?'].map(q => <option key={q} value={q}>{q}</option>)}
              </optgroup>
              <optgroup label="Điều chỉnh lịch">
                {['Thêm một quán ăn gần tuyến', 'Dời hoạt động chiều muộn hơn', 'Trời mưa, gợi ý điểm trong nhà', 'Giảm bớt điểm để đi thư giãn hơn'].map(q => <option key={q} value={q}>{q}</option>)}
              </optgroup>
            </select>
          </div>
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(26,29,59,0.06)', display: 'flex', gap: 8 }}>
            <input aria-label="Câu hỏi cho trợ lý" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder='Nhập câu hỏi...' style={{ flex: 1, minWidth: 0, padding: '9px 14px', border: '1.5px solid rgba(26,29,59,0.1)', borderRadius: 'var(--radius-full)', fontFamily: 'var(--font)', fontSize: '0.875rem', outline: 'none', background: 'rgba(26,29,59,0.03)', color: 'var(--navy)' }} />
            <button aria-label="Gửi câu hỏi" onClick={sendChat} disabled={chatLoading || !chatInput.trim()} style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,var(--coral),var(--warm-orange))', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}
      {showEmergency && (
        <div onClick={() => setShowEmergency(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 'var(--radius-xl)', padding: '20px 20px 32px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', margin: 0 }}>🚨 Số Khẩn Cấp</h3>
              <button onClick={() => setShowEmergency(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--navy-muted)' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {EMERGENCY.map(e => (
                <a key={e.phone} href={'tel:' + e.phone} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)', textDecoration: 'none' }}>
                  <span style={{ fontSize: 24 }}>{e.icon}</span>
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--navy)', margin: 0, fontSize: '0.9rem' }}>{e.label}</p>
                    <p style={{ color: '#EF4444', fontWeight: 700, margin: 0, fontSize: '1rem' }}>{e.phone}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
      {adaptOpen && (
        <div onClick={() => { if (!adapting) { setAdaptOpen(false); setAdaptPreview(null); setAdaptError(''); } }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 16px' }}>
          <div onClick={event => event.stopPropagation()} style={{ width: '100%', maxWidth: 520, maxHeight: '85dvh', overflowY: 'auto', background: 'white', borderRadius: 'var(--radius-xl)', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div><p className="section-eyebrow">ĐIỀU CHỈNH CHUYẾN ĐI</p><h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>Chuyện gì vừa xảy ra?</h3><p style={{ fontSize: '.8rem', color: 'var(--navy-muted)', margin: '4px 0 0' }}>HueViVu chuẩn bị phương án cho ngày {activeDay + 1}. Bạn xem trước rồi chọn áp dụng hoặc giữ lịch cũ.</p></div>
              <button onClick={() => { setAdaptOpen(false); setAdaptPreview(null); setAdaptError(''); }} disabled={adapting} style={{ border: 'none', background: 'rgba(26,29,59,.06)', width: 34, height: 34, borderRadius: '50%', fontSize: 20 }}>×</button>
            </div>
            {locationNotice && <p role="status" style={{ fontSize: '.78rem', lineHeight: 1.6, color: 'var(--navy-muted)' }}>{locationNotice}</p>}
            <button onClick={() => checkAutomaticReplan()} disabled={autoReplanLoading || adapting} style={{ width: '100%', marginBottom: 10, padding: '11px 14px', border: '1px solid rgba(255,127,107,.25)', borderRadius: 'var(--radius-full)', background: 'rgba(255,127,107,.08)', color: 'var(--coral)', fontWeight: 800, cursor: 'pointer' }}>
              {autoReplanLoading ? '🔎 Đang kiểm tra thời tiết và lịch…' : '✨ HueViVu tự kiểm tra: Có nên đổi lịch không?'}
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              {[
                ['rain', '🌧️', 'Trời đang mưa', 'Đổi tối đa 3 điểm ngoài trời'],
                ['hungry', '🍜', 'Cả nhóm đang đói', 'Đưa bữa ăn lên hoặc chèn quán gần'],
                ['tired', '😮‍💨', 'Mọi người đã mệt', 'Giảm điểm và thêm 45 phút nghỉ'],
                ['closed', '🚪', 'Điểm này đóng cửa', activeActivity === null ? 'Mở hoạt động cần thay trước' : `Thay hoạt động số ${activeActivity + 1}`],
              ].map(([key, icon, title, description]) => (
                <button key={key} disabled={adapting || (key === 'closed' && activeActivity === null)} onClick={() => applyAdaptation(key as any)} style={{ padding: 14, textAlign: 'left', border: '1.5px solid rgba(26,29,59,.08)', borderRadius: 'var(--radius-md)', background: 'rgba(26,29,59,.02)', cursor: 'pointer', opacity: key === 'closed' && activeActivity === null ? .45 : 1 }}><span style={{ fontSize: 24 }}>{icon}</span><p style={{ fontWeight: 700, color: 'var(--navy)', margin: '7px 0 3px' }}>{title}</p><p style={{ fontSize: '.72rem', color: 'var(--navy-muted)', margin: 0, lineHeight: 1.4 }}>{description}</p></button>
              ))}
            </div>
            <div style={{ marginTop: 10, padding: 14, background: 'rgba(255,127,107,.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,127,107,.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><p style={{ fontWeight: 700, color: 'var(--navy)', margin: 0 }}>⏰ Tôi đang đến trễ</p><p style={{ fontSize: '.72rem', color: 'var(--navy-muted)', margin: '2px 0 0' }}>Lùi phần lịch còn lại, tự bỏ hoạt động vượt 22:00.</p></div><select value={delayMinutes} onChange={e => setDelayMinutes(Number(e.target.value))} style={{ padding: '7px 9px', border: '1px solid rgba(26,29,59,.12)', borderRadius: 10, background: 'white' }}><option value={30}>30 phút</option><option value={45}>45 phút</option><option value={60}>60 phút</option><option value={90}>90 phút</option></select></div>
              <button onClick={() => applyAdaptation('late')} disabled={adapting} style={{ width: '100%', marginTop: 10, padding: 10, border: 'none', borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg,var(--coral),var(--warm-orange))', color: 'white', fontWeight: 700 }}>{adapting ? 'Đang tính lại…' : `Xem phương án lùi ${delayMinutes} phút`}</button>
            </div>
            {adaptError && adaptError.includes('Chưa có điểm cùng loại') && <Link href="/explore" style={{ display: 'inline-block', marginTop: 8, fontSize: '.8rem', color: 'var(--coral)', fontWeight: 700 }}>Xem điểm khác rồi gọi xác nhận</Link>}
            {adaptError && adaptError.includes('Chưa tìm được điểm trong nhà') && <Link href="/explore?indoor=true" style={{ display: 'inline-block', marginTop: 8, fontSize: '.8rem', color: 'var(--coral)', fontWeight: 700 }}>Xem nơi trong nhà được ghi nhận</Link>}
            {adaptError && adaptError.includes('giờ ăn tối') && <Link href="/explore?cat=food&open=true" style={{ display: 'inline-block', marginTop: 8, fontSize: '.8rem', color: 'var(--coral)', fontWeight: 700 }}>Tìm nơi ăn đang mở, rồi gọi xác nhận</Link>}
            {adaptPreview && <div ref={adaptPreviewRef} tabIndex={-1} role="region" aria-label="Xem trước điều chỉnh" style={{ marginTop: 16, padding: 14, border: '1px solid rgba(255,127,107,.3)', borderRadius: 12 }}>
              <h4 style={{ marginBottom: 8 }}>Phương án cho ngày {adaptPreview.dayIndex + 1}</h4>
              {adaptPreview.decision?.reason && <p style={{ fontSize: '.78rem', color: 'var(--navy-muted)', marginBottom: 8 }}>💡 {adaptPreview.decision.reason}</p>}
              {adaptPreview.routeImpact && <p style={{ fontSize: '.78rem', color: 'var(--navy-muted)', marginBottom: 8 }}>Đường Google đến {adaptPreview.routeImpact.nextActivity}: khoảng {(adaptPreview.routeImpact.distanceMeters / 1000).toFixed(1)} km, {adaptPreview.routeImpact.durationMinutes} phút. {adaptPreview.routeImpact.replacement && <>Điểm thay thế {adaptPreview.routeImpact.replacement.destination}: khoảng {(adaptPreview.routeImpact.replacement.distanceMeters / 1000).toFixed(1)} km, {adaptPreview.routeImpact.replacement.durationMinutes} phút.</>}</p>}

              <p style={{ fontSize: '.8rem', marginBottom: 8 }}>Lịch hiện tại vẫn được giữ. Xem giờ và điểm đến mới rồi chọn áp dụng.</p>
              {adaptPreview.changes.map((change: string, i: number) => <p key={i} style={{ fontSize: '.8rem', marginBottom: 6 }}>{change}</p>)}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '.75rem' }}>
                <div><strong>Trước</strong>{adaptPreview.before.activities.map((a: any, i: number) => <p key={i}>{a.time} · {a.name}</p>)}</div>
                <div><strong>Sau</strong>{adaptPreview.itinerary.days[adaptPreview.dayIndex].activities.map((a: any, i: number) => <p key={i}>{a.time} · {a.name}</p>)}</div>
              </div>
              <button className="btn-primary" disabled={adapting} onClick={() => applyAdaptation(adaptPreview.input.scenario, true)} style={{ width: '100%', marginTop: 12 }}>{adapting ? 'Đang áp dụng…' : 'Áp dụng phương án này'}</button>
              <button className="btn-secondary" disabled={adapting} onClick={() => { setAdaptPreview(null); setAdaptError(''); }} style={{ width: '100%', marginTop: 8 }}>Hủy, giữ lịch hiện tại</button>
            </div>}
            {adaptError && <p style={{ margin: '10px 0 0', padding: '9px 12px', background: 'rgba(239,68,68,.08)', color: '#B91C1C', borderRadius: 10, fontSize: '.8rem' }}>{adaptError}</p>}
          </div>
        </div>
      )}
      {showPacking && (
        <div onClick={() => setShowPacking(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 'var(--radius-xl)', padding: '20px 20px 32px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', margin: 0 }}>🧳 Cần Chuẩn Bị Gì?</h3>
              <button onClick={() => setShowPacking(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--navy-muted)' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PACKING.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(26,29,59,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(26,29,59,0.06)' }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>✓</span>
                  <p style={{ fontSize: '0.875rem', color: 'var(--navy)', margin: 0 }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {customizeOpen && (
        <div onClick={() => setCustomizeOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'white', borderRadius: 'var(--radius-xl)', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', margin: 0 }}>🤖 Tuỳ Chỉnh AI</h3>
              <button onClick={() => setCustomizeOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--navy-muted)' }}>×</button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--navy-muted)', marginBottom: 12 }}>Mô tả những thay đổi bạn muốn AI thực hiện:</p>
            <textarea value={customizeText} onChange={e => setCustomizeText(e.target.value)} rows={3} placeholder='Ví dụ: Thêm bữa ăn sáng chợ Đông Ba...' style={{ width: '100%', padding: '10px 14px', border: '1.5px solid rgba(26,29,59,0.12)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.875rem', resize: 'none', outline: 'none', boxSizing: 'border-box', color: 'var(--navy)' }} />
            <button onClick={handleCustomize} disabled={customizing || !customizeText.trim()} style={{ width: '100%', marginTop: 12, padding: '12px', background: customizing ? 'rgba(26,29,59,0.1)' : 'linear-gradient(135deg,var(--coral),var(--warm-orange))', color: customizing ? 'var(--navy-muted)' : 'white', border: 'none', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '0.9375rem', cursor: customizing ? 'wait' : 'pointer', fontFamily: 'var(--font)' }}>
              {customizing ? '🔄 Đang xử lý...' : '🚀 Tuỳ Chỉnh Ngay'}
            </button>
          </div>
        </div>
      )}
      {editOpen && (
        <div onClick={() => setEditOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'white', borderRadius: 'var(--radius-xl)', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', margin: 0 }}>{editActIdx !== null ? '✏️ Sửa Hoạt Động' : '+ Thêm Hoạt Động'}</h3>
              <button onClick={() => setEditOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--navy-muted)' }}>×</button>
            </div>
            {([
              { label: 'Tên hoạt động *', key: 'name', type: 'text', placeholder: 'Ví dụ: Thăm Kinh Thành Huế', },
              { label: 'Giờ bắt đầu', key: 'time', type: 'select', placeholder: '', options: TIMES, },
              { label: 'Loại', key: 'type', type: 'select', placeholder: '', options: Object.keys(TYPE_EMOJI), },
              { label: 'Thời gian', key: 'duration', type: 'text', placeholder: 'Ví dụ: 2 giờ', },
              { label: 'Chi phí', key: 'cost', type: 'text', placeholder: 'Miễn phí / 50.000 VND', },
              { label: 'Địa điểm', key: 'location', type: 'text', placeholder: 'Tên đường / phường', },
              { label: 'Mô tả', key: 'description', type: 'textarea', placeholder: 'Mô tả ngắn...', },
              { label: 'Tips AI', key: 'ai_tip', type: 'text', placeholder: 'Lời khuyên hữiu ích...', },
            ] as any[]).map(field => (
              <div key={field.key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy-muted)', marginBottom: 4 }}>{field.label}</label>
                {field.type === 'select' ? (
                  <select value={(editAct as any)[field.key] || ''} onChange={e => setEditAct(p => ({ ...p, [field.key]: e.target.value }))} style={{ width: '100%', padding: '9px 14px', border: '1.5px solid rgba(26,29,59,0.12)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.875rem', outline: 'none', background: 'white', color: 'var(--navy)' }}>
                    {field.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea value={(editAct as any)[field.key] || ''} onChange={e => setEditAct(p => ({ ...p, [field.key]: e.target.value }))} rows={2} placeholder={field.placeholder} style={{ width: '100%', padding: '9px 14px', border: '1.5px solid rgba(26,29,59,0.12)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.875rem', resize: 'none', outline: 'none', boxSizing: 'border-box', color: 'var(--navy)' }} />
                ) : (
                  <input value={(editAct as any)[field.key] || ''} onChange={e => setEditAct(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} style={{ width: '100%', padding: '9px 14px', border: '1.5px solid rgba(26,29,59,0.12)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', color: 'var(--navy)' }} />
                )}
              </div>
            ))}
            <button onClick={confirmEdit} disabled={!editAct.name?.trim()} style={{ width: '100%', marginTop: 8, padding: '12px', background: editAct.name?.trim() ? 'linear-gradient(135deg,var(--coral),var(--warm-orange))' : 'rgba(26,29,59,0.1)', color: editAct.name?.trim() ? 'white' : 'var(--navy-muted)', border: 'none', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '0.9375rem', cursor: editAct.name?.trim() ? 'pointer' : 'not-allowed', fontFamily: 'var(--font)' }}>
              {editActIdx !== null ? 'Lưu Thay Đổi' : 'Thêm Hoạt Động'}
            </button>
          </div>
        </div>
      )}

      {/* Place Search bottom sheet */}
      {placeSearchOpen && (
        <div onClick={() => setPlaceSearchOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: 'white', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', padding: '20px', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
            {placeOk ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, padding: '32px 0' }}>
                <span style={{ fontSize: 48 }}>✅</span>
                <p style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '1rem', margin: 0 }}>Đã thêm vào lịch trình!</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--navy-muted)', margin: 0 }}>{placeSelected?.name}</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div><h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', margin: 0 }}>Chèn địa điểm vào Ngày {activeDay + 1}</h3><p style={{ margin: '3px 0 0', color: 'var(--navy-muted)', fontSize: '.74rem' }}>Ưu tiên điểm gần tuyến và khoảng trống đủ thời gian.</p></div>
                  <button onClick={() => setPlaceSearchOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--navy-muted)' }}>×</button>
                </div>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <input
                    autoFocus
                    value={placeQuery}
                    onChange={e => { setPlaceQuery(e.target.value); searchPlaces(e.target.value); }}
                    placeholder="Tìm: bún bò, Kinh Thành, cà phê..."
                    style={{ width: '100%', padding: '11px 14px 11px 40px', border: '1.5px solid rgba(26,29,59,0.15)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: 'var(--navy)' }}
                  />
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>🔍</span>
                </div>
                {!placeSelected && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {([['🏛️','heritage','Di sản'],['🍜','food','Ăn uống'],['☕','cafe','Cà phê'],['🌿','nature','Thiên nhiên'],['🛕','temple','Chùa'],['🎨','craft_village','Làng nghề']] as [string,string,string][]).map(([icon, cat, label]) => (
                      <button key={cat} onClick={() => { setPlaceQuery(''); searchPlaces('', cat); }} style={{ padding: '6px 12px', background: 'rgba(26,29,59,0.05)', border: '1px solid rgba(26,29,59,0.1)', borderRadius: 'var(--radius-full)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--navy)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        {icon} {label}
                      </button>
                    ))}
                  </div>
                )}
                {!placeSelected && (
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {placeResults.map((p: any) => (
                      <button key={p.id} onClick={() => selectPlace(p)} style={{ display: 'flex', gap: 12, padding: '10px 12px', background: 'rgba(26,29,59,0.02)', border: '1.5px solid rgba(26,29,59,0.08)', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', alignItems: 'center' }}>
                        {p.img ? <img src={p.img} alt={p.name} style={{ width: 52, height: 52, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }} /> : <span style={{ width: 52, height: 52, borderRadius: 'var(--radius-sm)', background: 'rgba(255,127,107,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{TYPE_EMOJI[p.category] || '📍'}</span>}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--navy)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--navy-muted)', margin: '0 0 4px' }}>{p.address || 'Huế'}</p>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {p.rating && <span style={{ fontSize: '0.72rem', color: '#F59E0B', fontWeight: 700 }}>⭐ {p.rating}</span>}
                            {p.price && <span style={{ fontSize: '0.72rem', color: 'var(--navy-muted)' }}>💰 {p.price}</span>}
                            {p.duration && <span style={{ fontSize: '0.72rem', color: 'var(--navy-muted)' }}>⏱ {p.duration}</span>}
                            {p.route_distance_km != null && <span style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 700 }}>↗ {p.route_distance_km.toFixed(1)} km từ tuyến</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: 18, flexShrink: 0, opacity: 0.5 }}>›</span>
                      </button>
                    ))}
                    {placeQuery && placeResults.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--navy-muted)', fontSize: '0.85rem' }}>Không tìm thấy địa điểm phù hợp</div>
                    )}
                  </div>
                )}
                {placeSelected && (
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <button onClick={() => setPlaceSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--coral)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', padding: '0 0 10px', fontFamily: 'var(--font)' }}>← Chọn lại</button>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16, padding: '12px', background: 'rgba(255,127,107,0.05)', borderRadius: 'var(--radius-md)', border: '1.5px solid rgba(255,127,107,0.15)' }}>
                      {placeSelected.img ? <img src={placeSelected.img} alt={placeSelected.name} style={{ width: 56, height: 56, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }} /> : <span style={{ width: 56, height: 56, background: 'rgba(255,127,107,0.1)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{TYPE_EMOJI[placeSelected.category] || '📍'}</span>}
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)', margin: '0 0 2px' }}>{placeSelected.name}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--navy-muted)', margin: '0 0 4px' }}>{placeSelected.address || 'Huế'}</p>
                        {placeSelected.description && <p style={{ fontSize: '0.75rem', color: 'var(--navy-muted)', margin: 0, lineHeight: 1.4 }}>{placeSelected.description.slice(0, 80)}{placeSelected.description.length > 80 ? '...' : ''}</p>}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                      <button onClick={() => setSmartPlacement(true)} style={{ padding: '9px 10px', borderRadius: 12, border: `1.5px solid ${smartPlacement ? 'var(--coral)' : 'rgba(26,29,59,.1)'}`, background: smartPlacement ? 'rgba(255,127,107,.08)' : 'white', color: smartPlacement ? 'var(--coral)' : 'var(--navy)', fontWeight: 700 }}>✨ Chèn thông minh</button>
                      <button onClick={() => setSmartPlacement(false)} style={{ padding: '9px 10px', borderRadius: 12, border: `1.5px solid ${!smartPlacement ? 'var(--coral)' : 'rgba(26,29,59,.1)'}`, background: !smartPlacement ? 'rgba(255,127,107,.08)' : 'white', color: !smartPlacement ? 'var(--coral)' : 'var(--navy)', fontWeight: 700 }}>🕐 Tự chọn giờ</button>
                    </div>

                    {smartPlacement ? (
                      <div style={{ padding: '12px 14px', marginBottom: 14, borderRadius: 'var(--radius-md)', background: placeSuggestion?.feasible ? 'rgba(34,197,94,.08)' : 'rgba(245,158,11,.08)', border: `1px solid ${placeSuggestion?.feasible ? 'rgba(34,197,94,.2)' : 'rgba(245,158,11,.22)'}` }}>
                        {suggestionLoading ? <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--navy-muted)' }}>Đang tính khoảng trống và quãng đường…</p> : <>
                          <p style={{ margin: '0 0 4px', fontWeight: 800, color: placeSuggestion?.feasible ? '#15803D' : '#B45309', fontSize: '.84rem' }}>{placeSuggestion?.feasible ? `Đề xuất ${placeSuggestion.time} · Ngày ${activeDay + 1}` : 'Chưa tìm được vị trí chèn an toàn'}</p>
                          <p style={{ margin: 0, fontSize: '.75rem', lineHeight: 1.45, color: 'var(--navy-muted)' }}>{placeSuggestion?.reason || 'Đang phân tích lịch trình.'}</p>
                        </>}
                      </div>
                    ) : <>
                      <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>CHỌN GIỜ GHÉ THĂM</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                        {TIMES.map(t => {
                          const busy = busyAt(t);
                          return <button key={t} onClick={() => !busy && setPlaceTime(t)} disabled={!!busy} style={{ padding: '7px 13px', background: placeTime === t ? 'var(--coral)' : busy ? 'rgba(26,29,59,0.03)' : 'white', color: placeTime === t ? 'white' : busy ? 'rgba(26,29,59,0.25)' : 'var(--navy)', border: `1.5px solid ${placeTime === t ? 'var(--coral)' : busy ? 'rgba(26,29,59,0.06)' : 'rgba(26,29,59,0.12)'}`, borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>{busy ? '🔒 ' : ''}{t}</button>;
                        })}
                      </div>
                      {busyAt(placeTime) && <p style={{ fontSize: '0.75rem', color: '#EF4444', marginBottom: 12 }}>⚠️ Giờ này gần với &quot;{busyAt(placeTime)?.name}&quot; — chọn giờ khác</p>}
                    </>}
                    <button onClick={handleAddPlace} disabled={placeAdding || (smartPlacement ? !placeSuggestion?.feasible : !!busyAt(placeTime))} style={{ width: '100%', padding: '13px', background: (!placeAdding && (smartPlacement ? placeSuggestion?.feasible : !busyAt(placeTime))) ? 'linear-gradient(135deg,var(--coral),var(--warm-orange))' : 'rgba(26,29,59,0.1)', color: (!placeAdding && (smartPlacement ? placeSuggestion?.feasible : !busyAt(placeTime))) ? 'white' : 'var(--navy-muted)', border: 'none', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                      {placeAdding ? 'Đang chèn…' : `Thêm vào ${smartPlacement ? placeSuggestion?.time || 'vị trí phù hợp' : placeTime} · Ngày ${activeDay + 1}`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

