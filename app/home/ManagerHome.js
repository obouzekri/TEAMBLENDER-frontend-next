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

function pickDisplayName(user) {
  if (!user || typeof user !== 'object') return 'Manager';
  const first = String(user.first_name || user.firstName || '').trim();
  const last = String(user.last_name || user.lastName || '').trim();
  const full = `${first} ${last}`.trim();
  return full || String(user.name || user.email || 'Manager');
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
    throw new Error(err.message || `Erreur API sessions`);
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
          showErrorToast(err.message || 'Impossible de charger les sessions.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSessions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [guard.allowed, guard.token, showErrorToast, showLoadingToast, removeToast]);

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
          throw new Error(payload.error || `Erreur API participants (${response.status})`);
        }

        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.items)
            ? payload.items
            : Array.isArray(payload.data)
              ? payload.data
              : [];

        if (!cancelled) {
          setMembers(items);
        }
      })
      .catch((err) => {
        if (!cancelled) {
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
  }, [guard.allowed, guard.token, showErrorToast]);

  function logout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('selectedChallenges');
    window.location.replace('/login');
  }

  async function handleDeleteSession(session) {
    if (!guard.token || !session?.id) return;
    const label = session.name || `Session #${session.id}`;
    const accepted = window.confirm(`Supprimer ${label} ? Cette action est irreversible.`);
    if (!accepted) return;

    setDeletingSessionId(session.id);
    try {
      const response = await fetch(getApiUrl(`/sessions/${encodeURIComponent(session.id)}`), {
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

      setSessions((prev) => prev.filter((item) => String(item.id) !== String(session.id)));
      showSuccessToast('Session supprimee.');
    } catch (err) {
      showErrorToast(err.message || 'Suppression impossible.');
    } finally {
      setDeletingSessionId(null);
    }
  }

  function beginEditMember(member) {
    setEditingMemberId(member.id);
    setMemberForm({
      first_name: String(member.first_name || '').trim(),
      last_name: String(member.last_name || '').trim(),
      email: String(member.email || '').trim(),
      password: '',
      job_title: String(member.job_title || '').trim(),
      department: String(member.department || '').trim(),
    });
  }

  function resetMemberForm() {
    setEditingMemberId(null);
    setMemberForm({ first_name: '', last_name: '', email: '', password: '', job_title: '', department: '' });
  }

  async function handleSubmitMember(event) {
    event.preventDefault();
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
        setMembers(items);
      }
    } catch (err) {
      showErrorToast(err.message || `Impossible de ${editingMemberId ? 'mettre à jour' : 'créer'} le participant.`);
    } finally {
      setCreatingMember(false);
    }
  }

  async function handleDeleteMember(member) {
    if (!guard.token || !member?.id || deletingMemberId) return;

    const label = member.email || `${member.first_name || ''} ${member.last_name || ''}`.trim() || `Participant #${member.id}`;
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
          <p className="eyebrow">ESPACE MANAGER</p>
          <h1>Bonjour {userLabel}</h1>
          <p>Planifiez, lancez et analysez vos sessions de team building en quelques clics.</p>
          <div className="hero-actions home-hero-actions">
            <Link className="btn-primary" href="/session-builder">Créer une session</Link>
            {guard.user?.role === 'admin' && (
              <Link className="btn-secondary" href="/admin">Console admin</Link>
            )}
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
            {sessionStats.terminee > 0 && (
              <Link className="btn-mini stat-link" href={`/session-results/${sessions.find((s) => s.status === 'terminee')?.id}`}>Voir resultats</Link>
            )}
          </article>
        </section>

        <section className="feature-card sessions-panel home-sessions-panel">
          <div className="panel-head home-sessions-head">
            <div>
              <p className="eyebrow">VOS SESSIONS</p>
              <h2>Mes sessions</h2>
              <p>Suivez les sessions préparées, actives ou terminées depuis un seul bloc.</p>
            </div>
            <Link className="btn-primary" href="/session-builder">Créer une session</Link>
          </div>

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
            <ul className="session-list">
              {visibleSessions.map((session) => (
                <li key={String(session.id)} className="session-item">
                  <div>
                    <p className="session-title">{session.name || `Session #${session.id}`}</p>
                    <p className="session-meta">
                      <span className={`status-pill status-${session.status || 'preparee'}`}>
                        {STATUS_LABEL[session.status] || session.status || 'En préparation'}
                      </span>
                      {session.session_date ? (
                        <span className="session-date">{formatSessionDate(session.session_date)}</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="session-item-actions">
                    <Link
                      className="btn-mini"
                      href={
                        session.status === 'en_cours'
                          ? `/session-live/${session.id}`
                          : session.status === 'terminee'
                            ? `/session-results/${session.id}`
                            : `/session-builder?sessionId=${session.id}`
                      }
                    >
                      {session.status === 'terminee' ? 'Résultats' : 'Ouvrir'}
                    </Link>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleDeleteSession(session)}
                      disabled={deletingSessionId === session.id}
                      style={{ minWidth: '96px' }}
                    >
                      {deletingSessionId === session.id ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
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

        <section className="participants-grid" aria-label="Participants de l'équipe">
          <article className="feature-card participant-card participant-form-card">
            <p className="eyebrow">{editingMemberId ? 'MODIFIER PARTICIPANT' : 'NOUVEAU PARTICIPANT'}</p>
            <h2>{editingMemberId ? 'Mettre à jour le profil' : 'Créer un profil'}</h2>
            <p>
              {editingMemberId
                ? 'Modifiez les informations du participant sélectionné.'
                : 'Ajoutez un participant pour l’assigner ensuite à vos sessions.'}
            </p>

            <form className="participant-form" onSubmit={handleSubmitMember}>
              <label>
                Prénom *
                <input
                  type="text"
                  value={memberForm.first_name}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Ex: Sophie"
                  required
                />
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
              <label>
                Email *
                <input
                  type="email"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="sophie@entreprise.com"
                  required
                />
              </label>
              <label>
                Mot de passe {editingMemberId ? '(optionnel)' : '*'}
                <input
                  type="password"
                  value={memberForm.password}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={editingMemberId ? 'Laisser vide pour conserver le mot de passe actuel' : 'Minimum 8 caractères'}
                  minLength={8}
                  required={!editingMemberId}
                />
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
              <div className="participant-form-actions">
                {editingMemberId ? (
                  <button type="button" className="btn-secondary" onClick={resetMemberForm} disabled={creatingMember}>
                    Annuler
                  </button>
                ) : null}
                <button type="submit" className="btn-primary" disabled={creatingMember}>
                  {creatingMember
                    ? (editingMemberId ? 'Mise à jour...' : 'Ajout en cours...')
                    : (editingMemberId ? 'Enregistrer' : 'Ajouter un participant')}
                </button>
              </div>
            </form>
          </article>

          <article className="feature-card participant-card participant-list-card">
            <div className="panel-head">
              <div>
                <p className="eyebrow">ÉQUIPE</p>
                <h2>Participants de l'équipe</h2>
                <p>Visualisez les profils disponibles avant d’assigner vos sessions.</p>
              </div>
              <span className="list-count">{members.length} profil{members.length !== 1 ? 's' : ''}</span>
            </div>

            {loadingMembers ? <p>Chargement des participants...</p> : null}

            {!loadingMembers && members.length === 0 ? (
              <p>Aucun participant pour l'instant.</p>
            ) : null}

            {!loadingMembers && members.length > 0 ? (
              <ul className="session-list">
                {members.slice(0, 8).map((member) => {
                  const title = [member.first_name, member.last_name].filter(Boolean).join(' ').trim() || `Participant #${member.id}`;
                  const details = [member.job_title, member.department].filter(Boolean).join(' · ');
                  return (
                    <li key={String(member.id)} className="session-item">
                      <div>
                        <p className="session-title">{title}</p>
                        <p className="session-meta">
                          {member.email || 'Email non renseigné'}
                          {details ? ` · ${details}` : ''}
                        </p>
                      </div>
                      <div className="session-item-actions icon-only-actions">
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
          </article>
        </section>
      </main>
      <Footer />
    </>
  );
}
