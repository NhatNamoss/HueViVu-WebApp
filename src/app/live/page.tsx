'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Square, Volume2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HueViVuLivePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'analyzing' | 'speaking'>('idle');
  
  const recognitionRef = useRef<any>(null);

  // Initialize Camera
  useEffect(() => {
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    }
    setupCamera();

    // Initialize SpeechRecognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'vi-VN';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognition.onspeechend = () => {
          recognition.stop();
        };

        recognition.onend = () => {
          // If we were recording and it ended automatically, handle it
          if (isRecording) {
            handleSpeechEnd();
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Trình duyệt không hỗ trợ Web Speech API.");
      return;
    }

    if (isRecording) {
      // Stop recording manually
      setIsRecording(false);
      recognitionRef.current.stop();
      handleSpeechEnd();
    } else {
      // Start recording
      setIsRecording(true);
      setTranscript('');
      setAiResponse('');
      setStatus('listening');
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Speech recognition error:", e);
      }
    }
  };

  const captureFrame = (): string | null => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.8);
      }
    }
    return null;
  };

  const handleSpeechEnd = async () => {
    setIsRecording(false);
    setStatus('analyzing');
    
    // Fallback if no transcript
    const promptText = transcript.trim() || "Đây là vật gì?";
    
    const base64Image = captureFrame();
    
    if (!base64Image) {
      setAiResponse("Lỗi: Không thể chụp ảnh từ camera.");
      setStatus('idle');
      return;
    }

    try {
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64Image, 
          prompt: promptText
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setAiResponse(data.reply);
        speakResponse(data.reply);
      } else {
        setAiResponse("Lỗi từ server: " + data.error);
        setStatus('idle');
      }
    } catch (err) {
      console.error(err);
      setAiResponse("Lỗi kết nối tới AI.");
      setStatus('idle');
    }
  };

  const speakResponse = (text: string) => {
    setStatus('speaking');
    
    // Sử dụng Google Translate TTS API không chính thức (Zero Cost, Giọng Việt chuẩn)
    // Phân tách text thành các đoạn ngắn (Google TTS giới hạn ký tự)
    let chunks: string[] = Array.from(text.match(/[^.?!]+[.?!]*/g) || [text]);
    chunks = chunks.map(c => c.trim()).filter(c => c.length > 0);
    let currentChunk = 0;

    const playNextChunk = () => {
      if (currentChunk >= chunks.length) {
        setStatus('idle');
        return;
      }
      
      const chunkText = chunks[currentChunk];
      const url = `/api/tts?text=${encodeURIComponent(chunkText)}`;
      
      const audio = new Audio(url);
      audio.playbackRate = 1.25; // Tăng tốc độ đọc lên một chút
      audio.onended = () => {
        currentChunk++;
        playNextChunk();
      };
      audio.onerror = (e) => {
        console.error("Google TTS Playback Error:", e);
        // Fallback to next chunk if one fails
        currentChunk++;
        playNextChunk();
      };
      
      audio.play().catch(e => {
        console.error("Audio Play Error:", e);
        setStatus('idle');
      });
    };

    playNextChunk();
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-sans">
      {/* Video Background */}
      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted 
        className="absolute inset-0 w-full h-full object-cover opacity-80"
      />
      
      {/* Hidden Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-white hover:text-gray-300 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <Link href="/" className="text-white text-sm font-semibold tracking-wider">
            HUEVIVU
          </Link>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-white/10 backdrop-blur-md">
          <div className={`w-2 h-2 rounded-full ${status === 'listening' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
          <span className="text-white/80 text-xs font-medium uppercase tracking-widest">
            {status === 'idle' ? 'Live' : status === 'listening' ? 'Listening' : status === 'analyzing' ? 'Analyzing' : 'Speaking'}
          </span>
        </div>
      </div>

      {/* AI Radar/Focus Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="w-64 h-64 border-2 border-white/20 rounded-full flex items-center justify-center relative">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          {status === 'analyzing' && (
            <div className="absolute inset-0 border-2 border-[#D4AF37] rounded-full animate-ping opacity-50"></div>
          )}
          {status === 'speaking' && (
             <div className="absolute inset-0 flex items-center justify-center gap-2">
                <div className="w-1 h-12 bg-white/40 rounded-full animate-pulse"></div>
                <div className="w-1 h-20 bg-white/60 rounded-full animate-pulse delay-75"></div>
                <div className="w-1 h-12 bg-white/40 rounded-full animate-pulse delay-150"></div>
             </div>
          )}
        </div>
      </div>

      {/* Transcript & Response Area */}
      <div className="absolute bottom-32 inset-x-0 px-6 flex flex-col items-center text-center z-10">
        {transcript && (
          <div className="mb-4 max-w-sm">
            <p className="text-white/90 text-lg font-medium drop-shadow-md">
              "{transcript}"
            </p>
          </div>
        )}
        
        {aiResponse && (
          <div className="max-w-md bg-black/60 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">AI Guide</span>
            </div>
            <p className="text-white/90 text-sm leading-relaxed text-left">
              {aiResponse}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-10 inset-x-0 flex justify-center z-20">
        <button 
          onClick={toggleRecording}
          disabled={status === 'analyzing' || status === 'speaking'}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5)]
            ${isRecording ? 'bg-red-500 scale-110' : 'bg-white/10 backdrop-blur-md border-2 border-white/30 hover:bg-white/20 hover:scale-105'}
            ${(status === 'analyzing' || status === 'speaking') ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isRecording ? (
            <Square className="w-8 h-8 text-white fill-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}
