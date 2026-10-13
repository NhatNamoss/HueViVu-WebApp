import { fetchHueWeather } from '@/lib/hue-weather';
export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json(await fetchHueWeather(), { headers: { 'Cache-Control': 'no-store' } });
}
