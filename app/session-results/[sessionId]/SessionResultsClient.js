'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import { clearSessionAuth, getAuthHeaders, getStoredAuthToken, getStoredCurrentUser } from '@/lib/auth';
import { getApiUrl } from '@/lib/config';
import useI18n from '@/lib/i18n/useI18n';

function formatDuration(ms) {
  if (!ms || ms <= 0) return '—';
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

function StatusBadge({ status, isEn }) {
  const map = {
    completed: { label: isEn ? 'Completed' : 'Terminé', className: 'session-results-status--completed' },
    in_progress: { label: isEn ? 'In progress' : 'En cours', className: 'session-results-status--in-progress' },
    abandoned: { label: isEn ? 'Abandoned' : 'Abandonné', className: 'session-results-status--abandoned' },
  };
  const { label, className } = map[status] || { label: status, className: 'session-results-status--default' };
  return (
    <span className={`session-results-status ${className}`}>
      {label}
    </span>
  );
}

export default function SessionResultsClient() {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  const params = useParams();
  const sessionId = String(params?.sessionId || '');

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [results, setResults] = useState([]);
  const [participationRate, setParticipationRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const authInitRef = useRef(false);

  // Auth guard
  useEffect(() => {
    if (authInitRef.current) {
      return;
    }

    const token = getStoredAuthToken();
    const currentUser = getStoredCurrentUser();
    if (!token || !currentUser) {
      window.location.replace(withLocalePath('/login'));
      return;
    }
    authInitRef.current = true;
    setUser(currentUser);
  }, [withLocalePath]);

  const loadData = useCallback(async () => {
    if (!sessionId) return;
    try {
      const [sessionRes, resultsRes, rateRes] = await Promise.all([
        fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}`), { headers: getAuthHeaders() }),
        fetch(getApiUrl(`/challenge-results/sessions/${encodeURIComponent(sessionId)}/results`), { headers: getAuthHeaders() }),
        fetch(getApiUrl(`/challenge-results/sessions/${encodeURIComponent(sessionId)}/participation-rate`), { headers: getAuthHeaders() }),
      ]);

      if (!sessionRes.ok) throw new Error(isEn ? `Session not found (${sessionRes.status})` : `Session introuvable (${sessionRes.status})`);

      const sessionData = await sessionRes.json();
      setSession(sessionData);

      if (resultsRes.ok) {
        const resultsPayload = await resultsRes.json();
        setResults(Array.isArray(resultsPayload?.data) ? resultsPayload.data : []);
      }

      if (rateRes.ok) {
        const ratePayload = await rateRes.json();
        setParticipationRate(ratePayload?.data ?? null);
      }
    } catch (err) {
      setError(err.message || (isEn ? 'Unable to load results.' : 'Impossible de charger les résultats.'));
    } finally {
      setLoading(false);
    }
  }, [isEn, sessionId]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  function logout() {
    clearSessionAuth();
    window.location.replace(withLocalePath('/login'));
  }

  // Aggregate stats from results
  const stats = useMemo(() => {
    const completed = results.filter((r) => r.status === 'completed').length;
    const scores = results.filter((r) => r.score != null).map((r) => Number(r.score));
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const uniqueParticipants = new Set(results.map((r) => r.participant_id)).size;
    const uniqueChallenges = new Set(results.map((r) => r.challenge_id)).size;
    return { completed, avgScore, uniqueParticipants, uniqueChallenges, total: results.length };
  }, [results]);

  // Group results by challenge
  const byChallenge = useMemo(() => {
    const map = new Map();
    for (const r of results) {
      const key = r.challenge?.id || r.challenge_id || 'unknown';
      if (!map.has(key)) map.set(key, { challenge: r.challenge, rows: [] });
      map.get(key).rows.push(r);
    }
    return Array.from(map.values());
  }, [results]);

  const userLabel = useMemo(() => {
    const first = String(user?.first_name || user?.firstName || '').trim();
    const last = String(user?.last_name || user?.lastName || '').trim();
    const full = `${first} ${last}`.trim();
    return full || first || String(user?.name || user?.email || 'Manager');
  }, [user]);
  const isParticipant = user?.role === 'participant';

  if (loading) {
    return (
      <main className="shell auth-page">
        <section className="feature-card"><h1>{isEn ? 'Loading results...' : 'Chargement des résultats...'}</h1></section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>{isEn ? 'Error' : 'Erreur'}</h1>
          <p>{error}</p>
          <Link href={withLocalePath('/home')} className="btn-secondary">{isEn ? 'Back' : 'Retour'}</Link>
        </section>
      </main>
    );
  }

  return (
    <>
      <AppNav userLabel={userLabel} onLogout={logout} role={user?.role} />
      <main className="shell app-home">
        <section className="hero session-results-hero">
          <p className="eyebrow">{isEn ? 'SESSION RESULTS' : 'RESULTATS DE SESSION'}</p>
          <h1 className="session-results-title">{session?.name || `Session ${sessionId}`}</h1>
          <div className="session-results-meta-row">
            {session?.status && (
              <span className="eyebrow">
                {isEn ? 'Status:' : 'Statut :'} {{
                  en_cours: isEn ? 'In progress' : 'En cours',
                  preparee: isEn ? 'Prepared' : 'En préparation',
                  terminee: isEn ? 'Completed' : 'Terminée'
                }[session.status] || session.status}
              </span>
            )}
            {session?.session_date && (
              <span className="eyebrow">
                {isEn ? 'Date:' : 'Date :'} {new Date(session.session_date).toLocaleDateString(isEn ? 'en-US' : 'fr-FR')}
              </span>
            )}
          </div>
          <div className="hero-actions session-results-actions">
            {!isParticipant && (
              <Link href={withLocalePath('/home')} className="btn-primary">{isEn ? 'Back to home' : 'Retour a l\'accueil'}</Link>
            )}
            {!isParticipant && (
              <Link
                href={withLocalePath(`/session-live/${encodeURIComponent(sessionId)}`)}
                className="btn-secondary"
              >
                {isEn ? 'Resume session' : 'Reprendre la session'}
              </Link>
            )}
            {isParticipant && (
              <Link href={withLocalePath(`/participant?sessionId=${encodeURIComponent(sessionId)}`)} className="btn-primary">
                {isEn ? 'Back to session' : 'Retour a la session'}
              </Link>
            )}
          </div>
        </section>

        <section className="feature-card session-results-overview">
          <h2>{isEn ? 'Overview' : 'Vue d\'ensemble'}</h2>
          <div className="session-results-stats-grid">
            {[
              { label: isEn ? 'Active participants' : 'Participants actifs', value: stats.uniqueParticipants },
              { label: isEn ? 'Participation rate' : 'Taux de participation', value: participationRate != null ? `${participationRate.rate}%` : '—' },
              { label: isEn ? 'Played challenges' : 'Challenges joués', value: stats.uniqueChallenges },
              { label: isEn ? 'Attempts' : 'Tentatives', value: stats.total },
              { label: isEn ? 'Completed' : 'Complétées', value: stats.completed },
              { label: isEn ? 'Average score' : 'Score moyen', value: stats.avgScore != null ? `${stats.avgScore} pts` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="session-results-stat-card">
                <div className="session-results-stat-label">{label}</div>
                <div className="session-results-stat-value">{value}</div>
              </div>
            ))}
          </div>
        </section>

        {byChallenge.length > 0 ? (
          byChallenge.map(({ challenge, rows }) => (
            <section key={challenge?.id || 'unknown'} className="feature-card session-results-challenge-card">
              <h2>{challenge?.name || challenge?.engine_key || (isEn ? 'Challenge' : 'Challenge')}</h2>
              {challenge?.engine_key && (
                <p className="eyebrow session-results-engine-key">{challenge.engine_key}</p>
              )}
              <div className="session-results-rows">
                {rows.map((r) => {
                  const name = [r.participant?.firstname, r.participant?.last_name]
                    .filter(Boolean).join(' ') || r.participant?.email || `${isEn ? 'Participant' : 'Participant'} ${r.participant_id}`;
                  const duration = r.completed_at && r.created_at
                    ? formatDuration(new Date(r.completed_at) - new Date(r.created_at))
                    : '—';
                  return (
                    <div key={r.id} className="session-results-row">
                      <div className="session-results-row-main">
                        <div className="session-results-row-name">{name}</div>
                        <div className="session-results-row-duration">
                          {isEn ? 'Duration:' : 'Durée :'} {duration}
                        </div>
                      </div>
                      <div className="session-results-row-metrics">
                        {r.score != null && (
                          <span className="session-results-score">{r.score} {isEn ? 'pts' : 'pts'}</span>
                        )}
                        <StatusBadge status={r.status} isEn={isEn} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <section className="feature-card">
            <h2>{isEn ? 'No results recorded' : 'Aucun résultat enregistré'}</h2>
            <p>{isEn ? 'Results will appear here once participants have played.' : 'Les résultats apparaîtront ici une fois que les participants auront joué.'}</p>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
