'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import { clearSessionAuth, getAuthHeaders, getStoredCurrentUser } from '@/lib/auth';
import { getApiUrl } from '@/lib/config';
import useI18n from '@/lib/i18n/useI18n';
import { formatDate } from '@/lib/i18n/format';
import { fetchSessionResults } from '@/lib/session-results';
import { trackProductSessionEvent } from '@/lib/analytics';
import { translate } from '@/lib/i18n';

function formatDuration(ms) {
  if (!ms || ms <= 0) return '—';
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

function StatusBadge({ status, locale }) {
  const map = {
    completed: { label: translate(locale, 'sessionResults.completed5'), className: 'session-results-status--completed' },
    in_progress: { label: translate(locale, 'sessionResults.inProgress'), className: 'session-results-status--in-progress' },
    abandoned: { label: translate(locale, 'sessionResults.abandoned'), className: 'session-results-status--abandoned' },
  };
  const { label, className } = map[status] || { label: status, className: 'session-results-status--default' };
  return (
    <span className={`session-results-status ${className}`}>
      {label}
    </span>
  );
}

export default function SessionResultsClient() {
  const { locale, withLocalePath, t } = useI18n();
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
  const loadControllerRef = useRef(null);
  const resultsViewedSessionRef = useRef('');

  // Auth guard
  useEffect(() => {
    if (authInitRef.current) {
      return;
    }

    const currentUser = getStoredCurrentUser();
    if (!currentUser) {
      window.location.replace(withLocalePath('/login'));
      return;
    }
    authInitRef.current = true;
    setUser(currentUser);
  }, [withLocalePath]);

  const loadData = useCallback(async () => {
    if (!sessionId) return;
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;
    const { signal } = controller;
    setLoading(true);
    setError('');
    try {
      const data = await fetchSessionResults({ sessionId, getApiUrl, headers: getAuthHeaders(), signal, locale });
      if (signal?.aborted) return;
      setSession(data.session);
      setResults(data.results);
      setParticipationRate(data.participationRate);
      setKpis(data.kpis);
      if (resultsViewedSessionRef.current !== sessionId) {
        resultsViewedSessionRef.current = sessionId;
        trackProductSessionEvent('results_viewed', {
          sessionId,
          sessionStatus: data.session.status,
          challengeCount: new Set(data.results.map((result) => result.challenge_id).filter(Boolean)).size,
          surface: 'session_results',
        });
      }
    } catch (err) {
      if (signal?.aborted) return;
      setError(err.message || t('sessionResults.unableToLoadResults'));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [locale, sessionId]);

  useEffect(() => {
    if (!user) return;
    loadData();
    return () => loadControllerRef.current?.abort();
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
        <section className="feature-card"><h1>{t('sessionResults.loadingResults')}</h1></section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>{t('sessionResults.unableToLoadResults2')}</h1>
          <p role="alert">{error}</p>
          <p>{t('sessionResults.theDataCouldNotBeRetrieved')}</p>
          <div className="hero-actions">
            <button type="button" className="btn-primary" onClick={() => loadData()}>{t('sessionResults.retry')}</button>
            <Link href={withLocalePath(user?.role === 'participant' ? '/participant' : '/home')} className="btn-secondary">{t('sessionResults.back')}</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      <AppNav userLabel={userLabel} onLogout={logout} role={user?.role} />
      <main className="shell app-home">
        <section className="hero session-results-hero">
          <p className="eyebrow">{t('sessionResults.sessionResults')}</p>
          <h1 className="session-results-title">{session?.name || `Session ${sessionId}`}</h1>
          <div className="session-results-meta-row">
            {session?.status && (
              <span className="eyebrow">
                {t('sessionResults.status')} {{
                  en_cours: t('sessionResults.inProgress'),
                  preparee: t('sessionResults.prepared'),
                  terminee: t('sessionResults.completed')
                }[session.status] || session.status}
              </span>
            )}
            {session?.session_date && (
              <span className="eyebrow">
                {t('sessionResults.date')} {formatDate(session.session_date, locale, {})}
              </span>
            )}
          </div>
          <div className="hero-actions session-results-actions">
            {!isParticipant && (
              <Link href={withLocalePath('/home')} className="btn-primary">{t('sessionResults.backToHome')}</Link>
            )}
            {!isParticipant && (
              <Link
                href={withLocalePath(`/session-live/${encodeURIComponent(sessionId)}`)}
                className="btn-secondary"
              >
                {t('sessionResults.resumeSession')}
              </Link>
            )}
            {isParticipant && (
              <Link href={withLocalePath(`/participant?sessionId=${encodeURIComponent(sessionId)}`)} className="btn-primary">
                {t('sessionResults.backToSession')}
              </Link>
            )}
          </div>
        </section>

        <section className="feature-card session-results-overview">
          <h2>{t('sessionResults.overview')}</h2>
          <div className="session-results-stats-grid">
            {[
              { label: t('sessionResults.activeParticipants'), value: stats.uniqueParticipants },
              { label: t('sessionResults.participationRate'), value: stats.participationRate != null ? `${stats.participationRate}%` : '—' },
              { label: t('sessionResults.playedChallenges'), value: stats.uniqueChallenges },
              { label: t('sessionResults.answerSubmissions'), value: stats.answerSubmissions },
              { label: t('sessionResults.completed2'), value: stats.completed },
              { label: t('sessionResults.averageScore'), value: stats.avgScore != null ? `${stats.avgScore} pts` : '—' },
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
            <h2>{t('sessionResults.challengeInsights')}</h2>
            <div className="session-results-insight-grid">
              {challengeInsights.map((insight) => (
                <div key={insight.challenge_id} className="session-results-insight-item">
                  <div className="session-results-insight-title">{insight.challenge_name}</div>
                  <div className="session-results-insight-metrics">
                    <span>{insight.completed}/{insight.attempts} {t('sessionResults.completed3')}</span>
                    <span>{insight.completion_rate}% {t('sessionResults.completion')}</span>
                    <span>{insight.answer_submissions} {t('sessionResults.responses')}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {participantContributions.length > 0 && (
          <section className="feature-card session-results-summary-card">
            <h2>{t('sessionResults.participationContribution')}</h2>
            <div className="session-results-insight-grid">
              {participantContributions.map((participant) => (
                <div key={participant.participant_id} className="session-results-insight-item">
                  <div className="session-results-insight-title">{participant.participant_name}</div>
                  <div className="session-results-insight-metrics">
                    <span>{participant.attempts} {t('sessionResults.attempts')}</span>
                    <span>{participant.completed} {t('sessionResults.completed4')}</span>
                    <span>{participant.answer_submissions} {t('sessionResults.responses')}</span>
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
                    <h2>{challenge?.name || challenge?.engine_key || t('sessionResults.challenge')}</h2>
                    {challenge?.engine_key && (
                      <p className="eyebrow session-results-engine-key">{challenge.engine_key}</p>
                    )}
                  </div>
                  <div className="session-results-challenge-summary">
                    <span>{challengeCompleted} {t('sessionResults.done')}</span>
                    <span>{challengeAverage != null ? `${challengeAverage} pts` : t('sessionResults.noScoreYet')}</span>
                  </div>
                </div>
                <div className="session-results-rows">
                  {rows.map((r) => {
                    const name = String(r.participant_name || r.participant_name_snapshot || '').trim()
                      || `${t('sessionResults.participant')} ${r.participant_id}`;
                    const duration = r.completed_at && r.created_at
                      ? formatDuration(new Date(r.completed_at) - new Date(r.created_at))
                      : '—';
                    return (
                      <div key={r.id} className="session-results-row">
                        <div className="session-results-row-main">
                          <div className="session-results-row-name">{name}</div>
                          <div className="session-results-row-duration">
                            {t('sessionResults.duration')} {duration}
                          </div>
                          {r.engine_key === 'crossword_live_v1' && (
                            <div className="session-results-row-duration">
                              {t('sessionResults.wordsFound')}
                              {(r.data?.words_found || []).map((word) => word.answer).join(', ') || t('sessionResults.none')}
                              {' · '}
                              {t('sessionResults.sharedCompletion')}
                              {r.data?.completion_percent ?? 0}%
                            </div>
                          )}
                        </div>
                        <div className="session-results-row-metrics">
                          {r.score != null && (
                            <span className="session-results-score">{r.score} {t('sessionResults.pts')}</span>
                          )}
                          <StatusBadge status={r.status} locale={locale} />
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
            <h2>{t('sessionResults.noResultsRecorded')}</h2>
            <p>
              {stats.totalInvited > 0
                ? t('sessionResults.theSessionHasTotalinvitedAssignedParticipant', { totalInvited: stats.totalInvited })
                : t('sessionResults.resultsWillAppearHereOnceParticipants')}
            </p>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
