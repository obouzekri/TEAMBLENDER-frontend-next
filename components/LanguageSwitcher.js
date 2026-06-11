"use client";

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import useI18n from '@/lib/i18n/useI18n';
import { SUPPORTED_LOCALES, withLocalePath, stripLocaleFromPath } from '@/lib/i18n/routing';

export default function LanguageSwitcher() {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const { locale, t } = useI18n();

  const basePath = stripLocaleFromPath(pathname || '/');
  const query = searchParams?.toString() || '';

  return (
    <div className="lang-switch" aria-label={t('language.switcherAria')}>
      {SUPPORTED_LOCALES.map((targetLocale) => {
        const href = withLocalePath(targetLocale, `${basePath}${query ? `?${query}` : ''}`);
        const active = targetLocale === locale;
        return (
          <Link
            key={targetLocale}
            href={href}
            className={`lang-switch__btn${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {t(`language.${targetLocale}`)}
          </Link>
        );
      })}
    </div>
  );
}
