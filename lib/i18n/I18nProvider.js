"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { detectLocaleFromPathname, normalizeLocale, SUPPORTED_LOCALES } from './routing';
import { isPublicSeoPath } from '../seo';

const I18nContext = createContext(undefined);

export function I18nProvider({ children, initialLocale = 'fr' }) {
  const pathname = usePathname();
  const [locale, setLocaleState] = useState(() => normalizeLocale(initialLocale));

  // Initialize locale from pathname and localStorage on mount
  useEffect(() => {
    const pathLocale = detectLocaleFromPathname(pathname || '/');
    
    // Check localStorage for persisted locale preference
    const storedLocale = typeof window !== 'undefined' 
      ? localStorage.getItem('tb_locale_preference')
      : null;

    const hasPathLocale = SUPPORTED_LOCALES.includes((pathname || '/').split('/')[1]);
    const resolvedLocale = hasPathLocale
      ? pathLocale
      : isPublicSeoPath(pathname || '/') ? normalizeLocale(initialLocale)
        : storedLocale ? normalizeLocale(storedLocale) : normalizeLocale(initialLocale);

    if (resolvedLocale !== locale) {
      setLocaleState(resolvedLocale);
    }
    document.documentElement.lang = resolvedLocale;
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('tb_locale_preference', resolvedLocale);
    }
  }, [initialLocale, locale, pathname]);

  const setLocale = (newLocale) => {
    const normalized = normalizeLocale(newLocale);
    setLocaleState(normalized);
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('tb_locale_preference', normalized);
    }

    // Also set cookie by calling API
    if (typeof window !== 'undefined') {
      document.cookie = `tb_locale=${normalized}; path=/; max-age=31536000`;
    }
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18nContext() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18nContext must be used within I18nProvider');
  }
  return context;
}

// Gameplay language is session-owned; changing it must not change personal preferences.
export function ChallengeLocaleProvider({ locale, children }) {
  return (
    <I18nContext.Provider value={{ locale: normalizeLocale(locale || 'fr'), setLocale: () => {} }}>
      {children}
    </I18nContext.Provider>
  );
}
