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
  const [kpis, setKpis] = useState(null);
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
      const [sessionRes, resultsRes, rateRes, kpisRes] = await Promise.all([
        fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}`), { headers: getAuthHeaders() }),
        fetch(getApiUrl(`/challenge-results/sessions/${encodeURIComponent(sessionId)}/results`), { headers: getAuthHeaders() }),
        fetch(getApiUrl(`/challenge-results/sessions/${encodeURIComponent(sessionId)}/participation-rate`), { headers: getAuthHeaders() }),
        fetch(getApiUrl(`/challenge-results/sessions/${encodeURIComponent(sessionId)}/kpis`), { headers: getAuthHeaders() }),
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

      if (kpisRes.ok) {
        const kpisPayload = await kpisRes.json();
        setKpis(kpisPayload?.data ?? null);
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
    return {
      completed: kpis?.completed_challenges ?? completed,
      avgScore: kpis?.average_score ?? avgScore,
      uniqueParticipants: kpis?.active_participants ?? uniqueParticipants,
      uniqueChallenges: kpis?.challenges_played ?? uniqueChallenges,
      total: results.length || kpis?.answer_submissions || 0,
      answerSubmissions: kpis?.answer_submissions ?? 0,
      participationRate: kpis?.participation_rate ?? participationRate?.rate ?? null,
      totalInvited: kpis?.total_invited ?? participationRate?.total_invited ?? 0,
    };
  }, [kpis, participationRate, results]);

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

  const challengeInsights = kpis?.challenge_insights || [];
  const participantContributions = kpis?.participant_contributions || [];

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
              { label: isEn ? 'Participation rate' : 'Taux de participation', value: stats.participationRate != null ? `${stats.participationRate}%` : '—' },
              { label: isEn ? 'Played challenges' : 'Challenges joués', value: stats.uniqueChallenges },
              { label: isEn ? 'Answer submissions' : 'Soumissions', value: stats.answerSubmissions },
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

        {challengeInsights.length > 0 && (
          <section className="feature-card session-results-summary-card">
            <h2>{isEn ? 'Challenge insights' : 'Analyses par challenge'}</h2>
            <div className="session-results-insight-grid">
              {challengeInsights.map((insight) => (
                <div key={insight.challenge_id} className="session-results-insight-item">
                  <div className="session-results-insight-title">{insight.challenge_name}</div>
                  <div className="session-results-insight-metrics">
                    <span>{insight.completed}/{insight.attempts} {isEn ? 'completed' : 'terminés'}</span>
                    <span>{insight.completion_rate}% {isEn ? 'completion' : 'de complétion'}</span>
                    <span>{insight.answer_submissions} {isEn ? 'responses' : 'réponses'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {participantContributions.length > 0 && (
          <section className="feature-card session-results-summary-card">
            <h2>{isEn ? 'Participation contribution' : 'Contribution des participants'}</h2>
            <div className="session-results-insight-grid">
              {participantContributions.map((participant) => (
                <div key={participant.participant_id} className="session-results-insight-item">
                  <div className="session-results-insight-title">{participant.participant_name}</div>
                  <div className="session-results-insight-metrics">
                    <span>{participant.attempts} {isEn ? 'attempts' : 'tentatives'}</span>
                    <span>{participant.completed} {isEn ? 'completed' : 'terminées'}</span>
                    <span>{participant.answer_submissions} {isEn ? 'responses' : 'réponses'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {byChallenge.length > 0 ? (
          byChallenge.map(({ challenge, rows }) => {
            const challengeScores = rows.filter((row) => row.score != null).map((row) => Number(row.score));
            const challengeAverage = challengeScores.length
              ? Math.round(challengeScores.reduce((sum, value) => sum + value, 0) / challengeScores.length)
              : null;
            const challengeCompleted = rows.filter((row) => row.status === 'completed').length;

            return (
              <section key={challenge?.id || 'unknown'} className="feature-card session-results-challenge-card">
                <div className="session-results-challenge-header">
                  <div>
                    <h2>{challenge?.name || challenge?.engine_key || (isEn ? 'Challenge' : 'Challenge')}</h2>
                    {challenge?.engine_key && (
                      <p className="eyebrow session-results-engine-key">{challenge.engine_key}</p>
                    )}
                  </div>
                  <div className="session-results-challenge-summary">
                    <span>{challengeCompleted} {isEn ? 'done' : 'terminés'}</span>
                    <span>{challengeAverage != null ? `${challengeAverage} pts` : (isEn ? 'No score yet' : 'Pas de score')}</span>
                  </div>
                </div>
                <div className="session-results-rows">
                  {rows.map((r) => {
                    const name = String(r.participant_name || r.participant_name_snapshot || '').trim()
                      || `${isEn ? 'Participant' : 'Participant'} ${r.participant_id}`;
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
            );
          })
        ) : (
          <section className="feature-card session-results-empty">
            <h2>{isEn ? 'No results recorded' : 'Aucun résultat enregistré'}</h2>
            <p>
              {stats.totalInvited > 0
                ? (isEn
                  ? `The session has ${stats.totalInvited} assigned participant(s), but no challenge attempts have been captured yet.`
                  : `La session compte ${stats.totalInvited} participant(s) assigné(s), mais aucune tentative de challenge n'a encore été enregistrée.`)
                : (isEn
                  ? 'Results will appear here once participants have played.'
                  : 'Les résultats apparaîtront ici une fois que les participants auront joué.')}
            </p>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
