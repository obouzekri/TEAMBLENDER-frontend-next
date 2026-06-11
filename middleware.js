import { NextResponse } from 'next/server';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './lib/i18n/routing';

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(request) {
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

  if (SUPPORTED_LOCALES.includes(maybeLocale)) {
    const url = request.nextUrl.clone();
    const stripped = `/${segments.slice(1).join('/')}`;
    url.pathname = stripped === '/' ? '/' : stripped || '/';
    const response = NextResponse.rewrite(url);
    response.cookies.set('tb_locale', maybeLocale, { path: '/', sameSite: 'lax' });
    return response;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = `/${DEFAULT_LOCALE}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
