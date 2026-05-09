"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import ToastContainer from '@/components/ToastContainer';
import SessionCardSkeleton from '@/components/SessionCardSkeleton';
import { getApiUrl } from '@/lib/config';
import useToast from '@/lib/useToast';
import { fetchSessionsWithRetry } from '@/lib/api';

function pickDisplayName(user) {
  if (!user || typeof user !== 'object') return 'Manager';
  const first = String(user.first_name || user.firstName || '').trim();
  const last = String(user.last_name || user.lastName || '').trim();
  const full = `${first} ${last}`.trim();
  return full || String(user.name || user.email || 'Manager');
}

function useManagerGuard() {
  const [state, setState] = useState({ loading: true, allowed: false, user: null, token: '' });

  useEffect(() => {
    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    const rawUser = sessionStorage.getItem('currentUser');
    const user = rawUser ? JSON.parse(rawUser) : null;

    if (!token || !user) {
      window.location.replace('/login');
      return;
    }

    if (user.role === 'participant') {
      window.location.replace('/participant');
      return;
    }

    setState({ loading: false, allowed: true, user, token });
  }, []);

  return state;
}

async function fetchSessions(token) {
  try {
    const data = await fetchSessionsWithRetry(token);
    const items = Array.isArray(data) ? data : (data.sessions || data.data || []);
    return Array.isArray(items) ? items : [];
  } catch (err) {
    throw new Error(err.message || `Erreur API sessions`);
  }
}

export default function ManagerHome() {
  const guard = useManagerGuard();
  const { toasts, removeToast, error: showErrorToast, loading: showLoadingToast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const userLabel = useMemo(() => pickDisplayName(guard.user), [guard.user]);

  const sessionStats = useMemo(() => ({
    enCours: sessions.filter((s) => s.status === 'en_cours').length,
    preparee: sessions.filter((s) => s.status === 'preparee').length,
    terminee: sessions.filter((s) => s.status === 'terminee').length,
  }), [sessions]);

  useEffect(() => {
    if (!guard.allowed || !guard.token) return;

    let cancelled = false;
    setLoadingSessions(true);
    const loadingId = showLoadingToast('Chargement des sessions...');

    fetchSessions(guard.token)
      .then((data) => {
        if (!cancelled) {
          setSessions(data);
          removeToast(loadingId);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          removeToast(loadingId);
          showErrorToast(err.message || 'Impossible de charger les sessions.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSessions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [guard.allowed, guard.token, showErrorToast, showLoadingToast, removeToast]);

  function logout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('selectedChallenges');
    window.location.replace('/login');
  }

  if (guard.loading) {
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
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AppNav userLabel={userLabel} onLogout={logout} role={guard.user?.role} />
      <main className="shell app-home">
        <section className="hero">
          <p className="eyebrow">ESPACE MANAGER</p>
          <h1>Bonjour {userLabel}</h1>
          <p>Planifiez, lancez et analysez vos sessions de team building en quelques clics.</p>
          <div className="hero-actions">
            <Link className="btn-primary" href="/session-builder">Construire une session</Link>
            <Link className="btn-secondary" href="/session-builder">Lancer une session</Link>
          </div>
        </section>

        <section className="cards-grid" aria-label="Statistiques sessions">
          <article className="feature-card">
            <p className="eyebrow">EN COURS</p>
            <h2 style={{ fontSize: '2.5rem', margin: '0.25rem 0' }}>{loadingSessions ? '…' : sessionStats.enCours}</h2>
            <p>session{sessionStats.enCours !== 1 ? 's' : ''} active{sessionStats.enCours !== 1 ? 's' : ''}</p>
            {sessionStats.enCours > 0 && (
              <Link className="btn-mini" href={`/session-live/${sessions.find((s) => s.status === 'en_cours')?.id}`} style={{ marginTop: '0.75rem' }}>Reprendre</Link>
            )}
          </article>
          <article className="feature-card">
            <p className="eyebrow">A CONFIGURER</p>
            <h2 style={{ fontSize: '2.5rem', margin: '0.25rem 0' }}>{loadingSessions ? '…' : sessionStats.preparee}</h2>
            <p>session{sessionStats.preparee !== 1 ? 's' : ''} en preparation</p>
            {sessionStats.preparee > 0 && (
              <Link className="btn-mini" href="/session-builder" style={{ marginTop: '0.75rem' }}>Continuer</Link>
            )}
          </article>
          <article className="feature-card">
            <p className="eyebrow">TERMINEES</p>
            <h2 style={{ fontSize: '2.5rem', margin: '0.25rem 0' }}>{loadingSessions ? '…' : sessionStats.terminee}</h2>
            <p>session{sessionStats.terminee !== 1 ? 's' : ''} cloturee{sessionStats.terminee !== 1 ? 's' : ''}</p>
            {sessionStats.terminee > 0 && (
              <Link className="btn-mini" href={`/session-results/${sessions.find((s) => s.status === 'terminee')?.id}`} style={{ marginTop: '0.75rem' }}>Voir resultats</Link>
            )}
          </article>
        </section>

        <section className="feature-card sessions-panel">
          <div className="panel-head">
            <h2>Dernieres sessions</h2>
            <Link className="btn-secondary" href="/session-builder">Voir le builder</Link>
          </div>

          {loadingSessions ? (
            <div className="session-skeletons">
              {[...Array(3)].map((_, i) => (
                <SessionCardSkeleton key={i} />
              ))}
            </div>
          ) : null}

          {!loadingSessions && sessions.length === 0 ? (
            <p>Aucune session trouvee pour le moment.</p>
          ) : null}

          {!loadingSessions && sessions.length > 0 ? (
            <ul className="session-list">
              {sessions.slice(0, 8).map((session) => (
                <li key={String(session.id)} className="session-item">
                  <div>
                    <p className="session-title">{session.name || `Session #${session.id}`}</p>
                    <p className="session-meta">Statut: {session.status || 'preparee'}</p>
                  </div>
                  <Link
                    className="btn-mini"
                    href={
                      session.status === 'en_cours'
                        ? `/session-live/${session.id}`
                        : session.status === 'terminee'
                          ? `/session-results/${session.id}`
                          : `/session-builder?sessionId=${session.id}`
                    }
                  >
                    {session.status === 'en_cours' ? 'Reprendre' : session.status === 'terminee' ? 'Résultats' : 'Ouvrir'}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="feature-card">
          <h2>Nouvelle session</h2>
          <p>Creez une session, selectionnez vos challenges et invitez vos participants en quelques minutes.</p>
          <Link className="btn-primary" href="/session-builder">Creer une session</Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
