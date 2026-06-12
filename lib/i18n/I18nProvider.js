"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { detectLocaleFromPathname, normalizeLocale } from './routing';

const I18nContext = createContext(undefined);

export function I18nProvider({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [locale, setLocaleState] = useState(() => detectLocaleFromPathname(pathname || '/'));

  // Initialize locale from pathname and localStorage on mount
  useEffect(() => {
    const pathLocale = detectLocaleFromPathname(pathname || '/');
    
    // Check localStorage for persisted locale preference
    const storedLocale = typeof window !== 'undefined' 
      ? localStorage.getItem('tb_locale_preference')
      : null;

    const resolvedLocale = storedLocale 
      ? normalizeLocale(storedLocale)
      : pathLocale;

    if (resolvedLocale !== locale) {
      setLocaleState(resolvedLocale);
    }
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('tb_locale_preference', resolvedLocale);
    }
  }, [locale, pathname]);

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
