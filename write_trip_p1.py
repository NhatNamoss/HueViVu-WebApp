import sys
content = r"""'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CinematicMap from '@/components/CinematicMap';

type Activity = {
  time: string; name: string; type: string;
  duration: string; cost: string; description: string;
  ai_tip: string; location: string; lat?: number; lng?: number;
};
type Day = { day: number; theme: string; day_tip: string; activities: Activity[] };
type Trip = {
  id: string; title: string; summary: string; duration: number;
  companion: string; total_cost_estimate: string; ai_insight: string;
  highlights: string[]; itinerary: { days: Day[] }; is_shared: number;
  user_id: string; status: string;
};
type Weather = {
  emoji: string; temp: number; vi: string;
  advisory: string; advisory_type: string;
  forecast?: { day: string; temp_max: number; temp_min: number; emoji: string; condition_vi: string }[];
};

const TYPE_EMOJI: Record<string, string> = {
  heritage: '\ud83c\udfdb\ufe0f', food: '\ud83c\udf5c', nature: '\ud83c\udf3f', temple: '\ud83d\uded5',
  cafe: '\u2615', market: '\ud83d\udecd\ufe0f', experience: '\ud83c\udfad', craft_village: '\ud83c\udfa8',
};
const EMERGENCY = [
  { label: 'C\u1ea5p c\u1ee9u 115', phone: '115', icon: '\ud83d\ude91' },
  { label: 'C\u1ea3nh s\u00e1t 113', phone: '113', icon: '\ud83d\udea8' },
  { label: 'C\u1ee9u h\u1ecfa 114', phone: '114', icon: '\ud83d\ude92' },
  { label: 'BV TW Hu\u1ebf', phone: '02343822325', icon: '\ud83c\udfe5' },
];
const PACKING = [
  'N\u00f3n / m\u0169 che n\u1eafng (Hu\u1ebf r\u1ea5t n\u00f3ng)',
  'Gi\u00e0y tho\u1ea3i m\u00e1i (nhi\u1ec1u n\u01a1i c\u1ea7n leo c\u1ea7u thang)',
  'Thu\u1ed1c ch\u1ed1ng say xe n\u1ebfu \u0111i xe m\u00e1y',
  'Ti\u1ec1n m\u1eb7t VND (ch\u1ee3, \u0111\u1ec1n th\u01b0\u1eddng kh\u00f4ng nh\u1eadn th\u1ebb)',
  'S\u1ea1c d\u1ef1 ph\u00f2ng (pin t\u1ed1n khi d\u00f9ng GPS)',
  '\u00c1o kho\u00e1c m\u1ecfng (bu\u1ed5i t\u1ed1i Hu\u1ebf se l\u1ea1nh)',
];
const TIMES = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

type ChatMsg = { role: 'user' | 'assistant'; content: string };

function buildCopyText(trip: Trip): string {
  const lines: string[] = ['\ud83d\uddfa\ufe0f ' + trip.title, trip.summary, ''];
  (trip.itinerary?.days || []).forEach(day => {
    lines.push('\ud83d\udcc5 Ng\u00e0y ' + day.day + ': ' + day.theme);
    day.activities.forEach(a => lines.push('  ' + a.time + ' \u2014 ' + a.name + ' (' + a.duration + ') \u00b7 ' + (a.cost || 'Mi\u1ec5n ph\u00ed')));
    lines.push('');
  });
  lines.push('\ud83d\udcb0 T\u1ed5ng chi ph\u00ed d\u1ef1 ki\u1ebfn: ' + trip.total_cost_estimate);
  return lines.join('\n');
}
"""
with open(r'c:/Users/LENOVO/.gemini/antigravity/scratch/huevivu-nextjs/src/app/trips/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('p1 ok')
