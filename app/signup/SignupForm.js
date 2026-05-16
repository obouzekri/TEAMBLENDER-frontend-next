"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { registerUser } from '@/lib/auth';
import { getApiUrl } from '@/lib/config';

export default function SignupForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [plansLoading, setPlansLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadPlans() {
      setPlansLoading(true);
      try {
        const res = await fetch(getApiUrl('/pricing-plans'));
        if (!res.ok) return;
        const data = await res.json();
        if (!active || !Array.isArray(data)) return;
        setPlans(data);

        const highlighted = data.find((plan) => Boolean(plan?.highlighted));
        const fallback = highlighted || data[0];
        if (fallback?.id) {
          setSelectedPlanId(String(fallback.id));
        }
      } catch {
        // Keep signup usable even if pricing catalog is temporarily unavailable.
      } finally {
        if (active) setPlansLoading(false);
      }
    }

    loadPlans();
    return () => {
      active = false;
    };
  }, []);

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
        pricing_plan_id: selectedPlanId ? Number(selectedPlanId) : undefined,
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
              <input type="password" name="signup_password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Minimum 8 caracteres" />
            </label>

            {plansLoading ? (
              <p className="form-help">Chargement des formules...</p>
            ) : plans.length > 0 ? (
              <label>
                Formule *
                <select
                  name="signup_pricing_plan"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  required
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {(Number(plan.price || 0)).toFixed(2)} {plan.currency || 'EUR'}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="form-help">Aucune formule active trouvée. Un plan par défaut sera appliqué.</p>
            )}

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

