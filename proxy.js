import { NextResponse } from 'next/server';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './lib/i18n/routing';
import { isPublicSeoPath } from './lib/seo';

const PUBLIC_FILE = /\.(.*)$/;

function resolvePreferredLocale(request) {
  const fromCookie = String(request.cookies.get('tb_locale')?.value || '').trim().toLowerCase();
  if (SUPPORTED_LOCALES.includes(fromCookie)) return fromCookie;

  const acceptLanguage = String(request.headers.get('accept-language') || '').toLowerCase();
  if (acceptLanguage.includes('en')) return 'en';

  return DEFAULT_LOCALE;
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next')
    || pathname.startsWith('/api')
    || pathname.startsWith('/socket.io')
    || pathname.startsWith('/uploads')
    || PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const segments = pathname.split('/').filter(Boolean);
  const maybeLocale = String(segments[0] || '').toLowerCase();
  const hasLocale = SUPPORTED_LOCALES.includes(maybeLocale);
  const locale = hasLocale
    ? maybeLocale
    : isPublicSeoPath(pathname) ? DEFAULT_LOCALE : resolvePreferredLocale(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-teamblender-locale', locale);
  requestHeaders.set('x-teamblender-pathname', pathname);

  if (hasLocale) {
    const url = request.nextUrl.clone();
    const stripped = `/${segments.slice(1).join('/')}`;
    url.pathname = stripped === '/' ? '/' : stripped || '/';
    const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    response.cookies.set('tb_locale', maybeLocale, { path: '/', sameSite: 'lax' });
    return response;
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set('tb_locale', locale, { path: '/', sameSite: 'lax' });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};