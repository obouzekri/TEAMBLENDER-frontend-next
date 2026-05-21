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
  const [showPassword, setShowPassword] = useState(false);
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
        setMessage('Votre compte a bien été créé. Un email de confirmation vous a été envoyé. Cliquez sur le lien dans cet email pour activer votre compte.');
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
        title="Créer un compte TeamBlender"
        footer={<span>Déjà un compte ? <Link href="/login">Se connecter</Link></span>}
      >
        {done ? (
          <div className="success-box">
            <p>{message}</p>
            <Link href="/login" className="btn-secondary wide">Retour à la connexion</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="auth-form" autoComplete="off">
            <input type="text" name="fake_signup_username" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
            <input type="password" name="fake_signup_password" autoComplete="current-password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
            <label>
              Prénom *
              <input type="text" name="signup_first_name" autoComplete="off" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Votre prénom" />
            </label>

            <label>
              Nom *
              <input type="text" name="signup_last_name" autoComplete="off" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Votre nom" />
            </label>

            <label>
              Email *
              <input type="email" name="signup_email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="votre@email.com" />
            </label>

            <label>
              Mot de passe *
              <div className="password-input-wrap">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  name="signup_password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Minimum 8 caracteres"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-controls="signup-password"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M2.29 3.71a1 1 0 011.42-1.42l16.58 16.58a1 1 0 01-1.42 1.42l-2.43-2.43A11.51 11.51 0 0112 19c-5.67 0-9.31-5.23-9.46-5.45a1 1 0 010-1.1A18.87 18.87 0 016.4 8.18L2.29 3.71zM7.85 9.63A9.95 9.95 0 004.58 13c.61.97 3.48 4 7.42 4a9.42 9.42 0 003.13-.53l-1.78-1.78a3.5 3.5 0 01-4.5-4.5L7.85 9.63zm8.25 4.01l-1.47-1.47a3.5 3.5 0 00-2.34-2.34L10.82 8.36A2.5 2.5 0 0115.1 12.64zM12 5c5.67 0 9.31 5.23 9.46 5.45a1 1 0 010 1.1 18.5 18.5 0 01-2.53 2.93l-1.42-1.42A10.44 10.44 0 0019.42 11c-.61-.97-3.48-4-7.42-4a8.9 8.9 0 00-2.39.33L8 5.72A11.18 11.18 0 0112 5z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M12 5c5.67 0 9.31 5.23 9.46 5.45a1 1 0 010 1.1C21.31 11.77 17.67 17 12 17s-9.31-5.23-9.46-5.45a1 1 0 010-1.1C2.69 10.23 6.33 5 12 5zm0 2C8.06 7 5.19 10.03 4.58 11 5.19 11.97 8.06 15 12 15s6.81-3.03 7.42-4C18.81 10.03 15.94 7 12 7zm0 1.5A2.5 2.5 0 1112 13.5 2.5 2.5 0 0112 8.5z" />
                    </svg>
                  )}
                </button>
              </div>
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

