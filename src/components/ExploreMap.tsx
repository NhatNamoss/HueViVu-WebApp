'use client';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./ExploreMapInner'), {
  ssr: false,
  loading: () => <div className="w-full h-full skeleton" />,
});
export default function ExploreMap(props: any) { return <Map {...props} />; }
