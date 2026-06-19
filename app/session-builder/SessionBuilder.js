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
import Modal from '@/components/ui/Modal';
import { Alert, Button, Input, LoadingState } from '@/components/ui';
import useToast from '@/lib/useToast';
import useSessionBuilder from '@/lib/useSessionBuilder';
import { fetchWithRetry } from '@/lib/api';
import { ENABLE_CHALLENGES_MOCK_DATA, getApiUrl } from '@/lib/config';
import { trackGaEvent } from '@/lib/analytics';
import styles from './SessionBuilder.module.css';
import { mockChallenges } from '@/lib/mockChallenges';
import useI18n from '@/lib/i18n/useI18n';

const PIXEL_ARCHITECT_CATALOG_ENTRY = {
  id: 'pixel_architect_001',
  name: 'Pixel Architect',
  category: 'creativite-innovation',
  objective: 'collaboration',
  duration: 15,
  type: 'Collaborative 3D creation',
  tags: ['Voxel', 'Collaboration', 'Timeboxed'],
  description: 'Build a 3D cube structure under time, resource, and communication constraints.',
  engine_key: 'pixel_architect_v1',
  engine_config: {
    participants: {
      min_count: 3,
      recommended_count: 6,
      max_count: 12,
    },
  },
  config: {
    mode: 'replication',
    collaborationMode: 'standard',
    settings: {
      timeLimitSeconds: 900,
      maxCubes: 50,
      maxColors: 3,
      hintsEnabled: true,
      chatEnabled: true,
      timerEnabled: true,
    },
    replication: {
      modelSource: 'template',
      templateId: 'tour_signal',
    },
    creative: {
      theme: 'Build a structure that symbolizes collaboration.',
    },
  },
};

const THE_QUIZ_CATALOG_ENTRY = {
  id: 'the_quiz_001',
  name: 'The Quiz',
  category: 'culture-decouverte',
  objective: 'collaboration',
  objectives: 'collaboration, communication, intelligence-collective',
  duration: 20,
  type: 'Quiz multijoueur realtime',
  tags: ['Quiz', 'General knowledge', 'Realtime', 'Leaderboard'],
  description: 'Competitive general-knowledge quiz synchronized in real time for the whole session.',
  engine_key: 'the_quiz_v1',
  engine_config: {
    participants: {
      min_count: 4,
      recommended_count: 8,
      max_count: 30,
    },
  },
  config: {
    preset: 'medium',
    question_count: 9,
    question_duration_seconds: 30,
    chat: {
      enabled: true,
      quick_reactions_enabled: true,
    },
    leaderboard: {
      enabled: true,
    },
    timer: {
      enabled: true,
      duration_seconds: 30,
      warning_threshold_seconds: 10,
    },
  },
};

function ensurePixelArchitectChallenge(challenges) {
  const list = Array.isArray(challenges) ? [...challenges] : [];
  const existingIndex = list.findIndex((challenge) => String(challenge?.engine_key || '').trim() === 'pixel_architect_v1');

  if (existingIndex >= 0) {
    const current = list[existingIndex] || {};
    list[existingIndex] = {
      ...PIXEL_ARCHITECT_CATALOG_ENTRY,
      ...current,
      config: {
        ...PIXEL_ARCHITECT_CATALOG_ENTRY.config,
        ...(current.config && typeof current.config === 'object' ? current.config : {}),
      },
    };
    return list;
  }

  return [...list, PIXEL_ARCHITECT_CATALOG_ENTRY];
}

function ensureTheQuizChallenge(challenges) {
  const list = Array.isArray(challenges) ? [...challenges] : [];
  const existingIndex = list.findIndex((challenge) => String(challenge?.engine_key || '').trim() === 'the_quiz_v1');

  if (existingIndex >= 0) {
    const current = list[existingIndex] || {};
    list[existingIndex] = {
      ...THE_QUIZ_CATALOG_ENTRY,
      ...current,
      config: {
        ...THE_QUIZ_CATALOG_ENTRY.config,
        ...(current.config && typeof current.config === 'object' ? current.config : {}),
      },
    };
    return list;
  }

  return [...list, THE_QUIZ_CATALOG_ENTRY];
}

function ensureBuilderCatalogChallenges(challenges) {
  return ensureTheQuizChallenge(ensurePixelArchitectChallenge(challenges));
}

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

function toEpochMs(value) {
  const parsed = Date.parse(String(value || '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function getSessionFreshnessMs(session) {
  const base = toEpochMs(session?.updatedAt);
  const challenges = Array.isArray(session?.challenges) ? session.challenges : [];

  return challenges.reduce((max, challenge) => {
    const challengeUpdated = toEpochMs(challenge?.updatedAt);
    const junctionUpdated = toEpochMs(challenge?.SessionChallenge?.updatedAt);
    return Math.max(max, challengeUpdated, junctionUpdated);
  }, base);
}

function shouldApplyLocalDraftOverSession(savedDraft, session) {
  const draftUpdatedMs = toEpochMs(savedDraft?.updatedAt);
  if (draftUpdatedMs <= 0) {
    return false;
  }

  const sessionChallenges = Array.isArray(session?.challenges) ? session.challenges : [];
  if (sessionChallenges.length > 0) {
    // Server-side session data is the source of truth once challenges exist.
    // This avoids stale local drafts from overriding persisted configs (e.g. CoPuzzle images).
    return false;
  }

  const sessionFreshnessMs = getSessionFreshnessMs(session);
  return draftUpdatedMs > sessionFreshnessMs;
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

function mergeChallengeConfig(baseConfig, overrideConfig) {
  const base = baseConfig && typeof baseConfig === 'object' ? baseConfig : {};
  const override = overrideConfig && typeof overrideConfig === 'object' ? overrideConfig : {};

  return {
    ...base,
    ...override,
    image: { ...(base.image || {}), ...(override.image || {}) },
    timer: { ...(base.timer || {}), ...(override.timer || {}) },
    participants: { ...(base.participants || {}), ...(override.participants || {}) },
    grid: { ...(base.grid || {}), ...(override.grid || {}) },
    chat: { ...(base.chat || {}), ...(override.chat || {}) },
    settings: { ...(base.settings || {}), ...(override.settings || {}) },
    replication: { ...(base.replication || {}), ...(override.replication || {}) },
    creative: { ...(base.creative || {}), ...(override.creative || {}) },
    advancedRoles: { ...(base.advancedRoles || {}), ...(override.advancedRoles || {}) },
  };
}

function extractChallengeConfig(challenge) {
  const baseConfig = challenge?.engine_config && typeof challenge.engine_config === 'object'
    ? challenge.engine_config
    : {};

  const directConfig = challenge?.config && typeof challenge.config === 'object'
    ? challenge.config
    : {};

  const junctionConfig = challenge?.SessionChallenge?.config && typeof challenge.SessionChallenge.config === 'object'
    ? challenge.SessionChallenge.config
    : {};

  return mergeChallengeConfig(baseConfig, mergeChallengeConfig(directConfig, junctionConfig));
}

export default function SessionBuilder() {
  const { t, withLocalePath } = useI18n();
  const guard = useManagerGuard();
  const { toasts, removeToast, success: showSuccessToast, error: showErrorToast, loading: showLoadingToast } = useToast();
  const {
    allChallenges,
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
    toggleCategoryFilter,
    toggleObjectiveFilter,
    setConfiguring,
    getTotalDuration,
  } = useSessionBuilder();

  const [isLaunching, setIsLaunching] = useState(false);
  const [isLaunchConfirmOpen, setIsLaunchConfirmOpen] = useState(false);
  const [sessionChallengesLoaded, setSessionChallengesLoaded] = useState(false);
  const [hasRouteSessionId, setHasRouteSessionId] = useState(false);
  // Initialize as '' (matches SSR) — useEffect reads from URL after mount to avoid hydration mismatch.
  const [sessionId, setSessionId] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [flowMode, setFlowMode] = useState('manual');
  const [sessionDateTime, setSessionDateTime] = useState('');
  const [sessionParticipantCount, setSessionParticipantCount] = useState(0);
  const [isEditingSessionInfo, setIsEditingSessionInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editFlowMode, setEditFlowMode] = useState('manual');
  const [editDateTime, setEditDateTime] = useState('');
  const [editParticipantIds, setEditParticipantIds] = useState([]);
  const [isSavingSessionInfo, setIsSavingSessionInfo] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastLocalDraftSaveAt, setLastLocalDraftSaveAt] = useState('');
  const [lastBackendSaveAt, setLastBackendSaveAt] = useState('');
  const [draftParticipantIds, setDraftParticipantIds] = useState([]);
  const [availableParticipantsCount, setAvailableParticipantsCount] = useState(0);
  const [participantsInventoryLoaded, setParticipantsInventoryLoaded] = useState(false);
  const [loadedFromLocalDraft, setLoadedFromLocalDraft] = useState(false);
  const [selectedChallengesSnapshot, setSelectedChallengesSnapshot] = useState('[]');
  const hasHydratedSessionSelectionRef = useRef(false);
  const onboardingRedirectedRef = useRef(false);

  const handleParticipantsLoaded = useCallback((count) => {
    setAvailableParticipantsCount(Number(count || 0));
    setParticipantsInventoryLoaded(true);
  }, []);

  const userLabel = useMemo(() => pickDisplayName(guard.user), [guard.user]);
  const asyncStatusMessage = isCreatingSession
    ? t('sessionBuilder.creatingSession')
    : isSavingSessionInfo
      ? t('sessionBuilder.saving')
      : isLaunching
        ? t('sessionBuilder.loading')
        : isLoading
          ? t('sessionBuilder.loading')
          : '';
  const currentConfiguringChallenge = useMemo(
    () => selectedChallenges.find((c) => c.id === configuring) || null,
    [configuring, selectedChallenges]
  );
  const selectedChallengesJson = useMemo(
    () => JSON.stringify(selectedChallenges),
    [selectedChallenges]
  );

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
        setSessionChallengesLoaded(false);
        hasHydratedSessionSelectionRef.current = false;
      }
      return;
    }

    if (!routeSessionId && !sessionId) {
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

  const normalizePaywallTarget = useCallback((targetPath) => {
    const fallbackPath = '/account?source=paywall';
    const raw = String(targetPath || '').trim();
    if (!raw) return fallbackPath;

    // Keep internal app navigation safe and predictable.
    if (raw.startsWith('/')) return raw;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

    return fallbackPath;
  }, []);

  const redirectToUpgrade = useCallback((error) => {
    if (typeof window === 'undefined') return false;
    if (!error || error.code !== 'PLAN_LIMIT_REACHED') return false;

    const ctaPath = normalizePaywallTarget(error?.details?.conversion?.cta_path);
    window.location.assign(ctaPath);
    return true;
  }, [normalizePaywallTarget]);

  const apiRequest = useCallback(async (path, options = {}) => {
    const method = String(options.method || 'GET').toUpperCase();
    const cacheBust = method === 'GET' ? `${String(path).includes('?') ? '&' : '?'}_t=${Date.now()}` : '';
    const response = await fetch(getApiUrl(`${path}${cacheBust}`), options);

    if (response.status === 401) {
      logout();
      const unauthorizedError = new Error('Session expired. Please sign in again.');
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
          'Endpoint not found (404) while saving challenge configuration. Verify NEXT_PUBLIC_API_BASE (use /api or https://.../api) and ensure the session still exists.'
        );
      }

      let errorMessage = payload.error || `API error (${response.status})`;

      if (response.status === 502) {
        errorMessage = 'Session service is temporarily unavailable (502). Try again in a few seconds.';
      } else if (response.status >= 500) {
        errorMessage = 'The server encountered a temporary error. Try again in a few seconds.';
      }

      if (payload.code === 'PLAN_LIMIT_REACHED') {
        errorMessage = `${errorMessage} Upgrade to Pro.`;
      }

      const requestError = new Error(errorMessage);
      requestError.status = response.status;
      requestError.code = payload.code;
      requestError.details = payload.details;
      throw requestError;
    }

    return payload;
  }, []);

  const resolveChallengeApiId = useCallback(
    (challenge) => {
      const directId = toIntegerId(challenge?.id);
      if (directId !== null) {
        return directId;
      }

      const challengeEngineKey = String(challenge?.engine_key || '').trim();
      if (!challengeEngineKey) {
        return null;
      }

      const catalogMatch = allChallenges.find((item) => String(item?.engine_key || '').trim() === challengeEngineKey);
      return catalogMatch ? toIntegerId(catalogMatch.id) : null;
    },
    [allChallenges, toIntegerId]
  );

  const resolveChallengeApiIdentifier = useCallback(
    (challenge) => {
      const challengeId = resolveChallengeApiId(challenge);
      if (challengeId !== null) return challengeId;

      const challengeEngineKey = String(challenge?.engine_key || '').trim();
      return challengeEngineKey || null;
    },
    [resolveChallengeApiId]
  );

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
      .map((item) => resolveChallengeApiIdentifier(item))
      .filter((id) => id !== null);

    if (!selectedChallengeIds.length) {
      throw new Error('No valid API challenge to save for this session.');
    }

    await ensureChallengesLinkedToSession(selectedChallengeIds, token, markInProgress);

    const refreshedSession = await apiRequest(`/sessions/${sessionId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const persistedChallenges = Array.isArray(refreshedSession?.challenges) ? refreshedSession.challenges : [];

    for (const challenge of selectedChallenges) {
      let challengeId = resolveChallengeApiId(challenge);
      if (!challengeId) {
        const challengeEngineKey = String(challenge?.engine_key || '').trim();
        if (challengeEngineKey) {
          const persisted = persistedChallenges.find((item) => String(item?.engine_key || '').trim() === challengeEngineKey);
          challengeId = persisted ? toIntegerId(persisted.id) : null;
        }
      }
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
    resolveChallengeApiIdentifier,
    resolveChallengeApiId,
    selectedChallenges,
    sessionId,
    toIntegerId,
  ]);

  const restoreSelectedChallenges = useCallback(
    (challenges) => {
      const source = Array.isArray(challenges) ? challenges : [];
      clearAll();

      source.forEach((challenge) => {
        const resolvedChallengeId = resolveChallengeApiId(challenge);
        if (resolvedChallengeId === null) return;
        selectChallenge(resolvedChallengeId);
        const mergedConfig = extractChallengeConfig(challenge);
        if (Object.keys(mergedConfig).length > 0) {
          updateChallengeConfig(resolvedChallengeId, mergedConfig);
        }
      });
    },
    [clearAll, resolveChallengeApiId, selectChallenge, updateChallengeConfig]
  );

  const handleChallengeConfigSave = useCallback(async (challengeId, config) => {
    updateChallengeConfig(challengeId, config);

    if (!sessionId) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      return;
    }

    const mergedSelectedChallenges = selectedChallenges.map((item) => (
      item.id === challengeId ? { ...item, config } : item
    ));

    const selectedChallengeIds = mergedSelectedChallenges
      .map((item) => resolveChallengeApiIdentifier(item))
      .filter((id) => id !== null);

    if (!selectedChallengeIds.length) {
      return;
    }

    try {
      await ensureChallengesLinkedToSession(selectedChallengeIds, token, false);

      let challengeApiId = resolveChallengeApiId(
        mergedSelectedChallenges.find((item) => item.id === challengeId) || null
      );

      if (challengeApiId === null) {
        const refreshedSession = await apiRequest(`/sessions/${sessionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const challengeEngineKey = String(
          mergedSelectedChallenges.find((item) => item.id === challengeId)?.engine_key || ''
        ).trim();
        const persistedByEngine = Array.isArray(refreshedSession?.challenges)
          ? refreshedSession.challenges.find((item) => String(item?.engine_key || '').trim() === challengeEngineKey)
          : null;
        challengeApiId = persistedByEngine ? toIntegerId(persistedByEngine.id) : null;
      }

      if (challengeApiId !== null) {
        await apiRequest(`/sessions/${sessionId}/challenges/${challengeApiId}/config`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ config }),
        });
      }

      setSelectedChallengesSnapshot(JSON.stringify(mergedSelectedChallenges));
      setLastBackendSaveAt(new Date().toISOString());
      showSuccessToast('Challenge configuration applied immediately.');
    } catch (err) {
      if (redirectToUpgrade(err)) return;
      showErrorToast(err.message || 'Configuration saved locally, but server sync failed.');
    }
  }, [
    apiRequest,
    ensureChallengesLinkedToSession,
    getAuthToken,
    redirectToUpgrade,
    resolveChallengeApiIdentifier,
    resolveChallengeApiId,
    selectedChallenges,
    sessionId,
    showErrorToast,
    showSuccessToast,
    toIntegerId,
    updateChallengeConfig,
  ]);

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

    trackGaEvent('cta_click', {
      cta_name: 'session_builder_launch_challenge',
      cta_label: 'Lancer',
      cta_destination: sessionId ? `/session-live/${sessionId}` : '/session-live/:sessionId',
      selected_challenge_count: selectedChallenges.length,
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    });

    setIsLaunching(true);
    const loadingId = showLoadingToast('Saving session...');

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
        window.location.replace(withLocalePath('/home'));
      }
    } catch (error) {
      removeToast(loadingId);
      if (redirectToUpgrade(error)) return;
      showErrorToast(error.message || 'Unable to launch the session right now.');
      setIsLaunching(false);
    }
  }, [
    isLaunching,
    persistSelectionToBackend,
    removeToast,
    redirectToUpgrade,
    selectedChallenges,
    sessionId,
    showErrorToast,
    showLoadingToast,
    withLocalePath,
  ]);

  const handleRequestLaunch = useCallback(() => {
    if (!selectedChallenges.length || isLaunching) return;
    setIsLaunchConfirmOpen(true);
  }, [isLaunching, selectedChallenges.length]);

  useEffect(() => {
    if (!sessionId || !hasHydratedSessionSelectionRef.current) return;

    const savedAt = persistDraftToStorage(sessionId, selectedChallenges);
    if (savedAt) {
      setLastLocalDraftSaveAt(savedAt);
    }
  }, [selectedChallenges, sessionId]);

  useEffect(() => {
    if (!guard.allowed) return;
    if (sessionId || hasRouteSessionId) return;
    if (!participantsInventoryLoaded) return;
    if (availableParticipantsCount > 0) return;
    if (onboardingRedirectedRef.current) return;

    onboardingRedirectedRef.current = true;
    window.location.replace(withLocalePath('/home?onboarding=participants&reason=no_participants'));
  }, [availableParticipantsCount, guard.allowed, hasRouteSessionId, participantsInventoryLoaded, sessionId, withLocalePath]);

  const handleSaveDraft = useCallback(async () => {
    if (!sessionId || isSavingDraft) return;

    if (selectedChallenges.length === 0) {
      showErrorToast('Add at least one challenge before saving.');
      return;
    }

    setIsSavingDraft(true);
    const loadingId = showLoadingToast(t('sessionBuilder.saving'));

    try {
      await persistSelectionToBackend(false);
      removeToast(loadingId);
      showSuccessToast(t('sessionBuilder.save'));
    } catch (error) {
      removeToast(loadingId);
      if (redirectToUpgrade(error)) return;
      showErrorToast(error.message || t('sessionBuilder.catalogUnavailableError'));
    } finally {
      setIsSavingDraft(false);
    }
  }, [
    isSavingDraft,
    persistSelectionToBackend,
    removeToast,
    redirectToUpgrade,
    selectedChallenges.length,
    sessionId,
    showSuccessToast,
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

    fetch(getApiUrl(`/sessions/${sessionId}?_t=${Date.now()}`), {
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
          const fetchError = new Error(payload.error || `API error (${res.status})`);
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
          if (
            savedDraft
            && Array.isArray(savedDraft.selectedChallenges)
            && shouldApplyLocalDraftOverSession(savedDraft, session)
          ) {
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
              window.history.replaceState({}, '', withLocalePath('/session-builder'));
            }
          } else {
            showErrorToast(err.message || t('sessionBuilder.catalogUnavailableError'));
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
    const loadingId = showLoadingToast(t('sessionBuilder.loading'));

    const token = getAuthToken();

    fetchWithRetry(getApiUrl(`/challenges?_t=${Date.now()}`), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then((data) => {
        if (!cancelled) {
          const challenges = Array.isArray(data) ? data : data.challenges || data.data || [];
          setAllChallenges(ensureBuilderCatalogChallenges(challenges));
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
            setAllChallenges(ensureBuilderCatalogChallenges(mockChallenges));
            setError(err.message || 'Catalog unavailable, local fallback active.');
            showErrorToast(t('sessionBuilder.mockModeToast'));
            return;
          }

          setAllChallenges([]);
          setError(err.message || t('sessionBuilder.catalogUnavailableError'));
          showErrorToast(t('sessionBuilder.catalogUnavailableToast'));
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
      showErrorToast(t('sessionBuilder.addParticipantsFirst'));
      return;
    }
    const name = sessionName.trim() || `Session ${new Date().toLocaleDateString('en-US')}`;
    const sessionDate = sessionDateTime ? new Date(sessionDateTime) : null;
    if (sessionDateTime && Number.isNaN(sessionDate?.getTime())) {
      showErrorToast(t('sessionBuilder.invalidDateTime'));
      return;
    }
    const token = getAuthToken();
    setIsCreatingSession(true);
    const loadingId = showLoadingToast(t('sessionBuilder.creatingSession'));
    try {
      const payload = { name };
      payload.flow_mode = flowMode;
      if (draftParticipantIds.length > 0) {
        payload.participant_ids = draftParticipantIds;
      }
      if (sessionDate) {
        payload.session_date = sessionDate.toISOString();
      }
      const created = await apiRequest('/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const newId = String(created.id || created.session?.id || '');
      if (!newId) throw new Error(t('sessionBuilder.missingSessionId'));

      sessionStorage.setItem(SESSION_ID_STORAGE_KEY, newId);
      setSessionId(newId);
      setSessionParticipantCount(draftParticipantIds.length);
      await loadSessionDetails(newId, token);
      removeToast(loadingId);
      // Participants are already assigned in the creation pane; continue directly to challenge selection.
    } catch (err) {
      removeToast(loadingId);
      if (redirectToUpgrade(err)) return;
      showErrorToast(err.message || t('sessionBuilder.createSessionError'));
    } finally {
      setIsCreatingSession(false);
    }
  }, [
    apiRequest,
    availableParticipantsCount,
    draftParticipantIds,
    getAuthToken,
    removeToast,
    redirectToUpgrade,
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
      const currentAssigned = [...draftParticipantIds].sort((a, b) => a - b);
      const nextAssigned = [...editParticipantIds]
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value))
        .sort((a, b) => a - b);
      if (JSON.stringify(currentAssigned) !== JSON.stringify(nextAssigned)) {
        payload.participant_ids = nextAssigned;
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
      if (redirectToUpgrade(err)) return;
      showErrorToast(err.message || t('sessionBuilder.updateSessionError'));
    } finally {
      setIsSavingSessionInfo(false);
    }
  }, [
    apiRequest,
    editDateTime,
    editName,
    editParticipantIds,
    draftParticipantIds,
    getAuthToken,
    loadSessionDetails,
    redirectToUpgrade,
    sessionId,
    showErrorToast,
  ]);

  function logout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem(SELECTED_CHALLENGES_STORAGE_KEY);
    window.location.replace(withLocalePath('/login'));
  }

  if (guard.loading) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>{t('sessionBuilder.checkingSessionTitle')}</h1>
          <LoadingState text={t('sessionBuilder.loading')} />
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
                <p className="eyebrow">{t('sessionBuilder.newSessionEyebrow')}</p>
              </div>
              <p className={styles.creationPrerequisite}>
                {t('sessionBuilder.prerequisite')}
              </p>

              <div className={styles.creationContent}>
                <div className={styles.creationPrimary}>
                  <form id="create-session-form" onSubmit={handleCreateSession} className={styles.creationForm}>
                    <div className={styles.creationSectionHeader}>
                      <div>
                        <h2>{t('sessionBuilder.frameTitle')}</h2>
                      </div>
                    </div>

                    <div className={styles.creationGrid}>
                      <Input
                        label={t('sessionBuilder.sessionName')}
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        placeholder={t('sessionBuilder.sessionNamePlaceholder')}
                        autoFocus
                        required
                      />
                      <Input
                        label={t('sessionBuilder.sessionDateTime')}
                        type="datetime-local"
                        value={sessionDateTime}
                        onChange={(e) => setSessionDateTime(e.target.value)}
                        step="60"
                      />
                    </div>

                    <div className={styles.flowModeField}>
                      <div className={styles.creationFieldHeading}>
                        <span>{t('sessionBuilder.progressionMode')}</span>
                        <p>{t('sessionBuilder.progressionHint')}</p>
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
                            <strong>{t('sessionBuilder.manual')}</strong>
                            <small>{t('sessionBuilder.manualHint')}</small>
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
                            <strong>{t('sessionBuilder.automatic')}</strong>
                            <small>{t('sessionBuilder.automaticHint')}</small>
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className={styles.creationFooter}>
                      <p className={styles.creationHint}>
                        {t('sessionBuilder.dateHint')}
                      </p>
                    </div>
                  </form>
                </div>

                <aside className={styles.creationSecondary}>
                  <div className={styles.creationParticipantsPane}>
                    <div className={styles.creationSectionHeader}>
                      <div>
                        <h2>{t('sessionBuilder.assignParticipants')}</h2>
                      </div>
                      <span className={styles.creationParticipantsCount}>
                        {t('sessionBuilder.selectedCount', { count: draftParticipantIds.length })}
                      </span>
                    </div>

                    <ParticipantAssigner
                      isLoading={isCreatingSession}
                      selectedIds={draftParticipantIds}
                      onSelectionChange={setDraftParticipantIds}
                      onParticipantsLoaded={handleParticipantsLoaded}
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
                  <Alert variant="warning" className={styles.creationActionHint} title={t('sessionBuilder.createUnavailable')}>
                    {t('sessionBuilder.createUnavailableBody')}
                  </Alert>
                ) : null}
                <Button
                  type="submit"
                  form="create-session-form"
                  className={styles.creationSubmit}
                  disabled={isCreatingSession || availableParticipantsCount === 0}
                  title={
                    availableParticipantsCount === 0
                      ? t('sessionBuilder.createUnavailableBody')
                      : t('sessionBuilder.createSession')
                  }
                >
                  {isCreatingSession ? t('sessionBuilder.creating') : t('sessionBuilder.createSession')}
                </Button>
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
        <SessionBuilderHeader
          sessionName={sessionName}
          participantCount={sessionParticipantCount}
          selectedCount={selectedChallenges.length}
          totalDuration={getTotalDuration()}
          isSavingDraft={isSavingDraft}
          onEditSessionInfo={() => {
            setEditName(sessionName);
            setEditFlowMode(flowMode);
            setEditDateTime(sessionDateTime);
            setEditParticipantIds(draftParticipantIds);
            setIsEditingSessionInfo(true);
          }}
          onSaveConfig={handleSaveDraft}
          isLaunchDisabled={selectedChallenges.length === 0}
          isLaunching={isLaunching}
          onLaunch={handleRequestLaunch}
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
            allChallenges={allChallenges}
            selectedIds={selectedChallenges.map((c) => c.id)}
            filters={filters}
            isLoading={isLoading}
            onSelect={selectChallenge}
            onDeselect={deselectChallenge}
            onConfigure={(id) => setConfiguring(id)}
            onFilterChange={updateFilters}
            onToggleCategory={toggleCategoryFilter}
            onToggleObjective={toggleObjectiveFilter}
            onResetFilters={resetFilters}
          />
        </div>
      </main>

      <Modal
        open={isEditingSessionInfo}
        title={t('sessionBuilder.editSessionAria')}
        onClose={() => setIsEditingSessionInfo(false)}
        dialogClassName={styles.sessionInfoEditDialog}
        bodyClassName={styles.sessionInfoEditBody}
      >
        <section className={styles.sessionInfoEditContent} aria-label={t('sessionBuilder.editSessionAria')}>
          <div className={styles.sessionInfoEditGrid}>
            <input
              className={styles.sessionInfoInput}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder={t('sessionBuilder.sessionNamePlaceholderShort')}
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
              <option value="manual">{t('sessionBuilder.manualModeOption')}</option>
              <option value="auto">{t('sessionBuilder.autoModeOption')}</option>
            </select>
          </div>

          <div className={styles.sessionInfoParticipantsBlock}>
            <div className={styles.creationSectionHeader}>
              <div>
                <h2>{t('sessionBuilder.assignParticipants')}</h2>
              </div>
              <span className={styles.creationParticipantsCount}>
                {t('sessionBuilder.selectedCount', { count: editParticipantIds.length })}
              </span>
            </div>

            <ParticipantAssigner
              isLoading={isSavingSessionInfo}
              selectedIds={editParticipantIds}
              onSelectionChange={setEditParticipantIds}
              embedded
              hideActions
              title=""
              subtitle=""
            />
          </div>

          <div className={styles.sessionInfoEditActions}>
            <Button
              onClick={handleSaveSessionInfo}
              disabled={isSavingSessionInfo}
            >
              {isSavingSessionInfo ? t('sessionBuilder.saving') : t('sessionBuilder.save')}
            </Button>
            <Button variant="secondary" onClick={() => setIsEditingSessionInfo(false)}>
              {t('sessionBuilder.cancel')}
            </Button>
          </div>
        </section>
      </Modal>

      <Modal
        open={isLaunchConfirmOpen}
        title="Confirm session launch"
        onClose={() => setIsLaunchConfirmOpen(false)}
        dialogClassName={styles.launchConfirmDialog}
        bodyClassName={styles.launchConfirmBody}
      >
        <p className={styles.launchConfirmText}>
          Une fois la session lancée, la configuration ne pourra plus être modifiée.
        </p>
        <div className={styles.launchConfirmActions}>
          <Button
            variant="secondary"
            onClick={() => setIsLaunchConfirmOpen(false)}
            disabled={isLaunching}
          >
            Annuler
          </Button>
          <Button
            onClick={async () => {
              setIsLaunchConfirmOpen(false);
              await handleLaunchSession();
            }}
            disabled={isLaunching}
          >
            {isLaunching ? 'Launching...' : 'Confirmer'}
          </Button>
        </div>
      </Modal>

      {configuring && currentConfiguringChallenge && (
        <ChallengeConfigModal
          challenge={currentConfiguringChallenge}
          onSave={(config) => handleChallengeConfigSave(configuring, config)}
          onClose={() => setConfiguring(null)}
        />
      )}

      <Footer />
    </>
  );
}
