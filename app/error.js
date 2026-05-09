'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Keep a trace in dev/prod logs for quicker incident triage.
    console.error('Global Next error boundary caught an error:', error);
  }, [error]);

  return (
    <>
      <TopNav />
      <main className="shell landing">
        <section className="hero">
          <p className="eyebrow">ERREUR APPLICATION</p>
          <h1>Une erreur inattendue est survenue.</h1>
          <p>
            Vous pouvez reessayer immediatement. Si le probleme persiste,
            revenez a l accueil manager puis relancez votre parcours.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn-primary" onClick={reset}>
              Reessayer
            </button>
            <Link href="/home" className="btn-secondary">
              Espace manager
            </Link>
            <Link href="/login" className="btn-secondary">
              Connexion
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
