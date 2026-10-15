import { headers } from 'next/headers';
import { normalizeLocale } from './i18n/routing';

export async function getSeoRequest() {
  const requestHeaders = await headers();
  return {
    pathname: requestHeaders.get('x-teamblender-pathname') || '/',
    locale: normalizeLocale(requestHeaders.get('x-teamblender-locale')),
  };
}
