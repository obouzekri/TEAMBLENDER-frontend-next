'use client';

import useI18n from '@/lib/i18n/useI18n';

const STATUS_VARIANTS = {
  en_cours: 'en-cours',
  terminee: 'terminee',
};

const STATUS_LABEL_KEYS = {
  'en-cours': 'shell.sessionStatusLive',
  'a-venir': 'shell.sessionStatusUpcoming',
  terminee: 'shell.sessionStatusCompleted',
};

/** Maps an API session status to its shared visual variant (en-cours, a-venir, terminee). */
export function getSessionStatusVariant(status) {
  return STATUS_VARIANTS[String(status || '').trim().toLowerCase()] || 'a-venir';
}

/**
 * Session status badge shared by the manager and participant spaces.
 * Styles live in app/styles/23-dashboard-system.css (`.status-pill`).
 */
export default function StatusBadge({ status, className = '' }) {
  const { t } = useI18n();
  const variant = getSessionStatusVariant(status);
  return (
    <span className={`status-pill status-pill--${variant} ${className}`.trim()}>
      <span className="status-pill__dot" aria-hidden="true" />
      {t(STATUS_LABEL_KEYS[variant])}
    </span>
  );
}
