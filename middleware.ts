import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set('x-request-id', requestId);
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('x-frame-options', 'SAMEORIGIN');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set('permissions-policy', 'camera=(self), microphone=(self), geolocation=(self)');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
