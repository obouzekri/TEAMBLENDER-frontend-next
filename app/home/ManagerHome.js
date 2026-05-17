"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import ToastContainer from '@/components/ToastContainer';
import SessionCardSkeleton from '@/components/SessionCardSkeleton';
import { getApiUrl } from '@/lib/config';
import useToast from '@/lib/useToast';
import { fetchSessionsWithRetry } from '@/lib/api';
import { clearStoredAuth } from '@/lib/auth';

function pickDisplayName(user) {
  if (!user || typeof user !== 'object') return 'Manager';
  const first = String(user.first_name || user.firstName || '').trim();
  const last = String(user.last_name || user.lastName || '').trim();
  const full = `${first} ${last}`.trim();
  return full || String(user.name || user.email || 'Manager');
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

function formatSessionDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
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
  }, []);

  return state;
}

async function fetchSessions(token) {
  try {
    const data = await fetchSessionsWithRetry(token);
    const items = Array.isArray(data) ? data : (data.sessions || data.data || []);
    return Array.isArray(items) ? items : [];
  } catch (err) {
    const wrapped = new Error(err.message || 'Erreur API sessions');
    wrapped.status = err?.status;
    wrapped.code = err?.code;
    throw wrapped;
  }
}

export default function ManagerHome() {
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
  const [memberForm, setMemberForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    job_title: '',
    department: '',
  });

  const userLabel = useMemo(() => pickDisplayName(guard.user), [guard.user]);

  const STATUS_LABEL = { en_cours: 'En cours', preparee: 'En préparation', terminee: 'Terminée' };

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
  const createSessionBlockedReason = loadingMembers
    ? 'Chargement des participants en cours...'
    : 'Creation indisponible: ajoutez d abord des participants dans votre espace manager.';

  function handleCreateSessionClick(event) {
    if (canCreateSession) return;
    event.preventDefault();
    showErrorToast(createSessionBlockedReason);
  }

  function handleUnauthorizedAuth(message = 'Session expirée. Veuillez vous reconnecter.') {
    if (authInvalid) return;
    setAuthInvalid(true);
    showErrorToast(message);
    clearStoredAuth();
    window.location.replace('/login?reason=session_expired');
  }



  useEffect(() => {
    if (!guard.allowed || !guard.token) return;

    let cancelled = false;
    setLoadingSessions(true);
    const loadingId = showLoadingToast('Chargement des sessions...');

    fetchSessions(guard.token)
      .then((data) => {
        if (!cancelled) {
          setSessions(data);
          removeToast(loadingId);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          removeToast(loadingId);
          if (Number(err?.status) === 401) {
            handleUnauthorizedAuth();
            return;
          }
          showErrorToast(err.message || 'Impossible de charger les sessions.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSessions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [guard.allowed, guard.token, showErrorToast, showLoadingToast, removeToast, authInvalid]);

  useEffect(() => {
    if (!guard.allowed || !guard.token) return;

    let cancelled = false;
    setLoadingMembers(true);

    fetch(getApiUrl('/participants'), {
      headers: {
        Authorization: `Bearer ${guard.token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(async (response) => {
        const text = await response.text();
        let payload = {};
        try {
          payload = text ? JSON.parse(text) : {};
        } catch {
          payload = {};
        }

        if (!response.ok) {
          const error = new Error(payload.error || `Erreur API participants (${response.status})`);
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

        if (!cancelled) {
          setMembers(items.map(normalizeParticipant));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (Number(err?.status) === 401) {
            handleUnauthorizedAuth();
            return;
          }
          showErrorToast(err.message || 'Impossible de charger les participants.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingMembers(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [guard.allowed, guard.token, showErrorToast, authInvalid]);

  function logout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('selectedChallenges');
    window.location.replace('/login');
  }

  async function handleDeleteSession(session) {
    const sessionIdentifier = getSessionIdentifier(session);
    if (!guard.token || !sessionIdentifier) return;
    const label = session.name || `Session #${sessionIdentifier}`;
    const accepted = window.confirm(`Supprimer ${label} ? Cette action est irreversible.`);
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
        throw new Error(body || `Erreur ${response.status}`);
      }

      setSessions((prev) => prev.filter((item) => getSessionIdentifier(item) !== sessionIdentifier));
      showSuccessToast('Session supprimee.');
    } catch (err) {
      showErrorToast(err.message || 'Suppression impossible.');
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
        ? 'Prénom et email sont obligatoires.'
        : 'Prénom, email et mot de passe sont obligatoires.');
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
        throw new Error(payload.error || `${editingMemberId ? 'Mise à jour' : 'Création'} participant impossible (${response.status})`);
      }

      showSuccessToast(editingMemberId ? 'Participant mis à jour avec succès.' : 'Participant ajouté avec succès.');
      setShowParticipantForm(false);
      resetMemberForm();

      const refresh = await fetch(getApiUrl('/participants'), {
        headers: {
          Authorization: `Bearer ${guard.token}`,
          'Content-Type': 'application/json',
        },
      });
      const refreshText = await refresh.text();
      let refreshPayload = {};
      try {
        refreshPayload = refreshText ? JSON.parse(refreshText) : {};
      } catch {
        refreshPayload = {};
      }

      if (refresh.ok) {
        const items = Array.isArray(refreshPayload)
          ? refreshPayload
          : Array.isArray(refreshPayload.items)
            ? refreshPayload.items
            : Array.isArray(refreshPayload.data)
              ? refreshPayload.data
              : [];
        setMembers(items.map(normalizeParticipant));
      }
    } catch (err) {
      setMemberFormStatus(err.message || `Impossible de ${editingMemberId ? 'mettre à jour' : 'créer'} le participant.`);
      showErrorToast(err.message || `Impossible de ${editingMemberId ? 'mettre à jour' : 'créer'} le participant.`);
    } finally {
      setCreatingMember(false);
    }
  }

  async function handleDeleteMember(member) {
    if (!guard.token || !member?.id || deletingMemberId) return;

    const label = member.email || `${getParticipantFirstName(member)} ${getParticipantLastName(member)}`.trim() || `Participant #${member.id}`;
    const accepted = window.confirm(`Supprimer ${label} ? Cette action est irreversible.`);
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
        throw new Error(body || `Suppression participant impossible (${response.status})`);
      }

      setMembers((prev) => prev.filter((item) => String(item.id) !== String(member.id)));
      showSuccessToast('Participant supprimé.');
    } catch (err) {
      showErrorToast(err.message || 'Suppression participant impossible.');
    } finally {
      setDeletingMemberId(null);
    }
  }

  if (guard.loading) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>Verification de la session...</h1>
          <p>Chargement en cours.</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <AppNav userLabel={userLabel} onLogout={logout} role={guard.user?.role} />
      <main className="shell app-home manager-home">
        <section className="hero home-hero">
          <div className="home-hero-grid">
            <div className="home-hero-copy">
              <p className="eyebrow">ESPACE MANAGER</p>
              <h1>Bonjour {userLabel}</h1>
              <p>Planifiez, lancez et analysez vos sessions de team building dans un espace unique, clair et directement exploitable.</p>
              <div className="hero-actions home-hero-actions">
                <Link
                  className={`btn-primary ${canCreateSession ? '' : 'is-disabled'}`}
                  href="/session-builder"
                  onClick={handleCreateSessionClick}
                  aria-disabled={!canCreateSession}
                  title={canCreateSession ? 'Creer une session' : createSessionBlockedReason}
                >
                  Créer une session
                </Link>
                {guard.user?.role === 'admin' && (
                  <Link className="btn-secondary" href="/admin">Console admin</Link>
                )}
              </div>
              {!canCreateSession ? (
                <p className="home-prerequisite-hint" role="status">{createSessionBlockedReason}</p>
              ) : null}
              <div className="home-hero-trust" aria-label="Benefices manager">
                <span>Preparation guidee</span>
                <span>Animation live structuree</span>
                <span>Resultats exploitables</span>
              </div>
            </div>

            <aside className="home-hero-summary" aria-label="Synthese manager">
              <p className="home-hero-summary__eyebrow">Vue rapide</p>
              <strong className="home-hero-summary__title">Un cockpit simple pour piloter vos sessions.</strong>
              <ul className="home-hero-summary__list">
                <li>Creer et configurer une session sans friction</li>
                <li>Suivre les sessions actives et preparatoires au meme endroit</li>
                <li>Garder une base participants prete pour les prochains rituels</li>
              </ul>
            </aside>
          </div>
        </section>

        <section className="cards-grid" aria-label="Statistiques sessions">
          <article className="feature-card stat-card stat-card-live">
            <p className="eyebrow">EN COURS</p>
            <h2 className="stat-value">{loadingSessions ? '…' : sessionStats.enCours}</h2>
            <p>session{sessionStats.enCours !== 1 ? 's' : ''} active{sessionStats.enCours !== 1 ? 's' : ''}</p>
          </article>
          <article className="feature-card stat-card stat-card-ready">
            <p className="eyebrow">A CONFIGURER</p>
            <h2 className="stat-value">{loadingSessions ? '…' : sessionStats.preparee}</h2>
            <p>session{sessionStats.preparee !== 1 ? 's' : ''} en preparation</p>
          </article>
          <article className="feature-card stat-card stat-card-done">
            <p className="eyebrow">TERMINEES</p>
            <h2 className="stat-value">{loadingSessions ? '…' : sessionStats.terminee}</h2>
            <p>session{sessionStats.terminee !== 1 ? 's' : ''} cloturee{sessionStats.terminee !== 1 ? 's' : ''}</p>

          </article>
        </section>

        <section id="home-sessions-block" className="feature-card sessions-panel home-sessions-panel home-anchor-target">
          <div className="panel-head home-sessions-head">
            <div>
              <p className="eyebrow">VOS SESSIONS</p>
              <h2>Mes sessions</h2>
              <p>Suivez les sessions préparées, actives ou terminées depuis un seul bloc.</p>
            </div>
            <Link
              className={`btn-primary ${canCreateSession ? '' : 'is-disabled'}`}
              href="/session-builder"
              onClick={handleCreateSessionClick}
              aria-disabled={!canCreateSession}
              title={canCreateSession ? 'Creer une session' : createSessionBlockedReason}
            >
              Créer une session
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
            <p>Aucune session trouvee pour le moment.</p>
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
                  ? `/session-results/${sessionIdentifier}`
                  : isActive
                    ? `/session-live/${sessionIdentifier}`
                    : `/session-builder?sessionId=${sessionIdentifier}`;
                const editLink = `/session-builder?sessionId=${sessionIdentifier}`;
                return (
                  <article key={sessionIdentifier} className={`feature-card session-card ${isDeleting ? 'session-card--deleting' : ''}`}>
                    <div className="session-card-body">
                      <p className="session-title">{session.name || `Session #${sessionIdentifier}`}</p>
                      <p className="session-meta">
                        <span className={`status-pill ${statusClass}`}>
                          {STATUS_LABEL[session.status] || session.status || 'En préparation'}
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
                        title="Modifier"
                        aria-label="Modifier la session"
                      >
                        ✏️
                      </Link>
                      <Link
                        className="icon-action-btn"
                        href={openLink}
                        title={isDone ? 'Voir les résultats' : isActive ? 'Ouvrir la session' : 'Configurer'}
                        aria-label={isDone ? 'Voir les résultats' : isActive ? 'Ouvrir la session' : 'Configurer'}
                      >
                        {isDone ? '📊' : isActive ? '▶️' : '⚙️'}
                      </Link>
                      <button
                        type="button"
                        className="icon-action-btn icon-action-danger"
                        title="Supprimer"
                        aria-label="Supprimer la session"
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
              Afficher plus
            </button>
          ) : null}

          {!loadingSessions && sessions.length > 8 && visibleCount > 8 ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setVisibleCount(8)}
            >
              Replier la liste
            </button>
          ) : null}
        </section>

        <section id="home-participants-block" className="feature-card participants-panel home-anchor-target" aria-label="Participants de l'équipe">
          <div className="participants-panel-head">
            <div>
              <p className="eyebrow">PARTICIPANTS</p>
              <h2>Liste participant</h2>
            </div>
            <div className="participants-panel-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={showParticipantForm || editingMemberId ? resetMemberForm : openNewMemberForm}
              >
                {showParticipantForm || editingMemberId ? 'Fermer le formulaire' : 'Créer un participant'}
              </button>
            </div>
          </div>

          {showParticipantForm || editingMemberId ? (
            <article className="participant-inline-form">
              <div className="participant-inline-form-head">
                <p className="eyebrow">{editingMemberId ? 'MODIFIER PARTICIPANT' : 'NOUVEAU PARTICIPANT'}</p>
                <h3>{editingMemberId ? 'Mettre à jour le profil' : 'Créer un participant'}</h3>
                <p>
                  {editingMemberId
                    ? 'Modifiez les informations du participant sélectionné.'
                    : 'Ajoutez un participant pour l’assigner ensuite à vos sessions.'}
                </p>
              </div>

              <form className="participant-form participant-form--embedded" onSubmit={handleSubmitMember}>
                <div className="participant-form-grid">
                  <label>
                    Prénom *
                    <input
                      type="text"
                      value={memberForm.first_name}
                      onChange={(e) => setMemberForm((prev) => ({ ...prev, first_name: e.target.value }))}
                      placeholder="Ex: Sophie"
                      className={formAttempted && !memberFormChecks.firstNameOk ? 'input-invalid' : ''}
                      required
                    />
                    {formAttempted && !memberFormChecks.firstNameOk ? (
                      <span className="field-error">Le prénom est requis.</span>
                    ) : null}
                  </label>
                  <label>
                    Nom
                    <input
                      type="text"
                      value={memberForm.last_name}
                      onChange={(e) => setMemberForm((prev) => ({ ...prev, last_name: e.target.value }))}
                      placeholder="Ex: Martin"
                    />
                  </label>
                  <label className="participant-field-full">
                    Email *
                    <input
                      type="email"
                      value={memberForm.email}
                      onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="sophie@entreprise.com"
                      className={formAttempted && !memberFormChecks.emailOk ? 'input-invalid' : ''}
                      required
                    />
                    {formAttempted && !memberFormChecks.emailOk ? (
                      <span className="field-error">L'email est requis.</span>
                    ) : null}
                  </label>
                  <label className="participant-field-full">
                    Mot de passe {editingMemberId ? '(optionnel)' : '*'}
                    <input
                      type="password"
                      value={memberForm.password}
                      onChange={(e) => setMemberForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder={editingMemberId ? 'Laisser vide pour conserver le mot de passe actuel' : 'Minimum 8 caractères'}
                      minLength={8}
                      className={formAttempted && !memberFormChecks.passwordOk ? 'input-invalid' : ''}
                      required={!editingMemberId}
                    />
                    {!editingMemberId ? (
                      <span className="field-help">{memberFormChecks.passwordLength}/8 caractères minimum</span>
                    ) : (
                      <span className="field-help">Renseignez ce champ uniquement pour remplacer le mot de passe actuel.</span>
                    )}
                    {formAttempted && !memberFormChecks.passwordOk ? (
                      <span className="field-error">Le mot de passe doit contenir au moins 8 caractères.</span>
                    ) : null}
                  </label>
                  <label>
                    Fonction
                    <input
                      type="text"
                      value={memberForm.job_title}
                      onChange={(e) => setMemberForm((prev) => ({ ...prev, job_title: e.target.value }))}
                      placeholder="Ex: Product Manager"
                    />
                  </label>
                  <label>
                    Département
                    <input
                      type="text"
                      value={memberForm.department}
                      onChange={(e) => setMemberForm((prev) => ({ ...prev, department: e.target.value }))}
                      placeholder="Ex: RH"
                    />
                  </label>
                </div>
                <p className="participant-form-hint">Les champs marqués * sont requis pour créer un profil exploitable en session.</p>
                {memberFormStatus ? (
                  <p className={`participant-form-status ${memberFormStatus.includes('succès') || memberFormStatus.includes('créé') ? 'participant-form-status--ok' : 'participant-form-status--warn'}`}>
                    {memberFormStatus}
                  </p>
                ) : null}
                <div className="participant-form-actions">
                  <button type="button" className="btn-secondary" onClick={resetMemberForm} disabled={creatingMember}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary" disabled={!canSubmitMember}>
                    {creatingMember
                      ? (editingMemberId ? 'Mise à jour...' : 'Ajout en cours...')
                      : (editingMemberId ? 'Enregistrer' : 'Ajouter un participant')}
                  </button>
                </div>
              </form>
            </article>
          ) : null}

          {loadingMembers ? <p>Chargement des participants...</p> : null}

          {!loadingMembers && members.length === 0 ? (
            <p className="team-empty">Aucun participant pour l'instant. Commencez par créer votre premier profil.</p>
          ) : null}

          {!loadingMembers && members.length > 0 ? (
            <ul className="session-list">
              {members.map((member) => {
                const title = [getParticipantFirstName(member), getParticipantLastName(member)].filter(Boolean).join(' ').trim() || `Participant #${member.id}`;
                const details = [member.job_title, member.department].filter(Boolean).join(' · ');
                return (
                  <li key={String(member.id)} className="session-item team-member-item">
                    <div>
                      <p className="session-title">{title}</p>
                      <p className="session-meta">
                        {member.email || 'Email non renseigné'}
                        {details ? ` · ${details}` : ''}
                      </p>
                    </div>
                    <div className="session-item-actions icon-only-actions team-member-actions">
                      <button
                        type="button"
                        className="icon-action-btn"
                        title="Modifier"
                        aria-label="Modifier ce participant"
                        onClick={() => beginEditMember(member)}
                        disabled={deletingMemberId === member.id}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="icon-action-btn icon-action-danger"
                        title="Supprimer"
                        aria-label="Supprimer ce participant"
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
      <Footer />
    </>
  );
}
