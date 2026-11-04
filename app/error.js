'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import useI18n from '@/lib/i18n/useI18n';

export default function GlobalError({ error, reset }) {
  const { locale, withLocalePath, t } = useI18n();

  useEffect(() => {
    // Keep a trace in dev/prod logs for quicker incident triage.
    console.error('Global Next error boundary caught an error:', error);
  }, [error]);

  return (
    <>
      <TopNav />
      <main className="shell error-page">
        <section className="error-panel">
          <p className="eyebrow error-page__eyebrow">{t('errorPages.applicationError')}</p>
          <h1 className="error-page__title">{t('errorPages.anUnexpectedErrorOccurred')}</h1>
          <p className="error-page__text">
            {t('errorPages.youCanRetryImmediatelyIfThe')}
          </p>
          <div className="error-page__actions">
            <button type="button" className="btn-primary error-page__primary" onClick={reset}>
              {t('errorPages.retry')}
            </button>
            <Link href={withLocalePath('/home')} className="btn-secondary error-page__secondary">
              {t('errorPages.managerSpace')}
            </Link>
            <Link href={withLocalePath('/login')} className="btn-secondary error-page__secondary">
              {t('errorPages.logIn')}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
