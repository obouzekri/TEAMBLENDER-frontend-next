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
import { clearStoredAuth } from '@/lib/auth';
import { trackGaEvent } from '@/lib/analytics';
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

function formatSessionDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
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

    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    const rawUser = sessionStorage.getItem('currentUser');
    const user = rawUser ? JSON.parse(rawUser) : null;

    if (!token || !user) {
      window.location.replace('/login');
      return;
    }

    if (user.role === 'participant') {
      window.location.replace('/participant');
      return;
    }

    setState({ loading: false, allowed: true, user, token });

    // Refresh profile from backend to expose first_name/last_name in nav even if session storage is stale.
    fetch(getApiUrl('/users/me'), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
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

async function fetchSessions(token) {
  try {
    const data = await fetchSessionsWithRetry(token);
    const items = Array.isArray(data) ? data : (data.sessions || data.data || []);
    return Array.isArray(items) ? items : [];
  } catch (err) {
    const wrapped = new Error(err.message || 'Sessions API error');
    wrapped.status = err?.status;
    wrapped.code = err?.code;
    throw wrapped;
  }
}

const STARTUP_GUIDE_STEPS = Object.freeze([
  {
    step: '1',
    icon: 'P',
    title: 'Add participants',
    text: 'Create your participant base to organize workshops faster and more cleanly.',
    href: '/home#home-participants-block',
    cta: 'Go to this step',
  },
  {
    step: '2',
    icon: 'S',
    title: 'Configure the session',
    text: 'Choose the challenge, format, and key settings before launch.',
  },
  {
    step: '3',
    icon: 'L',
    title: 'Launch the challenge',
    text: 'Start the session, keep the pace, and finish with an actionable debrief.',
  }
]);

export default function ManagerHome() {
  const { withLocalePath } = useI18n();
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

  const STATUS_LABEL = { en_cours: 'In progress', preparee: 'Preparing', terminee: 'Completed' };

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
    ? 'Loading participants...'
    : 'Creation unavailable: add participants first in your manager space.';
  const asyncStatusMessage = creatingMember
    ? (editingMemberId ? 'Updating participant...' : 'Creating participant...')
    : deletingMemberId
      ? 'Deleting participant...'
      : deletingSessionId
        ? 'Deleting session...'
        : loadingSessions
          ? 'Loading sessions...'
          : loadingMembers
            ? 'Loading participants...'
            : '';

  function handleCreateSessionClick(event) {
    if (canCreateSession) {
      trackGaEvent('cta_click', {
        cta_name: 'manager_create_session',
        cta_label: 'Create session',
        cta_destination: '/session-builder',
        page_location: typeof window !== 'undefined' ? window.location.href : undefined,
      });
      return;
    }
    event.preventDefault();
    showErrorToast(createSessionBlockedReason);
  }

  function handleUnauthorizedAuth(message = 'Session expired. Please sign in again.') {
    if (authInvalid) return;
    setAuthInvalid(true);
    showErrorToast(message);
    clearStoredAuth();
    window.location.replace(withLocalePath('/login?reason=session_expired'));
  }

  const refreshSessions = useCallback(async ({ withToast = false } = {}) => {
    if (!guard.allowed || !guard.token || authInvalid) return;

    let loadingId = null;
    setLoadingSessions(true);
    if (withToast) {
      loadingId = showLoadingToast('Loading sessions...');
    }

    try {
      const data = await fetchSessions(guard.token);
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
      showErrorToast(err.message || 'Unable to load sessions.');
    } finally {
      setLoadingSessions(false);
    }
  }, [authInvalid, guard.allowed, guard.token, removeToast, showErrorToast, showLoadingToast]);

  const refreshMembers = useCallback(async () => {
    if (!guard.allowed || !guard.token || authInvalid) return;

    setLoadingMembers(true);
    try {
      const response = await fetch(getApiUrl('/participants'), {
        headers: {
          Authorization: `Bearer ${guard.token}`,
          'Content-Type': 'application/json',
        },
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
      showErrorToast(err.message || 'Unable to load participants.');
    } finally {
      setLoadingMembers(false);
    }
  }, [authInvalid, guard.allowed, guard.token, showErrorToast]);



  useEffect(() => {
    refreshSessions({ withToast: true });
  }, [refreshSessions]);

  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  useEffect(() => {
    if (!isParticipantModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isParticipantModalOpen]);

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
      setMemberFormStatus('Add your first participant to create sessions faster.');
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
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('selectedChallenges');
    window.location.replace(withLocalePath('/login'));
  }

  async function handleDeleteSession(session) {
    const sessionIdentifier = getSessionIdentifier(session);
    if (!guard.token || !sessionIdentifier) return;
    const label = session.name || `Session #${sessionIdentifier}`;
    const accepted = window.confirm(`Delete ${label}? This action is irreversible.`);
    if (!accepted) return;

    setDeletingSessionId(sessionIdentifier);
    try {
      const response = await fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionIdentifier)}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${guard.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Error ${response.status}`);
      }
      await refreshSessions();
      showSuccessToast('Session deleted.');
    } catch (err) {
      showErrorToast(err.message || 'Delete failed.');
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
    if (!guard.token || !guard.user?.id || creatingMember) return;

    const firstName = String(memberForm.first_name || '').trim();
    const lastName = String(memberForm.last_name || '').trim();
    const email = String(memberForm.email || '').trim().toLowerCase();
    const password = String(memberForm.password || '').trim();
    const jobTitle = String(memberForm.job_title || '').trim();
    const department = String(memberForm.department || '').trim();

    if (!firstName || !email || (!editingMemberId && !password)) {
      showErrorToast(editingMemberId
        ? 'First name and email are required.'
        : 'First name, email, and password are required.');
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
        headers: {
          Authorization: `Bearer ${guard.token}`,
          'Content-Type': 'application/json',
        },
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
            `${editingMemberId ? 'Participant update' : 'Participant creation'} failed (${response.status})`
          )
        );
      }

      showSuccessToast(editingMemberId ? 'Participant updated successfully.' : 'Participant added successfully.');
      setShowParticipantForm(false);
      resetMemberForm();

      await refreshMembers();
    } catch (err) {
      setMemberFormStatus(err.message || `Unable to ${editingMemberId ? 'update' : 'create'} participant.`);
      showErrorToast(err.message || `Unable to ${editingMemberId ? 'update' : 'create'} participant.`);
    } finally {
      setCreatingMember(false);
    }
  }

  async function handleDeleteMember(member) {
    if (!guard.token || !member?.id || deletingMemberId) return;

    const label = member.email || `${getParticipantFirstName(member)} ${getParticipantLastName(member)}`.trim() || `Participant #${member.id}`;
    const accepted = window.confirm(`Delete ${label}? This action is irreversible.`);
    if (!accepted) return;

    setDeletingMemberId(member.id);
    try {
      const response = await fetch(getApiUrl(`/participants/${encodeURIComponent(member.id)}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${guard.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Unable to delete participant (${response.status})`);
      }
      await refreshMembers();
      showSuccessToast('Participant deleted.');
    } catch (err) {
      showErrorToast(err.message || 'Unable to delete participant.');
    } finally {
      setDeletingMemberId(null);
    }
  }

  if (guard.loading) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>Checking session...</h1>
          <p>Loading...</p>
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
              <p className="eyebrow">MANAGER SPACE</p>
              <h1 className="home-hero-greeting">Hello {userLabel}</h1>
              <p>Plan, launch, and analyze your gamified team workshops in one clear, actionable workspace.</p>
              <div className="hero-actions home-hero-actions">
                <Link
                  className={`btn-primary home-create-cta ${canCreateSession ? '' : 'is-disabled'}`}
                  href={withLocalePath('/session-builder')}
                  onClick={handleCreateSessionClick}
                  aria-disabled={!canCreateSession}
                  title={canCreateSession ? 'Create session' : createSessionBlockedReason}
                >
                  Create session
                </Link>
                <button
                  type="button"
                  className="btn-secondary home-create-participants-cta"
                  onClick={openNewMemberForm}
                >
                  Creer des participants
                </button>
                {guard.user?.role === 'admin' && (
                  <Link className="btn-secondary" href={withLocalePath('/admin')}>Admin console</Link>
                )}
              </div>
              {!canCreateSession ? (
                <p className="home-prerequisite-hint" role="status">{createSessionBlockedReason}</p>
              ) : null}
              <div className="home-hero-trust" aria-label="Manager benefits">
                <span>Guided preparation</span>
                <span>Structured live facilitation</span>
                <span>Actionable outcomes</span>
              </div>
            </div>

            <aside className="home-hero-summary" aria-label="Manager summary">
              <p className="home-hero-summary__eyebrow">Quick view</p>
              <strong className="home-hero-summary__title">A simple cockpit to run your sessions.</strong>
              <ul className="home-hero-summary__list">
                <li>Create and configure sessions without friction</li>
                <li>Track active and upcoming sessions in one place</li>
                <li>Keep a ready-to-use participant base for future rituals</li>
              </ul>
              <button
                type="button"
                className="btn-secondary home-quickview-guide-cta"
                onClick={openStartupGuide}
              >
                Ouvrir le guide de demarrage
              </button>
            </aside>
          </div>
        </section>
        <section className="cards-grid" aria-label="Session statistics">
          <article className="feature-card stat-card stat-card-live">
            <p className="eyebrow">IN PROGRESS</p>
            <h2 className="stat-value">{loadingSessions ? '…' : sessionStats.enCours}</h2>
            <p>active session{sessionStats.enCours !== 1 ? 's' : ''}</p>
          </article>
          <article className="feature-card stat-card stat-card-ready">
            <p className="eyebrow">TO CONFIGURE</p>
            <h2 className="stat-value">{loadingSessions ? '…' : sessionStats.preparee}</h2>
            <p>preparing session{sessionStats.preparee !== 1 ? 's' : ''}</p>
          </article>
          <article className="feature-card stat-card stat-card-done">
            <p className="eyebrow">COMPLETED</p>
            <h2 className="stat-value">{loadingSessions ? '…' : sessionStats.terminee}</h2>
            <p>completed session{sessionStats.terminee !== 1 ? 's' : ''}</p>

          </article>
        </section>

        <section id="home-sessions-block" className="feature-card sessions-panel home-sessions-panel home-anchor-target">
          <div className="panel-head home-sessions-head">
            <div>
              <p className="eyebrow">YOUR SESSIONS</p>
              <h2>My sessions</h2>
              <p>Track preparing, active, and completed sessions from one panel.</p>
            </div>
            <Link
              className={`btn-primary ${canCreateSession ? '' : 'is-disabled'}`}
              href={withLocalePath('/session-builder')}
              onClick={handleCreateSessionClick}
              aria-disabled={!canCreateSession}
              title={canCreateSession ? 'Create session' : createSessionBlockedReason}
            >
              Create session
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
            <p>No sessions found yet.</p>
          ) : null}

          {!loadingSessions && sessions.length > 0 ? (
            <div className="session-cards-grid">
              {visibleSessions.map((session) => {
                const sessionIdentifier = getSessionIdentifier(session);
                if (!sessionIdentifier) return null;
                const isDeleting = String(deletingSessionId) === sessionIdentifier;
                const statusClass = `status-${session.status || 'preparee'}`;
                const isActive = session.status === 'en_cours';
                const isDone = session.status === 'terminee';
                const openLink = isDone
                  ? withLocalePath(`/session-results/${sessionIdentifier}`)
                  : isActive
                    ? withLocalePath(`/session-live/${sessionIdentifier}`)
                    : withLocalePath(`/session-builder?sessionId=${sessionIdentifier}`);
                const editLink = withLocalePath(`/session-builder?sessionId=${sessionIdentifier}`);
                return (
                  <article key={sessionIdentifier} className={`feature-card session-card ${isDeleting ? 'session-card--deleting' : ''}`}>
                    <div className="session-card-body">
                      <p className="session-title">{session.name || `Session #${sessionIdentifier}`}</p>
                      <p className="session-meta">
                        <span className={`status-pill ${statusClass}`}>
                          {STATUS_LABEL[session.status] || session.status || 'Preparing'}
                        </span>
                        {session.session_date ? (
                          <span className="session-date">{formatSessionDate(session.session_date)}</span>
                        ) : null}
                      </p>
                    </div>
                    <div className="session-card-actions">
                      <Link
                        className="icon-action-btn"
                        href={editLink}
                        title="Edit"
                        aria-label="Edit session"
                      >
                        ✏️
                      </Link>
                      <Link
                        className="icon-action-btn"
                        href={openLink}
                        title={isDone ? 'View results' : isActive ? 'Open session' : 'Configure'}
                        aria-label={isDone ? 'View results' : isActive ? 'Open session' : 'Configure'}
                      >
                        {isDone ? '📊' : isActive ? '▶️' : '⚙️'}
                      </Link>
                      <button
                        type="button"
                        className="icon-action-btn icon-action-danger"
                        title="Delete"
                        aria-label="Delete session"
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
              Show more
            </button>
          ) : null}

          {!loadingSessions && sessions.length > 8 && visibleCount > 8 ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setVisibleCount(8)}
            >
              Collapse list
            </button>
          ) : null}
        </section>

        <section id="home-participants-block" className="feature-card participants-panel home-anchor-target" aria-label="Team participants">
          <div className="participants-panel-head">
            <div>
              <p className="eyebrow">PARTICIPANTS</p>
              <h2>Participant list</h2>
            </div>
            <div className="participants-panel-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={openNewMemberForm}
              >
                Create participant
              </button>
            </div>
          </div>

          <div className="participants-panel-kpis" aria-label="Participant summary">
            <span>{members.length} participant{members.length > 1 ? 's' : ''} total</span>
            <span>{members.filter((member) => String(member.email || '').trim()).length} with email provided</span>
          </div>

          {loadingMembers ? <p>Loading participants...</p> : null}

          {!loadingMembers && members.length === 0 ? (
            <p className="team-empty">No participants yet. Start by creating your first profile.</p>
          ) : null}

          {!loadingMembers && members.length > 0 ? (
            <ul className="session-list manager-member-list">
              {members.map((member) => {
                const title = [getParticipantFirstName(member), getParticipantLastName(member)].filter(Boolean).join(' ').trim() || `Participant #${member.id}`;
                const details = [member.job_title, member.department].filter(Boolean).join(' · ');
                return (
                  <li key={String(member.id)} className="session-item team-member-item">
                    <div>
                      <p className="session-title">{title}</p>
                      <p className="session-meta">
                        {member.email || 'Email not provided'}
                        {details ? ` · ${details}` : ''}
                      </p>
                    </div>
                    <div className="session-item-actions icon-only-actions team-member-actions">
                      <button
                        type="button"
                        className="icon-action-btn"
                        title="Edit"
                        aria-label="Edit this participant"
                        onClick={() => beginEditMember(member)}
                        disabled={deletingMemberId === member.id}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="icon-action-btn icon-action-danger"
                        title="Delete"
                        aria-label="Delete this participant"
                        onClick={() => handleDeleteMember(member)}
                        disabled={deletingMemberId === member.id}
                      >
                        {deletingMemberId === member.id ? '…' : '🗑️'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      </main>
      <Modal
        open={isStartupGuideOpen}
        title="Getting started guide"
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
                <p className="eyebrow manager-onboarding-eyebrow">GETTING STARTED GUIDE</p>
                <h2 id="onboarding-guide-title">Create your first session in 3 simple steps.</h2>
                <p>
                  The flow is fast and intuitive:
                  prepare participants, configure the session, then launch your challenge.
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary manager-onboarding-close"
                onClick={closeStartupGuide}
              >
                Close
              </button>
            </div>

            <div className="manager-onboarding-grid manager-onboarding-grid--modal">
              {STARTUP_GUIDE_STEPS.map((item, index) => (
                <article
                  key={item.step}
                  className="card manager-onboarding-step manager-onboarding-step--premium"
                  style={{ '--onboarding-delay': `${index * 90}ms` }}
                >
                  <div className="manager-onboarding-step__head">
                    <span className="manager-onboarding-step__badge">Step {item.step}</span>
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
        title={editingMemberId ? 'Edit participant' : 'Create participant'}
        titleClassName="participant-modal-title"
        onClose={closeParticipantModal}
      >
        <div className="participant-modal-body">
          <article className="participant-inline-form participant-inline-form--modal">
            <div className="participant-inline-form-head">
              <p>
                {editingMemberId
                  ? 'Update the selected participant information.'
                  : 'Add a participant to assign them to your sessions.'}
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
                  First name *
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
                    <span className="field-error">First name is required.</span>
                  ) : null}
                </label>
                <label>
                  Last name
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
                    <span className="field-error">Email is required.</span>
                  ) : null}
                </label>
                <label className="participant-field-full">
                  Password {editingMemberId ? '(optional)' : '*'}
                  <input
                    type="password"
                    name="participant_access_password"
                    value={memberForm.password}
                    onChange={(e) => setMemberForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder={editingMemberId ? 'Leave blank to keep current password' : 'Minimum 8 characters'}
                    minLength={8}
                    className={formAttempted && !memberFormChecks.passwordOk ? 'input-invalid' : ''}
                    autoComplete="new-password"
                    required={!editingMemberId}
                  />
                  {!editingMemberId ? (
                    <span className="field-help">{memberFormChecks.passwordLength}/8 minimum characters</span>
                  ) : (
                    <span className="field-help">Fill this field only to replace the current password.</span>
                  )}
                  {formAttempted && !memberFormChecks.passwordOk ? (
                    <span className="field-error">Password must be at least 8 characters long.</span>
                  ) : null}
                </label>
                <label>
                  Job title
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
                  Department
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
              <p className="participant-form-hint">Fields marked with * are required to create a usable participant profile.</p>
              {memberFormStatus ? (
                <p className={`participant-form-status ${memberFormStatus.includes('success') || memberFormStatus.includes('created') ? 'participant-form-status--ok' : 'participant-form-status--warn'}`}>
                  {memberFormStatus}
                </p>
              ) : null}
              <div className="participant-form-actions">
                <button type="button" className="btn-secondary" onClick={closeParticipantModal} disabled={creatingMember}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={!canSubmitMember}>
                  {creatingMember
                    ? (editingMemberId ? 'Updating...' : 'Adding...')
                    : (editingMemberId ? 'Save changes' : 'Create participant')}
                </button>
              </div>
            </form>
          </article>
        </div>
      </Modal>
      <Footer />
    </>
  );
}
