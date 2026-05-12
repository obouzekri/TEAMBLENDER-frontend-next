'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import ToastContainer from '@/components/ToastContainer';
import ChallengesCatalog from '@/components/SessionBuilder/ChallengesCatalog';
import SelectedChallengesList from '@/components/SessionBuilder/SelectedChallengesList';
import ChallengeConfigModal from '@/components/SessionBuilder/ChallengeConfigModal';
import ParticipantAssigner from '@/components/SessionBuilder/ParticipantAssigner';
import SessionBuilderHeader from '@/components/SessionBuilder/SessionBuilderHeader';
import useToast from '@/lib/useToast';
import useSessionBuilder from '@/lib/useSessionBuilder';
import { fetchWithRetry } from '@/lib/api';
import { getApiUrl } from '@/lib/config';
import styles from './SessionBuilder.module.css';
import { mockChallenges } from '@/lib/mockChallenges';

function useManagerGuard() {
  const [state, setState] = React.useState({ loading: true, allowed: false, user: null });

  useEffect(() => {
    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    const rawUser = sessionStorage.getItem('currentUser');
    let user = null;
    try {
      user = rawUser ? JSON.parse(rawUser) : null;
    } catch {
      user = null;
    }

    if (!token || !user) {
      window.location.replace('/login');
      return;
    }

    if (user.role === 'participant') {
      window.location.replace('/participant');
      return;
    }

    setState({ loading: false, allowed: true, user });
  }, []);

  return state;
}

function pickDisplayName(user) {
  if (!user || typeof user !== 'object') return 'Manager';
  const first = String(user.first_name || user.firstName || '').trim();
  const last = String(user.last_name || user.lastName || '').trim();
  const full = `${first} ${last}`.trim();
  return full || String(user.name || user.email || 'Manager');
}

export default function SessionBuilder() {
  const guard = useManagerGuard();
  const { toasts, removeToast, error: showErrorToast, loading: showLoadingToast } = useToast();
  const {
    selectedChallenges,
    filteredChallenges,
    filters,
    isLoading,
    configuring,
    setAllChallenges,
    setIsLoading,
    setError,
    selectChallenge,
    deselectChallenge,
    updateChallengeConfig,
    moveChallengeUp,
    moveChallengeDown,
    clearAll,
    updateFilters,
    resetFilters,
    setConfiguring,
    getTotalDuration,
  } = useSessionBuilder();

  const [isLaunching, setIsLaunching] = useState(false);
  const [sessionChallengesLoaded, setSessionChallengesLoaded] = useState(false);
  const [sessionStep, setSessionStep] = useState('name'); // 'name' | 'participants' | 'challenges'
  const [hasRouteSessionId, setHasRouteSessionId] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('sessionId') || params.get('id') || '';
  });
  const [sessionName, setSessionName] = useState('');
  const [flowMode, setFlowMode] = useState('manual');
  const [sessionDateTime, setSessionDateTime] = useState('');
  const [sessionParticipantCount, setSessionParticipantCount] = useState(0);
  const [isEditingSessionInfo, setIsEditingSessionInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editFlowMode, setEditFlowMode] = useState('manual');
  const [editDateTime, setEditDateTime] = useState('');
  const [isSavingSessionInfo, setIsSavingSessionInfo] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isAssigningParticipants, setIsAssigningParticipants] = useState(false);

  const userLabel = useMemo(() => pickDisplayName(guard.user), [guard.user]);
  const currentConfiguringChallenge = useMemo(
    () => selectedChallenges.find((c) => c.id === configuring) || null,
    [configuring, selectedChallenges]
  );

  // Enter challenge step only when editing an explicit session from URL
  useEffect(() => {
    if (hasRouteSessionId && sessionId && sessionStep === 'name') {
      setSessionStep('challenges');
    }
  }, [hasRouteSessionId, sessionId, sessionStep]);

  // On plain /session-builder, reset stale cached session id to start a new flow
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const routeSessionId = params.get('sessionId') || params.get('id') || '';
    setHasRouteSessionId(Boolean(routeSessionId));
    if (!routeSessionId) {
      sessionStorage.removeItem('sessionId');
      sessionStorage.removeItem('selectedChallenges');
      localStorage.removeItem('selectedChallenges');
      clearAll();
      setSessionChallengesLoaded(false);
    }
  }, [clearAll]);

  const getAuthToken = useCallback(
    () => localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '',
    []
  );

  const toIntegerId = useCallback((value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }, []);

  const apiRequest = useCallback(async (path, options = {}) => {
    const response = await fetch(getApiUrl(path), options);
    const rawText = await response.text();
    let payload = {};
    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch {
      payload = {};
    }

    if (!response.ok) {
      throw new Error(payload.error || `Erreur API (${response.status})`);
    }

    return payload;
  }, []);

  const ensureChallengesLinkedToSession = useCallback(
    async (selectedChallengeIds, token, markInProgress = false) => {
      if (!sessionId || !token || !selectedChallengeIds.length) return;

      const payload = {
        challenge_ids: selectedChallengeIds,
        active_challenge_id: selectedChallengeIds[0],
      };

      if (markInProgress) {
        payload.status = 'en_cours';
      }

      await apiRequest(`/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    },
    [apiRequest, sessionId]
  );

  const persistSelectionToBackend = useCallback(async () => {
    const token = getAuthToken();
    if (!sessionId || !token) return;

    const selectedChallengeIds = selectedChallenges
      .map((item) => toIntegerId(item.id))
      .filter((id) => id !== null);

    if (!selectedChallengeIds.length) {
      throw new Error('Aucun challenge API valide a enregistrer pour cette session.');
    }

    await ensureChallengesLinkedToSession(selectedChallengeIds, token, true);

    for (const challenge of selectedChallenges) {
      const challengeId = toIntegerId(challenge.id);
      if (!challengeId) continue;

      const config = challenge.config && typeof challenge.config === 'object' ? challenge.config : {};
      if (!Object.keys(config).length) continue;

      await apiRequest(`/sessions/${sessionId}/challenges/${challengeId}/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ config }),
      });
    }
  }, [
    apiRequest,
    ensureChallengesLinkedToSession,
    getAuthToken,
    selectedChallenges,
    sessionId,
    toIntegerId,
  ]);

  const handleLaunchSession = useCallback(async () => {
    if (!selectedChallenges.length || isLaunching) {
      return;
    }

    setIsLaunching(true);
    const loadingId = showLoadingToast('Enregistrement de la session...');

    try {
      sessionStorage.setItem('selectedChallenges', JSON.stringify(selectedChallenges));
      if (sessionId) {
        sessionStorage.setItem('sessionId', sessionId);
      }

      await persistSelectionToBackend();
      removeToast(loadingId);

      // Redirect to Next.js live session view (replaces legacy facilitator-session)
      const targetId = sessionId || sessionStorage.getItem('sessionId') || '';
      if (targetId) {
        window.location.replace(`/session-live/${encodeURIComponent(targetId)}`);
      } else {
        window.location.replace('/home');
      }
    } catch (error) {
      removeToast(loadingId);
      showErrorToast(error.message || 'Impossible de lancer la session pour le moment.');
      setIsLaunching(false);
    }
  }, [
    isLaunching,
    persistSelectionToBackend,
    removeToast,
    selectedChallenges,
    sessionId,
    showErrorToast,
    showLoadingToast,
  ]);

  // Load existing session if sessionId is provided and challenge catalog is available
  useEffect(() => {
    if (!sessionId || !guard.allowed || filteredChallenges.length === 0 || sessionChallengesLoaded) {
      return;
    }

    let cancelled = false;
    const token = getAuthToken();

    fetch(getApiUrl(`/sessions/${sessionId}`), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Session not found (${res.status})`);
        return res.json();
      })
      .then((session) => {
        if (!cancelled) {
          // Pre-populate session metadata
          if (session.name) setSessionName(session.name);
          setFlowMode(String(session.flow_mode || session.flowMode || 'manual').trim().toLowerCase() === 'auto' ? 'auto' : 'manual');
          if (session.session_date) {
            // DATEONLY from DB is "YYYY-MM-DD"; datetime-local needs "YYYY-MM-DDTHH:mm"
            const raw = String(session.session_date);
            setSessionDateTime(raw.length === 10 ? `${raw}T00:00` : '');
          }
          const assigned = Array.isArray(session.assigned_participants)
            ? session.assigned_participants
            : [];
          setSessionParticipantCount(assigned.length);

          // Pre-populate selectedChallenges from session
          const sessionChallenges = Array.isArray(session.challenges) ? session.challenges : [];
          sessionChallenges.forEach((sc) => {
            const challengeId = sc.id || sc.challenge_id;
            if (challengeId) {
              selectChallenge(challengeId);
              // After selection, update config if available
              if (sc.config) {
                updateChallengeConfig(challengeId, sc.config);
              }
            }
          });
          setSessionChallengesLoaded(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          // If session not found / not owned by current user, reset flow
          if (err.message.includes('404') || err.message.includes('not found')) {
            setSessionId('');
            sessionStorage.removeItem('sessionId');
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, '', '/session-builder');
            }
          }
          setSessionChallengesLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, guard.allowed, filteredChallenges, getAuthToken, sessionChallengesLoaded, selectChallenge, updateChallengeConfig]);

  // Charger les challenges au mount
  useEffect(() => {
    if (!guard.allowed) return;

    let cancelled = false;
    setIsLoading(true);
    const loadingId = showLoadingToast('Chargement du catalogue...');

    const token = getAuthToken();

    fetchWithRetry(getApiUrl('/challenges'), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then((data) => {
        if (!cancelled) {
          const challenges = Array.isArray(data) ? data : data.challenges || data.data || [];
          setAllChallenges(challenges);
          removeToast(loadingId);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          removeToast(loadingId);
          // Fallback à données mock en développement
          setAllChallenges(mockChallenges);
          setError(err.message || 'Catalogue indisponible, fallback local actif.');
          showErrorToast('Utilisation des données de développement (mock data)');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    getAuthToken,
    guard.allowed,
    removeToast,
    setAllChallenges,
    setError,
    setIsLoading,
    showErrorToast,
    showLoadingToast,
  ]);

  const handleCreateSession = useCallback(async (e) => {
    e.preventDefault();
    const name = sessionName.trim() || `Session du ${new Date().toLocaleDateString('fr-FR')}`;
    const sessionDate = sessionDateTime ? new Date(sessionDateTime) : null;
    if (sessionDateTime && Number.isNaN(sessionDate?.getTime())) {
      showErrorToast('Veuillez choisir une date et heure valides.');
      return;
    }
    const token = getAuthToken();
    setIsCreatingSession(true);
    const loadingId = showLoadingToast('Creation de la session...');
    try {
      const payload = { name };
      payload.flow_mode = flowMode;
      if (sessionDate) {
        payload.session_date = sessionDate.toISOString();
      }
      const created = await apiRequest('/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const newId = String(created.id || created.session?.id || '');
      if (!newId) throw new Error('Identifiant de session manquant dans la reponse.');
      sessionStorage.setItem('sessionId', newId);
      setSessionId(newId);
      removeToast(loadingId);
      // Move to participants assignment step
      setSessionStep('participants');
    } catch (err) {
      removeToast(loadingId);
      showErrorToast(err.message || 'Impossible de creer la session.');
    } finally {
      setIsCreatingSession(false);
    }
  }, [apiRequest, getAuthToken, removeToast, sessionDateTime, sessionName, showErrorToast, showLoadingToast]);

  const handleSaveSessionInfo = useCallback(async () => {
    const token = getAuthToken();
    setIsSavingSessionInfo(true);
    try {
      const payload = {};
      const trimmedName = editName.trim();
      if (trimmedName) payload.name = trimmedName;
      if (editFlowMode !== flowMode) payload.flow_mode = editFlowMode;
      if (editDateTime) {
        const d = new Date(editDateTime);
        if (!Number.isNaN(d.getTime())) payload.session_date = d.toISOString();
      }
      if (!Object.keys(payload).length) {
        setIsEditingSessionInfo(false);
        return;
      }
      await apiRequest(`/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (trimmedName) setSessionName(trimmedName);
      setFlowMode(editFlowMode);
      setSessionDateTime(editDateTime);
      setIsEditingSessionInfo(false);
    } catch (err) {
      showErrorToast(err.message || 'Impossible de mettre à jour la session.');
    } finally {
      setIsSavingSessionInfo(false);
    }
  }, [apiRequest, editDateTime, editName, getAuthToken, sessionId, showErrorToast]);

  const handleAssignParticipants = useCallback(async (selectedParticipantIds) => {
    setIsAssigningParticipants(true);
    const loadingId = showLoadingToast('Assignation des participants...');
    const token = getAuthToken();

    try {
      // Update session with participant_ids (single source of truth)
      await apiRequest(`/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ participant_ids: selectedParticipantIds }),
      });
      removeToast(loadingId);
      sessionStorage.setItem('sessionId', sessionId);
      setSessionParticipantCount(selectedParticipantIds.length);
      // Move to challenges selection step
      setSessionStep('challenges');
    } catch (err) {
      removeToast(loadingId);
      showErrorToast(err.message || 'Impossible d\'assigner les participants.');
    } finally {
      setIsAssigningParticipants(false);
    }
  }, [apiRequest, getAuthToken, sessionId, removeToast, showErrorToast, showLoadingToast]);

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
          <h1>Vérification de la session...</h1>
          <p>Chargement en cours.</p>
        </section>
      </main>
    );
  }

  if (!sessionId) {
    return (
      <>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <AppNav userLabel={userLabel} onLogout={logout} />
        <main className="shell auth-page">
          <section className="feature-card" style={{ maxWidth: '480px', margin: '0 auto' }}>
            <p className="eyebrow">NOUVELLE SESSION</p>
            <h1 style={{ fontSize: '1.6rem', margin: '0.25rem 0 0.75rem' }}>Préparer la session</h1>
            <p style={{ color: 'var(--color-muted, #6b7280)', marginBottom: '1.25rem', fontSize: '14px' }}>
              Donnez un nom à votre session et indiquez sa date prévue pour garder un cadrage clair avant l’animation.
            </p>
            <form onSubmit={handleCreateSession} className={styles.creationForm}>
              <div className={styles.creationGrid}>
                <label className={styles.creationField}>
                  <span>Nom de la session</span>
                  <input
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="Ex: Team Building Q2 2026"
                    autoFocus
                    required
                  />
                </label>
                <label className={styles.creationField}>
                  <span>Date et heure prévues</span>
                  <input
                    type="datetime-local"
                    value={sessionDateTime}
                    onChange={(e) => setSessionDateTime(e.target.value)}
                    step="60"
                  />
                </label>
              </div>
              <div className={styles.creationField} style={{ marginTop: '1rem' }}>
                <span>Mode de progression des challenges</span>
                <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.85rem 1rem', border: '1px solid var(--color-border, #d1d5db)', borderRadius: '12px', background: flowMode === 'manual' ? 'rgba(15, 23, 42, 0.04)' : '#fff' }}>
                    <input
                      type="radio"
                      name="flowMode"
                      value="manual"
                      checked={flowMode === 'manual'}
                      onChange={() => setFlowMode('manual')}
                    />
                    <span>
                      <strong>Manuel</strong><br />
                      Le facilitateur garde la main et passe au challenge suivant quand il le décide.
                    </span>
                  </label>
                  <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.85rem 1rem', border: '1px solid var(--color-border, #d1d5db)', borderRadius: '12px', background: flowMode === 'auto' ? 'rgba(15, 23, 42, 0.04)' : '#fff' }}>
                    <input
                      type="radio"
                      name="flowMode"
                      value="auto"
                      checked={flowMode === 'auto'}
                      onChange={() => setFlowMode('auto')}
                    />
                    <span>
                      <strong>Automatique</strong><br />
                      Les challenges s&apos;enchaînent automatiquement après la fin du challenge en cours.
                    </span>
                  </label>
                </div>
              </div>
              <p className={styles.creationHint}>
                La date de session est facultative, mais elle aide à planifier et relire vos sessions plus vite.
              </p>
              <button type="submit" className="btn-primary" disabled={isCreatingSession}>
                {isCreatingSession ? 'Creation...' : 'Creer la session'}
              </button>
            </form>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  // Step 2: Assign Participants
  if (sessionStep === 'participants') {
    return (
      <>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <AppNav userLabel={userLabel} onLogout={logout} />
        <main className="shell">
          <ParticipantAssigner
            isLoading={isAssigningParticipants}
            onAssign={handleAssignParticipants}
            onCancel={() => {
              setSessionId('');
              setSessionName('');
              setSessionStep('name');
              sessionStorage.removeItem('sessionId');
            }}
          />
        </main>
        <Footer />
      </>
    );
  }

  // Step 3: Select Challenges

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AppNav userLabel={userLabel} onLogout={logout} />
      
      <main className={`shell ${styles.sessionBuilder}`}>
        <SessionBuilderHeader
          selectedCount={selectedChallenges.length}
          totalDuration={getTotalDuration()}
          isLaunchDisabled={selectedChallenges.length === 0}
          isLaunching={isLaunching}
          onLaunch={handleLaunchSession}
        />

        {/* Session info bar */}
        <div className={styles.sessionInfoBar}>
          {isEditingSessionInfo ? (
            <>
              <input
                className={styles.sessionInfoInput}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nom de la session"
              />
              <input
                className={styles.sessionInfoInput}
                type="datetime-local"
                value={editDateTime}
                onChange={(e) => setEditDateTime(e.target.value)}
                step="60"
              />
              <select
                className={styles.sessionInfoInput}
                value={editFlowMode}
                onChange={(e) => setEditFlowMode(e.target.value)}
              >
                <option value="manual">Mode manuel</option>
                <option value="auto">Mode automatique</option>
              </select>
              <button
                className="btn-primary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                onClick={handleSaveSessionInfo}
                disabled={isSavingSessionInfo}
              >
                {isSavingSessionInfo ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              <button
                className="btn-secondary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                onClick={() => setIsEditingSessionInfo(false)}
              >
                Annuler
              </button>
            </>
          ) : (
            <>
              <span className={styles.sessionInfoName}>{sessionName || 'Session sans nom'}</span>
              {sessionDateTime && (
                <span className={styles.sessionInfoDate}>
                  {new Date(sessionDateTime).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              )}
              {sessionParticipantCount > 0 && (
                <span className={styles.sessionInfoBadge}>
                  {sessionParticipantCount} participant{sessionParticipantCount > 1 ? 's' : ''}
                </span>
              )}
              <span className={styles.sessionInfoBadge}>
                Mode {flowMode === 'auto' ? 'automatique' : 'manuel'}
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button
                  className="btn-secondary"
                  style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}
                  onClick={() => {
                    setEditName(sessionName);
                    setEditFlowMode(flowMode);
                    setEditDateTime(sessionDateTime);
                    setIsEditingSessionInfo(true);
                  }}
                >
                  Modifier la session
                </button>
                <button
                  className="btn-secondary"
                  style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}
                  onClick={() => setSessionStep('participants')}
                >
                  Modifier les participants
                </button>
              </div>
            </>
          )}
        </div>

        <div className={styles.mainLayout}>
          <SelectedChallengesList
            challenges={selectedChallenges}
            onConfigure={(id) => setConfiguring(id)}
            onRemove={deselectChallenge}
            onMoveUp={moveChallengeUp}
            onMoveDown={moveChallengeDown}
            onClearAll={clearAll}
          />

          <ChallengesCatalog
            challenges={filteredChallenges}
            selectedIds={selectedChallenges.map((c) => c.id)}
            filters={filters}
            isLoading={isLoading}
            onSelect={selectChallenge}
            onConfigure={(id) => setConfiguring(id)}
            onFilterChange={updateFilters}
            onResetFilters={resetFilters}
          />
        </div>
      </main>

      {configuring && currentConfiguringChallenge && (
        <ChallengeConfigModal
          challengeId={configuring}
          challenge={currentConfiguringChallenge}
          onSave={(config) => updateChallengeConfig(configuring, config)}
          onClose={() => setConfiguring(null)}
        />
      )}

      <Footer />
    </>
  );
}
