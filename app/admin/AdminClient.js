"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import Modal from '@/components/ui/Modal';
import AdminDashboardPanel from './AdminDashboardPanel';
import { getApiUrl, normalizeUploadResultUrl } from '@/lib/config';
import { fetchWithCsrfRetry, withCsrfHeaders } from '@/lib/csrf';
import { clearSessionAuth } from '@/lib/auth';
import { getStoredCurrentUser as readAuthStoredCurrentUser } from '@/lib/auth-storage';
import { resolveChallengePlayerRange } from '@/lib/challenges/playerRange';
import useI18n from '@/lib/i18n/useI18n';
import { formatDateTime } from '@/lib/i18n/format';
import {
  ADMIN_TAB_IDS,
  CHALLENGE_CATEGORY_LABELS,
  CHALLENGE_CATEGORY_OPTIONS,
  CHALLENGE_OBJECTIVE_LABELS,
  CHALLENGE_OBJECTIVE_OPTIONS,
  CHALLENGE_SOURCES,
  CHALLENGE_STATUSES,
  CHALLENGE_TYPES,
  DEFAULT_NEW_CHALLENGE,
  DEFAULT_NEW_LANDING_BLOCK,
  DEFAULT_NEW_PRICING_PLAN,
  DEFAULT_NEW_SESSION,
  KNOWN_ENGINE_KEYS,
  LANDING_ALLOWED_BLOCK_KEY_HINT,
  PRICING_BILLING_CYCLES,
  SESSION_MODALITIES,
  SESSION_STATUSES,
  USER_ROLES,
} from '@/lib/admin/constants';
import AnalyticsTab from './tabs/AnalyticsTab';
import UsersTab from './tabs/UsersTab';
import ParticipantsTab from './tabs/ParticipantsTab';
import SessionsTab from './tabs/SessionsTab';
import ChallengesTab from './tabs/ChallengesTab';
import PricingTab from './tabs/PricingTab';
import LandingTab from './tabs/LandingTab';
import { ensureAdminCatalogChallenges } from '@/lib/admin/challengeCatalog';
import {
  applyPlayerRangeToEngineConfig,
  cloneJson,
  csvEscape,
  downloadTextFile,
  ensureCopuzzleConfig,
  ensureEscapeRoomE5Image,
  fetchAdminJson,
  buildLocalizedContentFromDraft,
  getCopuzzleDefaultImages,
  getLocalizedLabel,
  getParticipantDisplayName,
  getParticipantFirstName,
  getParticipantLastName,
  isAllowedLandingBlockKey,
  isStrongPassword,
  isTokenAuthError,
  isValidEmail,
  landingBlockToDraft,
  normalizeObjectivesInput,
  normalizePricingPlanId,
  parseList,
  pickUserLabel,
  planToDraft,
  resolveLocalizedRuleValue,
  resolveUserPricingPlanId,
  stripRulesFromEngineConfig,
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
      annual_price: String(draft.annual_price ?? '').trim() === '' ? null : Number(String(draft.annual_price).replace(',', '.')),
      currency: String(draft.currency || 'EUR').trim().toUpperCase(),
      billing_cycle: String(draft.billing_cycle || 'monthly').trim().toLowerCase(),
      cta_label: String(draft.cta_label || '').trim() || null,
      is_active: Boolean(draft.is_active),
      highlighted: Boolean(draft.highlighted),
      max_users: draft.max_users === '' ? null : Number(draft.max_users),
      support_level: String(draft.support_level || '').trim() || null,
      trial_days: draft.trial_days === '' ? null : Number(draft.trial_days),
      display_order: draft.display_order === '' ? 0 : Number(draft.display_order),
      localized_content: buildLocalizedContentFromDraft(draft),
    };
  }

  function isValidAnnualPrice(payload) {
    return payload.annual_price === null || (Number.isFinite(payload.annual_price) && payload.annual_price >= 0);
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

    if (!isValidAnnualPrice(payload)) {
      setNewPricingMessage(t('adminConsole.priceMustBeValidAndPositive'));
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

    if (!isValidAnnualPrice(payload)) {
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
            <AdminDashboardPanel
              t={t}
              userLabel={pickUserLabel(user)}
              stats={stats}
              visitSummary={adminVisitSummary}
              activityLoading={adminActivityLoading}
              visits={adminVisits}
              locale={locale}
              formatDateTime={formatDateTime}
              pendingUsers={pendingUsers}
              busyApprovalId={busyApprovalId}
              onApproval={updateApproval}
            />
          ) : null}

          {/* ── ANALYTICS ── */}
          {activeTab === 'analytics' ? (
            <AnalyticsTab
              analyticsDays={analyticsDays}
              analyticsError={analyticsError}
              analyticsLoading={analyticsLoading}
              analyticsSnapshot={analyticsSnapshot}
              canExpandCitiesForCountry={canExpandCitiesForCountry}
              displayedCitiesForAnalytics={displayedCitiesForAnalytics}
              effectiveSelectedCountry={effectiveSelectedCountry}
              exportAnalyticsCsv={exportAnalyticsCsv}
              loadAnalytics={loadAnalytics}
              locale={locale}
              setAnalyticsDays={setAnalyticsDays}
              setSelectedVisitorCountry={setSelectedVisitorCountry}
              setShowAllCitiesForCountry={setShowAllCitiesForCountry}
              showAllCitiesForCountry={showAllCitiesForCountry}
              t={t}
              visitorCountries={visitorCountries}
            />
          ) : null}

          {/* ── UTILISATEURS ── */}
          {activeTab === 'users' ? (
            <UsersTab
              beginEditUser={beginEditUser}
              busyApprovalId={busyApprovalId}
              busyDeleteKey={busyDeleteKey}
              busySaveKey={busySaveKey}
              filteredUsers={filteredUsers}
              handleAdminUserVerificationOverride={handleAdminUserVerificationOverride}
              handleDeleteUser={handleDeleteUser}
              handleResendVerificationLink={handleResendVerificationLink}
              handleToggleUserStatus={handleToggleUserStatus}
              newUser={newUser}
              newUserMessage={newUserMessage}
              pendingUsers={pendingUsers}
              setEditingUser={setEditingUser}
              setNewUser={setNewUser}
              setNewUserMessage={setNewUserMessage}
              setShowNewUserForm={setShowNewUserForm}
              setUserQuery={setUserQuery}
              showNewUserForm={showNewUserForm}
              submitNewUser={submitNewUser}
              t={t}
              updateApproval={updateApproval}
              user={user}
              userQuery={userQuery}
              users={users}
            />
          ) : null}

          {/* ── PARTICIPANTS ── */}
          {activeTab === 'participants' ? (
            <ParticipantsTab
              beginEditParticipant={beginEditParticipant}
              busyDeleteKey={busyDeleteKey}
              busySaveKey={busySaveKey}
              filteredParticipants={filteredParticipants}
              handleAdminParticipantVerificationOverride={handleAdminParticipantVerificationOverride}
              handleDeleteParticipant={handleDeleteParticipant}
              handleResendParticipantVerificationLink={handleResendParticipantVerificationLink}
              handleToggleParticipantStatus={handleToggleParticipantStatus}
              newParticipant={newParticipant}
              newParticipantMessage={newParticipantMessage}
              participantQuery={participantQuery}
              participants={participants}
              setEditingParticipant={setEditingParticipant}
              setNewParticipant={setNewParticipant}
              setNewParticipantMessage={setNewParticipantMessage}
              setParticipantQuery={setParticipantQuery}
              setShowNewParticipantForm={setShowNewParticipantForm}
              showNewParticipantForm={showNewParticipantForm}
              submitNewParticipant={submitNewParticipant}
              t={t}
              users={users}
            />
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
            <SessionsTab
              beginEditSession={beginEditSession}
              busyDeleteKey={busyDeleteKey}
              busySaveKey={busySaveKey}
              editingSession={editingSession}
              filteredAssignableMembers={filteredAssignableMembers}
              filteredSessions={filteredSessions}
              getSessionOwnerLabel={getSessionOwnerLabel}
              handleDeleteSession={handleDeleteSession}
              locale={locale}
              newSession={newSession}
              newSessionMemberIds={newSessionMemberIds}
              newSessionMemberQuery={newSessionMemberQuery}
              newSessionMessage={newSessionMessage}
              sessionQuery={sessionQuery}
              sessions={sessions}
              setEditingSession={setEditingSession}
              setNewSession={setNewSession}
              setNewSessionMemberIds={setNewSessionMemberIds}
              setNewSessionMemberQuery={setNewSessionMemberQuery}
              setNewSessionMessage={setNewSessionMessage}
              setSessionQuery={setSessionQuery}
              setShowNewSessionForm={setShowNewSessionForm}
              showNewSessionForm={showNewSessionForm}
              submitEditSession={submitEditSession}
              submitNewSession={submitNewSession}
              t={t}
              toggleNewSessionMember={toggleNewSessionMember}
            />
          ) : null}

          {/* ── CHALLENGES ── */}
          {activeTab === 'challenges' ? (
            <ChallengesTab
              beginEditChallenge={beginEditChallenge}
              busyDeleteKey={busyDeleteKey}
              busySaveKey={busySaveKey}
              challengeCategoryOptions={challengeCategoryOptions}
              challengeImageUploadBusy={challengeImageUploadBusy}
              challengeImageUploadError={challengeImageUploadError}
              challengeObjectiveOptions={challengeObjectiveOptions}
              challengeQuery={challengeQuery}
              challenges={challenges}
              editingChallenge={editingChallenge}
              filteredChallenges={filteredChallenges}
              handleDeleteChallenge={handleDeleteChallenge}
              handleUploadCopuzzleDefaultImage={handleUploadCopuzzleDefaultImage}
              handleUploadEscapeRoomImage={handleUploadEscapeRoomImage}
              locale={locale}
              newChallenge={newChallenge}
              newChallengeMessage={newChallengeMessage}
              setChallengeImageUploadError={setChallengeImageUploadError}
              setChallengeQuery={setChallengeQuery}
              setEditingChallenge={setEditingChallenge}
              setNewChallenge={setNewChallenge}
              setNewChallengeMessage={setNewChallengeMessage}
              setShowNewChallengeForm={setShowNewChallengeForm}
              showNewChallengeForm={showNewChallengeForm}
              submitEditChallenge={submitEditChallenge}
              submitNewChallenge={submitNewChallenge}
              t={t}
            />
          ) : null}

          {/* ── TARIFICATION ── */}
          {activeTab === 'pricing' ? (
            <PricingTab
              beginEditPricingPlan={beginEditPricingPlan}
              busyDeleteKey={busyDeleteKey}
              busySaveKey={busySaveKey}
              editingPricingPlan={editingPricingPlan}
              filteredPricingPlans={filteredPricingPlans}
              handleDeletePricingPlan={handleDeletePricingPlan}
              locale={locale}
              newPricingMessage={newPricingMessage}
              newPricingPlan={newPricingPlan}
              pricingPlans={pricingPlans}
              pricingQuery={pricingQuery}
              setEditingPricingPlan={setEditingPricingPlan}
              setNewPricingMessage={setNewPricingMessage}
              setNewPricingPlan={setNewPricingPlan}
              setPricingQuery={setPricingQuery}
              setShowNewPricingPlanForm={setShowNewPricingPlanForm}
              showNewPricingPlanForm={showNewPricingPlanForm}
              submitEditPricingPlan={submitEditPricingPlan}
              submitNewPricingPlan={submitNewPricingPlan}
              t={t}
            />
          ) : null}

          {/* ── LANDING CMS ── */}
          {activeTab === 'landing' ? (
            <LandingTab
              beginEditLandingBlock={beginEditLandingBlock}
              busyDeleteKey={busyDeleteKey}
              busySaveKey={busySaveKey}
              editingLandingBlock={editingLandingBlock}
              filteredLandingBlocks={filteredLandingBlocks}
              handleDeleteLandingBlock={handleDeleteLandingBlock}
              landingBlocks={landingBlocks}
              landingQuery={landingQuery}
              newLandingBlock={newLandingBlock}
              newLandingMessage={newLandingMessage}
              setEditingLandingBlock={setEditingLandingBlock}
              setLandingQuery={setLandingQuery}
              setNewLandingBlock={setNewLandingBlock}
              setNewLandingMessage={setNewLandingMessage}
              setShowNewLandingBlockForm={setShowNewLandingBlockForm}
              showNewLandingBlockForm={showNewLandingBlockForm}
              submitEditLandingBlock={submitEditLandingBlock}
              submitNewLandingBlock={submitNewLandingBlock}
              t={t}
            />
          ) : null}

        </main>
      </div>
      <Footer />
    </>
  );
}
