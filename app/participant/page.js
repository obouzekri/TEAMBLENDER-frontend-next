'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';

function parseUser() {
  const raw = sessionStorage.getItem('currentUser');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function ParticipantPage() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    const currentUser = parseUser();

    if (!token || !currentUser) {
      window.location.replace('/login');
      return;
    }

    setUser(currentUser);
    setReady(true);
  }, []);

  const participantLabel = useMemo(() => {
    if (!user) return 'Participant';
    return user.first_name || user.firstname || user.email || 'Participant';
  }, [user]);

  const sessionId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('sessionId') || sessionStorage.getItem('targetSessionId') || '';
  }, []);

  const userId = useMemo(() => {
    if (!user) return '';
    return String(user.id || user.userId || user.participantId || '').trim();
  }, [user]);

  function logout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('targetSessionId');
    window.location.replace('/login');
  }

  if (!ready) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>Verification de la session...</h1>
          <p>Chargement en cours.</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <AppNav userLabel={participantLabel} onLogout={logout} />
      <main className="shell app-home">
        <section className="hero">
          <p className="eyebrow">ESPACE PARTICIPANT</p>
          <h1>Bienvenue {participantLabel}</h1>
          <p>Le dashboard participant Next est en cours de migration. Vous pouvez rejoindre un challenge via un lien direct.</p>
          <div className="hero-actions">
            {sessionId ? (
              <Link className="btn-primary" href={`/challenges/escape_room_v1?sessionId=${encodeURIComponent(sessionId)}`}>Rejoindre le challenge actif</Link>
            ) : (
              <Link className="btn-primary" href="/login">Revenir a la connexion</Link>
            )}
            <Link className="btn-secondary" href={userId ? `/home?userId=${encodeURIComponent(userId)}` : '/home'}>Aller a l'accueil</Link>
          </div>
        </section>

        <section className="feature-card">
          <h2>Informations de session</h2>
          <p>Session cible: {sessionId || 'Aucune session detectee dans l URL'}</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
