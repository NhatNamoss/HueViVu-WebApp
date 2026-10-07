import { TOUR_STOPS } from '../src/components/3d/tour-stops.ts';
import { mkdir, writeFile } from 'node:fs/promises';

// Narrate only these public, authored descriptions, then serve local recordings.
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
await mkdir('public/audio/ngo-mon', { recursive: true });
for (const stop of TOUR_STOPS) {
  const pieces = []; let text = '';
  for (const word of `${stop.title}. ${stop.text}`.split(/\s+/)) {
    if ((text + ' ' + word).length > 170) { pieces.push(text); text = word; }
    else text = `${text} ${word}`.trim();
  }
  if (text) pieces.push(text);
  const buffers = [];
  for (const piece of pieces) {
    const response = await fetch(`${base}/api/tts?text=${encodeURIComponent(piece)}`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok || !response.headers.get('content-type')?.includes('audio')) throw new Error(`Voice unavailable for ${stop.id}: ${response.status}`);
    buffers.push(Buffer.from(await response.arrayBuffer()));
  }
  const audio = Buffer.concat(buffers);
  await writeFile(`public/audio/ngo-mon/${stop.id}.mp3`, audio);
  console.log(`${stop.id}: ${audio.length} bytes`);
}
