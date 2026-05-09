'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import { getApiUrl } from '@/lib/config';

function parseUser() {
  const raw = sessionStorage.getItem('currentUser');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function authHeaders() {
  const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return '—';
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

function StatusBadge({ status }) {
  const map = {
    completed: { label: 'Terminé', color: 'var(--success, #22c55e)' },
    in_progress: { label: 'En cours', color: 'var(--warning, #f59e0b)' },
    abandoned: { label: 'Abandonné', color: 'var(--danger, #ef4444)' },
  };
  const { label, color } = map[status] || { label: status, color: 'var(--muted, #888)' };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 10px',
      borderRadius: 99,
      background: color + '22',
      color,
      fontSize: '0.78rem',
      fontWeight: 600,
      letterSpacing: '0.02em',
    }}>
      {label}
    </span>
  );
}

export default function SessionResultsClient() {
  const params = useParams();
  const sessionId = String(params?.sessionId || '');

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    const currentUser = parseUser();
    if (!token || !currentUser) {
      window.location.replace('/login');
      return;
    }
    setUser(currentUser);
  }, []);

  const loadData = useCallback(async () => {
    if (!sessionId) return;
    try {
      const [sessionRes, resultsRes] = await Promise.all([
        fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}`), { headers: authHeaders() }),
        fetch(getApiUrl(`/challenge-results/sessions/${encodeURIComponent(sessionId)}/results`), { headers: authHeaders() }),
      ]);

      if (!sessionRes.ok) throw new Error(`Session introuvable (${sessionRes.status})`);

      const sessionData = await sessionRes.json();
      setSession(sessionData);

      if (resultsRes.ok) {
        const resultsPayload = await resultsRes.json();
        setResults(Array.isArray(resultsPayload?.data) ? resultsPayload.data : []);
      }
    } catch (err) {
      setError(err.message || 'Impossible de charger les résultats.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  function logout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    window.location.replace('/login');
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

  const userLabel = user ? (user.first_name || user.email || 'Manager') : 'Manager';
  const isParticipant = user?.role === 'participant';

  if (loading) {
    return (
      <main className="shell auth-page">
        <section className="feature-card"><h1>Chargement des résultats...</h1></section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>Erreur</h1>
          <p>{error}</p>
          <Link href="/home" className="btn-secondary">Retour</Link>
        </section>
      </main>
    );
  }

  return (
    <>
      <AppNav userLabel={userLabel} onLogout={logout} role={user?.role} />
      <main className="shell app-home">
        {/* Header */}
        <section className="hero">
          <p className="eyebrow">RÉSULTATS DE SESSION</p>
          <h1>{session?.name || `Session ${sessionId}`}</h1>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {session?.status && <span className="eyebrow">Statut : {{ en_cours: 'En cours', preparee: 'En préparation', terminee: 'Terminée' }[session.status] || session.status}</span>}
            {session?.session_date && (
              <span className="eyebrow">Date : {new Date(session.session_date).toLocaleDateString('fr-FR')}</span>
            )}
          </div>
          <div className="hero-actions" style={{ marginTop: '1.5rem' }}>
            {!isParticipant && (
              <Link href="/home" className="btn-primary">Retour a l&apos;accueil</Link>
            )}
            {!isParticipant && (
              <Link
                href={`/session-live/${encodeURIComponent(sessionId)}`}
                className="btn-secondary"
              >
                Reprendre la session
              </Link>
            )}
            {isParticipant && (
              <Link href={`/participant?sessionId=${encodeURIComponent(sessionId)}`} className="btn-primary">
                Retour a la session
              </Link>
            )}
          </div>
        </section>

        {/* Stats overview */}
        <section className="feature-card">
          <h2>Vue d&apos;ensemble</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
            marginTop: '1rem',
          }}>
            {[
              { label: 'Participants', value: stats.uniqueParticipants },
              { label: 'Challenges joués', value: stats.uniqueChallenges },
              { label: 'Tentatives', value: stats.total },
              { label: 'Complétées', value: stats.completed },
              { label: 'Score moyen', value: stats.avgScore != null ? `${stats.avgScore} pts` : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                padding: '1rem',
                border: '1px solid var(--border, #e5e7eb)',
                borderRadius: 12,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted, #888)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Results by challenge */}
        {byChallenge.length > 0 ? (
          byChallenge.map(({ challenge, rows }) => (
            <section key={challenge?.id || 'unknown'} className="feature-card">
              <h2>{challenge?.name || challenge?.engine_key || 'Challenge'}</h2>
              {challenge?.engine_key && (
                <p className="eyebrow" style={{ marginBottom: '1rem' }}>{challenge.engine_key}</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {rows.map((r) => {
                  const name = [r.participant?.firstname, r.participant?.last_name]
                    .filter(Boolean).join(' ') || r.participant?.email || `Participant ${r.participant_id}`;
                  const duration = r.completed_at && r.created_at
                    ? formatDuration(new Date(r.completed_at) - new Date(r.created_at))
                    : '—';
                  return (
                    <div key={r.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      padding: '0.75rem 1rem',
                      border: '1px solid var(--border, #e5e7eb)',
                      borderRadius: 10,
                      background: 'var(--surface-alt, #fafafa)',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted, #888)' }}>
                          Durée : {duration}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {r.score != null && (
                          <span style={{ fontWeight: 700 }}>{r.score} pts</span>
                        )}
                        <StatusBadge status={r.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <section className="feature-card">
            <h2>Aucun résultat enregistré</h2>
            <p>Les résultats apparaîtront ici une fois que les participants auront joué.</p>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
