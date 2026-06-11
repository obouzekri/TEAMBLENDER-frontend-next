"use client";

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { createTranslator } from './index';
import { detectLocaleFromPathname, withLocalePath } from './routing';

export default function useI18n() {
  const pathname = usePathname();
  const locale = detectLocaleFromPathname(pathname || '/');

  const t = useMemo(() => createTranslator(locale), [locale]);

  return {
    locale,
    t,
    withLocalePath: (href) => withLocalePath(locale, href)
  };
}
