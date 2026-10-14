'use client';

import { useEffect, useRef, useState } from 'react';
import { setStoredAuthSession, getRedirectPath } from '@/lib/auth';
import { readRecoveries, removeRecovery, resumeParticipation, saveRecovery } from '@/lib/participant-recovery';
import useI18n from '@/lib/i18n/useI18n';

export default function ParticipantResume({ fromLink = false }) {
  const { locale, withLocalePath } = useI18n();
  const isEn = locale === 'en';
  const [entries, setEntries] = useState([]);
  const [linkToken, setLinkToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      if (fromLink) {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const token = params.get('recovery') || '';
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        if (!/^[a-f0-9]{64}$/.test(token)) throw new Error(isEn ? 'Invalid recovery link. Ask your facilitator for a new one.' : 'Lien de reprise invalide. Demandez un nouveau lien a votre animateur.');
        setLinkToken(token);
      } else {
        setEntries(readRecoveries());
      }
    } catch (err) { setError(err.message); }
  }, [fromLink, isEn]);

  async function resume(token, kind, sessionId) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const data = await resumeParticipation(token, kind);
      setStoredAuthSession({ token: data.token, user: data.user, targetSessionId: data.sessionId });
      try {
        saveRecovery(data);
      } catch {
        sessionStorage.setItem('tb_recovery_warning', isEn ? 'Automatic recognition could not be saved. Keep a personal link.' : 'La reconnaissance automatique n a pas pu etre memorisee. Conservez un lien personnel.');
      }
      window.location.replace(withLocalePath(getRedirectPath('participant', data.sessionId, data.user.id)));
    } catch (err) {
      setError(err.message);
      if (sessionId && ['RECOVERY_INVALID', 'RECOVERY_UNAVAILABLE', 'SESSION_COMPLETED'].includes(err.code)) {
        try {
          removeRecovery(sessionId);
          setEntries(readRecoveries());
        } catch (storageError) { setError(`${err.message} ${storageError.message}`); }
      }
      setBusy(false);
    }
  }

  if (!fromLink && !entries.length && !error) return null;
  return (
    <section aria-label={isEn ? 'Resume participation' : 'Reprendre une participation'}>
      <h2>{isEn ? 'Resume my participation' : 'Reprendre ma participation'}</h2>
      <p>{isEn ? 'Keep your team and saved results. You will return to the current step.' : 'Retrouvez votre equipe et vos resultats enregistres. Vous reviendrez a l etape actuelle.'}</p>
      {fromLink && linkToken ? (
        <>
          <p>{isEn ? 'Using this link will replace previous access to this participation.' : 'Utiliser ce lien remplacera les anciens acces a cette participation.'}</p>
          <button type="button" className="btn-primary" disabled={busy} onClick={() => resume(linkToken, 'link')}>{busy ? (isEn ? 'Connecting...' : 'Connexion...') : (isEn ? 'Resume participation' : 'Reprendre la participation')}</button>
        </>
      ) : entries.map((entry) => (
        <div key={entry.sessionId}>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => resume(entry.deviceToken, 'device', entry.sessionId)}>
            {isEn ? 'Resume as' : 'Reprendre en tant que'} {entry.participantName} — {isEn ? 'session' : 'session'} {entry.sessionId}
          </button>
        </div>
      ))}
      {error ? <p role="alert">{error}</p> : null}
      {!fromLink ? <p>{isEn ? 'Lost access? Ask your facilitator to restore your existing participation rather than joining again.' : 'Acces perdu ? Demandez a votre animateur de retablir votre participation existante plutot que de rejoindre a nouveau.'}</p> : null}
    </section>
  );
}
