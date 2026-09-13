'use client';

import Link from 'next/link';
import styles from './CookieConsentBanner.module.css';
import { getConsentPolicyVersion, recordConsentDecision } from '@/lib/consent';

export default function CookieConsentBanner({ consentState, isReopened = false, onDismiss }) {
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
    <aside className={styles.banner} aria-label="Gestion des cookies et du consentement">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="false"
        aria-labelledby="cookie-consent-title"
        aria-describedby="cookie-consent-text"
      >
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Consentement cookies</p>
            <h2 id="cookie-consent-title" className={styles.title}>
              {isReopened
                ? 'Gérez vos cookies de mesure.'
                : 'Nous utilisons des cookies pour mesurer l’usage de manière limitée.'}
            </h2>
            <p id="cookie-consent-text" className={styles.text}>
              TeamBlender n’active pas les outils d’analytics, de tracking produit ni les balises tierces
              avant votre accord. Vous pouvez accepter pour aider à améliorer la plateforme ou refuser
              pour garder uniquement le strict nécessaire.
            </p>
            <div className={styles.meta}>
              <span className={styles.badge}>Politique {policyVersion}</span>
              {hasDecision ? (
                <span className={styles.badge}>
                  Choix actuel :{' '}
                  {currentDecision === 'granted' ? 'cookies autorisés' : 'cookies refusés'}
                </span>
              ) : (
                <span className={styles.badge}>Journal local horodaté</span>
              )}
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
            onClick={() => handleDecision('granted')}
          >
            Autoriser les cookies de mesure
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => handleDecision('denied')}
          >
            Refuser les cookies de mesure
          </button>
          {isReopened ? (
            <button
              type="button"
              className={`${styles.button} ${styles.buttonGhost}`}
              onClick={() => onDismiss?.()}
            >
              Fermer
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
