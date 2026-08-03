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

function isStrongPassword(value) {
  const raw = String(value || '');
  if (raw.length < 8 || raw.length > 128) return false;
  const hasLower = /[a-z]/.test(raw);
  const hasUpper = /[A-Z]/.test(raw);
  const hasDigit = /\d/.test(raw);
  const hasSpecial = /[^A-Za-z0-9]/.test(raw);
  return hasLower && hasUpper && hasDigit && hasSpecial;
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
  if (normalized === 'remote') return isEn ? 'Remote' : 'A distance';
  if (normalized === 'hybrid') return isEn ? 'Hybrid' : 'Hybride';
  if (normalized === 'in-person' || normalized === 'in_person') return isEn ? 'In person' : 'Presentiel';
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

async function fetchSessions() {
  try {
    const data = await fetchSessionsWithRetry();
    const items = Array.isArray(data) ? data : (data.sessions || data.data || []);
    return Array.isArray(items) ? items : [];
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
      icon: 'P',
      title: isEn ? 'Add participants' : 'Ajouter des participants',
      text: isEn
        ? 'Create your participant base to organize workshops faster and more cleanly.'
        : 'Constituez votre base participant pour organiser vos ateliers plus vite et plus clairement.',
      href: '/home#home-participants-block',
      cta: isEn ? 'Go to this step' : 'Aller à cette étape',
    },
    {
      step: '2',
      icon: 'S',
      title: isEn ? 'Configure the session' : 'Configurer la session',
      text: isEn
        ? 'Choose the challenge, format, and key settings before launch.'
        : 'Choisissez le challenge, le format et les paramètres avant le lancement.',
    },
    {
      step: '3',
      icon: 'L',
      title: isEn ? 'Launch the challenge' : 'Lancer le challenge',
      text: isEn
        ? 'Start the session, keep the pace, and finish with an actionable debrief.'
        : 'Démarrez la session, maintenez le rythme et concluez avec un debrief actionnable.',
    }
  ]);
}

function getManagerBenefits(isEn) {
  return Object.freeze(isEn
    ? ['Guided preparation', 'Structured live facilitation', 'Actionable outcomes']
    : ['Preparation guidee', 'Animation live structuree', 'Resultats actionnables']);
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
  const managerBenefits = useMemo(() => getManagerBenefits(isEn), [isEn]);
  const [activeTrustIndex, setActiveTrustIndex] = useState(0);
  const [isStartupGuideOpen, setIsStartupGuideOpen] = useState(false);
  const guard = useManagerGuard();
  const { toasts, removeToast, error: showErrorToast, loading: showLoadingToast, success: showSuccessToast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [members, setMembers] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [deletingMemberId, setDeletingMemberId] = useState(null);
  const [creatingMember, setCreatingMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(8);
  const [formAttempted, setFormAttempted] = useState(false);
  const [memberFormStatus, setMemberFormStatus] = useState('');
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [authInvalid, setAuthInvalid] = useState(false);
  const [mobileMenuSignal, setMobileMenuSignal] = useState(0);
  const onboardingHandledRef = useRef(false);
  const [memberForm, setMemberForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
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

  const visibleSessions = useMemo(() => sessions.slice(0, visibleCount), [sessions, visibleCount]);

  const memberFormChecks = useMemo(() => {
    const firstName = String(memberForm.first_name || '').trim();
    const email = String(memberForm.email || '').trim();
    const password = String(memberForm.password || '').trim();
    const needsPassword = !editingMemberId;
    return {
      firstNameOk: firstName.length > 0,
      emailOk: email.length > 0,
      passwordOk: !needsPassword || password.length >= 8,
      passwordLength: password.length,
    };
  }, [memberForm, editingMemberId]);

  const canSubmitMember = memberFormChecks.firstNameOk
    && memberFormChecks.emailOk
    && memberFormChecks.passwordOk
    && !creatingMember;

  const canCreateSession = !loadingMembers && members.length > 0;
  const isParticipantModalOpen = showParticipantForm || Boolean(editingMemberId);
  const createSessionBlockedReason = loadingMembers
    ? (isEn ? 'Loading participants...' : 'Chargement des participants...')
    : (isEn
      ? 'Creation unavailable: add participants first in your manager space.'
      : 'Création indisponible : ajoutez d\'abord des participants dans votre espace manager.');
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
    if (canCreateSession) {
      trackGaEvent('cta_click', {
        cta_name: 'manager_create_session',
        cta_label: 'Create session',
        cta_destination: '/session-builder',
        page_location: typeof window !== 'undefined' ? window.location.href : undefined,
      });
      trackProductSessionEvent('create_requested', {
        surface: 'manager_home',
      });
      return;
    }
    event.preventDefault();
    showErrorToast(createSessionBlockedReason);
  }

  function handleUnauthorizedAuth(message = isEn ? 'Session expired. Please sign in again.' : 'Session expiree. Veuillez vous reconnecter.') {
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
      const data = await fetchSessions();
      setSessions(data);
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
  }, [authInvalid, guard.allowed, isEn, removeToast, showErrorToast, showLoadingToast]);

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
    refreshSessions({ withToast: true });
  }, [refreshSessions]);

  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  useEffect(() => {
    setMobileMenuSignal((current) => current + 1);
  }, [deletingMemberId, deletingSessionId, visibleCount]);

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
        : 'Ajoutez votre premier participant pour creer des sessions plus rapidement.');
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

  function handleTrustScroll(event) {
    const container = event.currentTarget;
    if (!container) return;

    const items = Array.from(container.querySelectorAll('[data-benefit-index]'));
    if (!items.length) return;

    const containerLeft = container.getBoundingClientRect().left;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    items.forEach((item) => {
      const index = Number(item.getAttribute('data-benefit-index'));
      const distance = Math.abs(item.getBoundingClientRect().left - containerLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = Number.isFinite(index) ? index : 0;
      }
    });

    setActiveTrustIndex(closestIndex);
  }

  function logout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('selectedChallenges');
    window.location.replace(withLocalePath('/login'));
  }

  async function handleDeleteSession(session) {
    const sessionIdentifier = getSessionIdentifier(session);
    if (!sessionIdentifier) return;
    const label = session.name || `Session #${sessionIdentifier}`;
    const accepted = window.confirm(isEn
      ? `Delete ${label}? This action is irreversible.`
      : `Supprimer ${label} ? Cette action est irreversible.`);
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
      showSuccessToast(isEn ? 'Session deleted.' : 'Session supprimee.');
    } catch (err) {
      showErrorToast(err.message || (isEn ? 'Delete failed.' : 'La suppression a echoue.'));
    } finally {
      setDeletingSessionId(null);
    }
  }

  function beginEditMember(member) {
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
    setMemberForm({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      job_title: '',
      department: '',
    });
  }

  function resetMemberForm() {
    setFormAttempted(false);
    setMemberFormStatus('');
    setShowParticipantForm(false);
    setEditingMemberId(null);
    setMemberForm({ first_name: '', last_name: '', email: '', password: '', job_title: '', department: '' });
  }

  function closeParticipantModal() {
    if (creatingMember) return;
    resetMemberForm();
  }

  async function handleSubmitMember(event) {
    event.preventDefault();
    setFormAttempted(true);
    setMemberFormStatus('');
    if (!guard.user?.id || creatingMember) return;

    const firstName = String(memberForm.first_name || '').trim();
    const lastName = String(memberForm.last_name || '').trim();
    const email = String(memberForm.email || '').trim().toLowerCase();
    const password = String(memberForm.password || '').trim();
    const jobTitle = String(memberForm.job_title || '').trim();
    const department = String(memberForm.department || '').trim();

    if (!firstName || !email || (!editingMemberId && !password)) {
      const message = editingMemberId
        ? (isEn ? 'First name and email are required.' : 'Le prenom et l email sont requis.')
        : (isEn ? 'First name, email, and password are required.' : 'Le prenom, l email et le mot de passe sont requis.');
      setMemberFormStatus(message);
      showErrorToast(message);
      return;
    }

    if (!isValidEmail(email)) {
      const message = isEn ? 'A valid email address is required.' : 'Une adresse email valide est requise.';
      setMemberFormStatus(message);
      showErrorToast(message);
      return;
    }

    if (password && !isStrongPassword(password)) {
      const message = isEn
        ? 'Password must contain upper/lower case letters, a number, and a symbol (8+ characters).'
        : 'Le mot de passe doit contenir majuscule, minuscule, chiffre et symbole (8+ caracteres).';
      setMemberFormStatus(message);
      showErrorToast(message);
      return;
    }

    const hasDuplicateEmail = members.some((member) => (
      String(member?.id || '') !== String(editingMemberId || '')
      && String(member?.email || '').trim().toLowerCase() === email
    ));

    if (hasDuplicateEmail) {
      const message = isEn
        ? 'This email is already used by another participant.'
        : 'Cet email est deja utilise par un autre participant.';
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
        email,
        job_title: jobTitle || null,
        department: department || null,
      };

      if (!editingMemberId || password) {
        body.password = password;
      }

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
              : `${editingMemberId ? 'Echec de mise a jour du participant' : 'Echec de creation du participant'} (${response.status})`
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

      showSuccessToast(editingMemberId
        ? (isEn ? 'Participant updated successfully.' : 'Participant mis a jour avec succes.')
        : (isEn ? 'Participant added successfully.' : 'Participant ajoute avec succes.'));
      setShowParticipantForm(false);
      resetMemberForm();

      await refreshMembers();
    } catch (err) {
      const message = err.message || (isEn
        ? `Unable to ${editingMemberId ? 'update' : 'create'} participant.`
        : `Impossible de ${editingMemberId ? 'mettre a jour' : 'creer'} le participant.`);
      setMemberFormStatus(message);
      showErrorToast(message);
    } finally {
      setCreatingMember(false);
    }
  }

  async function handleDeleteMember(member) {
    if (!member?.id || deletingMemberId) return;

    const label = member.email || `${getParticipantFirstName(member)} ${getParticipantLastName(member)}`.trim() || `Participant #${member.id}`;
    const accepted = window.confirm(isEn
      ? `Delete ${label}? This action is irreversible.`
      : `Supprimer ${label} ? Cette action est irreversible.`);
    if (!accepted) return;

    setDeletingMemberId(member.id);
    try {
      const response = await fetch(getApiUrl(`/participants/${encodeURIComponent(member.id)}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Unable to delete participant (${response.status})`);
      }
      await refreshMembers();
      showSuccessToast(isEn ? 'Participant deleted.' : 'Participant supprime.');
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
          <h1>{isEn ? 'Checking session...' : 'Verification de la session...'}</h1>
          <p>{isEn ? 'Loading...' : 'Chargement...'}</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AppNav userLabel={userLabel} onLogout={logout} role={guard.user?.role} />
      <main className="shell app-home manager-home">
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
                : 'Planifiez, lancez et analysez vos ateliers gamifies dans un espace clair et actionnable.'}</p>
              <div className="hero-actions home-hero-actions">
                <Link
                  className={`btn-primary home-create-cta ${canCreateSession ? '' : 'is-disabled'}`}
                  href={withLocalePath('/session-builder')}
                  onClick={handleCreateSessionClick}
                  aria-disabled={!canCreateSession}
                  title={canCreateSession ? (isEn ? 'Create session' : 'Créer une session') : createSessionBlockedReason}
                >
                  {isEn ? 'Create session' : 'Créer une session'}
                </Link>
                <button
                  type="button"
                  className="btn-secondary home-create-participants-cta"
                  onClick={openNewMemberForm}
                >
                  {isEn ? 'Create participants' : 'Créer des participants'}
                </button>
                {guard.user?.role === 'admin' && (
                  <Link className="btn-secondary" href={withLocalePath('/admin')}>
                    {isEn ? 'Admin console' : 'Console admin'}
                  </Link>
                )}
              </div>
              {!canCreateSession ? (
                <p className="home-prerequisite-hint" role="status">{createSessionBlockedReason}</p>
              ) : null}
              <div className="home-hero-trust-wrap">
                <div className="home-hero-trust" aria-label={isEn ? 'Manager benefits' : 'Benefices manager'} onScroll={handleTrustScroll}>
                  {managerBenefits.map((benefit, index) => (
                    <span
                      key={benefit}
                      data-benefit-index={index}
                      className={activeTrustIndex === index ? 'is-active' : ''}
                    >
                      {benefit}
                    </span>
                  ))}
                </div>
                <div className="home-hero-trust-dots" aria-hidden="true">
                  {managerBenefits.map((benefit, index) => (
                    <span key={benefit} className={activeTrustIndex === index ? 'is-active' : ''} />
                  ))}
                </div>
              </div>
            </div>

            <aside className="home-hero-summary" aria-label={isEn ? 'Manager summary' : 'Resume manager'}>
              <p className="home-hero-summary__eyebrow">{isEn ? 'Quick view' : 'Vue rapide'}</p>
              <strong className="home-hero-summary__title">
                {isEn ? 'A simple cockpit to run your sessions.' : 'Un cockpit simple pour piloter vos sessions.'}
              </strong>
              <ul className="home-hero-summary__list">
                <li>{isEn ? 'Create and configure sessions without friction' : 'Creer et configurer des sessions sans friction'}</li>
                <li>{isEn ? 'Track active and upcoming sessions in one place' : 'Suivre les sessions actives et a venir au meme endroit'}</li>
                <li>{isEn ? 'Keep a ready-to-use participant base for future rituals' : 'Maintenir une base participants prete pour les prochains rituels'}</li>
              </ul>
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
            <p className="eyebrow">{isEn ? 'IN PROGRESS' : 'EN COURS'}</p>
            <h2 className="stat-value">{loadingSessions ? '…' : sessionStats.enCours}</h2>
            <p>
              {isEn
                ? `active session${sessionStats.enCours !== 1 ? 's' : ''}`
                : `session${sessionStats.enCours !== 1 ? 's' : ''} active${sessionStats.enCours !== 1 ? 's' : ''}`}
            </p>
          </article>
          <article className="feature-card stat-card stat-card-ready">
            <p className="eyebrow">{isEn ? 'TO CONFIGURE' : 'A CONFIGURER'}</p>
            <h2 className="stat-value">{loadingSessions ? '…' : sessionStats.preparee}</h2>
            <p>
              {isEn
                ? `preparing session${sessionStats.preparee !== 1 ? 's' : ''}`
                : `session${sessionStats.preparee !== 1 ? 's' : ''} en preparation`}
            </p>
          </article>
          <article className="feature-card stat-card stat-card-done">
            <p className="eyebrow">{isEn ? 'COMPLETED' : 'TERMINEES'}</p>
            <h2 className="stat-value">{loadingSessions ? '…' : sessionStats.terminee}</h2>
            <p>
              {isEn
                ? `completed session${sessionStats.terminee !== 1 ? 's' : ''}`
                : `session${sessionStats.terminee !== 1 ? 's' : ''} terminee${sessionStats.terminee !== 1 ? 's' : ''}`}
            </p>

          </article>
        </section>

        <section id="home-sessions-block" className="feature-card sessions-panel home-sessions-panel home-anchor-target">
          <div className="panel-head home-sessions-head">
            <div>
              <p className="eyebrow">{isEn ? 'YOUR SESSIONS' : 'VOS SESSIONS'}</p>
              <h2>{isEn ? 'My sessions' : 'Mes sessions'}</h2>
              <p>{isEn ? 'Track preparing, active, and completed sessions from one panel.' : 'Suivez les sessions en preparation, actives et terminees depuis un seul panneau.'}</p>
            </div>
            <Link
              className={`btn-primary ${canCreateSession ? '' : 'is-disabled'}`}
              href={withLocalePath('/session-builder')}
              onClick={handleCreateSessionClick}
              aria-disabled={!canCreateSession}
              title={canCreateSession ? (isEn ? 'Create session' : 'Créer une session') : createSessionBlockedReason}
            >
              {isEn ? 'Create session' : 'Créer une session'}
            </Link>
          </div>
          {!canCreateSession ? (
            <p className="home-prerequisite-hint" role="status">{createSessionBlockedReason}</p>
          ) : null}

          {loadingSessions ? (
            <div className="session-skeletons">
              {[...Array(3)].map((_, i) => (
                <SessionCardSkeleton key={i} />
              ))}
            </div>
          ) : null}

          {!loadingSessions && sessions.length === 0 ? (
            <p>{isEn ? 'No sessions found yet.' : 'Aucune session pour le moment.'}</p>
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
                  { key: 'edit', label: isEn ? 'Edit session' : 'Modifier la session', href: editLink },
                  { key: 'open', label: isDone ? (isEn ? 'View results' : 'Voir les résultats') : isActive ? (isEn ? 'Open session' : 'Ouvrir la session') : (isEn ? 'Configure session' : 'Configurer la session'), href: openLink },
                  { key: 'delete', label: isEn ? 'Delete session' : 'Supprimer la session', danger: true, onClick: () => handleDeleteSession(session), disabled: isDeleting },
                ];
                return (
                  <article key={sessionIdentifier} className={`feature-card session-card ${isDeleting ? 'session-card--deleting' : ''}`}>
                    <div className="session-card-body">
                      <p className="session-title">{session.name || `Session #${sessionIdentifier}`}</p>
                      <p className="session-meta">
                        <span className={`status-pill ${statusClass}`}>
                          {STATUS_LABEL[session.status] || session.status || (isEn ? 'Preparing' : 'En preparation')}
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
                    <div className="session-card-mobile-actions">
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
                        title={isDone ? (isEn ? 'View results' : 'Voir les résultats') : isActive ? (isEn ? 'Open session' : 'Ouvrir la session') : (isEn ? 'Configure' : 'Configurer')}
                        aria-label={isDone ? (isEn ? 'View results' : 'Voir les résultats') : isActive ? (isEn ? 'Open session' : 'Ouvrir la session') : (isEn ? 'Configure' : 'Configurer')}
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

          {!loadingSessions && sessions.length > visibleCount ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setVisibleCount((prev) => prev + 8)}
            >
              {isEn ? 'Show more' : 'Afficher plus'}
            </button>
          ) : null}

          {!loadingSessions && sessions.length > 8 && visibleCount > 8 ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setVisibleCount(8)}
            >
              {isEn ? 'Collapse list' : 'Replier la liste'}
            </button>
          ) : null}
        </section>

        <section id="home-participants-block" className="feature-card participants-panel home-anchor-target" aria-label={isEn ? 'Team participants' : 'Participants de l equipe'}>
          <div className="participants-panel-head">
            <div>
              <p className="eyebrow">{isEn ? 'PARTICIPANTS' : 'PARTICIPANTS'}</p>
              <h2>{isEn ? 'Participant list' : 'Liste des participants'}</h2>
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

          <div className="participants-panel-kpis" aria-label={isEn ? 'Participant summary' : 'Resume participants'}>
            <span>
              {isEn
                ? `${members.length} participant${members.length > 1 ? 's' : ''} total`
                : `${members.length} participant${members.length > 1 ? 's' : ''} au total`}
            </span>
          </div>

          {loadingMembers ? <p>{isEn ? 'Loading participants...' : 'Chargement des participants...'}</p> : null}

          {!loadingMembers && members.length === 0 ? (
            <p className="team-empty">{isEn ? 'No participants yet. Start by creating your first profile.' : 'Aucun participant pour le moment. Commencez par créer votre premier profil.'}</p>
          ) : null}

          {!loadingMembers && members.length > 0 ? (
            <div className="participants-card-grid">
              {members.map((member, index) => {
                const title = [getParticipantFirstName(member), getParticipantLastName(member)].filter(Boolean).join(' ').trim() || `Participant #${member.id}`;
                const details = [member.job_title, member.department].filter(Boolean).join(' · ');
                const initials = getParticipantInitials(member);
                const mobileParticipantActions = [
                  { key: 'edit', label: isEn ? 'Edit participant' : 'Modifier le participant', onClick: () => beginEditMember(member), disabled: deletingMemberId === member.id },
                  { key: 'delete', label: isEn ? 'Delete participant' : 'Supprimer le participant', danger: true, onClick: () => handleDeleteMember(member), disabled: deletingMemberId === member.id },
                ];
                return (
                  <article key={String(member.id)} className="participant-card">
                    <div className="participant-card__avatar" style={{ background: getParticipantAccent(member, index) }} aria-hidden="true">
                      {initials}
                    </div>
                    <div className="participant-card__content">
                      <p className="participant-card__name">{title}</p>
                      <p className="participant-card__meta">
                        {member.email || (isEn ? 'Email not provided' : 'Email non renseigne')}
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
        title={isEn ? 'Getting started guide' : 'Guide de demarrage'}
        onClose={closeStartupGuide}
        hideHeader
        overlayClassName="manager-onboarding-modalOverlay"
        dialogClassName="manager-onboarding-modalDialog"
        bodyClassName="manager-onboarding-modalBody"
      >
        <section className="manager-onboarding-panel manager-onboarding-panel--modal" aria-labelledby="onboarding-guide-title">
          <div className="manager-onboarding-shell">
            <div className="manager-onboarding-hero manager-onboarding-hero--modal">
              <div className="manager-onboarding-copy">
                <p className="eyebrow manager-onboarding-eyebrow">{isEn ? 'GETTING STARTED GUIDE' : 'GUIDE DE DEMARRAGE'}</p>
                <h2 id="onboarding-guide-title">{isEn ? 'Create your first session in 3 simple steps.' : 'Creez votre premiere session en 3 etapes simples.'}</h2>
                <p>
                  {isEn
                    ? 'The flow is fast and intuitive: prepare participants, configure the session, then launch your challenge.'
                    : 'Le flux est rapide et intuitif: preparez les participants, configurez la session, puis lancez votre challenge.'}
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary manager-onboarding-close"
                onClick={closeStartupGuide}
              >
                {isEn ? 'Close' : 'Fermer'}
              </button>
            </div>

            <div className="manager-onboarding-grid manager-onboarding-grid--modal">
              {startupGuideSteps.map((item, index) => (
                <article
                  key={item.step}
                  className="card manager-onboarding-step manager-onboarding-step--premium"
                  style={{ '--onboarding-delay': `${index * 90}ms` }}
                >
                  <div className="manager-onboarding-step__head">
                    <span className="manager-onboarding-step__badge">{isEn ? `Step ${item.step}` : `Etape ${item.step}`}</span>
                    <span className="manager-onboarding-step__index">0{item.step}</span>
                  </div>
                  <span className="manager-onboarding-step__icon" aria-hidden="true">{item.icon}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  {item.href ? (
                    <Link className="btn-secondary manager-onboarding-step__cta" href={withLocalePath(item.href)} onClick={closeStartupGuide}>
                      {item.cta}
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      </Modal>

      <Modal
        open={isParticipantModalOpen}
        title={editingMemberId
          ? (isEn ? 'Edit participant' : 'Modifier le participant')
          : (isEn ? 'Create participant' : 'Creer un participant')}
        titleClassName="participant-modal-title"
        onClose={closeParticipantModal}
      >
        <div className="participant-modal-body">
          <article className="participant-inline-form participant-inline-form--modal">
            <div className="participant-inline-form-head">
              <p>
                {editingMemberId
                  ? (isEn ? 'Update the selected participant information.' : 'Mettez a jour les informations du participant selectionne.')
                  : (isEn ? 'Add a participant to assign them to your sessions.' : 'Ajoutez un participant pour l assigner a vos sessions.')}
              </p>
            </div>

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
                  {isEn ? 'First name *' : 'Prenom *'}
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
                    <span className="field-error">{isEn ? 'First name is required.' : 'Le prenom est requis.'}</span>
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
                  Email *
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
                    <span className="field-error">{isEn ? 'Email is required.' : 'L email est requis.'}</span>
                  ) : null}
                </label>
                <label className="participant-field-full">
                  {isEn ? 'Password' : 'Mot de passe'} {editingMemberId ? (isEn ? '(optional)' : '(optionnel)') : '*'}
                  <input
                    type="password"
                    name="participant_access_password"
                    value={memberForm.password}
                    onChange={(e) => setMemberForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder={editingMemberId
                      ? (isEn ? 'Leave blank to keep current password' : 'Laissez vide pour conserver le mot de passe actuel')
                      : (isEn ? 'Minimum 8 characters' : 'Minimum 8 caracteres')}
                    minLength={8}
                    className={formAttempted && !memberFormChecks.passwordOk ? 'input-invalid' : ''}
                    autoComplete="new-password"
                    required={!editingMemberId}
                  />
                  {!editingMemberId ? (
                    <span className="field-help">{memberFormChecks.passwordLength}/8 {isEn ? 'minimum characters' : 'caracteres minimum'}</span>
                  ) : (
                    <span className="field-help">{isEn ? 'Fill this field only to replace the current password.' : 'Renseignez ce champ seulement pour remplacer le mot de passe actuel.'}</span>
                  )}
                  {formAttempted && !memberFormChecks.passwordOk ? (
                    <span className="field-error">{isEn ? 'Password must be at least 8 characters long.' : 'Le mot de passe doit contenir au moins 8 caracteres.'}</span>
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
                  {isEn ? 'Department' : 'Departement'}
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
                  ? 'Fields marked with * are required to create a usable participant profile.'
                  : 'Les champs marques d un * sont requis pour creer un profil participant utilisable.'}
              </p>
              {memberFormStatus ? (
                <p className="participant-form-status participant-form-status--warn" role="alert" aria-live="polite">
                  {memberFormStatus}
                </p>
              ) : null}
              <div className="participant-form-actions">
                <button type="button" className="btn-secondary" onClick={closeParticipantModal} disabled={creatingMember}>
                  {isEn ? 'Cancel' : 'Annuler'}
                </button>
                <button type="submit" className="btn-primary" disabled={!canSubmitMember}>
                  {creatingMember
                    ? (editingMemberId
                      ? (isEn ? 'Updating...' : 'Mise a jour...')
                      : (isEn ? 'Adding...' : 'Ajout...'))
                    : (editingMemberId
                      ? (isEn ? 'Save changes' : 'Enregistrer')
                      : (isEn ? 'Create participant' : 'Creer un participant'))}
                </button>
              </div>
            </form>
          </article>
        </div>
      </Modal>
      <style jsx global>{`
        .manager-onboarding-grid--modal {
          display: flex;
          flex-direction: row;
          flex-wrap: nowrap;
          gap: 1rem;
          overflow-x: auto;
          padding-bottom: 0.25rem;
        }

        .manager-onboarding-grid--modal .manager-onboarding-step {
          flex: 1 1 0;
          min-width: 240px;
          background: linear-gradient(155deg, #ffffff 0%, #eef4ff 100%);
          border: 1px solid rgba(91, 140, 255, 0.22);
          box-shadow: 0 12px 30px rgba(31, 70, 210, 0.12);
        }

        .manager-onboarding-grid--modal .manager-onboarding-step:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 34px rgba(31, 70, 210, 0.18);
        }
      `}</style>
      <Footer />
    </>
  );
}
