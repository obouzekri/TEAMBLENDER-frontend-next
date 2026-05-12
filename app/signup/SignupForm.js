"use client";

import { useState } from 'react';
import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { registerUser } from '@/lib/auth';

export default function SignupForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setMessage('');

    const f = firstName.trim();
    const l = lastName.trim();
    const e = email.trim().toLowerCase();

    if (!f || !l || !e || !password) {
      setMessage('Veuillez remplir tous les champs.');
      return;
    }
    if (password.length < 8) {
      setMessage('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    try {
      const { res, data, text } = await registerUser({
        email: e,
        password,
        first_name: f,
        last_name: l,
      });

      if (res.status === 201) {
        setDone(true);
        setMessage('Votre compte a bien été créé. Votre demande est en attente de validation par un administrateur.');
        return;
      }

      if (res.status === 409) {
        setMessage('Cet email est deja utilise.');
        return;
      }

      setMessage(data?.message || data?.error || text || 'Une erreur est survenue. Veuillez réessayer.');
    } catch {
      setMessage('Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell auth-page">
      <AuthCard
        title="Créer un compte TEAMSPARK"
        footer={<span>Déjà un compte ? <Link href="/login">Se connecter</Link></span>}
      >
        {done ? (
          <div className="success-box">
            <p>{message}</p>
            <Link href="/login" className="btn-secondary wide">Retour à la connexion</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="auth-form" autoComplete="off">
            <label>
              Prénom *
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Votre prénom" />
            </label>

            <label>
              Nom *
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Votre nom" />
            </label>

            <label>
              Email *
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="votre@email.com" />
            </label>

            <label>
              Mot de passe *
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Minimum 8 caracteres" />
            </label>

            <button type="submit" className="btn-primary wide" disabled={loading}>
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>

            {message ? <p className="form-error">{message}</p> : null}
          </form>
        )}
      </AuthCard>
    </main>
  );
}
