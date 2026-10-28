import { NextResponse } from 'next/server';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './lib/i18n/routing';
import { getPublicSeoRedirectPath, isPublicSeoPath } from './lib/seo';

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
  const forwardedLocale = String(request.headers.get('x-teamblender-locale') || '').trim().toLowerCase();
  const forwardedPathname = String(request.headers.get('x-teamblender-pathname') || '').trim();
  const isSeoRewritePass = request.headers.get('x-teamblender-seo-rewrite') === '1';

  if (
    pathname.startsWith('/_next')
    || pathname.startsWith('/api')
    || pathname.startsWith('/socket.io')
    || pathname.startsWith('/uploads')
    || PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const publicRedirectPath = getPublicSeoRedirectPath(pathname);
  if (publicRedirectPath) {
    const url = request.nextUrl.clone();
    url.pathname = publicRedirectPath;
    return NextResponse.redirect(url, 308);
  }

  const segments = pathname.split('/').filter(Boolean);
  const maybeLocale = String(segments[0] || '').toLowerCase();
  const hasLocale = SUPPORTED_LOCALES.includes(maybeLocale);
  const locale = isSeoRewritePass && SUPPORTED_LOCALES.includes(forwardedLocale)
    ? forwardedLocale
    : hasLocale
      ? maybeLocale
      : isPublicSeoPath(pathname) ? DEFAULT_LOCALE : resolvePreferredLocale(request);
  const seoPathname = isSeoRewritePass && forwardedPathname ? forwardedPathname : pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-teamblender-locale', locale);
  requestHeaders.set('x-teamblender-pathname', seoPathname);
  requestHeaders.set('x-teamblender-seo-rewrite', '1');

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