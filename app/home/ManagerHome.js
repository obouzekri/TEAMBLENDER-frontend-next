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
  const { toasts, removeToast, error: showErrorToast, loading: showLoadingToast, success: showSuccessToast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(8);

  const userLabel = useMemo(() => pickDisplayName(guard.user), [guard.user]);

  const STATUS_LABEL = { en_cours: 'En cours', preparee: 'En préparation', terminee: 'Terminée' };

  const sessionStats = useMemo(() => ({
    enCours: sessions.filter((s) => s.status === 'en_cours').length,
    preparee: sessions.filter((s) => s.status === 'preparee').length,
    terminee: sessions.filter((s) => s.status === 'terminee').length,
  }), [sessions]);

  const filteredSessions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return sessions.filter((session) => {
      const statusOk = statusFilter === 'all' || session.status === statusFilter;
      if (!statusOk) return false;
      if (!query) return true;
      const haystack = [session.name, session.status, session.format, session.modality]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [sessions, searchTerm, statusFilter]);

  const visibleSessions = useMemo(() => filteredSessions.slice(0, visibleCount), [filteredSessions, visibleCount]);

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

  async function handleDeleteSession(session) {
    if (!guard.token || !session?.id) return;
    const label = session.name || `Session #${session.id}`;
    const accepted = window.confirm(`Supprimer ${label} ? Cette action est irreversible.`);
    if (!accepted) return;

    setDeletingSessionId(session.id);
    try {
      const response = await fetch(getApiUrl(`/sessions/${encodeURIComponent(session.id)}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${guard.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Erreur ${response.status}`);
      }

      setSessions((prev) => prev.filter((item) => String(item.id) !== String(session.id)));
      showSuccessToast('Session supprimee.');
    } catch (err) {
      showErrorToast(err.message || 'Suppression impossible.');
    } finally {
      setDeletingSessionId(null);
    }
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
            {guard.user?.role === 'admin' && (
              <Link className="btn-secondary" href="/admin">Console admin</Link>
            )}
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

          <div className="filters-row">
            <input
              type="search"
              className="inline-input"
              placeholder="Rechercher une session..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(8);
              }}
            />
            <select
              className="inline-input"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setVisibleCount(8);
              }}
            >
              <option value="all">Tous les statuts</option>
              <option value="en_cours">En cours</option>
              <option value="preparee">En preparation</option>
              <option value="terminee">Terminee</option>
            </select>
          </div>

          {loadingSessions ? (
            <div className="session-skeletons">
              {[...Array(3)].map((_, i) => (
                <SessionCardSkeleton key={i} />
              ))}
            </div>
          ) : null}

          {!loadingSessions && filteredSessions.length === 0 ? (
            <p>Aucune session trouvee pour le moment.</p>
          ) : null}

          {!loadingSessions && filteredSessions.length > 0 ? (
            <ul className="session-list">
              {visibleSessions.map((session) => (
                <li key={String(session.id)} className="session-item">
                  <div>
                    <p className="session-title">{session.name || `Session #${session.id}`}</p>
                    <p className="session-meta">{STATUS_LABEL[session.status] || session.status || 'En préparation'}</p>
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
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleDeleteSession(session)}
                    disabled={deletingSessionId === session.id}
                    style={{ minWidth: '96px' }}
                  >
                    {deletingSessionId === session.id ? 'Suppression...' : 'Supprimer'}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {!loadingSessions && filteredSessions.length > visibleCount ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setVisibleCount((prev) => prev + 8)}
            >
              Afficher plus
            </button>
          ) : null}

          {!loadingSessions && filteredSessions.length > 8 && visibleCount > 8 ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setVisibleCount(8)}
            >
              Replier la liste
            </button>
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
