"use client";

import { useEffect } from 'react';

const THEME_STORAGE_KEY = 'tb_theme';

function getPreference() {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return ['light', 'dark', 'system'].includes(storedTheme) ? storedTheme : 'system';
  } catch (error) {
    console.error('Unable to read theme preference', error);
    return 'system';
  }
}

function applyTheme(preference, prefersDark) {
  const theme = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preference;
  if (document.body) {
    document.body.dataset.theme = theme;
  }
}

export default function ThemeController() {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncTheme = () => applyTheme(getPreference(), mediaQuery.matches);

    syncTheme();
    mediaQuery.addEventListener('change', syncTheme);
    window.addEventListener('storage', syncTheme);

    return () => {
      mediaQuery.removeEventListener('change', syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, []);

  return null;
}