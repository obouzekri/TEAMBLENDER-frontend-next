'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
import { ENABLE_CHALLENGES_MOCK_DATA, getApiUrl } from '@/lib/config';
import styles from './SessionBuilder.module.css';
import { mockChallenges } from '@/lib/mockChallenges';

const SESSION_ID_STORAGE_KEY = 'sessionId';
const SELECTED_CHALLENGES_STORAGE_KEY = 'selectedChallenges';
const DRAFT_STORAGE_PREFIX = 'sessionBuilderDraft:';

function getDraftStorageKey(sessionId) {
  const normalizedId = String(sessionId || '').trim();
  if (!normalizedId) return null;
  return `${DRAFT_STORAGE_PREFIX}${normalizedId}`;
}

function readDraftFromStorage(sessionId) {
  if (typeof window === 'undefined') return null;
  const storageKey = getDraftStorageKey(sessionId);
  if (!storageKey) return null;

  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.selectedChallenges)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistDraftToStorage(sessionId, selectedChallenges) {
  if (typeof window === 'undefined') return null;
  const storageKey = getDraftStorageKey(sessionId);
  if (!storageKey) return null;

  const nowIso = new Date().toISOString();
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      sessionId: String(sessionId),
      selectedChallenges,
      updatedAt: nowIso,
    })
  );

  // Kept for compatibility with existing manager flow and live page reads.
  sessionStorage.setItem(SELECTED_CHALLENGES_STORAGE_KEY, JSON.stringify(selectedChallenges));
  localStorage.setItem(SELECTED_CHALLENGES_STORAGE_KEY, JSON.stringify(selectedChallenges));
  sessionStorage.setItem(SESSION_ID_STORAGE_KEY, String(sessionId));

  return nowIso;
}

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
  const [hasRouteSessionId, setHasRouteSessionId] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('sessionId') || params.get('id') || sessionStorage.getItem(SESSION_ID_STORAGE_KEY) || '';
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
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastLocalDraftSaveAt, setLastLocalDraftSaveAt] = useState('');
  const [lastBackendSaveAt, setLastBackendSaveAt] = useState('');
  const [draftParticipantIds, setDraftParticipantIds] = useState([]);
  const [availableParticipantsCount, setAvailableParticipantsCount] = useState(0);
  const [loadedFromLocalDraft, setLoadedFromLocalDraft] = useState(false);
  const [selectedChallengesSnapshot, setSelectedChallengesSnapshot] = useState('[]');
  const hasHydratedSessionSelectionRef = useRef(false);

  const userLabel = useMemo(() => pickDisplayName(guard.user), [guard.user]);
  const asyncStatusMessage = isCreatingSession
    ? 'Cr�ation de la session en cours...'
    : isSavingSessionInfo
      ? 'Sauvegarde des informations de session en cours...'
      : isLaunching
        ? 'Lancement de la session en cours...'
        : isLoading
          ? 'Chargement du catalogue en cours...'
          : '';
  const currentConfiguringChallenge = useMemo(
    () => selectedChallenges.find((c) => c.id === configuring) || null,
    [configuring, selectedChallenges]
  );
  const selectedChallengesJson = useMemo(
    () => JSON.stringify(selectedChallenges),
    [selectedChallenges]
  );
  const hasUnsavedBackendChanges = sessionId && selectedChallengesJson !== selectedChallengesSnapshot;

  // On plain /session-builder, reset stale cached session id to start a new flow
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const routeSessionId = params.get('sessionId') || params.get('id') || '';
    setHasRouteSessionId(Boolean(routeSessionId));
    if (routeSessionId) {
      sessionStorage.setItem(SESSION_ID_STORAGE_KEY, routeSessionId);
      if (routeSessionId !== sessionId) {
        setSessionId(routeSessionId);
      }
      return;
    }

    const cachedSessionId = sessionStorage.getItem(SESSION_ID_STORAGE_KEY) || '';
    const hasCachedDraft = Boolean(cachedSessionId && readDraftFromStorage(cachedSessionId));
    if (cachedSessionId && hasCachedDraft) {
      if (cachedSessionId !== sessionId) {
        setSessionId(cachedSessionId);
      }
      return;
    }

    if (!routeSessionId && (!cachedSessionId || !hasCachedDraft)) {
      sessionStorage.removeItem(SESSION_ID_STORAGE_KEY);
      sessionStorage.removeItem(SELECTED_CHALLENGES_STORAGE_KEY);
      localStorage.removeItem(SELECTED_CHALLENGES_STORAGE_KEY);
      clearAll();
      setSessionChallengesLoaded(false);
      hasHydratedSessionSelectionRef.current = false;
    }
  }, [clearAll, sessionId]);

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

    if (response.status === 401) {
      logout();
      const unauthorizedError = new Error('Session expirée. Veuillez vous reconnecter.');
      unauthorizedError.status = 401;
      throw unauthorizedError;
    }

    const rawText = await response.text();
    let payload = {};
    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch {
      payload = {};
    }

    if (!response.ok) {
      const method = String(options.method || 'GET').toUpperCase();
      const normalizedPath = String(path || '');
      const isChallengeConfigPatch =
        method === 'PATCH' &&
        /\/sessions\/[^/]+\/challenges\/[^/]+\/config$/.test(normalizedPath);

      if (response.status === 404 && isChallengeConfigPatch) {
        throw new Error(
          'Endpoint introuvable (404) pendant la sauvegarde de la configuration challenge. Vérifiez NEXT_PUBLIC_API_BASE (utiliser /api ou https://.../api) et que la session existe toujours.'
        );
      }

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

  const persistSelectionToBackend = useCallback(async (markInProgress = false) => {
    const token = getAuthToken();
    if (!sessionId || !token) return;

    const selectedChallengeIds = selectedChallenges
      .map((item) => toIntegerId(item.id))
      .filter((id) => id !== null);

    if (!selectedChallengeIds.length) {
      throw new Error('Aucun challenge API valide a enregistrer pour cette session.');
    }

    await ensureChallengesLinkedToSession(selectedChallengeIds, token, markInProgress);

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

    setSelectedChallengesSnapshot(JSON.stringify(selectedChallenges));
    setLastBackendSaveAt(new Date().toISOString());
  }, [
    apiRequest,
    ensureChallengesLinkedToSession,
    getAuthToken,
    selectedChallenges,
    sessionId,
    toIntegerId,
  ]);

  const restoreSelectedChallenges = useCallback(
    (challenges) => {
      const source = Array.isArray(challenges) ? challenges : [];
      clearAll();

      source.forEach((challenge) => {
        const challengeId = challenge?.id ?? challenge?.challenge_id;
        if (!challengeId) return;
        selectChallenge(challengeId);
        if (challenge?.config && typeof challenge.config === 'object') {
          updateChallengeConfig(challengeId, challenge.config);
        }
      });
    },
    [clearAll, selectChallenge, updateChallengeConfig]
  );

  const loadSessionDetails = useCallback(async (targetSessionId, tokenOverride) => {
    const targetId = String(targetSessionId || '').trim();
    if (!targetId) return null;

    const token = tokenOverride || getAuthToken();
    if (!token) return null;

    const session = await apiRequest(`/sessions/${targetId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (session?.name) setSessionName(session.name);
    setFlowMode(String(session?.flow_mode || session?.flowMode || 'manual').trim().toLowerCase() === 'auto' ? 'auto' : 'manual');

    if (session?.session_date) {
      const raw = String(session.session_date);
      setSessionDateTime(raw.length === 10 ? `${raw}T00:00` : '');
    }

    const assigned = Array.isArray(session?.assigned_participants) ? session.assigned_participants : [];
    const assignedIds = assigned
      .map((participant) => (typeof participant === 'object' ? participant?.id : participant))
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value));

    setSessionParticipantCount(assigned.length);
    setDraftParticipantIds(assignedIds);
    return session;
  }, [apiRequest, getAuthToken]);

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

      await persistSelectionToBackend(true);
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

  useEffect(() => {
    if (!sessionId || !hasHydratedSessionSelectionRef.current) return;

    const savedAt = persistDraftToStorage(sessionId, selectedChallenges);
    if (savedAt) {
      setLastLocalDraftSaveAt(savedAt);
    }
  }, [selectedChallenges, sessionId]);

  const handleSaveDraft = useCallback(async () => {
    if (!sessionId || isSavingDraft) return;

    if (selectedChallenges.length === 0) {
      showErrorToast('Ajoutez au moins un challenge avant de sauvegarder.');
      return;
    }

    setIsSavingDraft(true);
    const loadingId = showLoadingToast('Sauvegarde des challenges en cours...');

    try {
      await persistSelectionToBackend(false);
      removeToast(loadingId);
    } catch (error) {
      removeToast(loadingId);
      showErrorToast(error.message || 'Impossible de sauvegarder les challenges.');
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    isSavingDraft,
    persistSelectionToBackend,
    removeToast,
    selectedChallenges.length,
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
      .then(async (res) => {
        const rawText = await res.text();
        let payload = {};
        try {
          payload = rawText ? JSON.parse(rawText) : {};
        } catch {
          payload = {};
        }

        if (!res.ok) {
          const fetchError = new Error(payload.error || `Erreur API (${res.status})`);
          fetchError.status = res.status;
          throw fetchError;
        }

        return payload;
      })
      .then((session) => {
        if (!cancelled) {
          // Pre-populate session metadata
          loadSessionDetails(sessionId, token).catch(() => null);

          // Pre-populate selectedChallenges from session
          const sessionChallenges = Array.isArray(session.challenges) ? session.challenges : [];

          restoreSelectedChallenges(sessionChallenges);

          setLoadedFromLocalDraft(false);
          const savedDraft = readDraftFromStorage(sessionId);
          if (savedDraft && Array.isArray(savedDraft.selectedChallenges)) {
            restoreSelectedChallenges(savedDraft.selectedChallenges);
            setLoadedFromLocalDraft(true);
            if (savedDraft.updatedAt) {
              setLastLocalDraftSaveAt(savedDraft.updatedAt);
            }
          }

          setSelectedChallengesSnapshot(JSON.stringify(sessionChallenges));
          hasHydratedSessionSelectionRef.current = true;
          setSessionChallengesLoaded(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (err.status === 401) {
            logout();
            return;
          }

          // Only a real 404 should reset to the new-session flow.
          if (err.status === 404) {
            setSessionId('');
            sessionStorage.removeItem('sessionId');
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, '', '/session-builder');
            }
          } else {
            showErrorToast(err.message || 'Impossible de charger la session.');
          }
          setSessionChallengesLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    filteredChallenges,
    getAuthToken,
    guard.allowed,
    loadSessionDetails,
    restoreSelectedChallenges,
    sessionChallengesLoaded,
    sessionId,
    showErrorToast,
  ]);

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

          if (err.status === 401) {
            logout();
            return;
          }

          if (ENABLE_CHALLENGES_MOCK_DATA) {
            // Fallback mock is opt-in only to avoid masking backend issues unexpectedly.
            setAllChallenges(mockChallenges);
            setError(err.message || 'Catalogue indisponible, fallback local actif.');
            showErrorToast('Mode mock actif: catalogue de développement utilisé.');
            return;
          }

          setAllChallenges([]);
          setError(err.message || 'Catalogue indisponible. Vérifiez l API backend ou activez le mode mock.');
          showErrorToast('Catalogue indisponible. Activez NEXT_PUBLIC_ENABLE_CHALLENGES_MOCK_DATA=true pour le mode mock.');
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
    if (availableParticipantsCount === 0) {
      showErrorToast('Ajoutez d\'abord des participants dans votre espace manager pour creer une session.');
      return;
    }
    const name = sessionName.trim() || `Session du ${new Date().toLocaleDateString('fr-FR')}`;
    const sessionDate = sessionDateTime ? new Date(sessionDateTime) : null;
    if (sessionDateTime && Number.isNaN(sessionDate?.getTime())) {
      showErrorToast('Veuillez choisir une date et heure valides.');
      return;
    }
    const token = getAuthToken();
    setIsCreatingSession(true);
    const loadingId = showLoadingToast('Cr�ation de la session...');
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

      if (draftParticipantIds.length > 0) {
        await apiRequest(`/sessions/${newId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ participant_ids: draftParticipantIds }),
        });
      }

      sessionStorage.setItem(SESSION_ID_STORAGE_KEY, newId);
      setSessionId(newId);
      setSessionParticipantCount(draftParticipantIds.length);
      await loadSessionDetails(newId, token);
      removeToast(loadingId);
      // Participants are already assigned in the creation pane; continue directly to challenge selection.
    } catch (err) {
      removeToast(loadingId);
      showErrorToast(err.message || 'Impossible de creer la session.');
    } finally {
      setIsCreatingSession(false);
    }
  }, [
    apiRequest,
    availableParticipantsCount,
    draftParticipantIds,
    getAuthToken,
    removeToast,
    sessionDateTime,
    sessionName,
    showErrorToast,
    showLoadingToast,
  ]);

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
      await loadSessionDetails(sessionId, token);
      setIsEditingSessionInfo(false);
    } catch (err) {
      showErrorToast(err.message || 'Impossible de mettre à jour la session.');
    } finally {
      setIsSavingSessionInfo(false);
    }
  }, [apiRequest, editDateTime, editName, getAuthToken, loadSessionDetails, sessionId, showErrorToast]);

  function logout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem(SELECTED_CHALLENGES_STORAGE_KEY);
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
        <main className={`auth-page ${styles.creationPageBackground}`}>
          <section className={styles.creationExperience}>
            <div className={styles.creationHero}>
              <div className={styles.creationHeroTop}>
                <p className="eyebrow">NOUVELLE SESSION</p>
              </div>
              <h1 className={styles.creationTitle}>
                <span className={styles.creationTitleMain}>Préparer la session:</span>
                <span className={styles.creationTitleInlineDescription}>
                  Organisez le cadre de la session et l&apos;assignation des participants dans une seule vue, claire et immediate.
                </span>
              </h1>
              <p className={styles.creationPrerequisite}>
                Prerequis: vous devez disposer d&apos;au moins un participant cree dans l&apos;espace manager avant de creer la
                session.
              </p>

              <div className={styles.creationContent}>
                <div className={styles.creationPrimary}>
                  <form id="create-session-form" onSubmit={handleCreateSession} className={styles.creationForm}>
                    <div className={styles.creationSectionHeader}>
                      <div>
                        <h2>Cadre de session</h2>
                      </div>
                    </div>

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

                    <div className={styles.flowModeField}>
                      <div className={styles.creationFieldHeading}>
                        <span>Mode de progression des challenges</span>
                        <p>Choisissez le niveau d&apos;autonomie du déroulé.</p>
                      </div>
                      <div className={styles.flowModeGrid}>
                        <label className={`${styles.flowModeCard} ${flowMode === 'manual' ? styles.flowModeCardActive : ''}`}>
                          <input
                            type="radio"
                            name="flowMode"
                            value="manual"
                            checked={flowMode === 'manual'}
                            onChange={() => setFlowMode('manual')}
                          />
                          <span className={styles.flowModeContent}>
                            <strong>Manuel</strong>
                            <small>Le facilitateur garde la main et pilote le rythme de la session.</small>
                          </span>
                        </label>
                        <label className={`${styles.flowModeCard} ${flowMode === 'auto' ? styles.flowModeCardActive : ''}`}>
                          <input
                            type="radio"
                            name="flowMode"
                            value="auto"
                            checked={flowMode === 'auto'}
                            onChange={() => setFlowMode('auto')}
                          />
                          <span className={styles.flowModeContent}>
                            <strong>Automatique</strong>
                            <small>Les challenges s&apos;enchaînent automatiquement une fois le precedent terminé.</small>
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className={styles.creationFooter}>
                      <p className={styles.creationHint}>
                        La date est facultative, mais utile pour planifier et retrouver rapidement vos sessions.
                      </p>
                    </div>
                  </form>
                </div>

                <aside className={styles.creationSecondary}>
                  <div className={styles.creationParticipantsPane}>
                    <div className={styles.creationSectionHeader}>
                      <div>
                        <h2>Assigner des participants</h2>
                      </div>
                      <span className={styles.creationParticipantsCount}>
                        {draftParticipantIds.length} selectionne{draftParticipantIds.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <ParticipantAssigner
                      isLoading={isCreatingSession}
                      selectedIds={draftParticipantIds}
                      onSelectionChange={setDraftParticipantIds}
                      onParticipantsLoaded={setAvailableParticipantsCount}
                      embedded
                      hideActions
                      title=""
                      subtitle=""
                    />
                  </div>
                </aside>
              </div>

              <div className={styles.creationGlobalActions}>
                {availableParticipantsCount === 0 ? (
                  <p className={styles.creationActionHint}>
                    Cr�ation indisponible: ajoutez d&apos;abord des participants dans votre espace manager.
                  </p>
                ) : null}
                <button
                  type="submit"
                  form="create-session-form"
                  className={`btn-primary ${styles.creationSubmit}`}
                  disabled={isCreatingSession || availableParticipantsCount === 0}
                  title={
                    availableParticipantsCount === 0
                      ? 'Creez d\'abord des participants dans l\'espace manager.'
                      : 'Cr�er la session'
                  }
                >
                  {isCreatingSession ? 'Cr�ation...' : 'Cr�er la session'}
                </button>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  // Select challenges

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AppNav userLabel={userLabel} onLogout={logout} />
      
      <main className={`shell ${styles.sessionBuilder}`}>
        {asyncStatusMessage ? (
          <p className="ui-async-status" role="status" aria-live="polite">{asyncStatusMessage}</p>
        ) : null}
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
              {lastLocalDraftSaveAt && (
                <span className={styles.sessionInfoLocalSave}>
                  Brouillon local: {new Date(lastLocalDraftSaveAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {lastBackendSaveAt && (
                <span className={styles.sessionInfoBackendSave}>
                  Serveur: {new Date(lastBackendSaveAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {loadedFromLocalDraft && (
                <span className={styles.sessionInfoDraftRestored}>Brouillon restaure</span>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button
                  className={hasUnsavedBackendChanges ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft || selectedChallenges.length === 0}
                  title={selectedChallenges.length === 0 ? 'Ajoutez au moins une activite.' : 'Enregistrer les challenges sur le serveur'}
                >
                  {isSavingDraft ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
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
              </div>
            </>
          )}
        </div>

        <SessionBuilderHeader
          selectedCount={selectedChallenges.length}
          totalDuration={getTotalDuration()}
          isLaunchDisabled={selectedChallenges.length === 0}
          isLaunching={isLaunching}
          onLaunch={handleLaunchSession}
        />

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
