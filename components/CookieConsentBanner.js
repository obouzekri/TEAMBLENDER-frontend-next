'use client';

import Link from 'next/link';
import styles from './CookieConsentBanner.module.css';
import { getConsentPolicyVersion, recordConsentDecision } from '@/lib/consent';

export default function CookieConsentBanner({ consentState }) {
  const currentDecision = String(consentState?.decision || 'unset');
  const policyVersion = getConsentPolicyVersion();
  const showBanner = currentDecision !== 'granted';

  if (!showBanner) {
    return null;
  }

  const isRejected = currentDecision === 'denied';
  const shouldCollapse = isRejected;

  return (
    <aside
      className={`${styles.banner} ${shouldCollapse ? styles.bannerCollapsed : ''}`}
      aria-label="Gestion des cookies et du consentement"
    >
      <div
        className={`${styles.panel} ${shouldCollapse ? styles.panelCollapsed : ''}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby="cookie-consent-title"
      >
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Consentement cookies</p>
            <h2 id="cookie-consent-title" className={styles.title}>
              {isRejected
                ? 'Vous avez refusé les outils de mesure.'
                : 'Nous utilisons des cookies pour mesurer l’usage de manière limitée.'}
            </h2>
            <p className={styles.text}>
              TeamBlender n’active pas les outils d’analytics, de tracking produit ni les balises tierces
              avant votre accord. Vous pouvez accepter pour aider à améliorer la plateforme ou refuser
              pour garder uniquement le strict nécessaire.
            </p>
            <div className={styles.meta}>
              <span className={styles.badge}>Politique {policyVersion}</span>
              <span className={styles.badge}>Journal local horodaté</span>
              <Link href="/confidentialite" className={styles.link}>
                Politique de confidentialité
              </Link>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={() => recordConsentDecision('granted', 'banner')}
          >
            Autoriser les cookies de mesure
          </button>
          {!isRejected ? (
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => recordConsentDecision('denied', 'banner')}
            >
              Refuser les cookies de mesure
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
