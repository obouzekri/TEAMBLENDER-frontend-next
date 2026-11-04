'use client';

import Link from 'next/link';
import styles from './CookieConsentBanner.module.css';
import { getConsentPolicyVersion, recordConsentDecision } from '@/lib/consent';
import useI18n from '@/lib/i18n/useI18n';

export default function CookieConsentBanner({ consentState, isReopened = false, onDismiss }) {
  const { t, withLocalePath } = useI18n();
  const currentDecision = String(consentState?.decision || 'unset');
  const policyVersion = getConsentPolicyVersion();
  const hasDecision = currentDecision === 'granted' || currentDecision === 'denied';

  // Une fois la decision prise (acceptee OU refusee), le bandeau disparait
  // jusqu'au prochain changement de version de politique ou a une reouverture explicite.
  if (hasDecision && !isReopened) {
    return null;
  }

  const handleDecision = (decision) => {
    recordConsentDecision(decision, isReopened ? 'preferences' : 'banner');
    if (typeof onDismiss === 'function') onDismiss();
  };

  return (
    <aside className={styles.banner} aria-label={t('cookieConsent.aria')}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="false"
        aria-labelledby="cookie-consent-title"
        aria-describedby="cookie-consent-text"
      >
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{t('cookieConsent.eyebrow')}</p>
            <h2 id="cookie-consent-title" className={styles.title}>
              {t(isReopened ? 'cookieConsent.titleReopened' : 'cookieConsent.title')}
            </h2>
            <p id="cookie-consent-text" className={styles.text}>
              {t('cookieConsent.text')}
            </p>
            <div className={styles.meta}>
              <span className={styles.badge}>{t('cookieConsent.policy', { version: policyVersion })}</span>
              {hasDecision ? (
                <span className={styles.badge}>
                  {t('cookieConsent.currentChoice', {
                    choice: t(currentDecision === 'granted' ? 'cookieConsent.granted' : 'cookieConsent.denied'),
                  })}
                </span>
              ) : (
                <span className={styles.badge}>{t('cookieConsent.localLog')}</span>
              )}
              <Link href={withLocalePath('/confidentialite')} className={styles.link}>
                {t('cookieConsent.privacyPolicy')}
              </Link>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={() => handleDecision('granted')}
          >
            {t('cookieConsent.accept')}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => handleDecision('denied')}
          >
            {t('cookieConsent.refuse')}
          </button>
          {isReopened ? (
            <button
              type="button"
              className={`${styles.button} ${styles.buttonGhost}`}
              onClick={() => onDismiss?.()}
            >
              {t('cookieConsent.close')}
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
