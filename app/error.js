'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import useI18n from '@/lib/i18n/useI18n';

export default function GlobalError({ error, reset }) {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';

  useEffect(() => {
    // Keep a trace in dev/prod logs for quicker incident triage.
    console.error('Global Next error boundary caught an error:', error);
  }, [error]);

  return (
    <>
      <TopNav />
      <main className="shell landing">
        <section className="hero">
          <p className="eyebrow">{isEn ? 'APPLICATION ERROR' : 'ERREUR APPLICATION'}</p>
          <h1>{isEn ? 'An unexpected error occurred.' : 'Une erreur inattendue est survenue.'}</h1>
          <p>
            {isEn
              ? 'You can retry immediately. If the problem persists, return to manager home and restart your flow.'
              : 'Vous pouvez reessayer immediatement. Si le probleme persiste, revenez a l accueil manager puis relancez votre parcours.'}
          </p>
          <div className="hero-actions">
            <button type="button" className="btn-primary" onClick={reset}>
              {isEn ? 'Retry' : 'Reessayer'}
            </button>
            <Link href={withLocalePath('/home')} className="btn-secondary">
              {isEn ? 'Manager space' : 'Espace manager'}
            </Link>
            <Link href={withLocalePath('/login')} className="btn-secondary">
              {isEn ? 'Log in' : 'Connexion'}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
