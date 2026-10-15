"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import Modal from '@/components/ui/Modal';
import ToastContainer from '@/components/ToastContainer';
import SessionCardSkeleton from '@/components/SessionCardSkeleton';
import { getApiUrl } from '@/lib/config';
import useToast from '@/lib/useToast';
import { fetchSessionsWithRetry } from '@/lib/api';
import { clearStoredAuth, getAuthHeaders } from '@/lib/auth';
import { trackGaEvent, trackProductSessionEvent } from '@/lib/analytics';
import useI18n from '@/lib/i18n/useI18n';
import guideStyles from './StartupGuide.module.css';
import homeStyles from './ManagerHome.module.css';

function pickDisplayName(user) {
  if (!user || typeof user !== 'object') return 'Manager';
  const first = String(user.first_name || user.firstName || '').trim();
  const last = String(user.last_name || user.lastName || '').trim();
  const full = `${first} ${last}`.trim();
  return full || String(user.name || 'Manager');
}

function getParticipantFirstName(participant) {
  return String(participant?.first_name || participant?.firstname || '').trim();
}

function getParticipantLastName(participant) {
  return String(participant?.last_name || participant?.lastname || '').trim();
}

function getParticipantInitials(participant) {
  const firstName = getParticipantFirstName(participant).charAt(0).toUpperCase();
  const lastName = getParticipantLastName(participant).charAt(0).toUpperCase();
  if (firstName || lastName) {
    return `${firstName}${lastName}`.trim() || '?';
  }
  const fallback = String(participant?.email || '').trim();
  return fallback ? fallback.charAt(0).toUpperCase() : '?';
}

function getParticipantAccent(member, index) {
  const palette = [
    'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    'linear-gradient(135deg, #0f766e 0%, #2dd4bf 100%)',
    'linear-gradient(135deg, #ea580c 0%, #fb923c 100%)',
    'linear-gradient(135deg, #be185d 0%, #f472b6 100%)',
  ];
  return palette[index % palette.length];
}

function normalizeParticipant(participant) {
  if (!participant || typeof participant !== 'object') return participant;
  const firstName = getParticipantFirstName(participant);
  const lastName = getParticipantLastName(participant);
  return {
    ...participant,
    first_name: firstName,
    last_name: lastName,
  };
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function formatPaywallMessage(payload, fallbackMessage) {
  const baseMessage = String(payload?.error || fallbackMessage || '').trim();
  if (payload?.code !== 'PLAN_LIMIT_REACHED') {
    return baseMessage;
  }

  const conversionHint = String(payload?.details?.conversion?.title || '').trim();
  const ctaPath = String(payload?.details?.conversion?.cta_path || '').trim() || '/pricing';

  if (!conversionHint) {
    return `${baseMessage} Consultez ${ctaPath} pour activer Pro.`;
  }

  return `${baseMessage} ${conversionHint} (${ctaPath}).`;
}

function formatSessionDate(value, locale = 'en') {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function getSessionModalityLabel(value, isEn) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'remote') return isEn ? 'Remote' : 'À distance';
  if (normalized === 'hybrid') return isEn ? 'Hybrid' : 'Hybride';
  if (normalized === 'in-person' || normalized === 'in_person') return isEn ? 'In person' : 'Présentiel';
  return normalized;
}

function getSessionDurationLabel(session, isEn) {
  const raw = session?.duration_minutes ?? session?.durationMinutes ?? session?.duration;
  const duration = Number(raw);
  if (!Number.isFinite(duration) || duration <= 0) return '';
  return isEn ? `${duration} min` : `${duration} min`;
}

function getSessionFormatLabel(session) {
  return String(session?.format || session?.session_format || '').trim();
}

function getSessionIdentifier(session) {
  const raw = session?.id ?? session?.session_id ?? session?.sessionId;
  const normalized = String(raw ?? '').trim();
  if (!normalized || normalized === 'undefined' || normalized === 'null') return '';
  return normalized;
}

function useManagerGuard() {
  const [state, setState] = useState({ loading: true, allowed: false, user: null, token: '' });

  useEffect(() => {
    let cancelled = false;

    const rawUser = sessionStorage.getItem('currentUser');
    const user = rawUser ? JSON.parse(rawUser) : null;

    if (!user) {
      window.location.replace('/login');
      return;
    }

    if (user.role === 'participant') {
      window.location.replace('/participant');
      return;
    }

    setState({ loading: false, allowed: true, user, token: '' });

    // Refresh profile from backend to expose first_name/last_name in nav even if session storage is stale.
    fetch(getApiUrl('/users/me'), {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json().catch(() => null);
      })
      .then((me) => {
        if (!me || cancelled) return;
        const mergedUser = {
          ...user,
          ...me,
          first_name: String(me.first_name || user.first_name || user.firstName || '').trim(),
          last_name: String(me.last_name || user.last_name || user.lastName || '').trim(),
        };
        sessionStorage.setItem('currentUser', JSON.stringify(mergedUser));
        setState((prev) => ({ ...prev, user: mergedUser }));
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

async function fetchSessions(query = {}) {
  try {
    const data = await fetchSessionsWithRetry(undefined, query);
    const items = Array.isArray(data)
      ? data
      : (data.items || data.sessions || data.data || []);
    const fallbackTotal = Array.isArray(items) ? items.length : 0;
    const pagination = data?.pagination && typeof data.pagination === 'object'
      ? data.pagination
      : {
        total: fallbackTotal,
        page: Number(query.page || 1),
        limit: Number(query.limit || 12),
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
    return {
      items: Array.isArray(items) ? items : [],
      pagination,
    };
  } catch (err) {
    const wrapped = new Error(err.message || 'Sessions API error');
    wrapped.status = err?.status;
    wrapped.code = err?.code;
    throw wrapped;
  }
}

function getStartupGuideSteps(isEn) {
  return Object.freeze([
    {
      step: '1',
      title: isEn ? 'Add your team' : 'Ajoutez votre équipe',
      text: isEn
        ? 'Add the people who will take part in your workshops.'
        : 'Ajoutez les personnes qui participeront à vos ateliers.',
      href: '/home#home-participants-block',
      cta: isEn ? 'Add participants' : 'Ajouter des participants',
    },
    {
      step: '2',
      title: isEn ? 'Create a session' : 'Créez une session',
      text: isEn
        ? 'Choose a challenge, add participants, and set the format.'
        : 'Choisissez un challenge, ajoutez des participants et définissez le format.',
      href: '/session-builder',
      cta: isEn ? 'Create a session' : 'Créer une session',
    },
    {
      step: '3',
      title: isEn ? 'Launch and debrief' : 'Lancez et débriefez',
      text: isEn
        ? 'Open your session to facilitate it, then review its results.'
        : 'Ouvrez votre session pour l’animer, puis consultez ses résultats.',
      href: '/home#home-sessions-block',
      cta: isEn ? 'View sessions' : 'Voir mes sessions',
    }
  ]);
}

function MobileActionMenu({ triggerLabel, menuLabel, items, closeSignal }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const menuRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerOutside(event) {
      if (!menuRef.current) return;
      const path = typeof event.composedPath === 'function' ? event.composedPath() : null;
      if (Array.isArray(path) && path.includes(menuRef.current)) return;
      if (!menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerOutside, true);
    document.addEventListener('touchstart', handlePointerOutside, true);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerOutside, true);
      document.removeEventListener('touchstart', handlePointerOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [closeSignal]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const triggerEl = menuRef.current;
    const dropdownEl = dropdownRef.current;
    if (!triggerEl || !dropdownEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const dropdownRect = dropdownEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight || 0;
    const safetyGap = 12;
    const neededHeight = dropdownRect.height + safetyGap;
    const availableBelow = viewportHeight - triggerRect.bottom;
    const availableAbove = triggerRect.top;

    setOpenUpward(availableBelow < neededHeight && availableAbove > availableBelow);
  }, [isOpen, items.length]);

  function handleAction(item) {
    setIsOpen(false);
    if (typeof item.onClick === 'function') {
      item.onClick();
    }
  }

  return (
    <div className="manager-mobile-menu" ref={menuRef}>
      <button
        type="button"
        className={`icon-action-btn icon-action-btn--mobile-friendly manager-mobile-menu__trigger${isOpen ? ' is-open' : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={triggerLabel}
        onClick={() => setIsOpen((current) => !current)}
      >
        ⋮
      </button>

      {isOpen ? (
        <div
          ref={dropdownRef}
          className={`manager-mobile-menu__dropdown${openUpward ? ' is-dropup' : ''}`}
          role="menu"
          aria-label={menuLabel}
        >
          {items.map((item) => {
            const itemClassName = `manager-mobile-menu__item${item.danger ? ' manager-mobile-menu__item--danger' : ''}`;
            if (item.href) {
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={itemClassName}
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                className={itemClassName}
                role="menuitem"
                onClick={() => handleAction(item)}
                disabled={item.disabled}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function ManagerHome() {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  const startupGuideSteps = useMemo(() => getStartupGuideSteps(isEn), [isEn]);
  const [isStartupGuideOpen, setIsStartupGuideOpen] = useState(false);
  const guard = useManagerGuard();
  const { toasts, removeToast, error: showErrorToast, loading: showLoadingToast, success: showSuccessToast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [members, setMembers] = useState([]);
  const [showSessionPeriod, setShowSessionPeriod] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [deletingMemberId, setDeletingMemberId] = useState(null);
  const [creatingMember, setCreatingMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [sessionStatusFilter, setSessionStatusFilter] = useState('all');
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionFromDate, setSessionFromDate] = useState('');
  const [sessionToDate, setSessionToDate] = useState('');
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsPagination, setSessionsPagination] = useState({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [formAttempted, setFormAttempted] = useState(false);
  const [memberFormStatus, setMemberFormStatus] = useState('');
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [authInvalid, setAuthInvalid] = useState(false);
  const [mobileMenuSignal, setMobileMenuSignal] = useState(0);
  const [lastCreatedCredentials, setLastCreatedCredentials] = useState(null);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [passwordResetMessage, setPasswordResetMessage] = useState('');
  const onboardingHandledRef = useRef(false);
  const sessionsToastShownRef = useRef(false);
  const [memberForm, setMemberForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    job_title: '',
    department: '',
  });

  const userLabel = useMemo(() => pickDisplayName(guard.user), [guard.user]);

  const STATUS_LABEL = {
    en_cours: isEn ? 'In progress' : 'En cours',
    preparee: isEn ? 'Upcoming' : 'À venir',
    terminee: isEn ? 'Completed' : 'Terminée',
  };

  const sessionStats = useMemo(() => ({
    enCours: sessions.filter((s) => s.status === 'en_cours').length,
    preparee: sessions.filter((s) => s.status === 'preparee').length,
    terminee: sessions.filter((s) => s.status === 'terminee').length,
  }), [sessions]);

  const visibleSessions = useMemo(() => sessions, [sessions]);
  const hasActiveSessionFilters = useMemo(() => (
    sessionStatusFilter !== 'all'
    || sessionSearch.trim().length > 0
    || Boolean(sessionFromDate)
    || Boolean(sessionToDate)
  ), [sessionFromDate, sessionSearch, sessionStatusFilter, sessionToDate]);

  const memberFormChecks = useMemo(() => {
    const firstName = String(memberForm.first_name || '').trim();
    const email = String(memberForm.email || '').trim();
    return {
      firstNameOk: firstName.length > 0,
      emailOk: isValidEmail(email),
    };
  }, [memberForm, editingMemberId]);

  const canSubmitMember = memberFormChecks.firstNameOk
    && memberFormChecks.emailOk
    && !creatingMember
    && !sendingPasswordReset;

  const editingMember = members.find((member) => String(member.id) === String(editingMemberId));
  const isParticipantModalOpen = showParticipantForm || Boolean(editingMemberId);
  const asyncStatusMessage = creatingMember
    ? (editingMemberId
      ? (isEn ? 'Updating participant...' : 'Mise à jour du participant...')
      : (isEn ? 'Creating participant...' : 'Création du participant...'))
    : deletingMemberId
      ? (isEn ? 'Deleting participant...' : 'Suppression du participant...')
      : deletingSessionId
        ? (isEn ? 'Deleting session...' : 'Suppression de la session...')
        : loadingSessions
          ? (isEn ? 'Loading sessions...' : 'Chargement des sessions...')
          : loadingMembers
            ? (isEn ? 'Loading participants...' : 'Chargement des participants...')
            : '';

  function handleCreateSessionClick(event) {
              trackGaEvent('cta_click', {
                cta_name: 'manager_create_session',
                cta_label: 'Create session',
                cta_destination: '/session-builder',
                page_location: typeof window !== 'undefined' ? window.location.href : undefined,
              });
              trackProductSessionEvent('create_requested', {
                surface: 'manager_home',
              });
  }

  function clearSessionFilters() {
    setSessionSearch('');
    setSessionStatusFilter('all');
    setSessionFromDate('');
    setSessionToDate('');
  }

  function handleUnauthorizedAuth(message = isEn ? 'Session expired. Please sign in again.' : 'Session expirée. Veuillez vous reconnecter.') {
    if (authInvalid) return;
    setAuthInvalid(true);
    showErrorToast(message);
    clearStoredAuth();
    window.location.replace(withLocalePath('/login?reason=session_expired'));
  }

  const refreshSessions = useCallback(async ({ withToast = false } = {}) => {
    if (!guard.allowed || authInvalid) return;

    let loadingId = null;
    setLoadingSessions(true);
    if (withToast) {
      loadingId = showLoadingToast(isEn ? 'Loading sessions...' : 'Chargement des sessions...');
    }

    try {
      const query = {
        page: sessionsPage,
        limit: 12,
        status: sessionStatusFilter === 'all' ? '' : sessionStatusFilter,
        q: sessionSearch.trim(),
        from: sessionFromDate,
        to: sessionToDate,
      };
      const data = await fetchSessions(query);
      setSessions(data.items);
      setSessionsPagination(data.pagination);
      if (loadingId) {
        removeToast(loadingId);
      }
    } catch (err) {
      if (loadingId) {
        removeToast(loadingId);
      }
      if (Number(err?.status) === 401) {
        handleUnauthorizedAuth();
        return;
      }
      showErrorToast(err.message || (isEn ? 'Unable to load sessions.' : 'Impossible de charger les sessions.'));
    } finally {
      setLoadingSessions(false);
    }
  }, [
    authInvalid,
    guard.allowed,
    isEn,
    removeToast,
    sessionFromDate,
    sessionSearch,
    sessionStatusFilter,
    sessionToDate,
    sessionsPage,
    showErrorToast,
    showLoadingToast,
  ]);

  const refreshMembers = useCallback(async () => {
    if (!guard.allowed || authInvalid) return;

    setLoadingMembers(true);
    try {
      const response = await fetch(getApiUrl('/participants'), {
        cache: 'no-store',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      const text = await response.text();
      let payload = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        payload = {};
      }

      if (!response.ok) {
        const error = new Error(payload.error || `Participants API error (${response.status})`);
        error.status = response.status;
        throw error;
      }

      const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.items)
          ? payload.items
          : Array.isArray(payload.data)
            ? payload.data
            : [];

      setMembers(items.map(normalizeParticipant));
    } catch (err) {
      if (Number(err?.status) === 401) {
        handleUnauthorizedAuth();
        return;
      }
      showErrorToast(err.message || (isEn ? 'Unable to load participants.' : 'Impossible de charger les participants.'));
    } finally {
      setLoadingMembers(false);
    }
  }, [authInvalid, guard.allowed, isEn, showErrorToast]);



  useEffect(() => {
    const withToast = !sessionsToastShownRef.current;
    sessionsToastShownRef.current = true;
    refreshSessions({ withToast });
  }, [refreshSessions]);

  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  useEffect(() => {
    setSessionsPage(1);
  }, [sessionStatusFilter, sessionSearch, sessionFromDate, sessionToDate]);

  useEffect(() => {
    setMobileMenuSignal((current) => current + 1);
  }, [deletingMemberId, deletingSessionId, sessionsPage]);

  useEffect(() => {
    if (!guard.allowed) return;
    if (loadingMembers) return;
    if (onboardingHandledRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const onboarding = String(params.get('onboarding') || '').trim().toLowerCase();
    if (onboarding !== 'participants') return;

    onboardingHandledRef.current = true;

    const section = document.getElementById('home-participants-block');
    if (section && typeof section.scrollIntoView === 'function') {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (members.length === 0) {
      setFormAttempted(false);
      setEditingMemberId(null);
      setShowParticipantForm(true);
      setMemberFormStatus(isEn
        ? 'Add your first participant to create sessions faster.'
        : 'Ajoutez votre premier participant pour créer des sessions plus rapidement.');
    }

    params.delete('onboarding');
    params.delete('reason');
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [guard.allowed, loadingMembers, members.length]);

  useEffect(() => {
    if (!guard.allowed || !guard.user?.id) return;
    const storageKey = `manager-home-startup-guide-seen:${guard.user.id}`;
    const alreadySeen = String(localStorage.getItem(storageKey) || '').trim() === '1';
    if (alreadySeen) {
      return;
    }

    localStorage.setItem(storageKey, '1');
    setIsStartupGuideOpen(true);
  }, [guard.allowed, guard.user?.id]);

  function openStartupGuide() {
    setIsStartupGuideOpen(true);
  }

  function closeStartupGuide() {
    setIsStartupGuideOpen(false);
  }

  function logout() {
    clearStoredAuth();
    window.location.replace(withLocalePath('/login'));
  }

  async function handleDeleteSession(session) {
    const sessionIdentifier = getSessionIdentifier(session);
    if (!sessionIdentifier) return;
    const label = session.name || `Session #${sessionIdentifier}`;
    const accepted = window.confirm(isEn
      ? `Delete ${label}? This action is irreversible.`
      : `Supprimer ${label} ? Cette action est irréversible.`);
    if (!accepted) return;

    setDeletingSessionId(sessionIdentifier);
    try {
      const response = await fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionIdentifier)}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Error ${response.status}`);
      }
      await refreshSessions();
      showSuccessToast(isEn ? 'Session deleted.' : 'Session supprimée.');
    } catch (err) {
      showErrorToast(err.message || (isEn ? 'Delete failed.' : 'La suppression a échoué.'));
    } finally {
      setDeletingSessionId(null);
    }
  }

  function beginEditMember(member) {
    setPasswordResetMessage('');
    setFormAttempted(false);
    setMemberFormStatus('');
    setShowParticipantForm(true);
    setEditingMemberId(member.id);
    setMemberForm({
      first_name: getParticipantFirstName(member),
      last_name: getParticipantLastName(member),
      email: String(member.email || '').trim(),
      password: '',
      job_title: String(member.job_title || '').trim(),
      department: String(member.department || '').trim(),
    });
  }

  function openNewMemberForm() {
    setFormAttempted(false);
    setMemberFormStatus('');
    setShowParticipantForm(true);
    setEditingMemberId(null);
    setLastCreatedCredentials(null);
    setMemberForm({
      first_name: '',
      last_name: '',
      email: '',
      job_title: '',
      department: '',
    });
  }

  function resetMemberForm() {
    setPasswordResetMessage('');
    setFormAttempted(false);
    setMemberFormStatus('');
    setShowParticipantForm(false);
    setEditingMemberId(null);
    setLastCreatedCredentials(null);
    setMemberForm({ first_name: '', last_name: '', email: '', job_title: '', department: '' });
  }

  function closeParticipantModal() {
    if (creatingMember || sendingPasswordReset) return;
    resetMemberForm();
  }

  async function handleSendPasswordReset() {
    if (!editingMember?.email || sendingPasswordReset || creatingMember) return;
    setSendingPasswordReset(true);
    setPasswordResetMessage('');
    setMemberFormStatus('');
    try {
      const response = await fetch(getApiUrl(`/participants/${encodeURIComponent(editingMember.id)}/password-reset-email`), {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const payload = await response.json();
      if (response.status === 401) {
        handleUnauthorizedAuth();
        return;
      }
      if (!response.ok || payload.success !== true) {
        throw new Error(payload.error || (isEn ? 'Unable to send the password reset link.' : 'Impossible d’envoyer le lien de réinitialisation.'));
      }
      setPasswordResetMessage(isEn
        ? `Password reset link sent to ${payload.email}.`
        : `Lien de réinitialisation du mot de passe envoyé à ${payload.email}.`);
    } catch (err) {
      const message = err.message || (isEn ? 'Unable to send the password reset link.' : 'Impossible d’envoyer le lien de réinitialisation.');
      setMemberFormStatus(message);
      showErrorToast(message);
    } finally {
      setSendingPasswordReset(false);
    }
  }

  async function handleSubmitMember(event) {
    event.preventDefault();
    setFormAttempted(true);
    setMemberFormStatus('');
    if (!guard.user?.id || creatingMember || sendingPasswordReset) return;

    const firstName = String(memberForm.first_name || '').trim();
    const lastName = String(memberForm.last_name || '').trim();
    const email = String(memberForm.email || '').trim().toLowerCase();
    const jobTitle = String(memberForm.job_title || '').trim();
    const department = String(memberForm.department || '').trim();

    if (!firstName || !email) {
      const message = isEn ? 'First name and email are required.' : 'Le prénom et l’adresse e-mail sont requis.';
      setMemberFormStatus(message);
      showErrorToast(message);
      return;
    }

    if (email && !isValidEmail(email)) {
      const message = isEn ? 'A valid email address is required.' : 'Une adresse e-mail valide est requise.';
      setMemberFormStatus(message);
      showErrorToast(message);
      return;
    }

    const hasDuplicateEmail = members.some((member) => (
      String(member?.id || '') !== String(editingMemberId || '')
      && email
      && String(member?.email || '').trim().toLowerCase() === email
    ));

    if (hasDuplicateEmail) {
      const message = isEn
        ? 'This email is already used by another participant.'
        : 'Cette adresse e-mail est déjà utilisée par un autre participant.';
      setMemberFormStatus(message);
      showErrorToast(message);
      return;
    }

    setCreatingMember(true);
    try {
      const targetUrl = editingMemberId
        ? getApiUrl(`/participants/${encodeURIComponent(editingMemberId)}`)
        : getApiUrl(`/users/${encodeURIComponent(guard.user.id)}/participants`);
      const method = editingMemberId ? 'PATCH' : 'POST';
      const body = {
        first_name: firstName,
        last_name: lastName || null,
        email: email || null,
        job_title: jobTitle || null,
        department: department || null,
      };

      const response = await fetch(targetUrl, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const text = await response.text();
      let payload = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        payload = {};
      }

      if (!response.ok) {
        throw new Error(
          formatPaywallMessage(
            payload,
            isEn
              ? `${editingMemberId ? 'Participant update' : 'Participant creation'} failed (${response.status})`
              : `${editingMemberId ? 'Échec de la mise à jour du participant' : 'Échec de la création du participant'} (${response.status})`
          )
        );
      }

      if (editingMemberId) {
        setMembers((prev) => prev.map((member) => (
          String(member?.id) === String(editingMemberId)
            ? normalizeParticipant({
              ...member,
              ...payload,
              id: member.id,
              email: payload?.email || email,
              first_name: payload?.first_name ?? firstName,
              firstname: payload?.firstname ?? payload?.first_name ?? firstName,
              last_name: payload?.last_name ?? (lastName || ''),
              lastname: payload?.lastname ?? payload?.last_name ?? (lastName || ''),
              job_title: payload?.job_title ?? (jobTitle || null),
              department: payload?.department ?? (department || null),
            })
            : member
        )));
      }

      if (!editingMemberId) {
        setLastCreatedCredentials({
          loginIdentifier: String(payload?.login_identifier || '').trim(),
          deliveredEmail: String(payload?.email || '').trim(),
        });
      }

      if (editingMemberId) {
        showSuccessToast(isEn ? 'Participant updated successfully.' : 'Participant mis à jour avec succès.');
        setShowParticipantForm(false);
        resetMemberForm();
      } else {
        setEditingMemberId(null);
        setShowParticipantForm(false);
        setFormAttempted(false);
        setMemberFormStatus('');
        setMemberForm({ first_name: '', last_name: '', email: '', job_title: '', department: '' });
      }

      await refreshMembers();
    } catch (err) {
      const message = err.message || (isEn
        ? `Unable to ${editingMemberId ? 'update' : 'create'} participant.`
        : `Impossible de ${editingMemberId ? 'mettre à jour' : 'créer'} le participant.`);
      setMemberFormStatus(message);
      showErrorToast(message);
    } finally {
      setCreatingMember(false);
    }
  }

  async function handleDeleteMember(member) {
    if (!member?.id || deletingMemberId) return;

    const label = member.email || `${getParticipantFirstName(member)} ${getParticipantLastName(member)}`.trim() || `Participant #${member.id}`;

    let hasParticipations = false;
    try {
      const summaryResponse = await fetch(getApiUrl(`/participants/${encodeURIComponent(member.id)}/participation-summary`), {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (summaryResponse.ok) {
        const summary = await summaryResponse.json();
        hasParticipations = Boolean(summary?.has_participations);
      }
    } catch {
      hasParticipations = false;
    }

    const participationWarning = isEn
      ? `This participant has already taken part in challenges.\nTheir record will be permanently deleted.\nTheir name will remain visible in historical reports to preserve the consistency of results.\nThis action is irreversible.`
      : `Ce participant a déjà participé à des défis.\nSa fiche sera supprimée définitivement.\nSon nom restera visible dans les rapports historiques afin de préserver la cohérence des résultats.\nCette action est irréversible.`;

    const accepted = window.confirm(hasParticipations
      ? `${label}\n\n${participationWarning}`
      : (isEn
        ? `Delete ${label}? This action is irreversible.`
        : `Supprimer ${label} ? Cette action est irréversible.`));
    if (!accepted) return;

    setDeletingMemberId(member.id);
    try {
      const response = await fetch(getApiUrl(`/participants/${encodeURIComponent(member.id)}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok && response.status !== 404) {
        const text = await response.text();
        let parsedError = '';
        try {
          parsedError = text ? JSON.parse(text)?.error || '' : '';
        } catch {
          parsedError = '';
        }
        throw new Error(parsedError || `Unable to delete participant (${response.status})`);
      }
      await refreshMembers();
      showSuccessToast(isEn ? 'Participant deleted.' : 'Participant supprimé.');
    } catch (err) {
      showErrorToast(err.message || (isEn ? 'Unable to delete participant.' : 'Impossible de supprimer le participant.'));
    } finally {
      setDeletingMemberId(null);
    }
  }

  if (guard.loading) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>{isEn ? 'Checking session...' : 'Vérification de la session...'}</h1>
          <p>{isEn ? 'Loading...' : 'Chargement...'}</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AppNav userLabel={userLabel} onLogout={logout} role={guard.user?.role} />
      <main className={`shell app-home manager-home ${homeStyles.home}`}>
        {asyncStatusMessage ? (
          <p className="ui-async-status" role="status" aria-live="polite">{asyncStatusMessage}</p>
        ) : null}
        <section className="hero home-hero">
          <div className="home-hero-grid">
            <div className="home-hero-copy">
              <p className="eyebrow">{isEn ? 'MANAGER SPACE' : 'ESPACE MANAGER'}</p>
              <h1 className="home-hero-greeting">{isEn ? `Hello ${userLabel}` : `Bonjour ${userLabel}`}</h1>
              <p>{isEn
                ? 'Plan, launch, and analyze your gamified team workshops in one clear, actionable workspace.'
                : 'Planifiez, lancez et analysez vos ateliers gamifiés dans un espace clair et actionnable.'}</p>
              <div className="hero-actions home-hero-actions">
                {guard.user?.role === 'admin' && (
                  <Link className="btn-secondary" href={withLocalePath('/admin')}>
                    {isEn ? 'Admin console' : 'Console admin'}
                  </Link>
                )}
              </div>
            </div>

            <aside className="home-hero-summary" aria-label={isEn ? 'Manager summary' : 'Résumé manager'}>
              <p className="home-hero-summary__eyebrow">{isEn ? 'Quick view' : 'Vue rapide'}</p>
              <strong className="home-hero-summary__title">
                {isEn ? 'A simple cockpit to run your sessions.' : 'Un cockpit simple pour piloter vos sessions.'}
              </strong>
              <button
                type="button"
                className="btn-secondary home-quickview-guide-cta"
                onClick={openStartupGuide}
              >
                {isEn ? 'Open getting started guide' : 'Ouvrir le guide de démarrage'}
              </button>
            </aside>
          </div>
        </section>
        <section className="cards-grid" aria-label={isEn ? 'Session statistics' : 'Statistiques des sessions'}>
          <article className="feature-card stat-card stat-card-live">
            <h2 className="stat-value">{loadingSessions ? '…' : sessionStats.enCours}</h2>
            <p>{isEn ? 'Active sessions' : 'Sessions actives'}</p>
          </article>
          <article className="feature-card stat-card stat-card-ready">
            <h2 className="stat-value">{loadingSessions ? '…' : sessionStats.preparee}</h2>
            <p>{isEn ? 'To configure' : 'À configurer'}</p>
          </article>
          <article className="feature-card stat-card stat-card-done">
            <h2 className="stat-value">{loadingSessions ? '…' : sessionStats.terminee}</h2>
            <p>{isEn ? 'Completed' : 'Terminées'}</p>
          </article>
        </section>

        <section id="home-sessions-block" className="sessions-panel home-sessions-panel home-anchor-target">
          <div className="panel-head home-sessions-head">
            <div>
              <h2 className="home-section-title">{isEn ? 'Sessions' : 'Sessions'}</h2>
              <p>{isEn ? 'Track preparing, active, and completed sessions from one panel.' : 'Suivez les sessions en préparation, actives et terminées depuis un seul panneau.'}</p>
            </div>
            <Link
              className="btn-primary"
              href={withLocalePath('/session-builder')}
              onClick={handleCreateSessionClick}
              title={isEn ? 'Create session' : 'Créer une session'}
            >
              {isEn ? 'Create session' : 'Créer une session'}
            </Link>
          </div>

          <div className="home-sessions-controls">
            <div className="home-sessions-filters">
              <label className="home-sessions-field">
                <span className="home-sessions-field-label">{isEn ? 'Search' : 'Recherche'}</span>
                <input
                  type="search"
                  className="home-sessions-control"
                  value={sessionSearch}
                  onChange={(event) => setSessionSearch(event.target.value)}
                  placeholder={isEn ? 'Search by session name…' : 'Rechercher par nom de session…'}
                  aria-label={isEn ? 'Search sessions' : 'Rechercher des sessions'}
                />
              </label>
              <label className="home-sessions-field">
                <span className="home-sessions-field-label">{isEn ? 'Status' : 'Statut'}</span>
                <select
                  className="home-sessions-control"
                  value={sessionStatusFilter}
                  onChange={(event) => setSessionStatusFilter(event.target.value)}
                  aria-label={isEn ? 'Filter by status' : 'Filtrer par statut'}
                >
                  <option value="all">{isEn ? 'All statuses' : 'Tous les statuts'}</option>
                  <option value="preparee">{isEn ? 'Preparing' : 'En préparation'}</option>
                  <option value="en_cours">{isEn ? 'In progress' : 'En cours'}</option>
                  <option value="terminee">{isEn ? 'Completed' : 'Terminée'}</option>
                </select>
              </label>
              <div className="home-sessions-field">
                <span className="home-sessions-field-label">{isEn ? 'Dates' : 'Dates'}</span>
                <button
                  type="button"
                  className="home-sessions-control home-sessions-period-toggle"
                  aria-expanded={showSessionPeriod}
                  aria-controls="home-sessions-period"
                  onClick={() => setShowSessionPeriod((open) => !open)}
                >
                  <span>
                    {isEn ? 'Period' : 'Période'}
                    {sessionFromDate || sessionToDate ? (
                      <small>
                        {sessionFromDate
                          ? new Date(`${sessionFromDate}T12:00:00`).toLocaleDateString(locale)
                          : isEn
                            ? 'Any start'
                            : 'Début libre'}
                        {' – '}
                        {sessionToDate
                          ? new Date(`${sessionToDate}T12:00:00`).toLocaleDateString(locale)
                          : isEn
                            ? 'Any end'
                            : 'Fin libre'}
                      </small>
                    ) : null}
                  </span>
                  <span aria-hidden="true">{showSessionPeriod ? '−' : '+'}</span>
                </button>
              </div>
            </div>
            <div
              id="home-sessions-period"
              className="home-sessions-date-filters"
              hidden={!showSessionPeriod}
            >
              <label className="home-sessions-field">
                <span className="home-sessions-field-label">{isEn ? 'From' : 'Du'}</span>
                <input
                  type="date"
                  className="home-sessions-control"
                  value={sessionFromDate}
                  onChange={(event) => setSessionFromDate(event.target.value)}
                  aria-label={isEn ? 'From date' : 'Date de début'}
                />
              </label>
              <label className="home-sessions-field">
                <span className="home-sessions-field-label">{isEn ? 'To' : 'Au'}</span>
                <input
                  type="date"
                  className="home-sessions-control"
                  value={sessionToDate}
                  onChange={(event) => setSessionToDate(event.target.value)}
                  aria-label={isEn ? 'To date' : 'Date de fin'}
                />
              </label>
            </div>
            <div className="home-sessions-controls-head">
              <p className="session-meta home-sessions-meta">
                {isEn
                  ? `Showing ${sessions.length} session(s) out of ${Number(sessionsPagination.total || 0)}`
                  : `${sessions.length} session(s) affichée(s) sur ${Number(sessionsPagination.total || 0)}`}
              </p>
              {hasActiveSessionFilters ? (
                <button type="button" className="home-sessions-clear" onClick={clearSessionFilters}>
                  {isEn ? 'Reset filters' : 'Réinitialiser les filtres'}
                </button>
              ) : null}
            </div>
          </div>

          {loadingSessions ? (
            <div className="session-skeletons">
              {[...Array(3)].map((_, i) => (
                <SessionCardSkeleton key={i} />
              ))}
            </div>
          ) : null}

          {!loadingSessions && sessions.length === 0 ? (
            <p className="team-empty">{isEn ? 'No sessions found yet.' : 'Aucune session pour le moment.'}</p>
          ) : null}

          {!loadingSessions && sessions.length > 0 ? (
            <div className="session-cards-grid">
              {visibleSessions.map((session) => {
                const sessionIdentifier = getSessionIdentifier(session);
                if (!sessionIdentifier) return null;
                const isDeleting = String(deletingSessionId) === sessionIdentifier;
                const isActive = session.status === 'en_cours';
                const isDone = session.status === 'terminee';
                const statusVariant = isActive ? 'en-cours' : isDone ? 'terminee' : 'a-venir';
                const statusClass = `status-pill--${statusVariant}`;
                const modalityLabel = getSessionModalityLabel(session.modality, isEn);
                const formatLabel = getSessionFormatLabel(session);
                const durationLabel = getSessionDurationLabel(session, isEn);
                const openLink = isDone
                  ? withLocalePath(`/session-results/${sessionIdentifier}`)
                  : isActive
                    ? withLocalePath(`/session-live/${sessionIdentifier}`)
                    : withLocalePath(`/session-builder?sessionId=${sessionIdentifier}`);
                const editLink = withLocalePath(`/session-builder?sessionId=${sessionIdentifier}`);
                const mobileSessionActions = [
                  {
                    key: 'edit',
                    label: isEn ? 'Edit session' : 'Modifier la session',
                    href: editLink,
                  },
                  {
                    key: 'open',
                    label: isDone
                      ? isEn
                        ? 'View results'
                        : 'Voir les résultats'
                      : isActive
                        ? isEn
                          ? 'Open session'
                          : 'Ouvrir la session'
                        : isEn
                          ? 'Configure session'
                          : 'Configurer la session',
                    href: openLink,
                  },
                  {
                    key: 'delete',
                    label: isEn ? 'Delete session' : 'Supprimer la session',
                    danger: true,
                    onClick: () => handleDeleteSession(session),
                    disabled: isDeleting,
                  },
                ];
                return (
                  <article
                    key={sessionIdentifier}
                    className={`feature-card session-card session-card--${statusVariant} ${isDeleting ? 'session-card--deleting' : ''}`}
                  >
                    <div className="session-card-body">
                      <p className="session-title">{session.name || `Session #${sessionIdentifier}`}</p>
                      <p className="session-meta">
                        <span className={`status-pill ${statusClass}`}>
                          {STATUS_LABEL[session.status] || session.status || (isEn ? 'Preparing' : 'En préparation')}
                        </span>
                        {session.session_date ? (
                          <span className="session-date">{formatSessionDate(session.session_date, locale)}</span>
                        ) : null}
                      </p>
                      <div className="session-tags" aria-label={isEn ? 'Session metadata' : 'Metadonnees de session'}>
                        {modalityLabel ? (
                          <span className="session-tag session-tag--modality">{modalityLabel}</span>
                        ) : null}
                        {formatLabel ? (
                          <span className="session-tag session-tag--format">{formatLabel}</span>
                        ) : null}
                        {durationLabel ? (
                          <span className="session-tag session-tag--duration">{durationLabel}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="session-card-mobile-actions session-card-mobile-actions--top">
                      <MobileActionMenu
                        triggerLabel={isEn ? 'Open session actions' : 'Ouvrir les actions session'}
                        menuLabel={isEn ? 'Session actions' : 'Actions session'}
                        items={mobileSessionActions}
                        closeSignal={mobileMenuSignal}
                      />
                    </div>
                    <div className="session-card-actions">
                      <Link
                        className="icon-action-btn"
                        href={editLink}
                        title={isEn ? 'Edit' : 'Modifier'}
                        aria-label={isEn ? 'Edit session' : 'Modifier la session'}
                      >
                        ✏️
                      </Link>
                      <Link
                        className="icon-action-btn"
                        href={openLink}
                        title={
                          isDone
                            ? isEn
                              ? 'View results'
                              : 'Voir les résultats'
                            : isActive
                              ? isEn
                                ? 'Open session'
                                : 'Ouvrir la session'
                              : isEn
                                ? 'Configure'
                                : 'Configurer'
                        }
                        aria-label={
                          isDone
                            ? isEn
                              ? 'View results'
                              : 'Voir les résultats'
                            : isActive
                              ? isEn
                                ? 'Open session'
                                : 'Ouvrir la session'
                              : isEn
                                ? 'Configure'
                                : 'Configurer'
                        }
                      >
                        {isDone ? '📊' : isActive ? '▶️' : '⚙️'}
                      </Link>
                      <button
                        type="button"
                        className="icon-action-btn icon-action-danger"
                        title={isEn ? 'Delete' : 'Supprimer'}
                        aria-label={isEn ? 'Delete session' : 'Supprimer la session'}
                        onClick={() => handleDeleteSession(session)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? '…' : '🗑️'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {!loadingSessions && Number(sessionsPagination.totalPages) > 1 ? (
            <nav
              className="home-sessions-pagination"
              aria-label={isEn ? 'Session pages' : 'Pages des sessions'}
            >
              <button
                type="button"
                className="btn-secondary"
                disabled={!sessionsPagination.hasPrevPage}
                onClick={() => setSessionsPage((prev) => Math.max(1, prev - 1))}
              >
                {isEn ? 'Previous' : 'Précédent'}
              </button>
              <span className="session-meta">
                {isEn ? 'Page' : 'Page'} {Number(sessionsPagination.page || sessionsPage)} /{' '}
                {Number(sessionsPagination.totalPages || 1)}
              </span>
              <button
                type="button"
                className="btn-secondary"
                disabled={!sessionsPagination.hasNextPage}
                onClick={() => setSessionsPage((prev) => prev + 1)}
              >
                {isEn ? 'Next' : 'Suivant'}
              </button>
            </nav>
          ) : null}
        </section>

        <section id="home-participants-block" className="participants-panel home-anchor-target" aria-label={isEn ? 'Team participants' : 'Participants de l’équipe'}>
          <div className="participants-panel-head">
            <div>
              <h2 className="home-section-title">{isEn ? 'Participants' : 'Participants'}</h2>
            </div>
            <div className="participants-panel-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={openNewMemberForm}
              >
                {isEn ? 'Create participant' : 'Créer un participant'}
              </button>
            </div>
          </div>

          <div className="participants-panel-kpis" aria-label={isEn ? 'Participant summary' : 'Résumé des participants'}>
            <span>
              {isEn
                ? `${members.length} participant${members.length > 1 ? 's' : ''} total`
                : `${members.length} participant${members.length > 1 ? 's' : ''} au total`}
            </span>
          </div>

          {loadingMembers ? (
            <p>{isEn ? 'Loading participants...' : 'Chargement des participants...'}</p>
          ) : null}

          {!loadingMembers && members.length === 0 ? (
            <p className="team-empty">{isEn ? 'No participants yet. You can add them here when you want to reuse them across sessions.' : 'Aucun participant pour le moment. Vous pourrez en ajouter ici pour les réutiliser dans vos sessions.'}</p>
          ) : null}

          {!loadingMembers && members.length > 0 ? (
            <div className="participants-card-grid">
              {members.map((member, index) => {
                const title = [getParticipantFirstName(member), getParticipantLastName(member)].filter(Boolean).join(' ').trim() || `Participant #${member.id}`;
                const details = [member.job_title, member.department].filter(Boolean).join(' · ');
                const initials = getParticipantInitials(member);
                const mobileParticipantActions = [
                  {
                    key: 'edit',
                    label: isEn ? 'Edit participant' : 'Modifier le participant',
                    onClick: () => beginEditMember(member),
                    disabled: deletingMemberId === member.id,
                  },
                  {
                    key: 'delete',
                    label: isEn ? 'Delete participant' : 'Supprimer le participant',
                    danger: true,
                    onClick: () => handleDeleteMember(member),
                    disabled: deletingMemberId === member.id,
                  },
                ];
                return (
                  <article key={String(member.id)} className="participant-card">
                    <div className="participant-card__avatar" style={{ background: getParticipantAccent(member, index) }} aria-hidden="true">
                      {initials}
                    </div>
                    <div className="participant-card__content">
                      <p className="participant-card__name">{title}</p>
                      <p className="participant-card__meta">
                        {member.email || (isEn ? 'Email not provided' : 'E-mail non renseigné')}
                        {details ? ` · ${details}` : ''}
                      </p>
                    </div>
                    <div className="team-member-mobile-actions">
                      <MobileActionMenu
                        triggerLabel={isEn ? 'Open participant actions' : 'Ouvrir les actions participant'}
                        menuLabel={isEn ? 'Participant actions' : 'Actions participant'}
                        items={mobileParticipantActions}
                        closeSignal={mobileMenuSignal}
                      />
                    </div>
                    <div className="session-item-actions icon-only-actions team-member-actions">
                      <button
                        type="button"
                        className="icon-action-btn icon-action-btn--mobile-friendly"
                        title={isEn ? 'Edit' : 'Modifier'}
                        aria-label={isEn ? 'Edit this participant' : 'Modifier ce participant'}
                        onClick={() => beginEditMember(member)}
                        disabled={deletingMemberId === member.id}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="icon-action-btn icon-action-btn--mobile-friendly icon-action-danger"
                        title={isEn ? 'Delete' : 'Supprimer'}
                        aria-label={isEn ? 'Delete this participant' : 'Supprimer ce participant'}
                        onClick={() => handleDeleteMember(member)}
                        disabled={deletingMemberId === member.id}
                      >
                        {deletingMemberId === member.id ? '…' : '🗑️'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      </main>
      <Modal
        open={isStartupGuideOpen}
        title={isEn ? 'Getting started guide' : 'Guide de démarrage'}
        onClose={closeStartupGuide}
        hideHeader
        overlayClassName="manager-onboarding-modalOverlay"
        dialogClassName="manager-onboarding-modalDialog"
        bodyClassName="manager-onboarding-modalBody"
      >
        <section className={`manager-onboarding-panel manager-onboarding-panel--modal ${guideStyles.guidePanel}`} aria-labelledby="onboarding-guide-title">
          <div className="manager-onboarding-shell">
            <header className={`manager-onboarding-hero manager-onboarding-hero--modal ${guideStyles.guideHeader}`}>
              <div className="manager-onboarding-copy">
                <p className="eyebrow manager-onboarding-eyebrow">{isEn ? 'YOUR FIRST SESSION' : 'VOTRE PREMIÈRE SESSION'}</p>
                <h2 id="onboarding-guide-title">{isEn ? 'From your team to your first session.' : 'De votre équipe à votre première session.'}</h2>
                <p>
                  {isEn
                    ? 'Follow these three steps to get ready to run a workshop.'
                    : 'Suivez ces trois étapes pour préparer votre atelier.'}
                </p>
              </div>
              <button
                type="button"
                className={`btn-secondary manager-onboarding-close ${guideStyles.guideClose}`}
                onClick={closeStartupGuide}
                aria-label={isEn ? 'Close the getting started guide' : 'Fermer le guide de démarrage'}
              >
                {isEn ? 'Close' : 'Fermer'}
              </button>
            </header>

            <ol className={`manager-onboarding-grid manager-onboarding-grid--modal ${guideStyles.guideGrid}`} aria-label={isEn ? 'Steps to create a session' : 'Étapes pour créer une session'}>
              {startupGuideSteps.map((item, index) => (
                <li key={item.step}>
                  <article
                    className={`card manager-onboarding-step manager-onboarding-step--premium ${guideStyles.guideStep}`}
                    style={{ '--onboarding-delay': `${index * 90}ms` }}
                  >
                    <span className={guideStyles.guideNumber} aria-hidden="true">{item.step.padStart(2, '0')}</span>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                    <Link className={`btn-secondary manager-onboarding-step__cta ${guideStyles.guideCta}`} href={withLocalePath(item.href)} onClick={closeStartupGuide}>
                      {item.cta}
                    </Link>
                  </article>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </Modal>

      <Modal
        open={isParticipantModalOpen}
        title={editingMemberId
          ? (isEn ? 'Edit participant' : 'Modifier le participant')
          : (isEn ? 'Create participant' : 'Créer un participant')}
        titleClassName="participant-modal-title"
        dialogClassName="participant-modal-dialog participant-modal-dialog--form"
        headerClassName="participant-modal-header"
        onClose={closeParticipantModal}
      >
        <p className="participant-modal-subtitle">
          {editingMemberId
            ? (isEn ? 'Update the selected participant information.' : 'Mettez à jour les informations du participant sélectionné.')
            : (isEn ? 'Add a participant to assign them to your sessions.' : 'Ajoutez un participant pour l’assigner à vos sessions.')}
        </p>
        <div className="participant-modal-body">
          <article className="participant-inline-form participant-inline-form--modal">
            <form
              className="participant-form participant-form--embedded"
              onSubmit={handleSubmitMember}
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
            >
              {/* Decoy fields: capture aggressive browser/password-manager autofill. */}
              <input
                type="text"
                name="participant_decoy_username"
                autoComplete="username"
                tabIndex={-1}
                aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }}
              />
              <input
                type="password"
                name="participant_decoy_password"
                autoComplete="current-password"
                tabIndex={-1}
                aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }}
              />
              <div className="participant-form-grid">
                <label>
                  {isEn ? 'First name *' : 'Prénom *'}
                  <input
                    type="text"
                    name="participant_first_name"
                    value={memberForm.first_name}
                    onChange={(e) => setMemberForm((prev) => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Ex: Sophie"
                    className={formAttempted && !memberFormChecks.firstNameOk ? 'input-invalid' : ''}
                    autoComplete="off"
                    required
                  />
                  {formAttempted && !memberFormChecks.firstNameOk ? (
                    <span className="field-error">{isEn ? 'First name is required.' : 'Le prénom est requis.'}</span>
                  ) : null}
                </label>
                <label>
                  {isEn ? 'Last name' : 'Nom'}
                  <input
                    type="text"
                    name="participant_last_name"
                    value={memberForm.last_name}
                    onChange={(e) => setMemberForm((prev) => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Ex: Martin"
                    autoComplete="off"
                  />
                </label>
                <label className="participant-field-full">
                  {isEn ? 'Email *' : 'E-mail *'}
                  <input
                    type="email"
                    name="participant_contact_email"
                    value={memberForm.email}
                    onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="sophie@company.com"
                    className={formAttempted && !memberFormChecks.emailOk ? 'input-invalid' : ''}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                  />
                  {formAttempted && !memberFormChecks.emailOk ? (
                    <span className="field-error">{isEn ? 'Email format is invalid.' : 'Le format de l’adresse e-mail est invalide.'}</span>
                  ) : null}
                </label>
                <label>
                  {isEn ? 'Job title' : 'Poste'}
                  <input
                    type="text"
                    name="participant_job_title"
                    value={memberForm.job_title}
                    onChange={(e) => setMemberForm((prev) => ({ ...prev, job_title: e.target.value }))}
                    placeholder="Ex: Product Manager"
                    autoComplete="off"
                  />
                </label>
                <label>
                  {isEn ? 'Department' : 'Département'}
                  <input
                    type="text"
                    name="participant_department"
                    value={memberForm.department}
                    onChange={(e) => setMemberForm((prev) => ({ ...prev, department: e.target.value }))}
                    placeholder="Ex: HR"
                    autoComplete="off"
                  />
                </label>
              </div>
              <p className="participant-form-hint">
                {isEn
                  ? 'Fields marked with * are required.'
                  : 'Les champs marqués d’un * sont obligatoires.'}
              </p>
              {editingMemberId ? (
                <section aria-label={isEn ? 'Password reset' : 'Réinitialisation du mot de passe'}>
                  <p className="participant-form-hint">
                    {editingMember?.email
                      ? (isEn
                        ? `Send a new link to the saved email address: ${editingMember.email}. Save any email changes first.`
                        : `Envoyez un nouveau lien à l’adresse enregistrée : ${editingMember.email}. Enregistrez d’abord toute modification de l’adresse e-mail.`)
                      : (isEn ? 'Save an email address first to send a reset link.' : 'Enregistrez d’abord une adresse e-mail pour envoyer un lien de réinitialisation.')}
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleSendPasswordReset}
                    disabled={sendingPasswordReset || creatingMember || !editingMember?.email || editingMember?.disabled}
                    aria-busy={sendingPasswordReset}
                    style={{ marginTop: '0.75rem' }}
                  >
                    {sendingPasswordReset
                      ? (isEn ? 'Sending...' : 'Envoi en cours...')
                      : (isEn ? 'Resend password reset link' : 'Renvoyer le lien de réinitialisation')}
                  </button>
                  {passwordResetMessage ? (
                    <p className="participant-form-status participant-form-status--ok" role="status">{passwordResetMessage}</p>
                  ) : null}
                </section>
              ) : null}
              {memberFormStatus ? (
                <p className="participant-form-status participant-form-status--warn" role="alert" aria-live="polite">
                  {memberFormStatus}
                </p>
              ) : null}
              <div className="participant-form-actions">
                <button type="button" className="btn-secondary" onClick={closeParticipantModal} disabled={creatingMember || sendingPasswordReset}>
                  {isEn ? 'Cancel' : 'Annuler'}
                </button>
                <button type="submit" className="btn-primary" disabled={!canSubmitMember}>
                  {creatingMember
                    ? (editingMemberId
                      ? (isEn ? 'Updating...' : 'Mise à jour...')
                      : (isEn ? 'Adding...' : 'Ajout...'))
                    : (editingMemberId
                      ? (isEn ? 'Save changes' : 'Enregistrer')
                      : (isEn ? 'Create participant' : 'Créer un participant'))}
                </button>
              </div>
            </form>
          </article>
        </div>
      </Modal>
      <Modal
        open={Boolean(lastCreatedCredentials)}
        title={isEn ? 'Participant created' : 'Participant créé'}
        dialogClassName="participant-modal-dialog"
        onClose={() => setLastCreatedCredentials(null)}
      >
        {lastCreatedCredentials ? (
          <div style={{ padding: '0 1.35rem 1.25rem' }}>
            <p className="participant-form-status participant-form-status--ok" role="status" aria-live="polite">
              {isEn
                ? `Participant created. Login: ${lastCreatedCredentials.loginIdentifier || 'n/a'} · Password setup link sent to ${lastCreatedCredentials.deliveredEmail || 'the participant email'}.`
                : `Participant créé. Identifiant : ${lastCreatedCredentials.loginIdentifier || 'non disponible'} · Lien de création du mot de passe envoyé à ${lastCreatedCredentials.deliveredEmail || 'l’adresse e-mail du participant'}.`}
            </p>
            <div className="participant-form-actions" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn-primary" onClick={() => setLastCreatedCredentials(null)}>
                {isEn ? 'Close' : 'Fermer'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
      <style jsx global>{`
        .manager-home .home-sessions-controls {
          display: grid;
          gap: 1rem;
          margin-bottom: 0;
          padding: 0;
          border: 0;
          background: transparent;
          box-shadow: none;
        }

        .manager-home .home-sessions-controls-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .manager-home .home-sessions-clear {
          border: 0;
          background: transparent;
          color: var(--accent-strong);
          border-radius: 6px;
          min-height: 44px;
          padding: 0.3rem 0.5rem;
          font-size: 0.84rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
        }

        .manager-home .home-sessions-clear:hover {
          background: rgba(59, 130, 246, 0.08);
          border-color: rgba(37, 99, 235, 0.55);
        }

        .manager-home .home-sessions-clear:focus-visible {
          outline: 3px solid rgba(59, 130, 246, 0.25);
          outline-offset: 2px;
        }

        .manager-home .home-sessions-filters {
          display: grid;
          grid-template-columns: minmax(220px, 2fr) minmax(160px, 1fr) minmax(220px, 1fr);
          gap: 1rem;
        }

        .manager-home .home-sessions-date-filters:not([hidden]) {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          max-width: 36rem;
        }

        .manager-home .home-sessions-period-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          text-align: start;
          cursor: pointer;
        }

        .manager-home .home-sessions-period-toggle small {
          display: block;
          color: var(--text-muted);
          font-size: 0.75rem;
        }

        .manager-home .home-sessions-field {
          display: grid;
          min-width: 0;
          gap: 0.32rem;
        }

        .manager-home .home-sessions-field-label {
          font-size: 0.76rem;
          font-weight: 500;
          color: var(--text-muted);
        }

        .manager-home .home-sessions-control {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          min-height: 42px;
          padding: 0.65rem 1rem;
          border-radius: 11px;
          border: 1px solid var(--surface-border);
          background: var(--card);
          color: var(--ink);
          box-shadow: none;
        }

        .manager-home .home-sessions-control:focus-visible {
          border-color: rgba(37, 99, 235, 0.75);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
          outline: none;
        }

        .manager-home .home-sessions-meta {
          margin: 0;
          color: var(--text-muted);
          font-weight: 500;
        }

        .manager-home .home-sessions-pagination {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 0.65rem;
          margin-top: 0.85rem;
        }

        .manager-home .home-sessions-pagination .btn-secondary {
          min-height: 44px;
          padding: 0.45rem 0.75rem;
          border-color: transparent;
          background: transparent;
          box-shadow: none;
          font-size: 0.85rem;
        }

        .manager-home .session-card-mobile-actions--top {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          left: auto;
        }

        @media (max-width: 960px) {
          .manager-home .home-sessions-filters {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 640px) {
          .manager-home .home-sessions-filters {
            grid-template-columns: 1fr;
          }

          .manager-home .home-sessions-pagination {
            flex-wrap: wrap;
            justify-content: flex-end;
          }
        }
      `}</style>
      <Footer />
    </>
  );
}
