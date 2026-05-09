"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import { getApiUrl } from '@/lib/config';

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

  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [challenges, setChallenges] = useState([]);

  const [busyApprovalId, setBusyApprovalId] = useState(null);
  const [busyDeleteKey, setBusyDeleteKey] = useState('');

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
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression utilisateur.');
    } finally {
      setBusyDeleteKey('');
    }
  }

  async function handleDeleteSession(sessionItem) {
    if (!token || !sessionItem?.id) return;
    const accepted = window.confirm(`Supprimer la session ${sessionItem.name || sessionItem.id} ?`);
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
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression session.');
    } finally {
      setBusyDeleteKey('');
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
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression challenge.');
    } finally {
      setBusyDeleteKey('');
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
            <ul className="session-list">
              {users.slice(0, 10).map((u) => (
                <li key={String(u.id)} className="session-item">
                  <div>
                    <p className="session-title">{u.first_name || ''} {u.last_name || ''}</p>
                    <p className="session-meta">{u.email} · {u.role || 'user'}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleDeleteUser(u)}
                    disabled={busyDeleteKey === `user:${u.id}` || String(u.id) === String(user?.id)}
                  >
                    {busyDeleteKey === `user:${u.id}` ? 'Suppression...' : 'Supprimer'}
                  </button>
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
        </section>

        <section className="feature-card admin-grid">
          <div className="admin-column">
            <h2>Dernieres sessions</h2>
            <ul className="session-list">
              {sessions.slice(0, 8).map((s) => (
                <li key={String(s.id)} className="session-item">
                  <div>
                    <p className="session-title">{s.name || `Session #${s.id}`}</p>
                    <p className="session-meta">{s.status || 'preparee'}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleDeleteSession(s)}
                    disabled={busyDeleteKey === `session:${s.id}`}
                  >
                    {busyDeleteKey === `session:${s.id}` ? 'Suppression...' : 'Supprimer'}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="admin-column">
            <h2>Catalogue challenges</h2>
            <ul className="session-list">
              {challenges.slice(0, 8).map((c) => (
                <li key={String(c.id)} className="session-item">
                  <div>
                    <p className="session-title">{c.name || c.title || `Challenge #${c.id}`}</p>
                    <p className="session-meta">{c.engine_key || c.type || 'sans engine'}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleDeleteChallenge(c)}
                    disabled={busyDeleteKey === `challenge:${c.id}`}
                  >
                    {busyDeleteKey === `challenge:${c.id}` ? 'Suppression...' : 'Supprimer'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
