'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, ChevronLeft, MapPin, Mic, MicOff, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { useRouter } from 'next/navigation';

type GuideMode = 'identify' | 'story' | 'practical' | 'next';
const MODES: { key: GuideMode; label: string; prompt: string }[] = [
  { key: 'identify', label: '👁 Nhận diện', prompt: 'Đây là gì? Hãy nhận diện và giải thích ngắn gọn.' },
  { key: 'story', label: '📖 Kể chuyện', prompt: 'Kể cho tôi câu chuyện văn hóa hoặc lịch sử liên quan đến thứ đang thấy.' },
  { key: 'practical', label: '🎒 Mẹo tham quan', prompt: 'Tôi cần biết những thông tin thực tế nào trước khi tham quan?' },
  { key: 'next', label: '🧭 Đi đâu tiếp', prompt: 'Từ đây, tôi nên làm gì hoặc đi đâu tiếp theo?' },
];

export default function HueViVuLivePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef('');

  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [mode, setMode] = useState<GuideMode>('identify');
  const [status, setStatus] = useState<'idle' | 'listening' | 'analyzing' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [weather, setWeather] = useState<any>(null);
  const [nearby, setNearby] = useState<any[]>([]);

  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { fetch('/api/weather').then(r => r.json()).then(setWeather).catch(() => {}); }, []);
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    window.speechSynthesis?.cancel();
  }, []);

  const setupSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.continuous = false; recognition.interimResults = true; recognition.lang = 'vi-VN';
    recognition.onresult = (event: any) => {
      let text = '';
      for (let i = event.resultIndex; i < event.results.length; i++) text += event.results[i][0].transcript;
      setTranscript(text);
    };
    recognition.onend = () => {
      if (status === 'listening') analyze(transcriptRef.current || MODES.find(item => item.key === mode)!.prompt);
    };
    recognition.onerror = () => { setStatus('idle'); setError('Không nghe rõ. Bạn có thể dùng các nút hỏi nhanh bên dưới.'); };
    recognitionRef.current = recognition;
  };

  const startGuide = async () => {
    setStarting(true); setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setupSpeechRecognition();
      setStarted(true);
      navigator.geolocation?.getCurrentPosition(pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => {});
    } catch {
      setError('Không thể mở camera. Hãy cấp quyền camera hoặc kiểm tra thiết bị rồi thử lại.');
    } finally { setStarting(false); }
  };

  const captureFrame = () => {
    const video = videoRef.current; const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return null;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.78);
  };

  const speak = (text: string) => {
    if (muted || !window.speechSynthesis) { setStatus('idle'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN'; utterance.rate = 1.02;
    utterance.onend = () => setStatus('idle'); utterance.onerror = () => setStatus('idle');
    setStatus('speaking'); window.speechSynthesis.speak(utterance);
  };

  const analyze = async (prompt: string, selectedMode = mode) => {
    const image = captureFrame();
    if (!image) { setError('Camera chưa sẵn sàng. Hãy giữ máy ổn định và thử lại.'); return; }
    setStatus('analyzing'); setError(''); setReply('');
    try {
      const response = await fetch('/api/vision', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, prompt, mode: selectedMode, lat: location?.lat, lng: location?.lng, weather: weather ? `${weather.condition_vi}, ${weather.temp}°C` : '' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Live Guide chưa phản hồi');
      setReply(data.reply); setNearby(data.nearby || []); speak(data.reply);
    } catch (cause: any) { setStatus('idle'); setError(cause.message); }
  };

  const startListening = () => {
    if (!recognitionRef.current) { setError('Trình duyệt này chưa hỗ trợ nhận giọng nói. Hãy dùng nút hỏi nhanh.'); return; }
    setTranscript(''); setReply(''); setError(''); setStatus('listening');
    try { recognitionRef.current.start(); } catch { setStatus('idle'); }
  };
  const stopListening = () => recognitionRef.current?.stop();

  return (
    <main className="relative min-h-screen bg-[#10131f] text-white overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted className={`fixed inset-0 w-full h-full object-cover transition-opacity ${started ? 'opacity-70' : 'opacity-20'}`} />
      <canvas ref={canvasRef} className="hidden" />
      <div className="fixed inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90 pointer-events-none" />

      <header className="relative z-20 p-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center"><ChevronLeft /></button>
        <div className="text-center"><p className="text-[10px] tracking-[0.25em] text-amber-300">HUEVIVU</p><h1 className="font-bold">Live Guide</h1></div>
        <button onClick={() => { setMuted(value => !value); window.speechSynthesis?.cancel(); }} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>
      </header>

      {!started ? (
        <section className="relative z-10 min-h-[78vh] flex items-center justify-center px-6">
          <div className="max-w-md text-center bg-black/45 backdrop-blur-xl border border-white/15 rounded-3xl p-7">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center text-black"><Camera size={30} /></div>
            <h2 className="text-2xl font-bold mt-5">Khám phá Huế ngay trước mắt</h2>
            <p className="text-white/70 text-sm leading-6 mt-3">Hướng camera vào công trình, hiện vật hoặc bảng tên. Live Guide đối chiếu với kho dữ liệu đã kiểm chứng để kể chuyện và đưa mẹo thực tế.</p>
            <div className="grid grid-cols-2 gap-2 mt-5 text-left text-xs text-white/75"><span className="bg-white/10 rounded-xl p-3">👁 Nhận diện có kiểm chứng</span><span className="bg-white/10 rounded-xl p-3">📖 Kể chuyện theo ngữ cảnh</span><span className="bg-white/10 rounded-xl p-3">🎒 Giờ, giá và mẹo</span><span className="bg-white/10 rounded-xl p-3">🧭 Gợi ý điểm tiếp theo</span></div>
            <button onClick={startGuide} disabled={starting} className="w-full mt-6 py-3.5 bg-white text-gray-950 font-bold rounded-full disabled:opacity-60">{starting ? 'Đang mở camera…' : 'Bắt đầu Live Guide'}</button>
            <p className="text-[11px] text-white/45 mt-3">Camera và vị trí chỉ được xin quyền sau khi bạn bấm bắt đầu.</p>
            {error && <p className="text-sm text-red-200 bg-red-500/20 rounded-xl p-3 mt-4">{error}</p>}
          </div>
        </section>
      ) : (
        <>
          <section className="relative z-10 px-4 pt-2">
            <div className="flex gap-2 overflow-x-auto pb-2">{MODES.map(item => <button key={item.key} onClick={() => setMode(item.key)} className={`shrink-0 px-3 py-2 rounded-full text-xs font-semibold border ${mode === item.key ? 'bg-white text-gray-950 border-white' : 'bg-black/35 border-white/20'}`}>{item.label}</button>)}</div>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/75"><MapPin size={14} className="text-amber-300" /><span>{location ? 'Đã dùng vị trí để tìm dữ liệu gần bạn' : 'Chưa có vị trí — vẫn có thể nhận diện bằng ảnh'}</span>{weather && <span className="ml-auto">{weather.condition_emoji} {weather.temp}°C</span>}</div>
          </section>

          <section className="relative z-10 min-h-[42vh] flex items-center justify-center pointer-events-none">
            <div className={`w-64 h-64 rounded-3xl border-2 ${status === 'analyzing' ? 'border-amber-300 animate-pulse' : 'border-white/35'} relative`}><span className="absolute -top-7 left-0 text-xs text-white/65">Đặt chủ thể vào khung</span><span className="absolute inset-0 m-auto w-2 h-2 bg-amber-300 rounded-full" /></div>
          </section>

          <section className="relative z-20 px-4 pb-32 space-y-3">
            {(reply || transcript || error) && <div className="bg-black/65 backdrop-blur-xl border border-white/15 rounded-2xl p-4">
              {transcript && <p className="text-xs text-white/50 mb-2">Bạn hỏi: “{transcript}”</p>}
              {reply && <p className="text-sm leading-6">{reply}</p>}
              {error && <p className="text-sm text-red-200">{error}</p>}
              {nearby.length > 0 && <div className="mt-3 pt-3 border-t border-white/10"><p className="text-[10px] uppercase tracking-widest text-amber-300 mb-2">Dữ liệu gần bạn</p><div className="flex gap-2 overflow-x-auto">{nearby.slice(0, 3).map(place => <span key={place.id} className="shrink-0 text-xs px-3 py-2 bg-white/10 rounded-lg">{place.name}{place.distance_km != null ? ` · ${place.distance_km.toFixed(1)} km` : ''}</span>)}</div></div>}
            </div>}
            <div className="grid grid-cols-2 gap-2">{MODES.map(item => <button key={item.key} onClick={() => { setMode(item.key); analyze(item.prompt, item.key); }} disabled={status !== 'idle'} className="bg-black/50 backdrop-blur border border-white/15 rounded-xl p-3 text-left text-xs font-semibold disabled:opacity-50">{item.label}</button>)}</div>
          </section>

          <div className="fixed bottom-6 inset-x-0 z-30 flex justify-center">
            <button onClick={status === 'listening' ? stopListening : startListening} disabled={status === 'analyzing' || status === 'speaking'} className={`w-20 h-20 rounded-full border-4 border-white/30 shadow-2xl flex items-center justify-center ${status === 'listening' ? 'bg-red-500' : status === 'analyzing' ? 'bg-amber-400 text-black animate-pulse' : 'bg-white text-gray-950'} disabled:opacity-70`}>
              {status === 'listening' ? <MicOff size={30} /> : status === 'analyzing' ? <Sparkles size={30} /> : <Mic size={30} />}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
