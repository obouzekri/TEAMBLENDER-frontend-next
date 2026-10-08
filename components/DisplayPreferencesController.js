'use client';

import { useEffect } from 'react';
import {
  applyDisplayPreferences,
  DISPLAY_PREFERENCES_EVENT,
  DISPLAY_PREFERENCES_KEY,
  readDisplayPreferences,
} from '@/lib/display-preferences';
import ToastContainer from './ToastContainer';
import useToast from '@/lib/useToast';
import useI18n from '@/lib/i18n/useI18n';

export default function DisplayPreferencesController() {
  const { t } = useI18n();
  const { toasts, removeToast, error: showError } = useToast();

  useEffect(() => {
    function syncPreferences() {
      try {
        applyDisplayPreferences(readDisplayPreferences(localStorage), document.documentElement);
      } catch (error) {
        console.error('Unable to apply display preferences', error);
        showError(t('preferencesPage.loadError'));
      }
    }
    function onStorage(event) {
      if (event.key === DISPLAY_PREFERENCES_KEY || event.key === null) syncPreferences();
    }
    syncPreferences();
    window.addEventListener('storage', onStorage);
    window.addEventListener(DISPLAY_PREFERENCES_EVENT, syncPreferences);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(DISPLAY_PREFERENCES_EVENT, syncPreferences);
    };
  }, [showError, t]);

  return <ToastContainer toasts={toasts} onRemove={removeToast} />;
}
