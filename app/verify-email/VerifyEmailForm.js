"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import { resendVerification, verifyEmail } from '@/lib/auth';

export default function VerifyEmailForm({ token, userType = 'user' }) {
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const [resendStatus, setResendStatus] = useState('idle'); // idle | sending | done | error
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Lien de vérification invalide. Vérifiez que vous avez copié le lien en entier depuis votre email.');
      return;
    }

    async function runVerification() {
      try {
        const { res, data } = await verifyEmail({ token, userType });
        if (res.ok && data?.success) {
          setStatus('success');
          setMessage('Votre adresse email a bien été confirmée. Vous pouvez maintenant vous connecter.');
        } else if (data?.code === 'VERIFICATION_TOKEN_EXPIRED') {
          setStatus('error');
          setMessage('Ce lien de vérification a expiré (validité 24h). Veuillez vous réinscrire ou contacter le support.');
        } else {
          setStatus('error');
          setMessage(data?.message || data?.error || 'Lien invalide ou déjà utilisé.');
        }
      } catch {
        setStatus('error');
        setMessage('Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.');
      }
    }

    runVerification();
  }, [token, userType]);

  async function handleResend() {
    setResendStatus('sending');
    setResendMessage('Envoi en cours...');
    try {
      const { res, data } = await resendVerification({ token, userType });
      if (res.ok && data?.success) {
        setResendStatus('done');
        setResendMessage(data?.message || 'Un nouveau lien de verification a ete envoye.');
        return;
      }

      setResendStatus('error');
      setResendMessage(data?.message || data?.error || 'Impossible de renvoyer le lien pour le moment.');
    } catch {
      setResendStatus('error');
      setResendMessage('Impossible de contacter le serveur. Verifiez votre connexion et reessayez.');
    }
  }

  return (
    <main className="shell auth-page">
      <AuthCard
        title="Confirmation de votre email"
        footer={<span><Link href="/login">Retour à la connexion</Link></span>}
      >
        {status === 'loading' && (
          <p className="form-help">Vérification en cours...</p>
        )}

        {status === 'success' && (
          <div className="success-box">
            <p>{message}</p>
            <Link href="/login" className="btn-primary wide">Se connecter</Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <p className="form-error">{message}</p>
            <button
              type="button"
              className="btn-primary wide"
              style={{ marginTop: '1rem' }}
              onClick={handleResend}
              disabled={resendStatus === 'sending'}
            >
              {resendStatus === 'sending' ? 'Envoi...' : 'Renvoyer le lien de verification'}
            </button>
            {resendStatus !== 'idle' && (
              <p className={resendStatus === 'error' ? 'form-error' : 'form-help'} style={{ marginTop: '0.75rem' }}>
                {resendMessage}
              </p>
            )}
            <Link href="/signup" className="btn-secondary wide" style={{ marginTop: '1rem', display: 'block', textAlign: 'center' }}>Créer un nouveau compte</Link>
          </div>
        )}
      </AuthCard>
    </main>
  );
}
