'use client';
import dynamic from 'next/dynamic';

const CinematicMapInner = dynamic(() => import('./CinematicMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#1A1D3B]">
      <div className="flex gap-2">
        <span className="w-3 h-3 bg-[#FF7F6B] rounded-full animate-pulse"></span>
        <span className="w-3 h-3 bg-[#FF9A5C] rounded-full animate-pulse delay-75"></span>
        <span className="w-3 h-3 bg-[#D4AF37] rounded-full animate-pulse delay-150"></span>
      </div>
    </div>
  )
});

export default function CinematicMap(props: any) {
  return <CinematicMapInner {...props} />;
}
