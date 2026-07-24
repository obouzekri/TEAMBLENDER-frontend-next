"use client";

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import useI18n from '@/lib/i18n/useI18n';
import { useI18nContext } from '@/lib/i18n/I18nProvider';
import { SUPPORTED_LOCALES, withLocalePath, stripLocaleFromPath } from '@/lib/i18n/routing';

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const { locale, t } = useI18n();
  const { setLocale } = useI18nContext();

  const basePath = stripLocaleFromPath(pathname || '/');
  const query = searchParams?.toString() || '';

  const handleLocaleChange = (newLocale) => {
    // Update context (triggers immediate re-render globally)
    setLocale(newLocale);
    
    // Update URL
    const newHref = withLocalePath(newLocale, `${basePath}${query ? `?${query}` : ''}`);
    router.push(newHref);
  };

  return (
    <div className="lang-switch" aria-label={t('language.switcherAria')}>
      <label htmlFor="language-switcher" className="lang-switch__label">{t('language.switcherAria')}</label>
      <select
        id="language-switcher"
        className="lang-switch__select"
        value={locale}
        onChange={(event) => handleLocaleChange(event.target.value)}
      >
        {SUPPORTED_LOCALES.map((targetLocale) => (
          <option key={targetLocale} value={targetLocale}>
            {t(`language.${targetLocale}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
