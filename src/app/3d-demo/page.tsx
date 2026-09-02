'use client';

import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Text, Html, PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Hook để bắt sự kiện bàn phím (WASD)
const usePlayerControls = () => {
  const [movement, setMovement] = React.useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': setMovement((m) => ({ ...m, forward: true })); break;
        case 'KeyS': setMovement((m) => ({ ...m, backward: true })); break;
        case 'KeyA': setMovement((m) => ({ ...m, left: true })); break;
        case 'KeyD': setMovement((m) => ({ ...m, right: true })); break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': setMovement((m) => ({ ...m, forward: false })); break;
        case 'KeyS': setMovement((m) => ({ ...m, backward: false })); break;
        case 'KeyA': setMovement((m) => ({ ...m, left: false })); break;
        case 'KeyD': setMovement((m) => ({ ...m, right: false })); break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return movement;
};

// Component Nhân vật (Player) ở chế độ FPS
const SPEED = 5;
function Player() {
  const { forward, backward, left, right } = usePlayerControls();
  const { camera, gl } = useThree();
  
  // Các vector trung gian để tính toán
  const direction = new THREE.Vector3();
  const frontVector = new THREE.Vector3();
  const sideVector = new THREE.Vector3();

  // Xử lý vuốt màn hình (Touch) để xoay camera trên Mobile
  React.useEffect(() => {
    let isDragging = false;
    let previousTouch: Touch | null = null;

    const onTouchStart = (e: TouchEvent) => {
      isDragging = true;
      previousTouch = e.touches[0];
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || !previousTouch) return;
      const touch = e.touches[0];
      const movementX = touch.clientX - previousTouch.clientX;
      const movementY = touch.clientY - previousTouch.clientY;
      
      const euler = new THREE.Euler(0, 0, 0, 'YXZ');
      euler.copy(camera.rotation);
      
      euler.y -= movementX * 0.005;
      euler.x -= movementY * 0.005;
      euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
      
      camera.rotation.copy(euler);
      previousTouch = touch;
    };

    const onTouchEnd = () => {
      isDragging = false;
      previousTouch = null;
    };

    gl.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    gl.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
    gl.domElement.addEventListener('touchend', onTouchEnd);
    gl.domElement.addEventListener('touchcancel', onTouchEnd);

    return () => {
      gl.domElement.removeEventListener('touchstart', onTouchStart);
      gl.domElement.removeEventListener('touchmove', onTouchMove);
      gl.domElement.removeEventListener('touchend', onTouchEnd);
      gl.domElement.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    // Tính toán vector di chuyển theo hướng camera
    frontVector.set(0, 0, Number(backward) - Number(forward));
    sideVector.set(Number(left) - Number(right), 0, 0);
    
    direction.subVectors(frontVector, sideVector).normalize().multiplyScalar(SPEED * delta).applyEuler(camera.rotation);

    // Bỏ qua trục Y để chỉ đi bộ trên mặt đất
    // Dùng += để sửa lỗi bị ngược hướng (trái/phải, trước/sau)
    camera.position.x += direction.x;
    camera.position.z += direction.z;
    // Cố định độ cao mắt nhìn (ví dụ 1.5m)
    camera.position.y = 1.5;
  });

  return <PointerLockControls />;
}

function InteractiveMarker({ position, title, description, audioSrc }: { position: [number, number, number], title: string, description: string, audioSrc?: string }) {
  const [hovered, setHovered] = React.useState(false);
  const [clicked, setClicked] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [progress, setProgress] = React.useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClick = (e: any) => {
    e.stopPropagation(); // Ngăn sự kiện click lan truyền
    setClicked(!clicked);
  };

  // Tự động play/pause audio khi click
  React.useEffect(() => {
    if (audioRef.current) {
      if (clicked) {
        setIsPlaying(true);
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      } else {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setProgress(0);
      }
    }
  }, [clicked]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <group position={position} onPointerMissed={() => setClicked(false)}>
      {/* Nút chấm tròn (Label) */}
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
        onClick={handleClick}
        scale={hovered ? 1.2 : 1}
      >
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial color={hovered ? "#FFF" : "#D4AF37"} emissive={hovered ? "#FFF" : "#D4AF37"} emissiveIntensity={0.6} roughness={0.2} metalness={0.8} />
      </mesh>
      
      {/* Hiệu ứng toả sáng (Pulse) */}
      <mesh>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshBasicMaterial color="#D4AF37" transparent opacity={0.2} />
      </mesh>

      {/* Ô thuyết minh (Panel) */}
      {clicked && (
        <Html position={[0.4, 0.1, 0]} center zIndexRange={[100, 0]}>
          <div className="w-80 p-5 bg-black/85 backdrop-blur-xl border border-[#D4AF37]/50 rounded-2xl text-white shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-300 pointer-events-auto flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-[#D4AF37] font-bold text-lg">{title}</h3>
              <button onClick={(e) => { e.stopPropagation(); setClicked(false); }} className="text-white/50 hover:text-white transition w-6 h-6 flex items-center justify-center rounded-full bg-white/10 shrink-0">✕</button>
            </div>
            <p className="text-sm text-white/90 mb-2 leading-relaxed">{description}</p>
            
            {audioSrc && (
              <div className="mt-3 p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3 backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
                <audio ref={audioRef} src={audioSrc} className="hidden" />
                
                <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-yellow-600 flex items-center justify-center text-black shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:scale-105 transition-all shrink-0">
                  {isPlaying ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  )}
                </button>
                
                <div className="flex-1 flex flex-col justify-center gap-1.5">
                  <div className="flex items-center justify-between text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest">
                    <span>Thuyết minh AI</span>
                    {isPlaying && <span className="animate-pulse text-green-400">Đang phát...</span>}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#D4AF37] to-yellow-200 transition-all duration-150 ease-linear" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </Html>
      )}

      {/* Gợi ý khi chưa click */}
      {!clicked && (
        <Html position={[0, 0.4, 0]} center>
          <div className="flex flex-col items-center animate-bounce cursor-pointer pointer-events-none opacity-90">
            <span className="text-[10px] font-bold text-[#D4AF37] bg-black/60 px-2 py-1 rounded-full uppercase tracking-wider drop-shadow-md whitespace-nowrap">{title}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

// Khi bạn có file .glb, bỏ comment đoạn code dưới đây và đưa model vào

import { useGLTF } from '@react-three/drei';
function NgoMonRealModel() {
  const { scene } = useGLTF('/models/ngo-mon-transformed.glb');
  return <primitive object={scene} scale={1} position={[0, 0, 0]} />;
}


export default function ThreeDDemoPage() {
  const [mode, setMode] = React.useState<'orbit' | 'fps'>('orbit');
  const router = useRouter();

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col font-sans">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-white hover:text-[#D4AF37] transition">
            <ChevronLeft className="w-8 h-8" />
          </button>
          <div>
            <h1 className="text-white text-xl font-bold tracking-tight">Trải nghiệm 3D Ngọ Môn</h1>
            <p className="text-white/60 text-xs mt-1">Sử dụng 1 ngón để xoay, 2 ngón để zoom</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-white/10 rounded-full border border-white/20 backdrop-blur-md">
          <span className="text-white/80 text-xs font-semibold uppercase tracking-widest">
            BETA
          </span>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 w-full h-full relative cursor-move">
        <Canvas shadows camera={{ position: [0, 2, 5], fov: 50 }}>
          {/* Môi trường chiếu sáng */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
          <Environment preset="sunset" background blur={0.4} />

          {/* Model */}
          <Suspense fallback={<Text position={[0, 0, 0]} fontSize={0.2} color="white">Đang tải...</Text>}>
            {/* Nếu đã copy file .glb vào thư mục public/models, thay NgoMonRealModel bằng component của bạn */}
            <NgoMonRealModel />

            {/* Điểm tương tác / Thuyết minh */}
            <InteractiveMarker
              position={[0, 0.5, 2]}
              title="Cổng Ngọ Môn"
              description="Ngọ Môn là cổng chính phía Nam của Hoàng thành Huế, được xây dựng năm 1833 dưới triều vua Minh Mạng. Cổng mang ý nghĩa hướng về phía mặt trời, với 5 lối đi mà lối chính giữa chỉ dành riêng cho vua. Phía trên là Lầu Ngũ Phụng - nơi nhà vua ngự xem duyệt binh và dự các lễ đài quan trọng của triều đình."
              audioSrc="/audio/demo.mp3"
            />
          </Suspense>

          {/* Bóng đổ trên mặt đất */}
          <ContactShadows position={[0, -0.1, 0]} opacity={0.5} scale={10} blur={2} far={4} />

          {mode === 'orbit' && (
            <OrbitControls
              enablePan={false}
              enableZoom={true}
              minDistance={0.5}
              maxDistance={150}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 2}
              autoRotate
              autoRotateSpeed={0.5}
            />
          )}

          {mode === 'fps' && <Player />}
        </Canvas>
      </div>

      {/* Crosshair (Tâm ngắm) cho chế độ FPS */}
      {mode === 'fps' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <div className="w-1 h-1 bg-white rounded-full"></div>
        </div>
      )}

      {/* Overlay hướng dẫn FPS */}
      {mode === 'fps' && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 p-3 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 pointer-events-none z-20 text-center animate-in fade-in slide-in-from-top-4">
          <p className="text-white text-sm font-semibold mb-1">Chế độ Khám phá</p>
          <p className="text-white/70 text-xs">Click chuột vào màn hình để bắt đầu. Dùng W,A,S,D để đi lại. Bấm ESC để thoát.</p>
        </div>
      )}

      {/* Mode Switcher */}
      <div className="absolute bottom-28 inset-x-0 flex justify-center z-20">
        <div className="flex bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/20">
          <button onClick={() => setMode('orbit')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${mode === 'orbit' ? 'bg-[#D4AF37] text-black' : 'text-white'}`}>
            Toàn cảnh (Orbit)
          </button>
          <button onClick={() => setMode('fps')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${mode === 'fps' ? 'bg-[#D4AF37] text-black' : 'text-white'}`}>
            Khám phá (WASD)
          </button>
        </div>
      </div>

      {/* Tương tác AR/Info */}
      <div className="absolute bottom-10 inset-x-0 px-6 flex justify-center gap-4 z-10">
        <button className="px-6 py-3 bg-[#D4AF37] text-black font-bold rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] flex items-center gap-2 transition hover:scale-105">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
          Gắn điểm thuyết minh
        </button>
        <button className="px-6 py-3 bg-white/10 text-white font-bold rounded-full border border-white/20 backdrop-blur-md transition hover:bg-white/20">
          Xem trong AR
        </button>
      </div>
    </div>
  );
}
