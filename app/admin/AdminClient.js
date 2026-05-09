"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import { getApiUrl } from '@/lib/config';

const USER_ROLES = new Set(['user', 'admin']);
const SESSION_STATUSES = new Set(['preparee', 'en_cours', 'terminee']);
const SESSION_MODALITIES = new Set(['', 'remote', 'hybrid', 'in-person']);
const CHALLENGE_TYPES = new Set(['icebreaker', 'individuel', 'equipe']);
const CHALLENGE_STATUSES = new Set(['actif', 'brouillon', 'archive']);

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function parseList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.sessions)) return payload.sessions;
  if (Array.isArray(payload?.challenges)) return payload.challenges;
  return [];
}

function pickUserLabel(user) {
  if (!user) return 'Admin';
  const first = String(user.first_name || user.firstName || '').trim();
  const last = String(user.last_name || user.lastName || '').trim();
  const full = `${first} ${last}`.trim();
  return full || user.email || 'Admin';
}

export default function AdminClient() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [challenges, setChallenges] = useState([]);

  const [busyApprovalId, setBusyApprovalId] = useState(null);
  const [busyDeleteKey, setBusyDeleteKey] = useState('');
  const [busySaveKey, setBusySaveKey] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [sessionQuery, setSessionQuery] = useState('');
  const [challengeQuery, setChallengeQuery] = useState('');

  const [editingUser, setEditingUser] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [editingChallenge, setEditingChallenge] = useState(null);

  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'user',
  });
  const [newUserMessage, setNewUserMessage] = useState('');

  useEffect(() => {
    const jwt = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    const raw = sessionStorage.getItem('currentUser');
    const currentUser = raw ? JSON.parse(raw) : null;

    if (!jwt || !currentUser) {
      window.location.replace('/login');
      return;
    }

    if (currentUser.role !== 'admin') {
      window.location.replace('/home');
      return;
    }

    setToken(jwt);
    setUser(currentUser);
    setLoading(false);
  }, []);

  const loadAll = useCallback(async () => {
    if (!token) return;
    setError('');

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [usersRes, pendingRes, sessionsRes, challengesRes] = await Promise.all([
        fetch(getApiUrl('/users'), { headers }),
        fetch(getApiUrl('/users/pending'), { headers }),
        fetch(getApiUrl('/sessions'), { headers }),
        fetch(getApiUrl('/challenges'), { headers }),
      ]);

      if (!usersRes.ok || !pendingRes.ok || !sessionsRes.ok || !challengesRes.ok) {
        throw new Error('Impossible de charger les donnees admin.');
      }

      const [usersPayload, pendingPayload, sessionsPayload, challengesPayload] = await Promise.all([
        usersRes.json(),
        pendingRes.json(),
        sessionsRes.json(),
        challengesRes.json(),
      ]);

      setUsers(parseList(usersPayload));
      setPendingUsers(parseList(pendingPayload));
      setSessions(parseList(sessionsPayload));
      setChallenges(parseList(challengesPayload));
    } catch (err) {
      setError(err.message || 'Erreur de chargement admin.');
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadAll();
  }, [token, loadAll]);

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
        throw new Error('Action admin refusee.');
      }

      await loadAll();
      setNotice(approval_status === 'approved' ? 'Compte valide avec succes.' : 'Compte refuse avec succes.');
    } catch (err) {
      setError(err.message || 'Erreur pendant la mise a jour.');
    } finally {
      setBusyApprovalId(null);
    }
  }

  async function submitNewUser(event) {
    event.preventDefault();
    setNewUserMessage('');

    if (!newUser.first_name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      setNewUserMessage('Prenom, email et mot de passe sont obligatoires.');
      return;
    }

    if (!isValidEmail(newUser.email)) {
      setNewUserMessage('Email invalide.');
      return;
    }

    if (!USER_ROLES.has(newUser.role)) {
      setNewUserMessage('Role invalide.');
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
        setNewUserMessage(payload.error || 'Creation utilisateur impossible.');
        return;
      }

      setNewUser({ first_name: '', last_name: '', email: '', password: '', role: 'user' });
      setNewUserMessage('Utilisateur cree avec succes.');
      await loadAll();
      setNotice('Utilisateur cree avec succes.');
    } catch {
      setNewUserMessage('Erreur reseau pendant la creation.');
    }
  }

  async function handleDeleteUser(targetUser) {
    if (!token || !targetUser?.id) return;
    if (String(targetUser.id) === String(user?.id)) {
      setError('Vous ne pouvez pas supprimer votre propre compte admin.');
      return;
    }

    const accepted = window.confirm(`Supprimer l'utilisateur ${targetUser.email || targetUser.id} ?`);
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
        throw new Error(payload.error || `Suppression impossible (${response.status})`);
      }

      await loadAll();
      setNotice('Utilisateur supprime avec succes.');
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression utilisateur.');
    } finally {
      setBusyDeleteKey('');
    }
  }

  function beginEditUser(targetUser) {
    setEditingUser({
      id: targetUser.id,
      first_name: targetUser.first_name || '',
      last_name: targetUser.last_name || '',
      email: targetUser.email || '',
      role: targetUser.role || 'user',
      job_title: targetUser.job_title || '',
      department: targetUser.department || '',
      password: '',
    });
  }

  async function submitEditUser(event) {
    event.preventDefault();
    if (!token || !editingUser?.id) return;

    if (!editingUser.first_name.trim() || !isValidEmail(editingUser.email)) {
      setError('Le prenom et un email valide sont requis.');
      return;
    }

    if (!USER_ROLES.has(editingUser.role)) {
      setError('Role utilisateur invalide.');
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
          ...(editingUser.password ? { password: editingUser.password } : {}),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.details || `Mise a jour impossible (${response.status})`);
      }

      setEditingUser(null);
      await loadAll();
      setNotice('Utilisateur mis a jour avec succes.');
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise a jour utilisateur.');
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleDeleteSession(sessionItem) {
    if (!token || !sessionItem?.id) return;
    const isLive = sessionItem.status === 'en_cours';
    const accepted = window.confirm(
      isLive
        ? `La session ${sessionItem.name || sessionItem.id} est en cours. Confirmer la suppression ?`
        : `Supprimer la session ${sessionItem.name || sessionItem.id} ?`
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
        throw new Error(body || `Suppression impossible (${response.status})`);
      }

      await loadAll();
      setNotice('Session supprimee avec succes.');
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression session.');
    } finally {
      setBusyDeleteKey('');
    }
  }

  function beginEditSession(sessionItem) {
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
      setError('Le nom de session est requis.');
      return;
    }

    if (!SESSION_STATUSES.has(editingSession.status)) {
      setError('Statut de session invalide.');
      return;
    }

    if (!SESSION_MODALITIES.has(editingSession.modality || '')) {
      setError('Modalite invalide. Utilisez remote, hybrid ou in-person.');
      return;
    }

    if (editingSession.duration_minutes && Number(editingSession.duration_minutes) <= 0) {
      setError('La duree doit etre superieure a 0.');
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
          format: editingSession.format || null,
          modality: editingSession.modality || null,
          session_date: editingSession.session_date || null,
          duration_minutes: editingSession.duration_minutes ? Number(editingSession.duration_minutes) : null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.details || `Mise a jour impossible (${response.status})`);
      }

      setEditingSession(null);
      await loadAll();
      setNotice('Session mise a jour avec succes.');
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise a jour session.');
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleDeleteChallenge(challengeItem) {
    if (!token || !challengeItem?.id) return;
    const label = challengeItem.name || challengeItem.title || challengeItem.id;
    const accepted = window.confirm(`Supprimer le challenge ${label} ?`);
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
        throw new Error(body || `Suppression impossible (${response.status})`);
      }

      await loadAll();
      setNotice('Challenge supprime avec succes.');
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression challenge.');
    } finally {
      setBusyDeleteKey('');
    }
  }

  function beginEditChallenge(challengeItem) {
    setEditingChallenge({
      id: challengeItem.id,
      name: challengeItem.name || '',
      type: challengeItem.type || 'individuel',
      status: challengeItem.status || 'actif',
      duration: challengeItem.duration || '',
      engine_key: challengeItem.engine_key || '',
      description: challengeItem.description || '',
    });
  }

  async function submitEditChallenge(event) {
    event.preventDefault();
    if (!token || !editingChallenge?.id) return;

    if (!editingChallenge.name.trim()) {
      setError('Le nom du challenge est requis.');
      return;
    }

    if (!CHALLENGE_TYPES.has(editingChallenge.type)) {
      setError('Type de challenge invalide.');
      return;
    }

    if (!CHALLENGE_STATUSES.has(editingChallenge.status)) {
      setError('Statut de challenge invalide.');
      return;
    }

    const key = `save:challenge:${editingChallenge.id}`;
    setBusySaveKey(key);
    setError('');
    try {
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
          duration: editingChallenge.duration || null,
          engine_key: editingChallenge.engine_key || null,
          description: editingChallenge.description || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.details || `Mise a jour impossible (${response.status})`);
      }

      setEditingChallenge(null);
      await loadAll();
      setNotice('Challenge mis a jour avec succes.');
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise a jour challenge.');
    } finally {
      setBusySaveKey('');
    }
  }

  function logout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    window.location.replace('/login');
  }

  const stats = useMemo(
    () => ({
      users: users.length,
      pending: pendingUsers.length,
      sessions: sessions.length,
      activeSessions: sessions.filter((s) => s.status === 'en_cours').length,
      challenges: challenges.length,
    }),
    [users, pendingUsers, sessions, challenges]
  );

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

  const filteredSessions = useMemo(() => {
    const query = sessionQuery.trim().toLowerCase();
    if (!query) return sessions;
    return sessions.filter((s) => {
      const haystack = [s.name, s.status, s.format, s.modality]
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

  if (loading) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>Verification de la session admin...</h1>
          <p>Chargement en cours.</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <AppNav userLabel={pickUserLabel(user)} onLogout={logout} role="admin" />
      <main className="shell app-home admin-page">
        <section className="hero">
          <p className="eyebrow">CONSOLE ADMIN</p>
          <h1>Pilotage plateforme</h1>
          <p>Gestion des comptes, validation des demandes et supervision des sessions/challenges.</p>
          <div className="hero-actions">
            <button type="button" className="btn-secondary" onClick={loadAll}>Rafraichir</button>
          </div>
        </section>

        {error ? (
          <section className="feature-card">
            <p className="form-error">{error}</p>
          </section>
        ) : null}

        {notice ? (
          <section className="feature-card">
            <p className="notice-ok">{notice}</p>
          </section>
        ) : null}

        <section className="cards-grid" aria-label="Statistiques admin">
          <article className="feature-card"><h2>{stats.users}</h2><p>Utilisateurs</p></article>
          <article className="feature-card"><h2>{stats.pending}</h2><p>Demandes en attente</p></article>
          <article className="feature-card"><h2>{stats.sessions}</h2><p>Sessions</p></article>
          <article className="feature-card"><h2>{stats.activeSessions}</h2><p>Sessions en cours</p></article>
          <article className="feature-card"><h2>{stats.challenges}</h2><p>Challenges</p></article>
        </section>

        <section className="feature-card admin-grid">
          <div className="admin-column">
            <h2>Utilisateurs actifs</h2>
            <input
              type="search"
              className="inline-input"
              placeholder="Rechercher un utilisateur..."
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
            />
            <ul className="session-list">
              {filteredUsers.slice(0, 10).map((u) => (
                <li key={String(u.id)} className="session-item">
                  <div>
                    <p className="session-title">{u.first_name || ''} {u.last_name || ''}</p>
                    <p className="session-meta">{u.email} · {u.role || 'user'}</p>
                  </div>
                  <div className="session-item-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => beginEditUser(u)}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleDeleteUser(u)}
                      disabled={busyDeleteKey === `user:${u.id}` || String(u.id) === String(user?.id)}
                    >
                      {busyDeleteKey === `user:${u.id}` ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="admin-column">
            <h2>Demandes en attente</h2>
            {pendingUsers.length === 0 ? <p>Aucune demande en attente.</p> : null}
            {pendingUsers.map((u) => (
              <div key={String(u.id)} className="admin-row">
                <div>
                  <p className="session-title">{u.first_name || ''} {u.last_name || ''}</p>
                  <p className="session-meta">{u.email}</p>
                </div>
                <div className="hero-actions" style={{ marginTop: 0 }}>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={busyApprovalId === u.id}
                    onClick={() => updateApproval(u.id, 'approved')}
                  >
                    Valider
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busyApprovalId === u.id}
                    onClick={() => updateApproval(u.id, 'rejected')}
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="admin-column">
            <h2>Creer un utilisateur</h2>
            <form className="auth-form" onSubmit={submitNewUser}>
              <label>
                Prenom
                <input value={newUser.first_name} onChange={(e) => setNewUser((p) => ({ ...p, first_name: e.target.value }))} required />
              </label>
              <label>
                Nom
                <input value={newUser.last_name} onChange={(e) => setNewUser((p) => ({ ...p, last_name: e.target.value }))} />
              </label>
              <label>
                Email
                <input type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} required />
              </label>
              <label>
                Mot de passe temporaire
                <input type="password" minLength={8} value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} required />
              </label>
              <label>
                Role
                <select value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
                  <option value="user">Utilisateur</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <button type="submit" className="btn-primary">Creer le compte</button>
            </form>
            {newUserMessage ? <p className="session-meta">{newUserMessage}</p> : null}
          </div>

          <div className="admin-column">
            <h2>Modifier utilisateur</h2>
            {!editingUser ? (
              <p>Selectionnez "Modifier" sur un utilisateur actif.</p>
            ) : (
              <form className="auth-form" onSubmit={submitEditUser}>
                <label>
                  Prenom
                  <input value={editingUser.first_name} onChange={(e) => setEditingUser((p) => ({ ...p, first_name: e.target.value }))} required />
                </label>
                <label>
                  Nom
                  <input value={editingUser.last_name} onChange={(e) => setEditingUser((p) => ({ ...p, last_name: e.target.value }))} />
                </label>
                <label>
                  Email
                  <input type="email" value={editingUser.email} onChange={(e) => setEditingUser((p) => ({ ...p, email: e.target.value }))} required />
                </label>
                <label>
                  Role
                  <select value={editingUser.role} onChange={(e) => setEditingUser((p) => ({ ...p, role: e.target.value }))}>
                    <option value="user">Utilisateur</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label>
                  Fonction
                  <input value={editingUser.job_title} onChange={(e) => setEditingUser((p) => ({ ...p, job_title: e.target.value }))} />
                </label>
                <label>
                  Departement
                  <input value={editingUser.department} onChange={(e) => setEditingUser((p) => ({ ...p, department: e.target.value }))} />
                </label>
                <label>
                  Nouveau mot de passe (optionnel)
                  <input type="password" minLength={8} value={editingUser.password} onChange={(e) => setEditingUser((p) => ({ ...p, password: e.target.value }))} />
                </label>
                <div className="hero-actions" style={{ marginTop: 0 }}>
                  <button type="submit" className="btn-primary" disabled={busySaveKey === `save:user:${editingUser.id}`}>
                    {busySaveKey === `save:user:${editingUser.id}` ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setEditingUser(null)}>Annuler</button>
                </div>
              </form>
            )}
          </div>
        </section>

        <section className="feature-card admin-grid">
          <div className="admin-column">
            <h2>Dernieres sessions</h2>
            <input
              type="search"
              className="inline-input"
              placeholder="Rechercher une session..."
              value={sessionQuery}
              onChange={(e) => setSessionQuery(e.target.value)}
            />
            <ul className="session-list">
              {filteredSessions.slice(0, 8).map((s) => (
                <li key={String(s.id)} className="session-item">
                  <div>
                    <p className="session-title">{s.name || `Session #${s.id}`}</p>
                    <p className="session-meta">{s.status || 'preparee'}</p>
                  </div>
                  <div className="session-item-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => beginEditSession(s)}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleDeleteSession(s)}
                      disabled={busyDeleteKey === `session:${s.id}`}
                    >
                      {busyDeleteKey === `session:${s.id}` ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="admin-column">
            <h2>Modifier session</h2>
            {!editingSession ? (
              <p>Selectionnez "Modifier" sur une session.</p>
            ) : (
              <form className="auth-form" onSubmit={submitEditSession}>
                <label>
                  Nom
                  <input value={editingSession.name} onChange={(e) => setEditingSession((p) => ({ ...p, name: e.target.value }))} required />
                </label>
                <label>
                  Statut
                  <select value={editingSession.status} onChange={(e) => setEditingSession((p) => ({ ...p, status: e.target.value }))}>
                    <option value="preparee">En preparation</option>
                    <option value="en_cours">En cours</option>
                    <option value="terminee">Terminee</option>
                  </select>
                </label>
                <label>
                  Format
                  <input value={editingSession.format} onChange={(e) => setEditingSession((p) => ({ ...p, format: e.target.value }))} />
                </label>
                <label>
                  Modalite
                  <input value={editingSession.modality} onChange={(e) => setEditingSession((p) => ({ ...p, modality: e.target.value }))} placeholder="remote|hybrid|in-person" />
                </label>
                <label>
                  Date
                  <input type="date" value={editingSession.session_date} onChange={(e) => setEditingSession((p) => ({ ...p, session_date: e.target.value }))} />
                </label>
                <label>
                  Duree (minutes)
                  <input type="number" min={1} value={editingSession.duration_minutes} onChange={(e) => setEditingSession((p) => ({ ...p, duration_minutes: e.target.value }))} />
                </label>
                <div className="hero-actions" style={{ marginTop: 0 }}>
                  <button type="submit" className="btn-primary" disabled={busySaveKey === `save:session:${editingSession.id}`}>
                    {busySaveKey === `save:session:${editingSession.id}` ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setEditingSession(null)}>Annuler</button>
                </div>
              </form>
            )}
          </div>

          <div className="admin-column">
            <h2>Catalogue challenges</h2>
            <input
              type="search"
              className="inline-input"
              placeholder="Rechercher un challenge..."
              value={challengeQuery}
              onChange={(e) => setChallengeQuery(e.target.value)}
            />
            <ul className="session-list">
              {filteredChallenges.slice(0, 8).map((c) => (
                <li key={String(c.id)} className="session-item">
                  <div>
                    <p className="session-title">{c.name || c.title || `Challenge #${c.id}`}</p>
                    <p className="session-meta">{c.engine_key || c.type || 'sans engine'}</p>
                  </div>
                  <div className="session-item-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => beginEditChallenge(c)}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleDeleteChallenge(c)}
                      disabled={busyDeleteKey === `challenge:${c.id}`}
                    >
                      {busyDeleteKey === `challenge:${c.id}` ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="admin-column">
            <h2>Modifier challenge</h2>
            {!editingChallenge ? (
              <p>Selectionnez "Modifier" sur un challenge.</p>
            ) : (
              <form className="auth-form" onSubmit={submitEditChallenge}>
                <label>
                  Nom
                  <input value={editingChallenge.name} onChange={(e) => setEditingChallenge((p) => ({ ...p, name: e.target.value }))} required />
                </label>
                <label>
                  Type
                  <select value={editingChallenge.type} onChange={(e) => setEditingChallenge((p) => ({ ...p, type: e.target.value }))}>
                    <option value="individuel">Individuel</option>
                    <option value="equipe">Equipe</option>
                    <option value="icebreaker">Icebreaker</option>
                  </select>
                </label>
                <label>
                  Statut
                  <select value={editingChallenge.status} onChange={(e) => setEditingChallenge((p) => ({ ...p, status: e.target.value }))}>
                    <option value="actif">Actif</option>
                    <option value="brouillon">Brouillon</option>
                    <option value="archive">Archive</option>
                  </select>
                </label>
                <label>
                  Duree
                  <input value={editingChallenge.duration} onChange={(e) => setEditingChallenge((p) => ({ ...p, duration: e.target.value }))} />
                </label>
                <label>
                  Engine key
                  <input value={editingChallenge.engine_key} onChange={(e) => setEditingChallenge((p) => ({ ...p, engine_key: e.target.value }))} />
                </label>
                <label>
                  Description
                  <textarea rows={4} value={editingChallenge.description} onChange={(e) => setEditingChallenge((p) => ({ ...p, description: e.target.value }))} />
                </label>
                <div className="hero-actions" style={{ marginTop: 0 }}>
                  <button type="submit" className="btn-primary" disabled={busySaveKey === `save:challenge:${editingChallenge.id}`}>
                    {busySaveKey === `save:challenge:${editingChallenge.id}` ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setEditingChallenge(null)}>Annuler</button>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
