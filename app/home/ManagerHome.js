"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import ToastContainer from '@/components/ToastContainer';
import SessionCardSkeleton from '@/components/SessionCardSkeleton';
import { getApiUrl } from '@/lib/config';
import { toLegacy } from '@/lib/legacy';
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
      window.location.replace(toLegacy('/src/pages/participant-dashboard.html'));
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
      <AppNav userLabel={userLabel} onLogout={logout} />
      <main className="shell app-home">
        <section className="hero">
          <p className="eyebrow">ESPACE MANAGER</p>
          <h1>Bonjour {userLabel}</h1>
          <p>Ce lot migre le home manager et conserve les flux sensibles sur le frontend legacy.</p>
          <div className="hero-actions">
            <Link className="btn-primary" href="/session-builder">Construire une session</Link>
            <a className="btn-secondary" href={toLegacy('/src/pages/facilitator_launch.html')}>Lancer une session (legacy)</a>
          </div>
        </section>

        <section className="cards-grid" aria-label="Actions manager">
          <article className="feature-card">
            <h2>Sessions</h2>
            <p>Consultez vos sessions recemment creees et poursuivez dans le flux actuel.</p>
          </article>
          <article className="feature-card">
            <h2>Migration progressive</h2>
            <p>Le guard auth et la navigation manager sont maintenant dans Next.js.</p>
          </article>
          <article className="feature-card">
            <h2>Zero regression</h2>
            <p>Les parcours live/challenges restent sur le socle vanilla en production.</p>
          </article>
        </section>

        <section className="feature-card sessions-panel">
          <div className="panel-head">
            <h2>Dernieres sessions</h2>
            <a className="btn-secondary" href={toLegacy('/src/pages/home.html')}>Voir home legacy</a>
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
                  <Link className="btn-mini" href={`/session-builder?sessionId=${session.id}`}>Ouvrir</Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="feature-card">
          <h2>Prochaine etape</h2>
          <p>Lot 3: migration du Session Builder dans Next.js.</p>
          <Link className="btn-secondary" href="/contact">Contacter l equipe produit</Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
