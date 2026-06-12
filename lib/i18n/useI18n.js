"use client";

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { createTranslator } from './index';
import { detectLocaleFromPathname, withLocalePath } from './routing';
import { useI18nContext } from './I18nProvider';

export default function useI18n() {
  const pathname = usePathname();
  const pathLocale = detectLocaleFromPathname(pathname || '/');
  
  // Try to get locale from context (if provider is available)
  let contextLocale;
  try {
    const context = useI18nContext();
    contextLocale = context?.locale;
  } catch {
    // Provider not available, fallback to pathname
  }

  // Use context locale if available and mounted, otherwise fall back to pathname
  const locale = contextLocale || pathLocale;

  const t = useMemo(() => createTranslator(locale), [locale]);

  return {
    locale,
    t,
    withLocalePath: (href) => withLocalePath(locale, href)
  };
}
