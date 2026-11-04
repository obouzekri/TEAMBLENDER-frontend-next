"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import Modal from '@/components/ui/Modal';
import { getApiUrl, normalizeUploadResultUrl } from '@/lib/config';
import { fetchWithCsrfRetry, withCsrfHeaders } from '@/lib/csrf';
import { clearSessionAuth } from '@/lib/auth';
import { getStoredCurrentUser as readAuthStoredCurrentUser } from '@/lib/auth-storage';
import { resolveChallengePlayerRange } from '@/lib/challenges/playerRange';
import useI18n from '@/lib/i18n/useI18n';
import { formatDate, formatDateTime, NUMERIC_DATE_TIME } from '@/lib/i18n/format';
import {
  ADMIN_TAB_IDS,
  CHALLENGE_CATEGORY_LABELS,
  CHALLENGE_CATEGORY_OPTIONS,
  CHALLENGE_OBJECTIVE_LABELS,
  CHALLENGE_OBJECTIVE_OPTIONS,
  CHALLENGE_SOURCES,
  CHALLENGE_SOURCE_OPTION_LABELS,
  CHALLENGE_STATUSES,
  CHALLENGE_STATUS_OPTION_LABELS,
  CHALLENGE_TYPES,
  CHALLENGE_TYPE_OPTION_LABELS,
  DEFAULT_NEW_CHALLENGE,
  DEFAULT_NEW_LANDING_BLOCK,
  DEFAULT_NEW_PRICING_PLAN,
  DEFAULT_NEW_SESSION,
  KNOWN_ENGINE_KEYS,
  LANDING_ALLOWED_BLOCK_KEYS,
  LANDING_ALLOWED_BLOCK_KEY_HINT,
  MAX_CHALLENGE_OBJECTIVES,
  PRICING_BILLING_CYCLES,
  PRICING_BILLING_CYCLE_LABELS,
  SESSION_MODALITIES,
  SESSION_MODALITY_OPTION_LABELS,
  SESSION_STATUSES,
  SESSION_STATUS_OPTION_LABELS,
  USER_ROLES,
} from '@/lib/admin/constants';
import { ensureAdminCatalogChallenges } from '@/lib/admin/challengeCatalog';
import {
  applyPlayerRangeToEngineConfig,
  cloneJson,
  csvEscape,
  downloadTextFile,
  ensureCopuzzleConfig,
  ensureEscapeRoomE5Image,
  fetchAdminJson,
  formatCurrency,
  formatDurationSeconds,
  formatPricingPlanAmount,
  getAdminPricingBadgeLabel,
  getChallengeStatusLabel,
  getChallengeTypeLabel,
  getCopuzzleDefaultImages,
  getCopuzzleImageSrc,
  getEscapeRoomE5ImageSrc,
  getLocalizedLabel,
  getParticipantDisplayName,
  getParticipantFirstName,
  getParticipantLastName,
  getPricingBillingCycleLabel,
  getSessionModalityLabel,
  getSessionStatusLabel,
  isAllowedLandingBlockKey,
  isPlatformAdminEmail,
  isStrongPassword,
  isTokenAuthError,
  isValidEmail,
  landingBlockToDraft,
  normalizeObjectivesInput,
  normalizePricingPlanId,
  parseList,
  pickUserLabel,
  planToDraft,
  renderUploadInputLabel,
  resolveLocalizedRuleValue,
  resolveUserPricingPlanId,
  stripRulesFromEngineConfig,
  toggleObjectiveSelection,
} from '@/lib/admin/utils';

const fetch = (input, options = {}) => {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  headers.delete('Authorization');
  if (method === 'GET' || method === 'HEAD') {
    return globalThis.fetch(input, { ...options, headers, credentials: 'include' });
  }
  return fetchWithCsrfRetry(input, {
    ...options,
    headers: withCsrfHeaders(Object.fromEntries(headers.entries())),
    credentials: 'include',
  });
};

export default function AdminClient() {
  const { locale, withLocalePath, t } = useI18n();
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [pricingPlans, setPricingPlans] = useState([]);
  const [landingBlocks, setLandingBlocks] = useState([]);
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [adminActivityLoading, setAdminActivityLoading] = useState(false);
  const [adminVisits, setAdminVisits] = useState([]);
  const [adminVisitSummary, setAdminVisitSummary] = useState({ totalVisits: 0, uniqueUsers: 0, recentVisits: [] });
  const [selectedVisitorCountry, setSelectedVisitorCountry] = useState('');
  const [showAllCitiesForCountry, setShowAllCitiesForCountry] = useState(false);

  const [busyApprovalId, setBusyApprovalId] = useState(null);
  const [busyDeleteKey, setBusyDeleteKey] = useState('');
  const [busySaveKey, setBusySaveKey] = useState('');
  const noticeTimer = useRef(null);
  const [userQuery, setUserQuery] = useState('');
  const [participantQuery, setParticipantQuery] = useState('');
  const [sessionQuery, setSessionQuery] = useState('');
  const [challengeQuery, setChallengeQuery] = useState('');
  const [pricingQuery, setPricingQuery] = useState('');
  const [landingQuery, setLandingQuery] = useState('');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [showNewParticipantForm, setShowNewParticipantForm] = useState(false);
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [showNewChallengeForm, setShowNewChallengeForm] = useState(false);
  const [showNewPricingPlanForm, setShowNewPricingPlanForm] = useState(false);
  const [showNewLandingBlockForm, setShowNewLandingBlockForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [editingParticipantError, setEditingParticipantError] = useState('');
  const [editingSession, setEditingSession] = useState(null);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [editingPricingPlan, setEditingPricingPlan] = useState(null);
  const [editingLandingBlock, setEditingLandingBlock] = useState(null);
  const [challengeImageUploadBusy, setChallengeImageUploadBusy] = useState(false);
  const [challengeImageUploadError, setChallengeImageUploadError] = useState('');

  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'user',
  });
  const [newUserMessage, setNewUserMessage] = useState('');
  const [newParticipant, setNewParticipant] = useState({
    owner_id: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    job_title: '',
    department: '',
  });
  const [newParticipantMessage, setNewParticipantMessage] = useState('');
  const [newSession, setNewSession] = useState(DEFAULT_NEW_SESSION);
  const [newSessionMessage, setNewSessionMessage] = useState('');
  const [newSessionMemberIds, setNewSessionMemberIds] = useState([]);
  const [newSessionMemberQuery, setNewSessionMemberQuery] = useState('');
  const [newChallenge, setNewChallenge] = useState(DEFAULT_NEW_CHALLENGE);
  const [newChallengeMessage, setNewChallengeMessage] = useState('');
  const [newPricingPlan, setNewPricingPlan] = useState(DEFAULT_NEW_PRICING_PLAN);
  const [newPricingMessage, setNewPricingMessage] = useState('');
  const [newLandingBlock, setNewLandingBlock] = useState(DEFAULT_NEW_LANDING_BLOCK);
  const [newLandingMessage, setNewLandingMessage] = useState('');

  const challengeCategoryOptions = useMemo(
    () => CHALLENGE_CATEGORY_OPTIONS.map((option) => ({
      ...option,
      label: getLocalizedLabel(CHALLENGE_CATEGORY_LABELS[option.value], locale) || option.label,
    })),
    [locale]
  );

  const challengeObjectiveOptions = useMemo(
    () => CHALLENGE_OBJECTIVE_OPTIONS.map((option) => ({
      ...option,
      label: getLocalizedLabel(CHALLENGE_OBJECTIVE_LABELS[option.value], locale) || option.label,
    })),
    [locale]
  );

  useEffect(() => {
    setNewPricingPlan((prev) => {
      const nextCta = t('adminConsole.chooseThisPlan');
      const current = String(prev.cta_label || '').trim();
      if (!current || current === 'Choisir cette formule' || current === 'Choose this plan') {
        return { ...prev, cta_label: nextCta };
      }
      return prev;
    });
  }, [locale]);

  const readStoredCurrentUser = useCallback(() => {
    return readAuthStoredCurrentUser();
  }, []);

  const persistCurrentUser = useCallback((nextUser) => {
    if (!nextUser) {
      sessionStorage.removeItem('currentUser');
      return;
    }

    try {
      sessionStorage.setItem('currentUser', JSON.stringify(nextUser));
    } catch {
      // Ignore storage write errors and keep runtime state as source of truth.
    }
  }, []);

  const forceReauth = useCallback(() => {
    clearSessionAuth();
    window.location.replace('/login');
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initAdminContext = async () => {
      const storedCurrentUser = readStoredCurrentUser();
      const lastNonAdminUser =
        storedCurrentUser && String(storedCurrentUser.role || '').toLowerCase() !== 'admin'
          ? storedCurrentUser
          : null;

      try {
        const mePayload = await fetchAdminJson('/users/me');
        const me = mePayload?.user && typeof mePayload.user === 'object' ? mePayload.user : mePayload;
        if (cancelled) return;

        if (!me || typeof me !== 'object') {
          forceReauth();
          return;
        }

        if (String(me.role || '').toLowerCase() !== 'admin') {
          persistCurrentUser(me || lastNonAdminUser);
          window.location.replace('/home');
          return;
        }

        persistCurrentUser(me);
        setToken('cookie-session');
        setUser(me);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        if (isTokenAuthError(err)) {
          forceReauth();
          return;
        }
        setError(t('adminConsole.unableToVerifyTheAdminSession'));
        setLoading(false);
      }
    };

    initAdminContext();

    return () => {
      cancelled = true;
    };
  }, [forceReauth, locale, persistCurrentUser, readStoredCurrentUser]);

  const loadAnalytics = useCallback(async (daysOverride = null) => {
    if (!token) return;
    setAnalyticsLoading(true);
    setAnalyticsError('');

    try {
      const days = Number(daysOverride || analyticsDays || 30);
      const payload = await fetchAdminJson(`/admin-analytics/overview?days=${days}`, token);
      setAnalyticsOverview(payload && typeof payload === 'object' ? payload : null);
    } catch (err) {
      // Analytics is optional: keep dashboard functional even if provider is unavailable.
      setAnalyticsOverview(null);
      setAnalyticsError(String(err?.message || 'Analytics provider unavailable.'));
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsDays, token]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tab = String(params.get('tab') || '').trim().toLowerCase();
    if (ADMIN_TAB_IDS.has(tab)) {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!ADMIN_TAB_IDS.has(activeTab)) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === activeTab) return;
    params.set('tab', activeTab);
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', next);
  }, [activeTab]);

  const recordAdminVisitEvent = useCallback(async (pagePath = null) => {
    if (!token) return;

    try {
      const resolvedPage = String(pagePath || window.location.pathname || '/admin').trim() || '/admin';
      await fetch(getApiUrl('/admin-analytics/visits'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'page_view',
          page: resolvedPage,
          metadata: {
            source: 'admin-dashboard',
            referrer: typeof document !== 'undefined' ? document.referrer || '' : '',
          },
        }),
      });
    } catch {
      // Ignore tracking errors so admin access remains unaffected.
    }
  }, [token]);

  const loadAdminVisits = useCallback(async (daysOverride = 30, limit = 12) => {
    if (!token) return;
    setAdminActivityLoading(true);

    try {
      const days = Number(daysOverride || 30);
      const limitValue = Number(limit || 12);
      const [visitsPayload, summaryPayload] = await Promise.all([
        fetchAdminJson(`/admin-analytics/visits?days=${days}&limit=${limitValue}`, token),
        fetchAdminJson(`/admin-analytics/visits/summary?days=${days}`, token),
      ]);

      setAdminVisits(Array.isArray(visitsPayload?.visits) ? visitsPayload.visits : []);
      setAdminVisitSummary(
        summaryPayload && typeof summaryPayload === 'object'
          ? {
            totalVisits: Number(summaryPayload.totalVisits || 0),
            uniqueUsers: Number(summaryPayload.uniqueUsers || 0),
            recentVisits: Array.isArray(summaryPayload.recentVisits) ? summaryPayload.recentVisits : [],
          }
          : { totalVisits: 0, uniqueUsers: 0, recentVisits: [] }
      );
    } catch {
      setAdminVisits([]);
      setAdminVisitSummary({ totalVisits: 0, uniqueUsers: 0, recentVisits: [] });
    } finally {
      setAdminActivityLoading(false);
    }
  }, [token]);

  const loadAll = useCallback(async () => {
    if (!token) return;
    setError('');

    try {
      const requests = [
        ['users', '/users'],
        ['pendingUsers', '/users/pending'],
        ['sessions', '/sessions'],
        ['challenges', '/challenges'],
        ['participants', '/participants?includeDisabled=true'],
        ['pricingPlans', '/pricing-plans/admin'],
        ['landingBlocks', '/landing-content/admin'],
      ];

      const results = await Promise.allSettled(
        requests.map(([, path]) => fetchAdminJson(path, token))
      );

      const failures = [];

      // Check for 401 on critical endpoints — if token expired, force reauth.
      // (landingBlocks is optional, so 401 there doesn't trigger reauth)
      const hasInvalidTokenOnCriticalEndpoint = results.some((result, index) => {
        const [key] = requests[index];
        return (
          key !== 'landingBlocks' &&
          result.status === 'rejected' &&
          isTokenAuthError(result.reason)
        );
      });

      if (hasInvalidTokenOnCriticalEndpoint) {
        setError(t('adminConsole.sessionExpiredOrInvalidPleaseSign'));
        forceReauth();
        return;
      }

      results.forEach((result, index) => {
        const [key] = requests[index];

        if (result.status === 'fulfilled') {
          const value = parseList(result.value);
          if (key === 'users') setUsers(value);
          if (key === 'pendingUsers') setPendingUsers(value);
          if (key === 'sessions') setSessions(value);
          if (key === 'challenges') setChallenges(ensureAdminCatalogChallenges(value));
          if (key === 'participants') setParticipants(value);
          if (key === 'pricingPlans') setPricingPlans(value);
          if (key === 'landingBlocks') setLandingBlocks(value);
          return;
        }

        const reasonRaw = String(result.reason?.message || t('adminConsole.unknownError'));
        const reasonMessage = reasonRaw.toLowerCase().includes('insufficient role')
          ? t('adminConsole.insufficientRoleAdminRequired')
          : reasonRaw;

        // Landing CMS is optional for the rest of admin loading.
        if (key === 'landingBlocks') {
          if (key === 'landingBlocks') {
            setLandingBlocks([]);
          }
          return;
        }

        failures.push(`${key}: ${reasonMessage}`);

        if (key === 'users') setUsers([]);
        if (key === 'pendingUsers') setPendingUsers([]);
        if (key === 'sessions') setSessions([]);
        if (key === 'challenges') setChallenges([]);
        if (key === 'participants') setParticipants([]);
        if (key === 'pricingPlans') setPricingPlans([]);
        if (key === 'landingBlocks') setLandingBlocks([]);
      });

      if (failures.length > 0) {
        const hasRoleMismatch = failures.some((entry) => entry.includes(t('adminConsole.insufficientRoleAdminRequired')));
        const hint = hasRoleMismatch
          ? t('adminConsole.verifyThatYourActiveSessionBelongs')
          : '';
        setError(t('adminConsole.someAdminDataCouldNotBe', { value: failures.join(' | '), hint }));
      }

    } catch (err) {
      setError(err.message || t('adminConsole.adminLoadingError'));
    }
  }, [forceReauth, token]);

  useEffect(() => {
    if (!token) return;
    loadAll();
  }, [token, loadAll]);

  useEffect(() => {
    if (!token || activeTab !== 'analytics') return;
    loadAnalytics();
  }, [activeTab, analyticsDays, loadAnalytics, token]);

  useEffect(() => {
    if (!token) return;
    loadAdminVisits();
    recordAdminVisitEvent();
  }, [token, loadAdminVisits, recordAdminVisitEvent]);

  async function updateApproval(id, approval_status) {
    if (!token) return;
    setBusyApprovalId(id);
    setError('');

    try {
      const response = await fetch(getApiUrl(`/users/${id}/approval`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approval_status }),
      });

      if (!response.ok) {
        throw new Error(t('adminConsole.adminActionDenied'));
      }

      await loadAll();
      showNotice(approval_status === 'approved'
        ? t('adminConsole.accountApprovedSuccessfully')
        : t('adminConsole.accountRejectedSuccessfully'));
    } catch (err) {
      setError(err.message || t('adminConsole.errorWhileUpdating'));
    } finally {
      setBusyApprovalId(null);
    }
  }

  async function submitNewUser(event) {
    event.preventDefault();
    setNewUserMessage('');

    if (!newUser.first_name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      setNewUserMessage(t('adminConsole.firstNameEmailAndPasswordAre'));
      return;
    }

    if (!isValidEmail(newUser.email)) {
      setNewUserMessage(t('adminConsole.invalidEmail'));
      return;
    }

    if (!USER_ROLES.has(newUser.role)) {
      setNewUserMessage(t('adminConsole.invalidRole'));
      return;
    }

    try {
      const response = await fetch(getApiUrl('/users'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setNewUserMessage(payload.error || t('adminConsole.unableToCreateUser'));
        return;
      }

      setNewUser({ first_name: '', last_name: '', email: '', password: '', role: 'user' });
      setNewUserMessage(t('adminConsole.userCreatedSuccessfully'));
      setShowNewUserForm(false);
      await loadAll();
      showNotice(t('adminConsole.userCreatedSuccessfully'));
    } catch {
      setNewUserMessage(t('adminConsole.networkErrorWhileCreatingTheUser'));
    }
  }

  async function handleDeleteUser(targetUser) {
    if (!token || !targetUser?.id) return;
    if (String(targetUser.id) === String(user?.id)) {
      setError(t('adminConsole.youCannotDeleteYourOwnAdmin'));
      return;
    }

    const accepted = window.confirm(t('adminConsole.deleteUserEmail', { email: targetUser.email || targetUser.id }));
    if (!accepted) return;

    const key = `user:${targetUser.id}`;
    setBusyDeleteKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/users/${targetUser.id}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || t('adminConsole.unableToDeleteStatus', { status: response.status }));
      }

      await loadAll();
      showNotice(t('adminConsole.userDeletedSuccessfully'));
    } catch (err) {
      setError(err.message || t('adminConsole.errorWhileDeletingUser'));
    } finally {
      setBusyDeleteKey('');
    }
  }

  async function handleToggleUserStatus(targetUser) {
    if (!token || !targetUser?.id) return;
    if (String(targetUser.id) === String(user?.id)) {
      setError(t('adminConsole.youCannotDisableYourOwnAdmin'));
      return;
    }

    const currentlyDisabled = Boolean(targetUser.disabled);
    const accepted = window.confirm(
      currentlyDisabled
        ? t('adminConsole.reEnableEmail', { email: targetUser.email || t('adminConsole.thisUser') })
        : t('adminConsole.disableEmail', { email: targetUser.email || t('adminConsole.thisUser') })
    );
    if (!accepted) return;

    const key = `status:user:${targetUser.id}`;
    setBusySaveKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/users/${targetUser.id}/status`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: currentlyDisabled }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || t('adminConsole.unableToUpdateStatusStatus', { status: response.status }));
      }

      await loadAll();
      showNotice(currentlyDisabled
        ? t('adminConsole.userReEnabled')
        : t('adminConsole.userDisabled'));
    } catch (err) {
      setError(err.message || t('adminConsole.errorWhileChangingUserStatus'));
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleResetUserPassword(targetUser) {
    if (!token || !targetUser?.id) return;

    const custom = window.prompt(
      t('adminConsole.newPasswordForEmailLeaveBlank', { email: targetUser.email || t('adminConsole.userNumber', { id: targetUser.id }) }),
      ''
    );
    if (custom === null) return;

    const key = `password:user:${targetUser.id}`;
    setBusySaveKey(key);
    setError('');

    try {
      const body = custom.trim() ? { password: custom.trim() } : {};
      const response = await fetch(getApiUrl(`/users/${targetUser.id}/password`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || t('adminConsole.unableToResetPasswordStatus', { status: response.status }));
      }

      const tempPassword = payload?.tempPassword
        ? t('adminConsole.passwordTemppassword', { tempPassword: payload.tempPassword })
        : '';
      showNotice(t('adminConsole.userPasswordResetTemppassword', { tempPassword }));
    } catch (err) {
      setError(err.message || t('adminConsole.errorWhileResettingTheUserPassword'));
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleResendVerificationLink(targetUser) {
    if (!targetUser?.email) return;

    const key = `verify:user:${targetUser.id}`;
    setBusySaveKey(key);
    setError('');

    try {
      const response = await fetch(getApiUrl('/auth/resend-verification'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: String(targetUser.email).trim().toLowerCase(),
          userType: 'user',
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.message || t('adminConsole.unableToResendVerificationLinkStatus', { status: response.status }));
      }

      showNotice(payload.message || t('adminConsole.verificationLinkResent'));
    } catch (err) {
      setError(err.message || t('adminConsole.errorWhileResendingTheVerificationLink'));
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleAdminUserVerificationOverride(targetUser) {
    if (!token || !targetUser?.id) return;

    const key = `verify-admin:user:${targetUser.id}`;
    setBusySaveKey(key);
    setError('');

    try {
      const response = await fetch(getApiUrl(`/users/${targetUser.id}/email-verification`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.message || t('adminConsole.unableToApproveManuallyStatus', { status: response.status }));
      }

      await loadAll();
      showNotice(payload.message || t('adminConsole.accountManuallyApproved'));
    } catch (err) {
      setError(err.message || t('adminConsole.errorDuringManualAccountApproval'));
    } finally {
      setBusySaveKey('');
    }
  }

  function beginEditUser(targetUser) {
    setShowNewUserForm(false);
    setEditingUser({
      id: targetUser.id,
      first_name: targetUser.first_name || '',
      last_name: targetUser.last_name || '',
      email: targetUser.email || '',
      role: targetUser.role || 'user',
      job_title: targetUser.job_title || '',
      department: targetUser.department || '',
      pricing_plan_id: resolveUserPricingPlanId(targetUser),
      password: '',
    });
  }

  async function submitEditUser(event) {
    event.preventDefault();
    if (!token || !editingUser?.id) return;

    if (!editingUser.first_name.trim() || !isValidEmail(editingUser.email)) {
      setError(t('adminConsole.firstNameAndAValidEmail'));
      return;
    }

    if (!USER_ROLES.has(editingUser.role)) {
      setError(t('adminConsole.invalidUserRole'));
      return;
    }

    const key = `save:user:${editingUser.id}`;
    setBusySaveKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/users/${editingUser.id}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
          email: editingUser.email,
          role: editingUser.role,
          job_title: editingUser.job_title,
          department: editingUser.department,
          pricing_plan_id: normalizePricingPlanId(editingUser.pricing_plan_id) || null,
          ...(editingUser.password ? { password: editingUser.password } : {}),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.details || t('adminConsole.unableToUpdateStatus', { status: response.status }));
      }

      setEditingUser(null);
      await loadAll();
      showNotice(t('adminConsole.userUpdatedSuccessfully'));
    } catch (err) {
      setError(err.message || t('adminConsole.errorWhileUpdatingUser'));
    } finally {
      setBusySaveKey('');
    }
  }

  async function submitNewParticipant(event) {
    event.preventDefault();
    setNewParticipantMessage('');

    if (!token) return;

    if (!newParticipant.owner_id || !newParticipant.first_name.trim() || !newParticipant.email.trim() || !newParticipant.password.trim()) {
      setNewParticipantMessage(t('adminConsole.ownerFirstNameEmailAndPassword'));
      return;
    }

    if (!isValidEmail(newParticipant.email)) {
      setNewParticipantMessage(t('adminConsole.invalidEmail'));
      return;
    }

    const key = 'create:participant';
    setBusySaveKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/users/${newParticipant.owner_id}/participants`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newParticipant.email.trim().toLowerCase(),
          first_name: newParticipant.first_name.trim(),
          last_name: newParticipant.last_name.trim() || null,
          password: newParticipant.password,
          job_title: newParticipant.job_title.trim() || null,
          department: newParticipant.department.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || t('adminConsole.unableToCreateParticipantStatus', { status: response.status }));
      }

      setNewParticipant({
        owner_id: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        job_title: '',
        department: '',
      });
      setShowNewParticipantForm(false);
      const tempPassword = payload?.tempPassword
        ? t('adminConsole.passwordTemppassword', { tempPassword: payload.tempPassword })
        : '';
      setNewParticipantMessage(t('adminConsole.participantCreatedSuccessfullyTemppassword', { tempPassword }));
      await loadAll();
      showNotice(t('adminConsole.participantCreatedSuccessfully'));
    } catch (err) {
      setNewParticipantMessage(err.message || t('adminConsole.unableToCreateParticipant'));
    } finally {
      setBusySaveKey('');
    }
  }

  function beginEditParticipant(participant) {
    setShowNewParticipantForm(false);
    setEditingParticipantError('');
    setEditingParticipant({
      id: participant.id,
      email: participant.email || '',
      first_name: getParticipantFirstName(participant),
      last_name: getParticipantLastName(participant),
      disabled: Boolean(participant.disabled),
      password: '',
      job_title: participant.job_title || '',
      department: participant.department || '',
    });
  }

  async function submitEditParticipant(event) {
    event.preventDefault();
    if (!token || !editingParticipant?.id) return;
    setEditingParticipantError('');

    if (!editingParticipant.first_name.trim() || !isValidEmail(editingParticipant.email)) {
      const message = t('adminConsole.participantFirstNameAndAValid');
      setEditingParticipantError(message);
      setError(message);
      return;
    }

    if (editingParticipant.password && !isStrongPassword(editingParticipant.password)) {
      const message = t('adminConsole.invalidPasswordUse8CharsWith');
      setEditingParticipantError(message);
      setError(message);
      return;
    }

    const normalizedEmail = editingParticipant.email.trim().toLowerCase();

    const duplicateEmail = participants.some((participant) => (
      String(participant?.id) !== String(editingParticipant.id)
      && String(participant?.email || '').trim().toLowerCase() === normalizedEmail
    ));

    if (duplicateEmail) {
      const message = t('adminConsole.thisEmailIsAlreadyUsedBy');
      setEditingParticipantError(message);
      setError(message);
      return;
    }

    const key = `save:participant:${editingParticipant.id}`;
    setBusySaveKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/participants/${editingParticipant.id}`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          first_name: editingParticipant.first_name.trim(),
          last_name: editingParticipant.last_name.trim() || null,
          disabled: Boolean(editingParticipant.disabled),
          ...(editingParticipant.password ? { password: editingParticipant.password } : {}),
          job_title: editingParticipant.job_title.trim() || null,
          department: editingParticipant.department.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || t('adminConsole.unableToUpdateParticipantStatus', { status: response.status }));
      }

      setParticipants((prev) => prev.map((participant) => (
        String(participant?.id) === String(editingParticipant.id)
          ? {
            ...participant,
            ...payload,
            id: participant.id,
            email: payload?.email || normalizedEmail,
            first_name: payload?.first_name ?? editingParticipant.first_name.trim(),
            firstname: payload?.firstname ?? payload?.first_name ?? editingParticipant.first_name.trim(),
            last_name: payload?.last_name ?? (editingParticipant.last_name.trim() || ''),
            lastname: payload?.lastname ?? payload?.last_name ?? (editingParticipant.last_name.trim() || ''),
            disabled: payload?.disabled ?? Boolean(editingParticipant.disabled),
            job_title: payload?.job_title ?? (editingParticipant.job_title.trim() || null),
            department: payload?.department ?? (editingParticipant.department.trim() || null),
          }
          : participant
      )));

      setEditingParticipant(null);
      await loadAll();
      showNotice(t('adminConsole.participantUpdatedSuccessfully'));
    } catch (err) {
      const message = err.message || t('adminConsole.errorWhileUpdatingParticipant');
      setEditingParticipantError(message);
      setError(message);
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleToggleParticipantStatus(participant) {
    if (!token || !participant?.id) return;
    const currentlyDisabled = Boolean(participant.disabled);
    const accepted = window.confirm(
      currentlyDisabled
        ? t('adminConsole.reEnableParticipantdisplayname', { participantDisplayName: getParticipantDisplayName(participant) })
        : t('adminConsole.disableParticipantdisplayname', { participantDisplayName: getParticipantDisplayName(participant) })
    );
    if (!accepted) return;

    const key = `status:participant:${participant.id}`;
    setBusySaveKey(key);
    setError('');

    try {
      const response = await fetch(getApiUrl(`/participants/${participant.id}`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ disabled: !currentlyDisabled }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || t('adminConsole.unableToUpdateParticipantStatusStatus', { status: response.status }));
      }

      await loadAll();
      showNotice(currentlyDisabled
        ? t('adminConsole.participantReEnabled')
        : t('adminConsole.participantDisabled'));
    } catch (err) {
      setError(err.message || t('adminConsole.errorWhileChangingParticipantStatus'));
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleDeleteParticipant(participant) {
    if (!token || !participant?.id) return;
    const accepted = window.confirm(t('adminConsole.deleteParticipantdisplayname', { participantDisplayName: getParticipantDisplayName(participant) }));
    if (!accepted) return;

    const key = `participant:${participant.id}`;
    setBusyDeleteKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/participants/${participant.id}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || t('adminConsole.unableToDeleteParticipantStatus', { status: response.status }));
      }

      if (editingParticipant && String(editingParticipant.id) === String(participant.id)) {
        setEditingParticipant(null);
      }
      await loadAll();
      showNotice(t('adminConsole.participantDeletedSuccessfully'));
    } catch (err) {
      setError(err.message || t('adminConsole.errorWhileDeletingParticipant'));
    } finally {
      setBusyDeleteKey('');
    }
  }

  async function handleResetParticipantPassword(participant) {
    if (!token || !participant?.id) return;

    const custom = window.prompt(
      t('adminConsole.newPasswordForParticipantdisplaynameLeaveBlank', { participantDisplayName: getParticipantDisplayName(participant) }),
      ''
    );
    if (custom === null) return;

    const key = `password:participant:${participant.id}`;
    setBusySaveKey(key);
    setError('');

    try {
      const body = custom.trim() ? { password: custom.trim() } : {};
      const response = await fetch(getApiUrl(`/participants/${participant.id}/password`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || t('adminConsole.unableToResetParticipantPasswordStatus', { status: response.status }));
      }

      const tempPassword = payload?.tempPassword
        ? t('adminConsole.passwordTemppassword', { tempPassword: payload.tempPassword })
        : '';
      showNotice(t('adminConsole.participantPasswordResetTemppassword', { tempPassword }));
    } catch (err) {
      setError(err.message || t('adminConsole.errorWhileResettingTheParticipantPassword'));
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleResendParticipantVerificationLink(participant) {
    if (!participant?.email) return;

    const key = `verify:participant:${participant.id}`;
    setBusySaveKey(key);
    setError('');

    try {
      const response = await fetch(getApiUrl('/auth/resend-verification'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: String(participant.email).trim().toLowerCase(),
          userType: 'participant',
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.message || t('adminConsole.unableToResendVerificationLinkStatus', { status: response.status }));
      }

      showNotice(payload.message || t('adminConsole.participantVerificationLinkResent'));
    } catch (err) {
      setError(err.message || t('adminConsole.errorWhileResendingTheParticipantVerification'));
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleAdminParticipantVerificationOverride(participant) {
    if (!token || !participant?.id) return;

    const key = `verify-admin:participant:${participant.id}`;
    setBusySaveKey(key);
    setError('');

    try {
      const response = await fetch(getApiUrl(`/participants/${participant.id}/email-verification`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.message || t('adminConsole.unableToApproveManuallyStatus', { status: response.status }));
      }

      await loadAll();
      showNotice(payload.message || t('adminConsole.participantManuallyApproved'));
    } catch (err) {
      setError(err.message || t('adminConsole.errorDuringManualParticipantApproval'));
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleDeleteSession(sessionItem) {
    if (!token || !sessionItem?.id) return;
    const isLive = sessionItem.status === 'en_cours';
    const accepted = window.confirm(
      isLive
        ? t('adminConsole.sessionNameIsLiveConfirmDeletion', { name: sessionItem.name || sessionItem.id })
        : t('adminConsole.deleteSessionName', { name: sessionItem.name || sessionItem.id })
    );
    if (!accepted) return;

    const key = `session:${sessionItem.id}`;
    setBusyDeleteKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/sessions/${sessionItem.id}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || t('adminConsole.unableToDeleteStatus', { status: response.status }));
      }

      await loadAll();
      showNotice(t('adminConsole.sessionDeletedSuccessfully'));
    } catch (err) {
      setError(err.message || t('adminConsole.errorWhileDeletingSession'));
    } finally {
      setBusyDeleteKey('');
    }
  }

  function beginEditSession(sessionItem) {
    setShowNewSessionForm(false);
    setEditingSession({
      id: sessionItem.id,
      name: sessionItem.name || '',
      status: sessionItem.status || 'preparee',
      format: sessionItem.format || '',
      modality: sessionItem.modality || '',
      session_date: sessionItem.session_date ? String(sessionItem.session_date).slice(0, 10) : '',
      duration_minutes: sessionItem.duration_minutes || '',
    });
  }

  async function submitEditSession(event) {
    event.preventDefault();
    if (!token || !editingSession?.id) return;

    if (!editingSession.name.trim()) {
      setError(t('adminConsole.sessionNameIsRequired'));
      return;
    }

    if (!SESSION_STATUSES.has(editingSession.status)) {
      setError(t('adminConsole.invalidSessionStatus'));
      return;
    }

    if (!SESSION_MODALITIES.has(editingSession.modality || '')) {
      setError(t('adminConsole.invalidModalityUseRemoteHybridOr'));
      return;
    }

    if (editingSession.duration_minutes && Number(editingSession.duration_minutes) <= 0) {
      setError(t('adminConsole.durationMustBeGreaterThan0'));
      return;
    }

    const key = `save:session:${editingSession.id}`;
    setBusySaveKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/sessions/${editingSession.id}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingSession.name,
          status: editingSession.status,
          ...(editingSession.status === 'en_cours' ? { locale } : {}),
          format: editingSession.format || null,
          modality: editingSession.modality || null,
          session_date: editingSession.session_date || null,
          duration_minutes: editingSession.duration_minutes ? Number(editingSession.duration_minutes) : null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.details || t('adminConsole.unableToUpdateStatus', { status: response.status }));
      }

      setEditingSession(null);
      await loadAll();
      showNotice(t('adminConsole.sessionUpdatedSuccessfully'));
    } catch (err) {
      setError(err.message || t('adminConsole.errorWhileUpdatingSession'));
    } finally {
      setBusySaveKey('');
    }
  }

  async function submitNewSession(event) {
    event.preventDefault();
    if (!token) return;

    setNewSessionMessage('');

    if (!newSession.name.trim()) {
      setNewSessionMessage(t('adminConsole.sessionNameIsRequired'));
      return;
    }

    if (!SESSION_STATUSES.has(newSession.status)) {
      setNewSessionMessage(t('adminConsole.invalidSessionStatus'));
      return;
    }

    if (!SESSION_MODALITIES.has(newSession.modality || '')) {
      setNewSessionMessage(t('adminConsole.invalidModalityUseRemoteHybridOr'));
      return;
    }

    if (newSession.duration_minutes && Number(newSession.duration_minutes) <= 0) {
      setNewSessionMessage(t('adminConsole.durationMustBeGreaterThan0'));
      return;
    }

    const key = 'create:session';
    setBusySaveKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl('/sessions'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSession.name.trim(),
          status: newSession.status,
          ...(newSession.status === 'en_cours' ? { locale } : {}),
          format: newSession.format.trim() || null,
          modality: newSession.modality || null,
          session_date: newSession.session_date || null,
          duration_minutes: newSession.duration_minutes ? Number(newSession.duration_minutes) : null,
          participant_ids: newSessionMemberIds.map((id) => Number(id)).filter(Number.isInteger),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.details || t('adminConsole.unableToCreateSessionStatus', { status: response.status }));
      }

      const createdSession = payload?.session || payload;
      setNewSession(DEFAULT_NEW_SESSION);
      setNewSessionMemberIds([]);
      setNewSessionMemberQuery('');
      setNewSessionMessage(t('adminConsole.sessionCreatedSuccessfully'));
      setShowNewSessionForm(false);
      await loadAll();
      setActiveTab('sessions');
      setSessionQuery('');
      if (createdSession?.id) {
        setEditingSession({
          id: createdSession.id,
          name: createdSession.name || '',
          status: createdSession.status || 'preparee',
          format: createdSession.format || '',
          modality: createdSession.modality || '',
          session_date: createdSession.session_date ? String(createdSession.session_date).slice(0, 10) : '',
          duration_minutes: createdSession.duration_minutes || '',
        });
      }
      showNotice(t('adminConsole.sessionCreatedSuccessfullyFromTheAdmin'));
    } catch (err) {
      setNewSessionMessage(err.message || t('adminConsole.unableToCreateSession'));
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleDeleteChallenge(challengeItem) {
    if (!token || !challengeItem?.id) return;
    const label = challengeItem.name || challengeItem.title || challengeItem.id;
    const accepted = window.confirm(t('adminConsole.deleteChallengeLabel', { label }));
    if (!accepted) return;

    const key = `challenge:${challengeItem.id}`;
    setBusyDeleteKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/challenges/${challengeItem.id}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || t('adminConsole.unableToDeleteStatus', { status: response.status }));
      }

      await loadAll();
      showNotice(t('adminConsole.challengeDeletedSuccessfully'));
    } catch (err) {
      setError(err.message || t('adminConsole.errorWhileDeletingChallenge'));
    } finally {
      setBusyDeleteKey('');
    }
  }

  async function submitNewChallenge(event) {
    event.preventDefault();
    if (!token) return;

    setNewChallengeMessage('');

    if (!newChallenge.name.trim()) {
      setNewChallengeMessage(t('adminConsole.challengeNameIsRequired'));
      return;
    }

    if (!CHALLENGE_TYPES.has(newChallenge.type)) {
      setNewChallengeMessage(t('adminConsole.invalidChallengeType'));
      return;
    }

    if (!CHALLENGE_STATUSES.has(newChallenge.status)) {
      setNewChallengeMessage(t('adminConsole.invalidChallengeStatus'));
      return;
    }

    if (!CHALLENGE_SOURCES.has(newChallenge.source)) {
      setNewChallengeMessage(t('adminConsole.invalidChallengeSource'));
      return;
    }

    const key = 'create:challenge';
    setBusySaveKey(key);
    setError('');

    try {
      const normalizedObjectives = normalizeObjectivesInput(newChallenge.objectives);
      const engineConfig = applyPlayerRangeToEngineConfig(
        stripRulesFromEngineConfig({}),
        newChallenge
      );
      const response = await fetch(getApiUrl('/challenges'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newChallenge.name.trim(),
          type: newChallenge.type,
          status: newChallenge.status,
          source: newChallenge.source,
          category: newChallenge.category || null,
          objectives: normalizedObjectives.length ? normalizedObjectives.join(', ') : null,
          duration: newChallenge.duration || null,
          engine_key: newChallenge.engine_key || null,
          description: newChallenge.description || null,
          engine_config: engineConfig,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.details || t('adminConsole.unableToCreateChallengeStatus', { status: response.status }));
      }

      setNewChallenge(DEFAULT_NEW_CHALLENGE);
      setNewChallengeMessage(t('adminConsole.challengeCreatedSuccessfully'));
      setShowNewChallengeForm(false);
      await loadAll();
      showNotice(t('adminConsole.challengeCreatedSuccessfully'));
    } catch (err) {
      setNewChallengeMessage(err.message || t('adminConsole.unableToCreateChallenge'));
    } finally {
      setBusySaveKey('');
    }
  }

  function beginEditChallenge(challengeItem) {
    setChallengeImageUploadError('');
    setShowNewChallengeForm(false);
    const isCoPuzzle = String(challengeItem?.engine_key || '').toLowerCase() === 'copuzzle_live_v1';
    const normalizedEngineConfig = isCoPuzzle
      ? ensureCopuzzleConfig(challengeItem.engine_config)
      : cloneJson(challengeItem.engine_config, {}) || {};
    const rulesSource = {
      objective: challengeItem?.rules_objective,
      facilitator: challengeItem?.rules_facilitator,
      participant: challengeItem?.rules_participant,
      footnote: challengeItem?.rules_footnote,
    };
    const playerRange = resolveChallengePlayerRange({ engine_config: normalizedEngineConfig });

    setEditingChallenge({
      id: challengeItem.id,
      name: challengeItem.name || '',
      type: challengeItem.type || 'individuel',
      status: challengeItem.status || 'actif',
      category: challengeItem.category || '',
      objectives: normalizeObjectivesInput(challengeItem.objectives),
      duration: challengeItem.duration || '',
      engine_key: challengeItem.engine_key || '',
      description: challengeItem.description || '',
      engine_config: normalizedEngineConfig,
      rules_objective: String(resolveLocalizedRuleValue(rulesSource.objective, locale) || ''),
      rules_facilitator: Array.isArray(resolveLocalizedRuleValue(rulesSource.facilitator, locale))
        ? resolveLocalizedRuleValue(rulesSource.facilitator, locale).join('\n')
        : '',
      rules_participant: Array.isArray(resolveLocalizedRuleValue(rulesSource.participant, locale))
        ? resolveLocalizedRuleValue(rulesSource.participant, locale).join('\n')
        : '',
      rules_footnote: String(resolveLocalizedRuleValue(rulesSource.footnote, locale) || ''),
      player_min: playerRange.min || '',
      player_recommended: playerRange.recommended || '',
      player_max: playerRange.max || '',
    });
  }

  async function persistChallengeEngineConfig(challengeId, nextEngineConfig) {
    const response = await fetch(getApiUrl(`/challenges/${challengeId}`), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        engine_config: nextEngineConfig,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || payload.details || t('adminConsole.unableToSaveChallengeStatus', { status: response.status }));
    }

    const persistedConfig = cloneJson(payload?.engine_config, null) || cloneJson(nextEngineConfig, {}) || {};

    setChallenges((prev) => prev.map((item) => (
      String(item?.id || '') === String(challengeId)
        ? { ...item, engine_config: persistedConfig }
        : item
    )));

    setEditingChallenge((prev) => {
      if (!prev) return prev;
      if (String(prev.id || '') !== String(challengeId)) return prev;
      return {
        ...prev,
        engine_config: persistedConfig,
      };
    });

    return persistedConfig;
  }

  async function handleUploadEscapeRoomImage(event) {
    if (!token || !editingChallenge) return;

    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setChallengeImageUploadError('');

    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setChallengeImageUploadError(t('adminConsole.unsupportedFormatUseJpgOrPng'));
      event.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setChallengeImageUploadError(t('adminConsole.imageTooLargeMax8Mb'));
      event.target.value = '';
      return;
    }

    setChallengeImageUploadBusy(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(getApiUrl('/challenges/upload-image'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || t('adminConsole.unableToUploadStatus', { status: response.status }));
      }

      const uploadedUrl = normalizeUploadResultUrl(payload);
      if (!uploadedUrl) {
        throw new Error(t('adminConsole.missingImageUrlInUploadResponse'));
      }

      const nextEngineConfig = ensureEscapeRoomE5Image(editingChallenge.engine_config, uploadedUrl);
      await persistChallengeEngineConfig(editingChallenge.id, nextEngineConfig);
      showNotice(t('adminConsole.puzzle5ImageUploadedAndSaved'));
    } catch (err) {
      setChallengeImageUploadError(err.message || t('adminConsole.unableToUploadImage'));
    } finally {
      setChallengeImageUploadBusy(false);
      event.target.value = '';
    }
  }

  async function handleUploadCopuzzleDefaultImage(event, imageIndex) {
    if (!token || !editingChallenge) return;

    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setChallengeImageUploadError('');

    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setChallengeImageUploadError(t('adminConsole.unsupportedFormatUseJpgOrPng'));
      event.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setChallengeImageUploadError(t('adminConsole.imageTooLargeMax8Mb'));
      event.target.value = '';
      return;
    }

    setChallengeImageUploadBusy(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(getApiUrl('/challenges/upload-image'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || t('adminConsole.unableToUploadStatus', { status: response.status }));
      }

      const uploadedUrl = normalizeUploadResultUrl(payload);
      if (!uploadedUrl) {
        throw new Error(t('adminConsole.missingImageUrlInUploadResponse'));
      }

      const currentConfig = ensureCopuzzleConfig(editingChallenge.engine_config);
      const defaultImages = getCopuzzleDefaultImages(currentConfig).map((item) => ({ ...item }));
      const safeIndex = Math.max(0, Math.min(defaultImages.length - 1, Number(imageIndex) || 0));
      const currentItem = defaultImages[safeIndex] || {
        id: `default_${safeIndex + 1}`,
        title: `Image ${safeIndex + 1}`,
        src: '',
      };

      defaultImages[safeIndex] = {
        ...currentItem,
        src: uploadedUrl,
      };

      const selectedDefaultImageId = String(currentConfig.default_image_id || defaultImages[0]?.id || '').trim();
      const selectedDefault = defaultImages.find((item) => item.id === selectedDefaultImageId) || defaultImages[0] || null;
      const nextEngineConfig = {
        ...currentConfig,
        default_images: defaultImages,
        image_url: String(selectedDefault?.src || uploadedUrl),
        image: {
          ...(currentConfig.image || {}),
          src: String(selectedDefault?.src || uploadedUrl),
        },
      };

      await persistChallengeEngineConfig(editingChallenge.id, nextEngineConfig);
      showNotice(t('adminConsole.copuzzleReferenceImageUploadedAndSaved'));
    } catch (err) {
      setChallengeImageUploadError(err.message || t('adminConsole.unableToUploadImage'));
    } finally {
      setChallengeImageUploadBusy(false);
      event.target.value = '';
    }
  }

  async function submitEditChallenge(event) {
    event.preventDefault();
    if (!token || !editingChallenge?.id) return;

    if (!editingChallenge.name.trim()) {
      setError(t('adminConsole.challengeNameIsRequired'));
      return;
    }

    if (!CHALLENGE_TYPES.has(editingChallenge.type)) {
      setError(t('adminConsole.invalidChallengeType'));
      return;
    }

    if (!CHALLENGE_STATUSES.has(editingChallenge.status)) {
      setError(t('adminConsole.invalidChallengeStatus'));
      return;
    }

    const key = `save:challenge:${editingChallenge.id}`;
    setBusySaveKey(key);
    setError('');
    try {
      const normalizedObjectives = normalizeObjectivesInput(editingChallenge.objectives);
      const engineConfig = applyPlayerRangeToEngineConfig(
        stripRulesFromEngineConfig(editingChallenge.engine_config || {}),
        editingChallenge
      );
      const response = await fetch(getApiUrl(`/challenges/${editingChallenge.id}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingChallenge.name,
          type: editingChallenge.type,
          status: editingChallenge.status,
          category: editingChallenge.category || null,
          objectives: normalizedObjectives.length ? normalizedObjectives.join(', ') : null,
          duration: editingChallenge.duration || null,
          engine_key: editingChallenge.engine_key || null,
          description: editingChallenge.description || null,
          engine_config: engineConfig,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.details || t('adminConsole.unableToUpdateStatus', { status: response.status }));
      }

      setEditingChallenge(null);
      await loadAll();
      showNotice(t('adminConsole.challengeUpdatedSuccessfully'));
    } catch (err) {
      setError(err.message || t('adminConsole.errorWhileUpdatingChallenge'));
    } finally {
      setBusySaveKey('');
    }
  }

  function buildPricingPayloadFromDraft(draft) {
    const features = String(draft.features || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      name: String(draft.name || '').trim(),
      description: String(draft.description || '').trim() || null,
      features,
      price: draft.price === '' ? null : Number(String(draft.price).replace(',', '.')),
      currency: String(draft.currency || 'EUR').trim().toUpperCase(),
      billing_cycle: String(draft.billing_cycle || 'monthly').trim().toLowerCase(),
      cta_label: String(draft.cta_label || '').trim() || null,
      is_active: Boolean(draft.is_active),
      highlighted: Boolean(draft.highlighted),
      max_users: draft.max_users === '' ? null : Number(draft.max_users),
      max_sessions_per_month: draft.max_sessions_per_month === '' ? null : Number(draft.max_sessions_per_month),
      support_level: String(draft.support_level || '').trim() || null,
      trial_days: draft.trial_days === '' ? null : Number(draft.trial_days),
      display_order: draft.display_order === '' ? 0 : Number(draft.display_order),
    };
  }

  async function submitNewPricingPlan(event) {
    event.preventDefault();
    if (!token) return;

    setNewPricingMessage('');
    const payload = buildPricingPayloadFromDraft(newPricingPlan);

    if (!payload.name) {
      setNewPricingMessage(t('adminConsole.planNameIsRequired'));
      return;
    }

    if (!Number.isFinite(payload.price) || payload.price < 0) {
      setNewPricingMessage(t('adminConsole.priceIsRequiredAndMustBe'));
      return;
    }

    if (!PRICING_BILLING_CYCLES.has(payload.billing_cycle)) {
      setNewPricingMessage(t('adminConsole.invalidBillingCycle'));
      return;
    }

    const key = 'create:pricing-plan';
    setBusySaveKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl('/pricing-plans'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || t('adminConsole.unableToCreatePlanStatus', { status: response.status }));
      }

      setNewPricingPlan(DEFAULT_NEW_PRICING_PLAN);
      setNewPricingMessage(t('adminConsole.planCreatedSuccessfully'));
      setShowNewPricingPlanForm(false);
      await loadAll();
      showNotice(t('adminConsole.pricingPlanCreated'));
    } catch (err) {
      setNewPricingMessage(err.message || t('adminConsole.unableToCreatePlan'));
    } finally {
      setBusySaveKey('');
    }
  }

  function beginEditPricingPlan(plan) {
    setShowNewPricingPlanForm(false);
    setEditingPricingPlan(planToDraft(plan));
  }

  async function submitEditPricingPlan(event) {
    event.preventDefault();
    if (!token || !editingPricingPlan?.id) return;

    const payload = buildPricingPayloadFromDraft(editingPricingPlan);
    if (!payload.name) {
      setError(t('adminConsole.planNameIsRequired'));
      return;
    }

    if (!Number.isFinite(payload.price) || payload.price < 0) {
      setError(t('adminConsole.priceMustBeValidAndPositive'));
      return;
    }

    if (!PRICING_BILLING_CYCLES.has(payload.billing_cycle)) {
      setError(t('adminConsole.invalidBillingCycle'));
      return;
    }

    const key = `save:pricing-plan:${editingPricingPlan.id}`;
    setBusySaveKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/pricing-plans/${editingPricingPlan.id}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || t('adminConsole.unableToUpdatePlanStatus', { status: response.status }));
      }

      setEditingPricingPlan(null);
      await loadAll();
      showNotice(t('adminConsole.pricingPlanUpdated'));
    } catch (err) {
      setError(err.message || t('adminConsole.errorWhileUpdatingThePlan'));
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleDeletePricingPlan(plan) {
    if (!token || !plan?.id) return;
    const accepted = window.confirm(t('adminConsole.deletePlanName', { name: plan.name || plan.id }));
    if (!accepted) return;

    const key = `pricing-plan:${plan.id}`;
    setBusyDeleteKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/pricing-plans/${plan.id}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || t('adminConsole.unableToDeletePlanStatus', { status: response.status }));
      }

      if (editingPricingPlan && String(editingPricingPlan.id) === String(plan.id)) {
        setEditingPricingPlan(null);
      }
      await loadAll();
      showNotice(t('adminConsole.pricingPlanDeleted'));
    } catch (err) {
      setError(err.message || t('adminConsole.errorWhileDeletingThePlan'));
    } finally {
      setBusyDeleteKey('');
    }
  }

  function buildLandingPayloadFromDraft(draft) {
    return {
      label: String(draft.label || '').trim() || null,
      title: String(draft.title || '').trim() || null,
      subtitle: String(draft.subtitle || '').trim() || null,
      description: String(draft.description || '').trim() || null,
      image_url: String(draft.image_url || '').trim() || null,
      cta_label: String(draft.cta_label || '').trim() || null,
      cta_href: String(draft.cta_href || '').trim() || null,
      badge_text: String(draft.badge_text || '').trim() || null,
      is_active: Boolean(draft.is_active),
      display_order: draft.display_order === '' ? 0 : Number(draft.display_order),
    };
  }

  async function submitNewLandingBlock(event) {
    event.preventDefault();
    if (!token) return;

    const blockKey = String(newLandingBlock.block_key || '').trim().toLowerCase();
    if (!blockKey) {
      setNewLandingMessage(t('adminConsole.blockKeyIsRequired'));
      return;
    }

    if (!isAllowedLandingBlockKey(blockKey)) {
      setNewLandingMessage(t('adminConsole.unauthorizedBlockKeyUseOnlyLanding', { LANDING_ALLOWED_BLOCK_KEY_HINT }));
      return;
    }

    const payload = buildLandingPayloadFromDraft(newLandingBlock);
    const key = `create:landing:${blockKey}`;
    setBusySaveKey(key);
    setError('');
    setNewLandingMessage('');

    try {
      const response = await fetch(getApiUrl(`/landing-content/${encodeURIComponent(blockKey)}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || t('adminConsole.unableToCreateBlockStatus', { status: response.status }));
      }

      setNewLandingBlock(DEFAULT_NEW_LANDING_BLOCK);
      setNewLandingMessage(t('adminConsole.landingBlockSaved'));
      setShowNewLandingBlockForm(false);
      await loadAll();
      showNotice(t('adminConsole.landingBlockCreatedUpdated'));
    } catch (err) {
      setNewLandingMessage(err.message || t('adminConsole.errorWhileCreatingLandingBlock'));
    } finally {
      setBusySaveKey('');
    }
  }

  function beginEditLandingBlock(block) {
    setShowNewLandingBlockForm(false);
    setEditingLandingBlock(landingBlockToDraft(block));
  }

  async function submitEditLandingBlock(event) {
    event.preventDefault();
    if (!token || !editingLandingBlock?.block_key) return;

    const blockKey = String(editingLandingBlock.block_key || '').trim().toLowerCase();
    if (!blockKey) {
      setError(t('adminConsole.blockKeyIsRequired'));
      return;
    }

    if (!isAllowedLandingBlockKey(blockKey)) {
      setError(t('adminConsole.unauthorizedBlockKeyUseOnlyLanding', { LANDING_ALLOWED_BLOCK_KEY_HINT }));
      return;
    }

    const payload = buildLandingPayloadFromDraft(editingLandingBlock);
    const key = `save:landing:${blockKey}`;
    setBusySaveKey(key);
    setError('');

    try {
      const response = await fetch(getApiUrl(`/landing-content/${encodeURIComponent(blockKey)}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || t('adminConsole.unableToUpdateBlockStatus', { status: response.status }));
      }

      setEditingLandingBlock(null);
      await loadAll();
      showNotice(t('adminConsole.landingBlockUpdated'));
    } catch (err) {
      setError(err.message || t('adminConsole.errorWhileUpdatingLandingBlock'));
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleDeleteLandingBlock(block) {
    if (!token || !block?.block_key) return;
    const accepted = window.confirm(t('adminConsole.deleteBlockBlockKey', { block_key: block.block_key }));
    if (!accepted) return;

    const key = `landing:${block.block_key}`;
    setBusyDeleteKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/landing-content/${encodeURIComponent(block.block_key)}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || t('adminConsole.unableToDeleteBlockStatus', { status: response.status }));
      }

      if (editingLandingBlock && editingLandingBlock.block_key === block.block_key) {
        setEditingLandingBlock(null);
      }

      await loadAll();
      showNotice(t('adminConsole.landingBlockDeleted'));
    } catch (err) {
      setError(err.message || t('adminConsole.errorWhileDeletingLandingBlock'));
    } finally {
      setBusyDeleteKey('');
    }
  }

  function logout() {
    clearSessionAuth();
    window.location.replace(withLocalePath('/login'));
  }

  function showNotice(msg) {
    setNotice(msg);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 4000);
  }

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const stats = useMemo(
    () => ({
      users: users.length,
      activeUsers: users.filter((u) => !u.disabled).length,
      disabledUsers: users.filter((u) => Boolean(u.disabled)).length,
      pending: pendingUsers.length,
      participants: participants.length,
      activeParticipants: participants.filter((p) => !p.disabled).length,
      sessions: sessions.length,
      activeSessions: sessions.filter((s) => s.status === 'en_cours').length,
      challenges: challenges.length,
      pricingPlans: pricingPlans.length,
      landingBlocks: landingBlocks.length,
    }),
    [users, pendingUsers, participants, sessions, challenges, pricingPlans, landingBlocks]
  );

  const analyticsSnapshot = useMemo(() => {
    const source = analyticsOverview && typeof analyticsOverview === 'object' ? analyticsOverview : {};
    return {
      configured: Boolean(source.configured),
      degraded: Boolean(source.degraded),
      errorCode: String(source.errorCode || ''),
      reason: String(source.reason || '').trim(),
      lookbackDays: Number(source.lookbackDays || 30),
      users: source.users || {},
      engagement: source.engagement || {},
      conversion: source.conversion || {},
      performance: source.performance || {},
      business: source.business || {},
      visitors: source.visitors || {},
      generatedAt: String(source.generatedAt || ''),
    };
  }, [analyticsOverview]);

  const visitorCountries = useMemo(
    () => (Array.isArray(analyticsSnapshot.visitors.countries) ? analyticsSnapshot.visitors.countries : []),
    [analyticsSnapshot.visitors.countries]
  );

  const visitorCities = useMemo(
    () => (Array.isArray(analyticsSnapshot.visitors.cities) ? analyticsSnapshot.visitors.cities : []),
    [analyticsSnapshot.visitors.cities]
  );

  const visitorCitiesByCountry = useMemo(
    () => (Array.isArray(analyticsSnapshot.visitors.citiesByCountry) ? analyticsSnapshot.visitors.citiesByCountry : []),
    [analyticsSnapshot.visitors.citiesByCountry]
  );

  const effectiveSelectedCountry = useMemo(() => {
    const fallbackCountry = String(visitorCountries[0]?.label || '').trim();
    if (!selectedVisitorCountry) return fallbackCountry;
    const selectedExists = visitorCountries.some((item) => String(item?.label || '').trim() === selectedVisitorCountry);
    return selectedExists ? selectedVisitorCountry : fallbackCountry;
  }, [selectedVisitorCountry, visitorCountries]);

  const citiesForSelectedCountry = useMemo(() => {
    const selectedCountry = String(effectiveSelectedCountry || '').trim();
    if (!selectedCountry) return [];

    const grouped = new Map();
    visitorCitiesByCountry.forEach((row) => {
      if (String(row?.country || '').trim() !== selectedCountry) return;
      const city = String(row?.city || '').trim() || 'Inconnue';
      const value = Math.max(0, Number(row?.value || 0));
      grouped.set(city, (grouped.get(city) || 0) + value);
    });

    return Array.from(grouped.entries())
      .map(([label, value]) => ({ label, value }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [effectiveSelectedCountry, visitorCitiesByCountry]);

  const displayedCitiesForAnalytics = useMemo(() => {
    const source = citiesForSelectedCountry.length > 0 ? citiesForSelectedCountry : visitorCities;
    if (showAllCitiesForCountry) return source;
    return source.slice(0, 6);
  }, [citiesForSelectedCountry, showAllCitiesForCountry, visitorCities]);

  const canExpandCitiesForCountry = useMemo(
    () => citiesForSelectedCountry.length > 6,
    [citiesForSelectedCountry]
  );

  useEffect(() => {
    setShowAllCitiesForCountry(false);
  }, [effectiveSelectedCountry]);

  function exportAnalyticsCsv() {
    const rows = [
      ['metric', 'value', 'unit', 'window_days', 'generated_at'],
      ['users_active_total', Number(analyticsSnapshot.users.totalActive || 0), 'count', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['users_new', Number(analyticsSnapshot.users.newUsers || 0), 'count', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['users_returning', Number(analyticsSnapshot.users.returningUsers || 0), 'count', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['engagement_page_views', Number(analyticsSnapshot.engagement.pageViews || 0), 'count', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['engagement_avg_session_duration', Number(analyticsSnapshot.engagement.avgSessionDurationSec || 0), 'seconds', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['conversion_signup_count', Number(analyticsSnapshot.conversion.signupCount || 0), 'count', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['conversion_purchase_count', Number(analyticsSnapshot.conversion.purchaseCount || 0), 'count', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['conversion_key_action_count', Number(analyticsSnapshot.conversion.keyActionCount || 0), 'count', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['performance_avg_page_load', Number(analyticsSnapshot.performance.avgPageLoadMs || 0), 'milliseconds', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['performance_frontend_error_count', Number(analyticsSnapshot.performance.frontendErrorCount || 0), 'count', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['business_revenue', Number(analyticsSnapshot.business.revenue || 0), String(analyticsSnapshot.business.currency || 'EUR').toUpperCase(), analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['business_avg_basket', Number(analyticsSnapshot.business.avgBasket || 0), String(analyticsSnapshot.business.currency || 'EUR').toUpperCase(), analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
    ];

    const csv = rows
      .map((row) => row.map((cell) => csvEscape(cell)).join(';'))
      .join('\n');

    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `analytics-admin-${analyticsSnapshot.lookbackDays}j-${stamp}.csv`;
    downloadTextFile(csv, filename, 'text/csv;charset=utf-8;');
  }

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u) => {
      const haystack = [u.first_name, u.last_name, u.email, u.role, u.job_title, u.department]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [users, userQuery]);

  const filteredParticipants = useMemo(() => {
    const query = participantQuery.trim().toLowerCase();
    if (!query) return participants;
    return participants.filter((p) => {
      const haystack = [
        p.email,
        p.first_name,
        p.firstname,
        p.last_name,
        p.lastname,
        p.job_title,
        p.department,
        p.creator?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [participants, participantQuery]);

  function getSessionOwnerLabel(s) {
    const fullName = [s.owner?.first_name, s.owner?.last_name].filter(Boolean).join(' ');
    if (fullName && s.owner?.email) return `${fullName} (${s.owner.email})`;
    return fullName || s.owner?.email || `#${s.owner_id || '?'}`;
  }

  const filteredSessions = useMemo(() => {
    const query = sessionQuery.trim().toLowerCase();
    if (!query) return sessions;
    return sessions.filter((s) => {
      const haystack = [s.name, s.status, s.format, s.modality, s.owner?.first_name, s.owner?.last_name, s.owner?.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [sessions, sessionQuery]);

  const filteredChallenges = useMemo(() => {
    const query = challengeQuery.trim().toLowerCase();
    if (!query) return challenges;
    return challenges.filter((c) => {
      const haystack = [c.name, c.title, c.engine_key, c.type, c.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [challenges, challengeQuery]);

  const filteredPricingPlans = useMemo(() => {
    const query = pricingQuery.trim().toLowerCase();
    if (!query) return pricingPlans;
    return pricingPlans.filter((plan) => {
      const haystack = [
        plan.name,
        plan.description,
        plan.currency,
        plan.billing_cycle,
        plan.support_level,
        ...(Array.isArray(plan.features) ? plan.features : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [pricingPlans, pricingQuery]);

  const filteredLandingBlocks = useMemo(() => {
    const query = landingQuery.trim().toLowerCase();
    if (!query) return landingBlocks;
    return landingBlocks.filter((block) => {
      const haystack = [
        block.block_key,
        block.label,
        block.title,
        block.subtitle,
        block.description,
        block.image_url,
        block.cta_label,
        block.cta_href,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [landingBlocks, landingQuery]);

  const filteredAssignableMembers = useMemo(() => {
    const query = newSessionMemberQuery.trim().toLowerCase();
    const source = participants.filter((participant) => !Boolean(participant?.disabled));
    if (!query) return source;
    return source.filter((participant) => {
      const haystack = [
        participant.first_name,
        participant.firstname,
        participant.last_name,
        participant.lastname,
        participant.email,
        participant.department,
        participant.job_title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [participants, newSessionMemberQuery]);

  function toggleNewSessionMember(memberId) {
    setNewSessionMemberIds((prev) => {
      const normalized = String(memberId);
      if (prev.includes(normalized)) {
        return prev.filter((id) => id !== normalized);
      }
      return [...prev, normalized];
    });
  }

  if (loading) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>{t('adminConsole.checkingAdminSession')}</h1>
          <p>{t('adminConsole.loading')}</p>
        </section>
      </main>
    );
  }

  const TAB_ITEMS = [
    { id: 'dashboard', label: t('adminConsole.dashboard'), badge: null },
    { id: 'analytics', label: t('adminConsole.analytics'), badge: null },
    { id: 'users', label: t('adminConsole.users'), badge: stats.pending > 0 ? stats.pending : null },
    { id: 'participants', label: t('adminConsole.participants'), badge: null },
    { id: 'sessions', label: t('adminConsole.sessions'), badge: stats.activeSessions > 0 ? stats.activeSessions : null },
    { id: 'challenges', label: 'Challenges', badge: null },
    { id: 'linkedin', label: t('adminConsole.linkedinPosts'), badge: null, href: withLocalePath('/admin/linkedin') },
    { id: 'billing', label: t('adminConsole.billing'), badge: null, href: withLocalePath('/admin/billing') },
    { id: 'pricing', label: t('adminConsole.pricing'), badge: stats.pricingPlans > 0 ? stats.pricingPlans : null },
    { id: 'landing', label: t('adminConsole.landingCms'), badge: stats.landingBlocks > 0 ? stats.landingBlocks : null },
  ];

  function handleAdminTabClick(tab) {
    if (tab?.href) {
      window.location.href = tab.href;
      return;
    }
    setActiveTab(tab.id);
  }

  return (
    <>
      <AppNav userLabel={pickUserLabel(user)} onLogout={logout} role="admin" />
      <datalist id="known-engine-keys">
        {KNOWN_ENGINE_KEYS.map((engineKey) => (
          <option key={engineKey} value={engineKey} />
        ))}
      </datalist>
      <div className="admin-console-layout">

        {/* Sidebar - responsive via CSS media query */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar__brand">
            <p className="admin-sidebar__eyebrow">TeamBlender</p>
            <p className="admin-sidebar__title">{t('adminConsole.adminConsole')}</p>
          </div>

          <nav className="admin-sidebar__nav">
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`admin-nav-button${activeTab === tab.id ? ' is-active' : ''}`}
                onClick={() => handleAdminTabClick(tab)}
              >
                <span>{tab.label}</span>
                {tab.badge != null ? (
                  <span className="admin-nav-badge">{tab.badge}</span>
                ) : null}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="admin-main-shell">

          {/* Notifications */}
          {error ? (
            <div className="admin-alert admin-alert--error" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span>{error}</span>
              <button type="button" aria-label={t('adminConsole.closeErrorMessage')} onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: '16px', lineHeight: 1, padding: '0 0 0 12px' }}>✕</button>
            </div>
          ) : null}

          {notice ? (
            <div className="admin-alert admin-alert--success" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span>{notice}</span>
              <button type="button" aria-label={t('adminConsole.closeInfoMessage')} onClick={() => setNotice('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803d', fontSize: '16px', lineHeight: 1, padding: '0 0 0 12px' }}>✕</button>
            </div>
          ) : null}

          <div className="admin-mobile-tabs" aria-label={t('adminConsole.adminMobileNavigation')}>
            {TAB_ITEMS.map((tab) => (
              <button
                key={`mobile-${tab.id}`}
                type="button"
                className={`admin-mobile-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => handleAdminTabClick(tab)}
              >
                {tab.label}
                {tab.badge != null ? <span className="admin-mobile-tab-badge">{tab.badge}</span> : null}
              </button>
            ))}
          </div>

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' ? (
            <div>
              <div className="admin-page-hero admin-page-hero--dashboard">
                <div>
                  <p className="admin-page-hero__eyebrow">{t('adminConsole.operationsCenter')}</p>
                  <h1 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 6px' }}>{t('adminConsole.dashboard')}</h1>
                  <p className="admin-page-hero__text">{t('adminConsole.platformOverviewInRealTime')}</p>
                </div>
                <div className="admin-page-hero__pill">{pickUserLabel(user)}</div>
              </div>
              <div className="admin-stat-grid" style={{ marginBottom: '24px' }}>
                {[
                  { value: stats.users, label: t('adminConsole.users') },
                  { value: stats.activeUsers, label: t('adminConsole.activeUsers') },
                  { value: stats.disabledUsers, label: t('adminConsole.inactiveUsers') },
                  { value: stats.pending, label: t('adminConsole.pendingRequests'), highlight: stats.pending > 0 },
                  { value: stats.participants, label: 'Participants' },
                  { value: stats.activeParticipants, label: t('adminConsole.activeParticipants') },
                  { value: stats.sessions, label: 'Sessions' },
                  { value: stats.activeSessions, label: t('adminConsole.liveSessions'), highlight: stats.activeSessions > 0 },
                  { value: stats.challenges, label: 'Challenges' },
                  { value: stats.pricingPlans, label: t('adminConsole.pricingPlans') },
                  { value: stats.landingBlocks, label: t('adminConsole.landingCmsBlocks') },
                ].map((item) => (
                  <div key={item.label} className={`admin-stat-card${item.highlight ? ' admin-stat-card--highlight' : ''}`}>
                    <p className="admin-stat-card__value">{item.value}</p>
                    <p className="admin-stat-card__label">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="admin-panel-card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>{t('adminConsole.recentAdminActivity')}</h2>
                    <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '13px' }}>
                      {t('adminConsole.totalvisitsVisitsRecordedInTheLast', { totalVisits: adminVisitSummary.totalVisits })}
                    </p>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-muted, #6b7280)', textAlign: 'right' }}>
                    <div><strong style={{ color: 'var(--color-primary, #4f46e5)' }}>{adminVisitSummary.totalVisits}</strong> {t('adminConsole.visits')}</div>
                    <div>{adminVisitSummary.uniqueUsers} {t('adminConsole.activeUsers2')}</div>
                  </div>
                </div>

                {adminActivityLoading ? (
                  <p style={{ margin: 0, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>{t('adminConsole.loadingActivity')}</p>
                ) : adminVisits.length > 0 ? (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {adminVisits.map((visit) => (
                      <li key={String(visit.id || `${visit.page || 'visit'}-${visit.createdAt || visit.created_at || Math.random()}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderTop: '1px solid var(--color-border, #e5e7eb)' }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 600, margin: '0 0 2px', fontSize: '14px' }}>{String(visit.page || '/admin').trim() || '/admin'}</p>
                          <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '12px' }}>
                            {String(visit.eventType || 'page_view').trim() || 'page_view'} · {visit.userEmail || t('adminConsole.unknownUser')}
                          </p>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-muted, #6b7280)', textAlign: 'right', flexShrink: 0 }}>
                          <div>{visit.createdAt ? formatDateTime(visit.createdAt, locale) : t('adminConsole.justNow')}</div>
                          <div>{visit.userRole || 'admin'}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>{t('adminConsole.noVisitActivityHasBeenRecorded')}</p>
                )}
              </div>

              {/* Pending approvals on dashboard */}
              {pendingUsers.length > 0 ? (
                <div className="admin-panel-card admin-panel-card--accent">
                  <h2 style={{ fontSize: '16px', fontWeight: 700, marginTop: 0, marginBottom: '16px' }}>{t('adminConsole.pendingRequests')} ({pendingUsers.length})</h2>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {pendingUsers.map((u) => (
                      <li key={String(u.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px 0', borderBottom: '1px solid var(--color-border, #e5e7eb)' }}>
                        <div>
                          <p style={{ fontWeight: 600, margin: '0 0 2px', fontSize: '14px' }}>{u.first_name || ''} {u.last_name || ''}</p>
                          <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '13px' }}>{u.email}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          <button type="button" className="btn-primary" disabled={busyApprovalId === u.id} onClick={() => updateApproval(u.id, 'approved')} style={{ fontSize: '13px', padding: '6px 14px' }}>{t('adminConsole.approve')}</button>
                          <button type="button" className="btn-secondary" disabled={busyApprovalId === u.id} onClick={() => updateApproval(u.id, 'rejected')} style={{ fontSize: '13px', padding: '6px 14px' }}>{t('adminConsole.reject')}</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* ── ANALYTICS ── */}
          {activeTab === 'analytics' ? (
            <div>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>{t('adminConsole.posthogAnalytics')}</h1>
                  <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>
                    {t('adminConsole.summaryOfTheLastLookbackdaysDays', { lookbackDays: analyticsSnapshot.lookbackDays })}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {[7, 30, 90].map((days) => (
                    <button
                      key={`analytics-period-${days}`}
                      type="button"
                      className="btn-secondary"
                      onClick={() => setAnalyticsDays(days)}
                      disabled={analyticsLoading || analyticsDays === days}
                      style={{
                        fontSize: '12px',
                        padding: '6px 10px',
                        borderColor: analyticsDays === days ? 'var(--color-primary, #4f46e5)' : undefined,
                        color: analyticsDays === days ? 'var(--color-primary, #4f46e5)' : undefined,
                      }}
                    >
                      {days}{t('adminConsole.d')}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => loadAnalytics()}
                    disabled={analyticsLoading}
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                  >
                    {analyticsLoading ? t('adminConsole.refreshing') : t('adminConsole.refresh')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={exportAnalyticsCsv}
                    disabled={analyticsLoading || !analyticsSnapshot.configured || analyticsSnapshot.degraded || Boolean(analyticsError)}
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                  >
                    {t('adminConsole.exportCsv')}
                  </button>
                </div>
              </div>

              <div className="admin-panel-card" style={{ marginBottom: '16px' }}>
                {analyticsSnapshot.configured ? (
                  <p style={{ margin: 0, fontSize: '13px', color: analyticsSnapshot.degraded ? 'var(--color-warning, #b45309)' : 'var(--color-success, #15803d)', fontWeight: 600 }}>
                    {analyticsSnapshot.degraded
                      ? t('adminConsole.posthogUnavailableDegradedMode')
                      : t('adminConsole.posthogConnected')}
                  </p>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-warning, #b45309)', fontWeight: 600 }}>{t('adminConsole.analyticsNotConfigured')}</p>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--color-muted, #6b7280)', lineHeight: 1.55 }}>
                      {t('adminConsole.add')}<code style={{ fontFamily: 'monospace', background: 'var(--color-code-bg, #f3f4f6)', padding: '1px 4px', borderRadius: '3px' }}>POSTHOG_PROJECT_ID</code>{t('adminConsole.and')}
                      <code style={{ fontFamily: 'monospace', background: 'var(--color-code-bg, #f3f4f6)', padding: '1px 4px', borderRadius: '3px' }}>POSTHOG_PERSONAL_API_KEY</code>{' '}
                      {t('adminConsole.toTheBackend')}<code style={{ fontFamily: 'monospace', background: 'var(--color-code-bg, #f3f4f6)', padding: '1px 4px', borderRadius: '3px' }}>.env</code>{t('adminConsole.fileThenRestartTheServer')}
                    </p>
                  </>
                )}
                {analyticsSnapshot.configured && analyticsSnapshot.degraded && analyticsSnapshot.reason ? (
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--color-warning-dark, #92400e)', lineHeight: 1.5 }}>
                    {t('adminConsole.reason')}: {analyticsSnapshot.reason}
                  </p>
                ) : null}
                {analyticsSnapshot.errorCode === 'POSTHOG_AUTHENTICATION_FAILED' || analyticsSnapshot.errorCode === 'POSTHOG_ACCESS_DENIED' ? (
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--color-warning-dark, #92400e)', lineHeight: 1.5 }}>
                    {analyticsSnapshot.errorCode === 'POSTHOG_AUTHENTICATION_FAILED'
                      ? t('adminConsole.replacePosthogPersonalApiKeyWith')
                      : t('adminConsole.checkThatThePersonalApiKey')}
                  </p>
                ) : null}
                {analyticsSnapshot.generatedAt ? (
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--color-muted, #6b7280)' }}>
                    {t('adminConsole.generatedAt')} {formatDate(analyticsSnapshot.generatedAt, locale, NUMERIC_DATE_TIME)}
                  </p>
                ) : null}
                {analyticsError ? (
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#b45309' }}>
                    {t('adminConsole.dataTemporarilyUnavailable')}: {analyticsError}
                  </p>
                ) : null}
              </div>

              {analyticsLoading ? (
                <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                  <p style={{ margin: 0, color: 'var(--color-muted, #6b7280)' }}>{t('adminConsole.loadingAnalyticsData')}</p>
                </div>
              ) : null}

              <div className="admin-stat-grid" style={{ marginBottom: '16px' }}>
                {[
                  { label: t('adminConsole.activeUsers'), value: Number(analyticsSnapshot.users.totalActive || 0) },
                  { label: t('adminConsole.newUsers'), value: Number(analyticsSnapshot.users.newUsers || 0) },
                  { label: t('adminConsole.returningUsers'), value: Number(analyticsSnapshot.users.returningUsers || 0) },
                  { label: t('adminConsole.pageViews'), value: Number(analyticsSnapshot.engagement.pageViews || 0) },
                  { label: t('adminConsole.averageSessionDuration'), value: formatDurationSeconds(analyticsSnapshot.engagement.avgSessionDurationSec) },
                  { label: t('adminConsole.signups'), value: Number(analyticsSnapshot.conversion.signupCount || 0) },
                  { label: t('adminConsole.purchasesCheckout'), value: Number(analyticsSnapshot.conversion.purchaseCount || 0) },
                  { label: t('adminConsole.keyActionSessionsCreated'), value: Number(analyticsSnapshot.conversion.keyActionCount || 0) },
                  { label: t('adminConsole.averageLoadTime'), value: `${Math.round(Number(analyticsSnapshot.performance.avgPageLoadMs || 0))} ms` },
                  { label: t('adminConsole.frontendErrors'), value: Number(analyticsSnapshot.performance.frontendErrorCount || 0) },
                  {
                    label: `${t('adminConsole.revenue')} (${String(analyticsSnapshot.business.currency || 'EUR').toUpperCase()})`,
                    value: formatCurrency(analyticsSnapshot.business.revenue, analyticsSnapshot.business.currency),
                  },
                  {
                    label: t('adminConsole.averageBasket'),
                    value: formatCurrency(analyticsSnapshot.business.avgBasket, analyticsSnapshot.business.currency),
                  },
                ].map((item) => (
                  <div key={item.label} style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '14px 12px' }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '20px', color: 'var(--color-text, #111)' }}>{!analyticsSnapshot.configured || analyticsSnapshot.degraded ? t('adminConsole.unavailable') : item.value}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-muted, #6b7280)' }}>{item.label}</p>
                  </div>
                ))}
              </div>

              {analyticsSnapshot.configured && !analyticsSnapshot.degraded ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  {[
                    {
                      title: t('adminConsole.topCountries'),
                      list: visitorCountries,
                      interactive: true,
                    },
                    {
                      title: effectiveSelectedCountry
                        ? `${t('adminConsole.cities')} - ${effectiveSelectedCountry}`
                        : t('adminConsole.topCities'),
                      list: displayedCitiesForAnalytics,
                      expandable: canExpandCitiesForCountry,
                    },
                    { title: t('adminConsole.topBrowsers'), list: Array.isArray(analyticsSnapshot.visitors.browsers) ? analyticsSnapshot.visitors.browsers : [] },
                    { title: t('adminConsole.topSystems'), list: Array.isArray(analyticsSnapshot.visitors.os) ? analyticsSnapshot.visitors.os : [] },
                  ].map((block) => (
                    <div key={block.title} style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '14px 14px' }}>
                      <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700 }}>{block.title}</p>
                      {block.list.length > 0 ? (
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {block.list.slice(0, 6).map((item) => (
                            <li key={`${block.title}-${item.label}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '12px' }}>
                              {block.interactive ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedVisitorCountry(String(item.label || '').trim())}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    padding: 0,
                                    margin: 0,
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: String(item.label || '').trim() === effectiveSelectedCountry
                                      ? 'var(--color-primary, #4f46e5)'
                                      : 'var(--color-text, #111)',
                                    fontWeight: String(item.label || '').trim() === effectiveSelectedCountry ? 700 : 400,
                                  }}
                                  title={t('adminConsole.showCitiesForLabel', { label: item.label })}
                                >
                                  {item.label}
                                </button>
                              ) : (
                                <span style={{ color: 'var(--color-text, #111)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                              )}
                              <strong style={{ color: 'var(--color-primary, #4f46e5)', flexShrink: 0 }}>{item.value}</strong>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {block.expandable ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setShowAllCitiesForCountry((current) => !current)}
                          style={{ marginTop: '10px', fontSize: '12px', padding: '4px 8px' }}
                        >
                          {showAllCitiesForCountry ? t('adminConsole.showLess') : t('adminConsole.showAllCities')}
                        </button>
                      ) : (
                        block.list.length === 0 ? <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-muted, #6b7280)' }}>{t('adminConsole.noDataAvailable')}</p> : null
                      )}
                    </div>
                  ))}
                </div>
              ) : null}


            </div>
          ) : null}

          {/* ── UTILISATEURS ── */}
          {activeTab === 'users' ? (
            <div>
              <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>{t('adminConsole.users')}</h1>
                  <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>{t('adminConsole.manageUserAccountsAndApprovalRequests')}</p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setEditingUser(null);
                    setNewUserMessage('');
                    setShowNewUserForm((current) => !current);
                  }}
                >
                  {showNewUserForm ? t('adminConsole.closeForm') : t('adminConsole.createUser')}
                </button>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                  <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>{t('adminConsole.pendingRequests')} {pendingUsers.length > 0 ? `(${pendingUsers.length})` : ''}</h2>
                  {pendingUsers.length === 0 ? <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '13px' }}>{t('adminConsole.noPendingRequest')}</p> : null}
                  {pendingUsers.length > 0 ? (
                    <ul className="session-list" style={{ margin: 0 }}>
                      {pendingUsers.map((u) => (
                        <li key={String(u.id)} className="session-item" style={{ alignItems: 'center' }}>
                          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                            <p className="session-title">{u.first_name || ''} {u.last_name || ''}</p>
                            <p className="session-meta">{u.email}</p>
                          </div>
                          <div className="session-item-actions" style={{ flexShrink: 0 }}>
                            <button type="button" className="btn-primary" disabled={busyApprovalId === u.id} onClick={() => updateApproval(u.id, 'approved')} style={{ fontSize: '12px', padding: '5px 10px' }}>{t('adminConsole.approve')}</button>
                            <button type="button" className="btn-secondary" disabled={busyApprovalId === u.id} onClick={() => updateApproval(u.id, 'rejected')} style={{ fontSize: '12px', padding: '5px 10px' }}>{t('adminConsole.reject')}</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                {showNewUserForm ? (
                  <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>{t('adminConsole.createAnAccount')}</h2>
                    <form className="auth-form" onSubmit={submitNewUser} autoComplete="off">
                      <input type="text" name="fake_username" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
                      <input type="password" name="fake_password" autoComplete="current-password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
                      <label>{t('adminConsole.firstName')}<input name="create_user_first_name" autoComplete="off" value={newUser.first_name} onChange={(e) => setNewUser((p) => ({ ...p, first_name: e.target.value }))} required /></label>
                      <label>{t('adminConsole.lastName')}<input name="create_user_last_name" autoComplete="off" value={newUser.last_name} onChange={(e) => setNewUser((p) => ({ ...p, last_name: e.target.value }))} /></label>
                      <label>Email<input type="email" name="create_user_email" autoComplete="off" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} required /></label>
                      <label>{t('adminConsole.password')}<input type="password" name="create_user_password" autoComplete="new-password" minLength={8} value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} required /></label>
                      <label>{t('adminConsole.role')}
                        <select value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
                          <option value="user">{t('adminConsole.user')}</option>
                          <option value="admin">Admin</option>
                        </select>
                      </label>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <button type="submit" className="btn-primary">{t('adminConsole.createAccount')}</button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setShowNewUserForm(false);
                            setNewUserMessage('');
                          }}
                        >
                          {t('adminConsole.cancel')}
                        </button>
                      </div>
                    </form>
                    {newUserMessage ? <p className="session-meta" style={{ marginTop: '8px' }}>{newUserMessage}</p> : null}
                  </div>
                ) : null}

                <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                      {t('adminConsole.list')} {users.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>({filteredUsers.length}/{users.length})</span> : null}
                    </h2>
                    <input
                      type="search"
                      className="inline-input"
                      placeholder={t('adminConsole.search')}
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      style={{ width: 'min(360px, 100%)' }}
                    />
                  </div>
                  <ul className="session-list" style={{ margin: 0 }}>
                    {filteredUsers.length === 0 ? <li className="list-empty">{t('adminConsole.noMatchingUser')}</li> : null}
                    {filteredUsers.map((u) => (
                      <li key={String(u.id)} className="session-item" style={{ alignItems: 'center' }}>
                        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                          <p className="session-title">{u.first_name || ''} {u.last_name || ''}</p>
                          <p className="session-meta">
                            {u.email} · {u.role || 'user'} · {u.disabled ? t('adminConsole.inactive') : t('adminConsole.active')}
                            {isPlatformAdminEmail(u.email) ? ` · ${t('adminConsole.verificationNotRequired')}` : ''}
                          </p>
                        </div>
                        <div className="session-item-actions icon-only-actions" style={{ flexShrink: 0 }}>
                          {!isPlatformAdminEmail(u.email) ? (
                            <button
                              type="button"
                              className="icon-action-btn"
                              onClick={() => handleAdminUserVerificationOverride(u)}
                              disabled={busySaveKey === `verify-admin:user:${u.id}`}
                              title={t('adminConsole.manualAdminVerification')}
                              aria-label={t('adminConsole.manualAdminVerification')}
                            >
                              {busySaveKey === `verify-admin:user:${u.id}` ? '…' : '✓'}
                            </button>
                          ) : null}
                          {!isPlatformAdminEmail(u.email) ? (
                            <button
                              type="button"
                              className="icon-action-btn"
                              onClick={() => handleResendVerificationLink(u)}
                              disabled={busySaveKey === `verify:user:${u.id}`}
                              title={t('adminConsole.resendVerificationLink')}
                              aria-label={t('adminConsole.resendVerificationLink')}
                            >
                              {busySaveKey === `verify:user:${u.id}` ? '…' : '✉'}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => beginEditUser(u)}
                            title={t('adminConsole.edit')}
                            aria-label={t('adminConsole.editUser')}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={busySaveKey === `status:user:${u.id}` || String(u.id) === String(user?.id)}
                            title={u.disabled ? t('adminConsole.enable') : t('adminConsole.disable')}
                            aria-label={u.disabled ? t('adminConsole.enableUser') : t('adminConsole.disableUser')}
                          >
                            {busySaveKey === `status:user:${u.id}` ? '…' : u.disabled ? '↺' : '⏸'}
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn icon-action-danger"
                            onClick={() => handleDeleteUser(u)}
                            disabled={busyDeleteKey === `user:${u.id}` || String(u.id) === String(user?.id)}
                            title={t('adminConsole.delete')}
                            aria-label={t('adminConsole.deleteUser')}
                          >
                            {busyDeleteKey === `user:${u.id}` ? '…' : '🗑'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── PARTICIPANTS ── */}
          {activeTab === 'participants' ? (
            <div>
              <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>{t('adminConsole.participants')}</h1>
                  <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>{t('adminConsole.manageParticipantAccountsLinkedToUsers')}</p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setEditingParticipant(null);
                    setNewParticipantMessage('');
                    setShowNewParticipantForm((current) => !current);
                  }}
                >
                  {showNewParticipantForm ? t('adminConsole.closeForm') : t('adminConsole.createParticipant')}
                </button>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                {showNewParticipantForm ? (
                  <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>{t('adminConsole.createParticipant')}</h2>
                    <form className="auth-form" onSubmit={submitNewParticipant} autoComplete="off">
                      <input type="text" name="fake_participant_username" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
                      <input type="password" name="fake_participant_password" autoComplete="current-password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
                      <label>{t('adminConsole.owner')}
                        <select value={newParticipant.owner_id} onChange={(e) => setNewParticipant((prev) => ({ ...prev, owner_id: e.target.value }))} required>
                          <option value="">{t('adminConsole.selectAUser')}</option>
                          {users.filter((u) => String(u.role || '') === 'user').map((u) => (
                            <option key={String(u.id)} value={String(u.id)}>{u.first_name || ''} {u.last_name || ''} ({u.email})</option>
                          ))}
                        </select>
                      </label>
                      <label>{t('adminConsole.firstName')}<input name="create_participant_first_name" autoComplete="off" value={newParticipant.first_name} onChange={(e) => setNewParticipant((prev) => ({ ...prev, first_name: e.target.value }))} required /></label>
                      <label>{t('adminConsole.lastName')}<input name="create_participant_last_name" autoComplete="off" value={newParticipant.last_name} onChange={(e) => setNewParticipant((prev) => ({ ...prev, last_name: e.target.value }))} /></label>
                      <label>Email<input type="email" name="create_participant_email" autoComplete="off" value={newParticipant.email} onChange={(e) => setNewParticipant((prev) => ({ ...prev, email: e.target.value }))} required /></label>
                      <label>{t('adminConsole.password')}<input type="password" name="create_participant_password" autoComplete="new-password" minLength={8} value={newParticipant.password} onChange={(e) => setNewParticipant((prev) => ({ ...prev, password: e.target.value }))} required /></label>
                      <label>{t('adminConsole.jobTitle')}<input value={newParticipant.job_title} onChange={(e) => setNewParticipant((prev) => ({ ...prev, job_title: e.target.value }))} /></label>
                      <label>{t('adminConsole.department')}<input value={newParticipant.department} onChange={(e) => setNewParticipant((prev) => ({ ...prev, department: e.target.value }))} /></label>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <button type="submit" className="btn-primary" disabled={busySaveKey === 'create:participant'}>{busySaveKey === 'create:participant' ? t('adminConsole.creating') : t('adminConsole.createParticipant2')}</button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setShowNewParticipantForm(false);
                            setNewParticipantMessage('');
                          }}
                        >
                          {t('adminConsole.cancel')}
                        </button>
                      </div>
                    </form>
                    {newParticipantMessage ? <p className="session-meta" style={{ marginTop: '8px' }}>{newParticipantMessage}</p> : null}
                  </div>
                ) : null}

                <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                      {t('adminConsole.list')} {participants.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>({filteredParticipants.length}/{participants.length})</span> : null}
                    </h2>
                    <input
                      type="search"
                      className="inline-input"
                      placeholder={t('adminConsole.search')}
                      value={participantQuery}
                      onChange={(e) => setParticipantQuery(e.target.value)}
                      style={{ width: 'min(360px, 100%)' }}
                    />
                  </div>
                  <ul className="session-list" style={{ margin: 0 }}>
                    {filteredParticipants.length === 0 ? <li className="list-empty">{t('adminConsole.noMatchingParticipant')}</li> : null}
                    {filteredParticipants.map((p) => (
                      <li key={String(p.id)} className="session-item" style={{ alignItems: 'center' }}>
                        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                          <p className="session-title">{getParticipantDisplayName(p)}</p>
                          <p className="session-meta">{p.email} · {p.disabled ? t('adminConsole.inactive') : t('adminConsole.active')} · {p.creator?.email || `${t('adminConsole.owner')} #${p.created_by || '?'}`}</p>
                        </div>
                        <div className="session-item-actions icon-only-actions" style={{ flexShrink: 0 }}>
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => handleAdminParticipantVerificationOverride(p)}
                            disabled={busySaveKey === `verify-admin:participant:${p.id}`}
                            title={t('adminConsole.manualAdminVerification')}
                            aria-label={t('adminConsole.manualParticipantVerification')}
                          >
                            {busySaveKey === `verify-admin:participant:${p.id}` ? '…' : '✓'}
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => handleResendParticipantVerificationLink(p)}
                            disabled={busySaveKey === `verify:participant:${p.id}`}
                            title={t('adminConsole.resendVerificationLink')}
                            aria-label={t('adminConsole.resendParticipantVerificationLink')}
                          >
                            {busySaveKey === `verify:participant:${p.id}` ? '…' : '✉'}
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => beginEditParticipant(p)}
                            title={t('adminConsole.edit')}
                            aria-label={t('adminConsole.editParticipant')}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => handleToggleParticipantStatus(p)}
                            disabled={busySaveKey === `status:participant:${p.id}`}
                            title={p.disabled ? t('adminConsole.enable') : t('adminConsole.disable')}
                            aria-label={p.disabled ? t('adminConsole.enableParticipant') : t('adminConsole.disableParticipant')}
                          >
                            {busySaveKey === `status:participant:${p.id}` ? '…' : p.disabled ? '↺' : '⏸'}
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn icon-action-danger"
                            onClick={() => handleDeleteParticipant(p)}
                            disabled={busyDeleteKey === `participant:${p.id}`}
                            title={t('adminConsole.delete')}
                            aria-label={t('adminConsole.deleteParticipant')}
                          >
                            {busyDeleteKey === `participant:${p.id}` ? '…' : '🗑'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          <Modal
            open={Boolean(editingUser)}
            title={t('adminConsole.editUser')}
            onClose={() => setEditingUser(null)}
            dialogClassName="admin-edit-modal"
            bodyClassName="admin-edit-modal-body"
          >
            {editingUser ? (
              <form className="auth-form" onSubmit={submitEditUser}>
                <label>{t('adminConsole.firstName')}<input value={editingUser.first_name} onChange={(e) => setEditingUser((p) => ({ ...p, first_name: e.target.value }))} required /></label>
                <label>{t('adminConsole.lastName')}<input value={editingUser.last_name} onChange={(e) => setEditingUser((p) => ({ ...p, last_name: e.target.value }))} /></label>
                <label>Email<input type="email" value={editingUser.email} onChange={(e) => setEditingUser((p) => ({ ...p, email: e.target.value }))} required /></label>
                <label>{t('adminConsole.role')}
                  <select value={editingUser.role} onChange={(e) => setEditingUser((p) => ({ ...p, role: e.target.value }))}>
                    <option value="user">{t('adminConsole.user')}</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label>{t('adminConsole.currentOffer')}
                  <select
                    value={normalizePricingPlanId(editingUser.pricing_plan_id)}
                    onChange={(e) => setEditingUser((p) => ({ ...p, pricing_plan_id: e.target.value }))}
                  >
                    <option value="">{t('adminConsole.noOfferAssigned')}</option>
                    {pricingPlans.map((plan) => (
                      <option key={String(plan.id)} value={String(plan.id)}>
                        {plan.name || `${t('adminConsole.offer')} #${plan.id}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label>{t('adminConsole.jobTitle')}<input value={editingUser.job_title} onChange={(e) => setEditingUser((p) => ({ ...p, job_title: e.target.value }))} /></label>
                <label>{t('adminConsole.department')}<input value={editingUser.department} onChange={(e) => setEditingUser((p) => ({ ...p, department: e.target.value }))} /></label>
                <label>{t('adminConsole.newPasswordOptional')}<input type="password" minLength={8} value={editingUser.password} onChange={(e) => setEditingUser((p) => ({ ...p, password: e.target.value }))} /></label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn-primary" disabled={busySaveKey === `save:user:${editingUser.id}`}>{busySaveKey === `save:user:${editingUser.id}` ? t('adminConsole.saving') : t('adminConsole.save')}</button>
                  <button type="button" className="btn-secondary" onClick={() => setEditingUser(null)}>{t('adminConsole.cancel')}</button>
                </div>
              </form>
            ) : null}
          </Modal>

          <Modal
            open={Boolean(editingParticipant)}
            title={t('adminConsole.editParticipant')}
            onClose={() => {
              setEditingParticipant(null);
              setEditingParticipantError('');
            }}
            dialogClassName="admin-edit-modal"
            bodyClassName="admin-edit-modal-body"
          >
            {editingParticipant ? (
              <form className="auth-form" onSubmit={submitEditParticipant}>
                <label>{t('adminConsole.firstName')}<input value={editingParticipant.first_name} onChange={(e) => setEditingParticipant((prev) => ({ ...prev, first_name: e.target.value }))} required /></label>
                <label>{t('adminConsole.lastName')}<input value={editingParticipant.last_name} onChange={(e) => setEditingParticipant((prev) => ({ ...prev, last_name: e.target.value }))} /></label>
                <label>Email<input type="email" value={editingParticipant.email} onChange={(e) => setEditingParticipant((prev) => ({ ...prev, email: e.target.value }))} required /></label>
                <label>{t('adminConsole.status')}
                  <select value={editingParticipant.disabled ? 'disabled' : 'active'} onChange={(e) => setEditingParticipant((prev) => ({ ...prev, disabled: e.target.value === 'disabled' }))}>
                    <option value="active">{t('adminConsole.active')}</option>
                    <option value="disabled">{t('adminConsole.inactive')}</option>
                  </select>
                </label>
                <label>{t('adminConsole.jobTitle')}<input value={editingParticipant.job_title} onChange={(e) => setEditingParticipant((prev) => ({ ...prev, job_title: e.target.value }))} /></label>
                <label>{t('adminConsole.department')}<input value={editingParticipant.department} onChange={(e) => setEditingParticipant((prev) => ({ ...prev, department: e.target.value }))} /></label>
                <label>{t('adminConsole.newPasswordOptional')}<input type="password" minLength={8} value={editingParticipant.password} onChange={(e) => setEditingParticipant((prev) => ({ ...prev, password: e.target.value }))} /></label>
                {editingParticipantError ? (
                  <p className="participant-form-status participant-form-status--warn" role="alert" aria-live="polite">{editingParticipantError}</p>
                ) : null}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn-primary" disabled={busySaveKey === `save:participant:${editingParticipant.id}`}>{busySaveKey === `save:participant:${editingParticipant.id}` ? t('adminConsole.saving') : t('adminConsole.save')}</button>
                  <button type="button" className="btn-secondary" onClick={() => {
                    setEditingParticipant(null);
                    setEditingParticipantError('');
                  }}>{t('adminConsole.cancel')}</button>
                </div>
              </form>
            ) : null}
          </Modal>

          {/* ── SESSIONS ── */}
          {activeTab === 'sessions' ? (
            <div>
              <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>{t('adminConsole.sessions')}</h1>
                  <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>{t('adminConsole.createSuperviseAndUpdateSessionsFrom')}</p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setEditingSession(null);
                    setNewSessionMessage('');
                    setShowNewSessionForm((current) => !current);
                  }}
                >
                  {showNewSessionForm ? t('adminConsole.closeForm') : t('adminConsole.createSession')}
                </button>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                {showNewSessionForm ? (
                  <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>{t('adminConsole.createSession')}</h2>
                    <form className="auth-form" onSubmit={submitNewSession}>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted, #6b7280)' }}>{t('adminConsole.step1')}</p>
                      <label>{t('adminConsole.name')}<input value={newSession.name} onChange={(e) => setNewSession((p) => ({ ...p, name: e.target.value }))} required /></label>
                      <label>{t('adminConsole.status')}
                        <select value={newSession.status} onChange={(e) => setNewSession((p) => ({ ...p, status: e.target.value }))}>
                          <option value="preparee">{getLocalizedLabel(SESSION_STATUS_OPTION_LABELS.preparee, locale)}</option>
                          <option value="en_cours">{getLocalizedLabel(SESSION_STATUS_OPTION_LABELS.en_cours, locale)}</option>
                          <option value="terminee">{getLocalizedLabel(SESSION_STATUS_OPTION_LABELS.terminee, locale)}</option>
                        </select>
                      </label>
                      <label>{t('adminConsole.format')}<input value={newSession.format} onChange={(e) => setNewSession((p) => ({ ...p, format: e.target.value }))} placeholder={t('adminConsole.exampleWorkshop')} /></label>
                      <label>{t('adminConsole.modality')}
                        <select value={newSession.modality} onChange={(e) => setNewSession((p) => ({ ...p, modality: e.target.value }))}>
                          <option value="">{getLocalizedLabel(SESSION_MODALITY_OPTION_LABELS[''], locale)}</option>
                          <option value="remote">{getLocalizedLabel(SESSION_MODALITY_OPTION_LABELS.remote, locale)}</option>
                          <option value="hybrid">{getLocalizedLabel(SESSION_MODALITY_OPTION_LABELS.hybrid, locale)}</option>
                          <option value="in-person">{getLocalizedLabel(SESSION_MODALITY_OPTION_LABELS['in-person'], locale)}</option>
                        </select>
                      </label>
                      <label>{t('adminConsole.date')}<input type="date" value={newSession.session_date} onChange={(e) => setNewSession((p) => ({ ...p, session_date: e.target.value }))} /></label>
                      <label>{t('adminConsole.durationMinutes')}<input type="number" min={1} value={newSession.duration_minutes} onChange={(e) => setNewSession((p) => ({ ...p, duration_minutes: e.target.value }))} /></label>

                      <div style={{ border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '12px' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted, #6b7280)' }}>{t('adminConsole.step2Optional')}</p>
                        <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--color-muted, #6b7280)' }}>
                          {t('adminConsole.assignParticipantsNowSoTheyCan')}
                        </p>
                        <input
                          type="search"
                          className="inline-input"
                          placeholder={t('adminConsole.searchAParticipant')}
                          value={newSessionMemberQuery}
                          onChange={(e) => setNewSessionMemberQuery(e.target.value)}
                          style={{ marginBottom: '8px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setNewSessionMemberIds(filteredAssignableMembers.map((m) => String(m.id)))}
                            disabled={filteredAssignableMembers.length === 0}
                          >
                            {t('adminConsole.selectAll')}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setNewSessionMemberIds([])}
                            disabled={newSessionMemberIds.length === 0}
                          >
                            {t('adminConsole.unselectAll')}
                          </button>
                        </div>
                        <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '8px', padding: '8px' }}>
                          {filteredAssignableMembers.length === 0 ? (
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-muted, #6b7280)' }}>{t('adminConsole.noParticipantAvailable')}</p>
                          ) : (
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '6px' }}>
                              {filteredAssignableMembers.map((member) => {
                                const selected = newSessionMemberIds.includes(String(member.id));
                                return (
                                  <li key={String(member.id)}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                      <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={() => toggleNewSessionMember(member.id)}
                                      />
                                      <span style={{ fontSize: '13px' }}>
                                        {getParticipantDisplayName(member)}
                                        {member.email ? <span style={{ color: 'var(--color-muted, #6b7280)' }}> · {member.email}</span> : null}
                                      </span>
                                    </label>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                        <p className="session-meta" style={{ marginTop: '8px' }}>
                          {t('adminConsole.lengthParticipantValueAssigned', { length: newSessionMemberIds.length, value: newSessionMemberIds.length > 1 ? 's' : '' })}
                        </p>
                      </div>

                      <button type="submit" className="btn-primary" disabled={busySaveKey === 'create:session'}>
                        {busySaveKey === 'create:session' ? t('adminConsole.creating') : t('adminConsole.createSession2')}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setShowNewSessionForm(false);
                          setNewSessionMessage('');
                        }}
                      >
                        {t('adminConsole.cancel')}
                      </button>
                    </form>
                    {newSessionMessage ? <p className="session-meta" style={{ marginTop: '8px' }}>{newSessionMessage}</p> : null}
                  </div>
                ) : null}

                {editingSession ? (
                  <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-primary, #4f46e5)', borderRadius: '10px', padding: '20px 24px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>{t('adminConsole.editSession')}</h2>
                    <form className="auth-form" onSubmit={submitEditSession}>
                        <label>{t('adminConsole.name')}<input value={editingSession.name} onChange={(e) => setEditingSession((p) => ({ ...p, name: e.target.value }))} required /></label>
                        <label>{t('adminConsole.status')}
                          <select value={editingSession.status} onChange={(e) => setEditingSession((p) => ({ ...p, status: e.target.value }))}>
                            <option value="preparee">{getSessionStatusLabel('preparee', locale)}</option>
                            <option value="en_cours">{getSessionStatusLabel('en_cours', locale)}</option>
                            <option value="terminee">{getSessionStatusLabel('terminee', locale)}</option>
                          </select>
                        </label>
                        <label>{t('adminConsole.format')}<input value={editingSession.format} onChange={(e) => setEditingSession((p) => ({ ...p, format: e.target.value }))} /></label>
                        <label>{t('adminConsole.modality')}
                          <select value={editingSession.modality} onChange={(e) => setEditingSession((p) => ({ ...p, modality: e.target.value }))}>
                            <option value="">{getSessionModalityLabel('', locale)}</option>
                            <option value="remote">{getSessionModalityLabel('remote', locale)}</option>
                            <option value="hybrid">{getSessionModalityLabel('hybrid', locale)}</option>
                            <option value="in-person">{getSessionModalityLabel('in-person', locale)}</option>
                          </select>
                        </label>
                        <label>{t('adminConsole.date')}<input type="date" value={editingSession.session_date} onChange={(e) => setEditingSession((p) => ({ ...p, session_date: e.target.value }))} /></label>
                        <label>{t('adminConsole.durationMinutes')}<input type="number" min={1} value={editingSession.duration_minutes} onChange={(e) => setEditingSession((p) => ({ ...p, duration_minutes: e.target.value }))} /></label>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button type="submit" className="btn-primary" disabled={busySaveKey === `save:session:${editingSession.id}`}>{busySaveKey === `save:session:${editingSession.id}` ? t('adminConsole.saving') : t('adminConsole.save')}</button>
                          <button type="button" className="btn-secondary" onClick={() => setEditingSession(null)}>{t('adminConsole.cancel')}</button>
                        </div>
                    </form>
                  </div>
                ) : null}

                <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                      {t('adminConsole.list')} {sessions.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>({filteredSessions.length}/{sessions.length})</span> : null}
                    </h2>
                    <input
                      type="search"
                      className="inline-input"
                      placeholder={t('adminConsole.search')}
                      value={sessionQuery}
                      onChange={(e) => setSessionQuery(e.target.value)}
                      style={{ width: 'min(360px, 100%)' }}
                    />
                  </div>
                  <ul className="session-list" style={{ margin: 0 }}>
                    {filteredSessions.length === 0 ? <li className="list-empty">{t('adminConsole.noMatchingSession')}</li> : null}
                    {filteredSessions.map((s) => (
                      <li key={String(s.id)} className="session-item" style={{ alignItems: 'center' }}>
                        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                          <p className="session-title">{s.name || `Session #${s.id}`}</p>
                          <p className="session-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className={`status-pill status-${s.status || 'preparee'}`}>
                              {getSessionStatusLabel(s.status, locale)}
                            </span>
                            {s.modality ? <span>{t('adminConsole.modality')}: {getSessionModalityLabel(s.modality, locale) || s.modality}</span> : null}
                            <span>{t('adminConsole.owner')}: {getSessionOwnerLabel(s)}</span>
                          </p>
                        </div>
                        <div className="session-item-actions" style={{ flexShrink: 0 }}>
                          <button type="button" className="btn-secondary" onClick={() => beginEditSession(s)}>{t('adminConsole.edit')}</button>
                          <button type="button" className="btn-secondary" onClick={() => handleDeleteSession(s)} disabled={busyDeleteKey === `session:${s.id}`}>
                            {busyDeleteKey === `session:${s.id}` ? '...' : t('adminConsole.delete')}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── CHALLENGES ── */}
          {activeTab === 'challenges' ? (
            <div>
              <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Challenges</h1>
                  <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>{t('adminConsole.manageTheAvailableChallengeCatalog')}</p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setEditingChallenge(null);
                    setChallengeImageUploadError('');
                    setNewChallengeMessage('');
                    setShowNewChallengeForm((current) => !current);
                  }}
                >
                  {showNewChallengeForm ? t('adminConsole.closeForm') : t('adminConsole.addChallenge')}
                </button>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                {showNewChallengeForm ? (
                  <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>{t('adminConsole.addChallenge')}</h2>
                    <form className="auth-form" onSubmit={submitNewChallenge}>
                      <label>{t('adminConsole.name')}<input value={newChallenge.name} onChange={(e) => setNewChallenge((p) => ({ ...p, name: e.target.value }))} required /></label>
                      <label>{t('adminConsole.type')}
                        <select value={newChallenge.type} onChange={(e) => setNewChallenge((p) => ({ ...p, type: e.target.value }))}>
                          <option value="individuel">{getLocalizedLabel(CHALLENGE_TYPE_OPTION_LABELS.individuel, locale)}</option>
                          <option value="equipe">{getLocalizedLabel(CHALLENGE_TYPE_OPTION_LABELS.equipe, locale)}</option>
                        </select>
                      </label>
                      <label>{t('adminConsole.status')}
                        <select value={newChallenge.status} onChange={(e) => setNewChallenge((p) => ({ ...p, status: e.target.value }))}>
                          <option value="actif">{getLocalizedLabel(CHALLENGE_STATUS_OPTION_LABELS.actif, locale)}</option>
                          <option value="brouillon">{getLocalizedLabel(CHALLENGE_STATUS_OPTION_LABELS.brouillon, locale)}</option>
                          <option value="archive">{getLocalizedLabel(CHALLENGE_STATUS_OPTION_LABELS.archive, locale)}</option>
                        </select>
                      </label>
                      <label>{t('adminConsole.source')}
                        <select value={newChallenge.source} onChange={(e) => setNewChallenge((p) => ({ ...p, source: e.target.value }))}>
                          <option value="local">{getLocalizedLabel(CHALLENGE_SOURCE_OPTION_LABELS.local, locale)}</option>
                          <option value="external">{getLocalizedLabel(CHALLENGE_SOURCE_OPTION_LABELS.external, locale)}</option>
                        </select>
                      </label>
                      <label>{t('adminConsole.category')}
                        <select value={newChallenge.category} onChange={(e) => setNewChallenge((p) => ({ ...p, category: e.target.value }))}>
                          <option value="">{t('adminConsole.select')}</option>
                          {challengeCategoryOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label>{t('adminConsole.objectives')}
                        <div style={{ display: 'grid', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '13px', color: 'var(--color-muted, #6b7280)' }}>
                            <span>{t('adminConsole.chooseUpToMaxChallengeObjectives', { MAX_CHALLENGE_OBJECTIVES })}</span>
                            <strong>{normalizeObjectivesInput(newChallenge.objectives).length}/{MAX_CHALLENGE_OBJECTIVES}</strong>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {challengeObjectiveOptions.map((option) => {
                              const selectedObjectives = normalizeObjectivesInput(newChallenge.objectives);
                              const isSelected = selectedObjectives.includes(option.value);
                              const limitReached = selectedObjectives.length >= MAX_CHALLENGE_OBJECTIVES;
                              const disabled = !isSelected && limitReached;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  className="admin-objective-chip"
                                  aria-pressed={isSelected}
                                  onClick={() => setNewChallenge((p) => ({ ...p, objectives: toggleObjectiveSelection(p.objectives, option.value) }))}
                                  disabled={disabled}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                          {normalizeObjectivesInput(newChallenge.objectives).length >= MAX_CHALLENGE_OBJECTIVES ? (
                              <p className="session-meta" style={{ margin: 0 }}>{t('adminConsole.limitReachedRemoveOneObjectiveTo')}</p>
                          ) : null}
                        </div>
                      </label>
                      <label>{t('adminConsole.duration')}<input value={newChallenge.duration} onChange={(e) => setNewChallenge((p) => ({ ...p, duration: e.target.value }))} /></label>
                      <label>{t('adminConsole.engineKey')}
                        <input list="known-engine-keys" value={newChallenge.engine_key} onChange={(e) => setNewChallenge((p) => ({ ...p, engine_key: e.target.value }))} />
                      </label>
                      <label>{t('adminConsole.description')}<textarea rows={4} value={newChallenge.description} onChange={(e) => setNewChallenge((p) => ({ ...p, description: e.target.value }))} /></label>
                      <div style={{ border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '8px', padding: '12px', display: 'grid', gap: '10px' }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{t('adminConsole.challengeRules')}</p>
                        <p className="session-meta" style={{ margin: 0 }}>{t('adminConsole.thisContentFeedsTheBriefShown')}</p>
                        <label>{t('adminConsole.missionBrief')}
                          <textarea rows={3} value={newChallenge.rules_objective} onChange={(e) => setNewChallenge((p) => ({ ...p, rules_objective: e.target.value }))} placeholder={t('adminConsole.describeTheMainChallengeObjective')} />
                        </label>
                        <label>{t('adminConsole.facilitatorInstructions1Line1Rule')}
                          <textarea rows={4} value={newChallenge.rules_facilitator} onChange={(e) => setNewChallenge((p) => ({ ...p, rules_facilitator: e.target.value }))} placeholder={t('adminConsole.frameTheChallenge10StartThe')} />
                        </label>
                        <label>{t('adminConsole.participantInstructions1Line1Rule')}
                          <textarea rows={4} value={newChallenge.rules_participant} onChange={(e) => setNewChallenge((p) => ({ ...p, rules_participant: e.target.value }))} placeholder={t('adminConsole.listenToTheBrief10Collaborate')} />
                        </label>
                        <label>{t('adminConsole.closingNote')}
                          <textarea rows={2} value={newChallenge.rules_footnote} onChange={(e) => setNewChallenge((p) => ({ ...p, rules_footnote: e.target.value }))} placeholder={t('adminConsole.optionalSummaryMessage')} />
                        </label>
                        <div style={{ borderTop: '1px dashed var(--color-border, #e5e7eb)', paddingTop: '10px', display: 'grid', gap: '10px' }}>
                          <p style={{ margin: 0, fontWeight: 600 }}>{t('adminConsole.playersMinRecommendedMax')}</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                            <label>Min
                              <input type="number" min="1" value={newChallenge.player_min} onChange={(e) => setNewChallenge((p) => ({ ...p, player_min: e.target.value }))} />
                            </label>
                            <label>{t('adminConsole.recommended')}
                              <input type="number" min="1" value={newChallenge.player_recommended} onChange={(e) => setNewChallenge((p) => ({ ...p, player_recommended: e.target.value }))} />
                            </label>
                            <label>Max
                              <input type="number" min="1" value={newChallenge.player_max} onChange={(e) => setNewChallenge((p) => ({ ...p, player_max: e.target.value }))} />
                            </label>
                          </div>
                        </div>
                      </div>
                      <button type="submit" className="btn-primary" disabled={busySaveKey === 'create:challenge'}>
                        {busySaveKey === 'create:challenge' ? t('adminConsole.creating') : t('adminConsole.createChallenge')}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setShowNewChallengeForm(false);
                          setNewChallengeMessage('');
                        }}
                      >
                        {t('adminConsole.cancel')}
                      </button>
                    </form>
                    {newChallengeMessage ? <p className="session-meta" style={{ marginTop: '8px' }}>{newChallengeMessage}</p> : null}
                  </div>
                ) : null}

                {editingChallenge ? (
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--modal-scrim, rgba(0,0,0,0.45))', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}
                    onClick={(e) => { if (e.target === e.currentTarget) { setEditingChallenge(null); setChallengeImageUploadError(''); } }}
                  >
                    <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-primary, #4f46e5)', borderRadius: '12px', padding: '24px 28px', width: '100%', maxWidth: '640px', position: 'relative', marginBottom: '40px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>{t('adminConsole.editChallenge')}</h2>
                        <button type="button" onClick={() => { setEditingChallenge(null); setChallengeImageUploadError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--color-muted, #6b7280)', padding: '2px 8px', lineHeight: 1 }} aria-label={t('adminConsole.closeWindow')}>✕</button>
                      </div>
                    <form className="auth-form" onSubmit={submitEditChallenge}>
                        <label>{t('adminConsole.name')}<input value={editingChallenge.name} onChange={(e) => setEditingChallenge((p) => ({ ...p, name: e.target.value }))} required /></label>
                        <label>{t('adminConsole.type')}
                          <select value={editingChallenge.type} onChange={(e) => setEditingChallenge((p) => ({ ...p, type: e.target.value }))}>
                            <option value="individuel">{getChallengeTypeLabel('individuel', locale)}</option>
                            <option value="equipe">{getChallengeTypeLabel('equipe', locale)}</option>
                          </select>
                        </label>
                        <label>{t('adminConsole.status')}
                          <select value={editingChallenge.status} onChange={(e) => setEditingChallenge((p) => ({ ...p, status: e.target.value }))}>
                            <option value="actif">{getChallengeStatusLabel('actif', locale)}</option>
                            <option value="brouillon">{getChallengeStatusLabel('brouillon', locale)}</option>
                            <option value="archive">{getChallengeStatusLabel('archive', locale)}</option>
                          </select>
                        </label>
                        <label>{t('adminConsole.category')}
                          <select value={editingChallenge.category} onChange={(e) => setEditingChallenge((p) => ({ ...p, category: e.target.value }))}>
                            <option value="">{t('adminConsole.select')}</option>
                            {challengeCategoryOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label>{t('adminConsole.objectives')}
                          <div style={{ display: 'grid', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '13px', color: 'var(--color-muted, #6b7280)' }}>
                              <span>{t('adminConsole.chooseUpToMaxChallengeObjectives', { MAX_CHALLENGE_OBJECTIVES })}</span>
                              <strong>{normalizeObjectivesInput(editingChallenge.objectives).length}/{MAX_CHALLENGE_OBJECTIVES}</strong>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {challengeObjectiveOptions.map((option) => {
                                const selectedObjectives = normalizeObjectivesInput(editingChallenge.objectives);
                                const isSelected = selectedObjectives.includes(option.value);
                                const limitReached = selectedObjectives.length >= MAX_CHALLENGE_OBJECTIVES;
                                const disabled = !isSelected && limitReached;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    className="admin-objective-chip"
                                    aria-pressed={isSelected}
                                    onClick={() => setEditingChallenge((p) => ({ ...p, objectives: toggleObjectiveSelection(p.objectives, option.value) }))}
                                    disabled={disabled}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                            {normalizeObjectivesInput(editingChallenge.objectives).length >= MAX_CHALLENGE_OBJECTIVES ? (
                              <p className="session-meta" style={{ margin: 0 }}>{t('adminConsole.limitReachedRemoveOneObjectiveTo')}</p>
                            ) : null}
                          </div>
                        </label>
                        <label>{t('adminConsole.duration')}<input value={editingChallenge.duration} onChange={(e) => setEditingChallenge((p) => ({ ...p, duration: e.target.value }))} /></label>
                        <label>{t('adminConsole.engineKey')}
                          <input list="known-engine-keys" value={editingChallenge.engine_key} onChange={(e) => setEditingChallenge((p) => ({ ...p, engine_key: e.target.value }))} />
                        </label>
                        <label>{t('adminConsole.description')}<textarea rows={4} value={editingChallenge.description} onChange={(e) => setEditingChallenge((p) => ({ ...p, description: e.target.value }))} /></label>
                        <div style={{ border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '8px', padding: '12px', display: 'grid', gap: '10px' }}>
                          <p style={{ margin: 0, fontWeight: 600 }}>{t('adminConsole.challengeRules')}</p>
                          <p className="session-meta" style={{ margin: 0 }}>{t('adminConsole.thisContentFeedsTheBriefShown')}</p>
                          <label>{t('adminConsole.missionBrief')}
                            <textarea rows={3} value={editingChallenge.rules_objective || ''} onChange={(e) => setEditingChallenge((p) => ({ ...p, rules_objective: e.target.value }))} placeholder={t('adminConsole.describeTheMainChallengeObjective')} />
                          </label>
                          <label>{t('adminConsole.facilitatorInstructions1Line1Rule')}
                            <textarea rows={4} value={editingChallenge.rules_facilitator || ''} onChange={(e) => setEditingChallenge((p) => ({ ...p, rules_facilitator: e.target.value }))} placeholder={t('adminConsole.frameTheChallenge10StartThe')} />
                          </label>
                          <label>{t('adminConsole.participantInstructions1Line1Rule')}
                            <textarea rows={4} value={editingChallenge.rules_participant || ''} onChange={(e) => setEditingChallenge((p) => ({ ...p, rules_participant: e.target.value }))} placeholder={t('adminConsole.listenToTheBrief10Collaborate')} />
                          </label>
                          <label>{t('adminConsole.closingNote')}
                            <textarea rows={2} value={editingChallenge.rules_footnote || ''} onChange={(e) => setEditingChallenge((p) => ({ ...p, rules_footnote: e.target.value }))} placeholder={t('adminConsole.optionalSummaryMessage')} />
                          </label>
                          <div style={{ borderTop: '1px dashed var(--color-border, #e5e7eb)', paddingTop: '10px', display: 'grid', gap: '10px' }}>
                            <p style={{ margin: 0, fontWeight: 600 }}>{t('adminConsole.playersMinRecommendedMax')}</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                              <label>Min
                                <input
                                  type="number"
                                  min="1"
                                  value={editingChallenge.player_min || ''}
                                  onChange={(e) => setEditingChallenge((p) => ({ ...p, player_min: e.target.value }))}
                                />
                              </label>
                              <label>{t('adminConsole.recommended')}
                                <input
                                  type="number"
                                  min="1"
                                  value={editingChallenge.player_recommended || ''}
                                  onChange={(e) => setEditingChallenge((p) => ({ ...p, player_recommended: e.target.value }))}
                                />
                              </label>
                              <label>Max
                                <input
                                  type="number"
                                  min="1"
                                  value={editingChallenge.player_max || ''}
                                  onChange={(e) => setEditingChallenge((p) => ({ ...p, player_max: e.target.value }))}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                        {(editingChallenge.engine_key || '').toLowerCase() === 'escape_room_v1' ? (
                          <div
                            style={{
                              border: '1px solid var(--color-border, #cbd5e1)',
                              borderRadius: '14px',
                              padding: '14px',
                              display: 'grid',
                              gap: '10px',
                              background: 'var(--color-surface, #fff)',
                              boxShadow: '0 10px 24px -20px rgba(15, 23, 42, 0.55)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                              <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-strong, #0f172a)' }}>{t('adminConsole.puzzle5ImageSecretRoom')}</p>
                              <span style={{ fontSize: '12px', color: 'var(--color-muted, #334155)', fontWeight: 600 }}>{t('adminConsole.persistentStorageEnabled')}</span>
                            </div>
                            <p className="session-meta" style={{ margin: 0 }}>{t('adminConsole.thisImageIsUsedInThe')}</p>
                            <label style={{ display: 'inline-flex', width: 'fit-content' }}>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg"
                                onChange={handleUploadEscapeRoomImage}
                                disabled={challengeImageUploadBusy}
                                style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', pointerEvents: 'none' }}
                              />
                              {renderUploadInputLabel({ locale, busy: challengeImageUploadBusy })}
                            </label>
                            {challengeImageUploadError ? (
                              <p className="session-meta" style={{ margin: 0, color: '#b91c1c', fontWeight: 600 }}>{challengeImageUploadError}</p>
                            ) : null}
                            {getEscapeRoomE5ImageSrc(editingChallenge.engine_config) ? (
                              <div style={{ border: '1px solid var(--color-border, #dbe4f0)', borderRadius: '12px', padding: '8px', background: 'var(--color-surface, #f8fafc)' }}>
                                <Image
                                  src={getEscapeRoomE5ImageSrc(editingChallenge.engine_config)}
                                  alt={t('adminConsole.puzzle5Preview')}
                                  unoptimized
                                  width={640}
                                  height={360}
                                  loading="lazy"
                                  style={{ display: 'block', width: '100%', maxHeight: '190px', objectFit: 'contain', borderRadius: '8px' }}
                                />
                              </div>
                            ) : (
                              <p className="session-meta" style={{ margin: 0 }}>{t('adminConsole.noImageConfiguredForE5')}</p>
                            )}
                          </div>
                        ) : null}
                        {(editingChallenge.engine_key || '').toLowerCase() === 'copuzzle_live_v1' ? (
                          <div style={{ border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '8px', padding: '12px', display: 'grid', gap: '10px' }}>
                            <p style={{ margin: 0, fontWeight: 600 }}>{t('adminConsole.copuzzleConfiguration3AdminReferenceImages')}</p>
                            <p className="session-meta" style={{ margin: 0 }}>
                              {t('adminConsole.defineUpTo3ReferenceImages')}
                            </p>

                            {getCopuzzleDefaultImages(editingChallenge.engine_config).map((imageItem, imageIndex) => {
                              const slotIndex = imageIndex + 1;
                              return (
                                <div
                                  key={imageItem.id || `copuzzle-default-${slotIndex}`}
                                  style={{
                                    border: '1px solid var(--color-border, #dbe4f0)',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    display: 'grid',
                                    gap: '9px',
                                    background: 'var(--color-surface, #fff)',
                                  }}
                                >
                                  <p style={{ margin: 0, fontWeight: 600 }}>{t('adminConsole.referenceImageSlotindex', { slotIndex })}</p>

                                  <label>{t('adminConsole.title')}
                                    <input
                                      value={String(imageItem.title || '')}
                                      onChange={(e) => {
                                        const nextTitle = String(e.target.value || '').trimStart();
                                        setEditingChallenge((prev) => {
                                          if (!prev) return prev;
                                          const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                          const defaultImages = getCopuzzleDefaultImages(currentConfig).map((item) => ({ ...item }));
                                          defaultImages[imageIndex] = {
                                            ...(defaultImages[imageIndex] || {}),
                                            id: defaultImages[imageIndex]?.id || `default_${slotIndex}`,
                                            src: String(defaultImages[imageIndex]?.src || imageItem.src || '').trim(),
                                            title: nextTitle || `Image ${slotIndex}`,
                                          };

                                          return {
                                            ...prev,
                                            engine_config: {
                                              ...currentConfig,
                                              default_images: defaultImages,
                                            },
                                          };
                                        });
                                      }}
                                      placeholder={`Image ${slotIndex}`}
                                    />
                                  </label>

                                  <label>{t('adminConsole.imageUrl')}
                                    <input
                                      value={String(imageItem.src || '')}
                                      onChange={(e) => {
                                        const nextSrc = String(e.target.value || '').trim();
                                        setEditingChallenge((prev) => {
                                          if (!prev) return prev;
                                          const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                          const defaultImages = getCopuzzleDefaultImages(currentConfig).map((item) => ({ ...item }));
                                          defaultImages[imageIndex] = {
                                            ...(defaultImages[imageIndex] || {}),
                                            id: defaultImages[imageIndex]?.id || `default_${slotIndex}`,
                                            title: String(defaultImages[imageIndex]?.title || imageItem.title || `Image ${slotIndex}`),
                                            src: nextSrc,
                                          };
                                          const selectedDefaultImageId = String(currentConfig.default_image_id || defaultImages[0]?.id || '').trim();
                                          const selectedDefault = defaultImages.find((item) => item.id === selectedDefaultImageId) || defaultImages[0] || null;
                                          return {
                                            ...prev,
                                            engine_config: {
                                              ...currentConfig,
                                              default_images: defaultImages,
                                              image_url: String(selectedDefault?.src || nextSrc),
                                              image: {
                                                ...(currentConfig.image || {}),
                                                src: String(selectedDefault?.src || nextSrc),
                                              },
                                            },
                                          };
                                        });
                                      }}
                                      placeholder={t('adminConsole.httpsOrCopuzzleDefaultBlueSvg')}
                                    />
                                  </label>

                                  <label style={{ display: 'inline-flex', width: 'fit-content', gap: '8px' }}>
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/jpg"
                                      onChange={(event) => handleUploadCopuzzleDefaultImage(event, imageIndex)}
                                      disabled={challengeImageUploadBusy}
                                      style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', pointerEvents: 'none' }}
                                    />
                                    {renderUploadInputLabel({ locale, busy: challengeImageUploadBusy })}
                                  </label>

                                  {String(imageItem.src || '').trim() ? (
                                    <div style={{ border: '1px solid var(--color-border, #dbe4f0)', borderRadius: '10px', padding: '7px', background: 'var(--color-surface, #f8fafc)' }}>
                                      <Image
                                        src={String(imageItem.src || '').trim()}
                                        alt={t('adminConsole.imagePreviewSlotindex', { slotIndex })}
                                        unoptimized
                                        width={640}
                                        height={360}
                                        loading="lazy"
                                        style={{ display: 'block', width: '100%', maxHeight: '140px', objectFit: 'contain', borderRadius: '7px' }}
                                      />
                                    </div>
                                  ) : null}

                                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                      type="radio"
                                      name="copuzzle-default-image"
                                      checked={String(ensureCopuzzleConfig(editingChallenge.engine_config).default_image_id || '') === String(imageItem.id || '')}
                                      onChange={() => {
                                        setEditingChallenge((prev) => {
                                          if (!prev) return prev;
                                          const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                          const defaultImages = getCopuzzleDefaultImages(currentConfig);
                                          const selected = defaultImages.find((item) => item.id === imageItem.id) || defaultImages[0] || null;
                                          return {
                                            ...prev,
                                            engine_config: {
                                              ...currentConfig,
                                              default_image_id: String(imageItem.id || selected?.id || ''),
                                              image_url: String(selected?.src || currentConfig.image_url || ''),
                                              image: {
                                                ...(currentConfig.image || {}),
                                                src: String(selected?.src || currentConfig.image?.src || currentConfig.image_url || ''),
                                              },
                                            },
                                          };
                                        });
                                      }}
                                    />
                                    {t('adminConsole.defaultSelectedImage')}
                                  </label>
                                </div>
                              );
                            })}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <label>{t('adminConsole.gridRows')}
                                <input
                                  type="number"
                                  min="2"
                                  max="16"
                                  value={ensureCopuzzleConfig(editingChallenge.engine_config).grid.rows}
                                  onChange={(e) => {
                                    const value = Number(e.target.value || 4);
                                    setEditingChallenge((prev) => {
                                      if (!prev) return prev;
                                      const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                      return {
                                        ...prev,
                                        engine_config: {
                                          ...currentConfig,
                                          grid: {
                                            ...(currentConfig.grid || {}),
                                            rows: value,
                                          },
                                        },
                                      };
                                    });
                                  }}
                                />
                              </label>
                              <label>{t('adminConsole.gridCols')}
                                <input
                                  type="number"
                                  min="2"
                                  max="16"
                                  value={ensureCopuzzleConfig(editingChallenge.engine_config).grid.cols}
                                  onChange={(e) => {
                                    const value = Number(e.target.value || 4);
                                    setEditingChallenge((prev) => {
                                      if (!prev) return prev;
                                      const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                      return {
                                        ...prev,
                                        engine_config: {
                                          ...currentConfig,
                                          grid: {
                                            ...(currentConfig.grid || {}),
                                            cols: value,
                                          },
                                        },
                                      };
                                    });
                                  }}
                                />
                              </label>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <label>{t('adminConsole.timerSeconds')}
                                <input
                                  type="number"
                                  min="30"
                                  max="7200"
                                  value={ensureCopuzzleConfig(editingChallenge.engine_config).timer.duration_seconds}
                                  onChange={(e) => {
                                    const value = Number(e.target.value || 1200);
                                    setEditingChallenge((prev) => {
                                      if (!prev) return prev;
                                      const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                      return {
                                        ...prev,
                                        engine_config: {
                                          ...currentConfig,
                                          timer: {
                                            ...(currentConfig.timer || {}),
                                            duration_seconds: value,
                                          },
                                        },
                                      };
                                    });
                                  }}
                                />
                              </label>
                              <label>{t('adminConsole.warningThresholdSeconds')}
                                <input
                                  type="number"
                                  min="10"
                                  max="600"
                                  value={ensureCopuzzleConfig(editingChallenge.engine_config).timer.warning_threshold_seconds}
                                  onChange={(e) => {
                                    const value = Number(e.target.value || 60);
                                    setEditingChallenge((prev) => {
                                      if (!prev) return prev;
                                      const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                      return {
                                        ...prev,
                                        engine_config: {
                                          ...currentConfig,
                                          timer: {
                                            ...(currentConfig.timer || {}),
                                            warning_threshold_seconds: value,
                                          },
                                        },
                                      };
                                    });
                                  }}
                                />
                              </label>
                            </div>

                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="checkbox"
                                checked={ensureCopuzzleConfig(editingChallenge.engine_config).timer.enabled}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setEditingChallenge((prev) => {
                                    if (!prev) return prev;
                                    const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                    return {
                                      ...prev,
                                      engine_config: {
                                        ...currentConfig,
                                        timer: {
                                          ...(currentConfig.timer || {}),
                                          enabled: checked,
                                        },
                                      },
                                    };
                                  });
                                }}
                              />
                              {t('adminConsole.timerEnabled')}
                            </label>

                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="checkbox"
                                checked={ensureCopuzzleConfig(editingChallenge.engine_config).chat.enabled}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setEditingChallenge((prev) => {
                                    if (!prev) return prev;
                                    const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                    return {
                                      ...prev,
                                      engine_config: {
                                        ...currentConfig,
                                        chat: {
                                          ...(currentConfig.chat || {}),
                                          enabled: checked,
                                        },
                                      },
                                    };
                                  });
                                }}
                              />
                              {t('adminConsole.chatEnabled')}
                            </label>

                            {challengeImageUploadBusy ? (
                              <p className="session-meta" style={{ marginTop: '8px' }}>{t('adminConsole.uploadInProgress')}</p>
                            ) : null}
                            {challengeImageUploadError ? (
                              <p className="session-meta" style={{ marginTop: '8px', color: '#dc2626' }}>{challengeImageUploadError}</p>
                            ) : null}

                            <Image
                              src={getCopuzzleImageSrc(editingChallenge.engine_config)}
                              alt={t('adminConsole.copuzzlePreview')}
                              unoptimized
                              width={840}
                              height={840}
                              loading="lazy"
                              style={{ marginTop: '6px', maxWidth: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              onLoad={(e) => { e.currentTarget.style.display = 'block'; }}
                            />
                          </div>
                        ) : null}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button type="submit" className="btn-primary" disabled={busySaveKey === `save:challenge:${editingChallenge.id}`}>{busySaveKey === `save:challenge:${editingChallenge.id}` ? t('adminConsole.saving') : t('adminConsole.save')}</button>
                          <button type="button" className="btn-secondary" onClick={() => { setEditingChallenge(null); setChallengeImageUploadError(''); }}>{t('adminConsole.cancel')}</button>
                        </div>
                    </form>
                    </div>
                  </div>
                ) : null}

                <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                      {t('adminConsole.list')} {challenges.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>({filteredChallenges.length}/{challenges.length})</span> : null}
                    </h2>
                    <input
                      type="search"
                      className="inline-input"
                      placeholder={t('adminConsole.search')}
                      value={challengeQuery}
                      onChange={(e) => setChallengeQuery(e.target.value)}
                      style={{ width: 'min(360px, 100%)' }}
                    />
                  </div>
                  <ul className="session-list" style={{ margin: 0 }}>
                    {filteredChallenges.length === 0 ? <li className="list-empty">{t('adminConsole.noMatchingChallenge')}</li> : null}
                    {filteredChallenges.map((c) => (
                      <li key={String(c.id)} className="session-item" style={{ alignItems: 'center' }}>
                        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                          <p className="session-title">{c.name || c.title || `Challenge #${c.id}`}</p>
                          <p className="session-meta">{getChallengeTypeLabel(c.type, locale)} · {getChallengeStatusLabel(c.status, locale)} {c.engine_key ? `· ${c.engine_key}` : ''}</p>
                          {(() => {
                            const playerRange = resolveChallengePlayerRange(c);
                            if (!playerRange.hasRange) return null;
                            return (
                              <p className="session-meta" style={{ marginTop: '4px' }}>
                                ~{playerRange.recommended || '-'} {t('adminConsole.players')} · Min {playerRange.min || '-'} · Max {playerRange.max || '-'}
                              </p>
                            );
                          })()}
                        </div>
                        <div className="session-item-actions icon-only-actions" style={{ flexShrink: 0 }}>
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => beginEditChallenge(c)}
                            title={t('adminConsole.edit')}
                            aria-label={t('adminConsole.editChallenge2')}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn icon-action-danger"
                            onClick={() => handleDeleteChallenge(c)}
                            disabled={busyDeleteKey === `challenge:${c.id}`}
                            title={t('adminConsole.delete')}
                            aria-label={t('adminConsole.deleteChallenge')}
                          >
                            {busyDeleteKey === `challenge:${c.id}` ? '…' : '🗑'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── TARIFICATION ── */}
          {activeTab === 'pricing' ? (
            <div>
              <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>{t('adminConsole.pricing')}</h1>
                  <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>
                    {t('adminConsole.createAndManageYourCommercialOffers')}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setEditingPricingPlan(null);
                    setNewPricingMessage('');
                    setShowNewPricingPlanForm((current) => !current);
                  }}
                >
                  {showNewPricingPlanForm ? t('adminConsole.closeForm') : t('adminConsole.createPricingPlan')}
                </button>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                {showNewPricingPlanForm ? (
                  <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>{t('adminConsole.createPricingPlan')}</h2>
                    <form className="auth-form" onSubmit={submitNewPricingPlan}>
                      <label>{t('adminConsole.offerName')}<input value={newPricingPlan.name} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, name: e.target.value }))} required /></label>
                      <label>{t('adminConsole.shortDescription')}<textarea rows={3} value={newPricingPlan.description} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, description: e.target.value }))} /></label>
                      <label>{t('adminConsole.includedFeatures1Line1Bullet')}
                        <textarea rows={5} value={newPricingPlan.features} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, features: e.target.value }))} placeholder={t('adminConsole.exampleManagerDashboardLiveSessionEmail')} />
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label>{t('adminConsole.price')}<input type="number" min="0" step="0.01" value={newPricingPlan.price} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, price: e.target.value }))} required /></label>
                        <label>{t('adminConsole.currency')}<input value={newPricingPlan.currency} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} maxLength={3} /></label>
                      </div>
                      <label>{t('adminConsole.billingCycle')}
                        <select value={newPricingPlan.billing_cycle} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, billing_cycle: e.target.value }))}>
                          <option value="monthly">{getLocalizedLabel(PRICING_BILLING_CYCLE_LABELS.monthly, locale)}</option>
                          <option value="yearly">{getLocalizedLabel(PRICING_BILLING_CYCLE_LABELS.yearly, locale)}</option>
                          <option value="one_time">{getLocalizedLabel(PRICING_BILLING_CYCLE_LABELS.one_time, locale)}</option>
                          <option value="custom">{getLocalizedLabel(PRICING_BILLING_CYCLE_LABELS.custom, locale)}</option>
                        </select>
                      </label>
                      <label>{t('adminConsole.ctaButtonLabel')}<input value={newPricingPlan.cta_label} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, cta_label: e.target.value }))} /></label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label>{t('adminConsole.maxUsers')}<input type="number" min="0" value={newPricingPlan.max_users} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, max_users: e.target.value }))} /></label>
                        <label>{t('adminConsole.maxSessionsMonth')}<input type="number" min="0" value={newPricingPlan.max_sessions_per_month} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, max_sessions_per_month: e.target.value }))} /></label>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        <label>{t('adminConsole.supportLevel')}<input value={newPricingPlan.support_level} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, support_level: e.target.value }))} placeholder={t('adminConsole.emailPriority')} /></label>
                        <label>{t('adminConsole.trialDays')}<input type="number" min="0" value={newPricingPlan.trial_days} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, trial_days: e.target.value }))} /></label>
                        <label>{t('adminConsole.displayOrder')}<input type="number" min="0" value={newPricingPlan.display_order} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, display_order: e.target.value }))} /></label>
                      </div>
                      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <input type="checkbox" checked={newPricingPlan.is_active} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, is_active: e.target.checked }))} />
                          {t('adminConsole.activeOffer')}
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <input type="checkbox" checked={newPricingPlan.highlighted} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, highlighted: e.target.checked }))} />
                          {t('adminConsole.highlighted')}
                        </label>
                      </div>
                      <button type="submit" className="btn-primary" disabled={busySaveKey === 'create:pricing-plan'}>
                        {busySaveKey === 'create:pricing-plan' ? t('adminConsole.creating') : t('adminConsole.createPlan')}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setShowNewPricingPlanForm(false);
                          setNewPricingMessage('');
                        }}
                      >
                        {t('adminConsole.cancel')}
                      </button>
                    </form>
                    {newPricingMessage ? <p className="session-meta" style={{ marginTop: '8px' }}>{newPricingMessage}</p> : null}
                  </div>
                ) : null}

                {editingPricingPlan ? (
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--modal-scrim, rgba(0,0,0,0.45))', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}
                    onClick={(e) => { if (e.target === e.currentTarget) setEditingPricingPlan(null); }}
                  >
                    <div style={{ background: 'var(--surface-elevated, #fff)', border: '1px solid var(--accent, var(--color-primary, #4f46e5))', borderRadius: '12px', width: '100%', maxWidth: '760px', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', padding: '22px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>{t('adminConsole.editPricingPlan')}</h2>
                        <button
                          type="button"
                          onClick={() => setEditingPricingPlan(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--ink-soft, #6b7280)', padding: '2px 8px', lineHeight: 1 }}
                          aria-label={t('adminConsole.closeWindow')}
                        >
                          ✕
                        </button>
                      </div>
                    <form className="auth-form" onSubmit={submitEditPricingPlan}>
                        <label>{t('adminConsole.offerName')}<input value={editingPricingPlan.name} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, name: e.target.value }))} required /></label>
                        <label>{t('adminConsole.shortDescription')}<textarea rows={3} value={editingPricingPlan.description} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, description: e.target.value }))} /></label>
                        <label>{t('adminConsole.includedFeatures1Line1Bullet')}
                          <textarea rows={5} value={editingPricingPlan.features} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, features: e.target.value }))} />
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <label>{t('adminConsole.price')}<input type="number" min="0" step="0.01" value={editingPricingPlan.price} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, price: e.target.value }))} required /></label>
                          <label>{t('adminConsole.currency')}<input value={editingPricingPlan.currency} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} maxLength={3} /></label>
                        </div>
                        <label>{t('adminConsole.billingCycle')}
                          <select value={editingPricingPlan.billing_cycle} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, billing_cycle: e.target.value }))}>
                            <option value="monthly">{getPricingBillingCycleLabel('monthly', locale)}</option>
                            <option value="yearly">{getPricingBillingCycleLabel('yearly', locale)}</option>
                            <option value="one_time">{getPricingBillingCycleLabel('one_time', locale)}</option>
                            <option value="custom">{getPricingBillingCycleLabel('custom', locale)}</option>
                          </select>
                        </label>
                        <label>{t('adminConsole.ctaButtonLabel')}<input value={editingPricingPlan.cta_label} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, cta_label: e.target.value }))} /></label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <label>{t('adminConsole.maxUsers')}<input type="number" min="0" value={editingPricingPlan.max_users} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, max_users: e.target.value }))} /></label>
                          <label>{t('adminConsole.maxSessionsMonth')}<input type="number" min="0" value={editingPricingPlan.max_sessions_per_month} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, max_sessions_per_month: e.target.value }))} /></label>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                          <label>{t('adminConsole.supportLevel')}<input value={editingPricingPlan.support_level} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, support_level: e.target.value }))} /></label>
                          <label>{t('adminConsole.trialDays')}<input type="number" min="0" value={editingPricingPlan.trial_days} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, trial_days: e.target.value }))} /></label>
                          <label>{t('adminConsole.displayOrder')}<input type="number" min="0" value={editingPricingPlan.display_order} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, display_order: e.target.value }))} /></label>
                        </div>
                        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" checked={editingPricingPlan.is_active} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, is_active: e.target.checked }))} />
                            {t('adminConsole.activeOffer')}
                          </label>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" checked={editingPricingPlan.highlighted} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, highlighted: e.target.checked }))} />
                            {t('adminConsole.highlighted')}
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button type="submit" className="btn-primary" disabled={busySaveKey === `save:pricing-plan:${editingPricingPlan.id}`}>
                            {busySaveKey === `save:pricing-plan:${editingPricingPlan.id}` ? t('adminConsole.saving') : t('adminConsole.save')}
                          </button>
                          <button type="button" className="btn-secondary" onClick={() => setEditingPricingPlan(null)}>{t('adminConsole.cancel')}</button>
                        </div>
                    </form>
                    </div>
                  </div>
                ) : null}

                <div style={{ background: 'var(--surface-elevated, #fff)', border: '1px solid var(--line, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                      {t('adminConsole.list')} {pricingPlans.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--ink-soft, #6b7280)', fontSize: '13px' }}>({filteredPricingPlans.length}/{pricingPlans.length})</span> : null}
                    </h2>
                    <input
                      type="search"
                      className="inline-input"
                      placeholder={t('adminConsole.searchAPlan')}
                      value={pricingQuery}
                      onChange={(e) => setPricingQuery(e.target.value)}
                      style={{ width: 'min(360px, 100%)' }}
                    />
                  </div>

                  <ul className="session-list" style={{ margin: 0 }}>
                    {filteredPricingPlans.length === 0 ? <li className="list-empty">{t('adminConsole.noMatchingPlan')}</li> : null}
                    {filteredPricingPlans.map((plan) => (
                      <li key={String(plan.id)} className="session-item" style={{ alignItems: 'center' }}>
                        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                          <p className="session-title">
                            {plan.name}
                            {getAdminPricingBadgeLabel(plan, locale) ? <span className="pricing-badge admin-pricing-inline-badge">{getAdminPricingBadgeLabel(plan, locale)}</span> : null}
                          </p>
                          <p className="session-meta">
                            {formatPricingPlanAmount(plan, locale)}
                            {' · '}
                            {getPricingBillingCycleLabel(plan.billing_cycle, locale)}
                            {' · '}
                            {plan.is_active ? t('adminConsole.active2') : t('adminConsole.inactive2')}
                          </p>
                        </div>
                        <div className="session-item-actions icon-only-actions" style={{ flexShrink: 0 }}>
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => beginEditPricingPlan(plan)}
                            title={t('adminConsole.edit')}
                            aria-label={t('adminConsole.editPlan')}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn icon-action-danger"
                            onClick={() => handleDeletePricingPlan(plan)}
                            disabled={busyDeleteKey === `pricing-plan:${plan.id}`}
                            title={t('adminConsole.delete')}
                            aria-label={t('adminConsole.deletePlan')}
                          >
                            {busyDeleteKey === `pricing-plan:${plan.id}` ? '…' : '🗑'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── LANDING CMS ── */}
          {activeTab === 'landing' ? (
            <div>
              <datalist id="landing-allowed-keys">
                {LANDING_ALLOWED_BLOCK_KEYS.map((key) => (
                  <option key={key} value={key} />
                ))}
              </datalist>

              <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>{t('adminConsole.landingCms2')}</h1>
                  <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>
                    {t('adminConsole.reducedStructureModeHero3Proof')}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setEditingLandingBlock(null);
                    setNewLandingMessage('');
                    setShowNewLandingBlockForm((current) => !current);
                  }}
                >
                  {showNewLandingBlockForm ? t('adminConsole.closeForm') : t('adminConsole.createBlock')}
                </button>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                {showNewLandingBlockForm ? (
                  <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>{t('adminConsole.createBlock')}</h2>
                    <form className="auth-form" onSubmit={submitNewLandingBlock}>
                      <label>{t('adminConsole.blockKey')}<input value={newLandingBlock.block_key} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, block_key: e.target.value }))} placeholder="hero_main" list="landing-allowed-keys" required /></label>
                      <label>{t('adminConsole.adminLabel')}<input value={newLandingBlock.label} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, label: e.target.value }))} /></label>
                      <label>{t('adminConsole.title')}<input value={newLandingBlock.title} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, title: e.target.value }))} /></label>
                      <label>{t('adminConsole.subtitle')}<input value={newLandingBlock.subtitle} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, subtitle: e.target.value }))} /></label>
                      <label>{t('adminConsole.description')}<textarea rows={4} value={newLandingBlock.description} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, description: e.target.value }))} /></label>
                      <label>{t('adminConsole.imageUrl2')}<input value={newLandingBlock.image_url} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, image_url: e.target.value }))} placeholder="https://..." /></label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label>{t('adminConsole.ctaLabel')}<input value={newLandingBlock.cta_label} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, cta_label: e.target.value }))} /></label>
                        <label>{t('adminConsole.ctaLink')}<input value={newLandingBlock.cta_href} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, cta_href: e.target.value }))} /></label>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label>{t('adminConsole.badge')}<input value={newLandingBlock.badge_text} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, badge_text: e.target.value }))} /></label>
                        <label>{t('adminConsole.order')}<input type="number" min="0" value={newLandingBlock.display_order} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, display_order: e.target.value }))} /></label>
                      </div>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" checked={newLandingBlock.is_active} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, is_active: e.target.checked }))} />
                        {t('adminConsole.activeBlock')}
                      </label>
                      <button type="submit" className="btn-primary" disabled={busySaveKey === `create:landing:${String(newLandingBlock.block_key || '').trim().toLowerCase()}`}>
                        {busySaveKey === `create:landing:${String(newLandingBlock.block_key || '').trim().toLowerCase()}` ? t('adminConsole.saving') : t('adminConsole.createBlock2')}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setShowNewLandingBlockForm(false);
                          setNewLandingMessage('');
                        }}
                      >
                        {t('adminConsole.cancel')}
                      </button>
                    </form>
                    {newLandingMessage ? <p className="session-meta" style={{ marginTop: '8px' }}>{newLandingMessage}</p> : null}
                  </div>
                ) : null}

                {editingLandingBlock ? (
                  <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-primary, #4f46e5)', borderRadius: '10px', padding: '20px 24px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>{t('adminConsole.editBlock')}</h2>
                    <form className="auth-form" onSubmit={submitEditLandingBlock}>
                      <label>{t('adminConsole.blockKey')}<input value={editingLandingBlock.block_key} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, block_key: e.target.value }))} list="landing-allowed-keys" required /></label>
                        <label>{t('adminConsole.adminLabel')}<input value={editingLandingBlock.label} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, label: e.target.value }))} /></label>
                        <label>{t('adminConsole.title')}<input value={editingLandingBlock.title} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, title: e.target.value }))} /></label>
                        <label>{t('adminConsole.subtitle')}<input value={editingLandingBlock.subtitle} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, subtitle: e.target.value }))} /></label>
                        <label>{t('adminConsole.description')}<textarea rows={4} value={editingLandingBlock.description} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, description: e.target.value }))} /></label>
                        <label>{t('adminConsole.imageUrl2')}<input value={editingLandingBlock.image_url} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, image_url: e.target.value }))} /></label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <label>{t('adminConsole.ctaLabel')}<input value={editingLandingBlock.cta_label} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, cta_label: e.target.value }))} /></label>
                          <label>{t('adminConsole.ctaLink')}<input value={editingLandingBlock.cta_href} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, cta_href: e.target.value }))} /></label>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <label>{t('adminConsole.badge')}<input value={editingLandingBlock.badge_text} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, badge_text: e.target.value }))} /></label>
                          <label>{t('adminConsole.order')}<input type="number" min="0" value={editingLandingBlock.display_order} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, display_order: e.target.value }))} /></label>
                        </div>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <input type="checkbox" checked={editingLandingBlock.is_active} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, is_active: e.target.checked }))} />
                          {t('adminConsole.activeBlock')}
                        </label>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button type="submit" className="btn-primary" disabled={busySaveKey === `save:landing:${String(editingLandingBlock.block_key || '').trim().toLowerCase()}`}>
                            {busySaveKey === `save:landing:${String(editingLandingBlock.block_key || '').trim().toLowerCase()}` ? t('adminConsole.saving') : t('adminConsole.save')}
                          </button>
                          <button type="button" className="btn-secondary" onClick={() => setEditingLandingBlock(null)}>{t('adminConsole.cancel')}</button>
                        </div>
                    </form>
                  </div>
                ) : null}

                <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                      {t('adminConsole.blocks')} {landingBlocks.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>({filteredLandingBlocks.length}/{landingBlocks.length})</span> : null}
                    </h2>
                    <input
                      type="search"
                      className="inline-input"
                      placeholder={t('adminConsole.searchABlock')}
                      value={landingQuery}
                      onChange={(e) => setLandingQuery(e.target.value)}
                      style={{ width: 'min(360px, 100%)' }}
                    />
                  </div>

                  <ul className="session-list" style={{ margin: 0 }}>
                    {filteredLandingBlocks.length === 0 ? <li className="list-empty">{t('adminConsole.noMatchingBlock')}</li> : null}
                    {filteredLandingBlocks.map((block) => (
                      <li key={String(block.id)} className="session-item" style={{ alignItems: 'center' }}>
                        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                          <p className="session-title">{block.label || block.block_key}</p>
                          <p className="session-meta">{block.block_key} · {block.is_active ? t('adminConsole.active') : t('adminConsole.inactive')}</p>
                        </div>
                        <div className="session-item-actions icon-only-actions" style={{ flexShrink: 0 }}>
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => beginEditLandingBlock(block)}
                            title={t('adminConsole.edit')}
                            aria-label={t('adminConsole.editLandingBlock')}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn icon-action-danger"
                            onClick={() => handleDeleteLandingBlock(block)}
                            disabled={busyDeleteKey === `landing:${block.block_key}`}
                            title={t('adminConsole.delete')}
                            aria-label={t('adminConsole.deleteLandingBlock')}
                          >
                            {busyDeleteKey === `landing:${block.block_key}` ? '…' : '🗑'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

        </main>
      </div>
      <Footer />
    </>
  );
}
