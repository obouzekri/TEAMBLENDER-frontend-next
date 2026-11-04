'use client';

import { useEffect, useRef, useState } from 'react';
import { setStoredAuthSession, getRedirectPath } from '@/lib/auth';
import { readRecoveries, removeRecovery, resumeParticipation, saveRecovery } from '@/lib/participant-recovery';
import useI18n from '@/lib/i18n/useI18n';

export default function ParticipantResume({ fromLink = false }) {
  const { locale, withLocalePath, t } = useI18n();
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
        if (!/^[a-f0-9]{64}$/.test(token)) throw new Error(t('participantSpace.invalidRecoveryLinkAskYourFacilitator'));
        setLinkToken(token);
      } else {
        setEntries(readRecoveries());
      }
    } catch (err) { setError(err.message); }
  }, [fromLink, locale]);

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
        sessionStorage.setItem('tb_recovery_warning', t('participantSpace.automaticRecognitionCouldNotBeSaved'));
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
    <section aria-label={t('participantSpace.resumeParticipation')}>
      <h2>{t('participantSpace.resumeMyParticipation')}</h2>
      <p>{t('participantSpace.keepYourTeamAndSavedResults')}</p>
      {fromLink && linkToken ? (
        <>
          <p>{t('participantSpace.usingThisLinkWillReplacePrevious')}</p>
          <button type="button" className="btn-primary" disabled={busy} onClick={() => resume(linkToken, 'link')}>{busy ? t('participantSpace.connecting') : t('participantSpace.resumeParticipation2')}</button>
        </>
      ) : entries.map((entry) => (
        <div key={entry.sessionId}>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => resume(entry.deviceToken, 'device', entry.sessionId)}>
            {t('participantSpace.resumeAs')} {entry.participantName} — {t('participantSpace.session')} {entry.sessionId}
          </button>
        </div>
      ))}
      {error ? <p role="alert">{error}</p> : null}
      {!fromLink ? <p>{t('participantSpace.lostAccessAskYourFacilitatorTo')}</p> : null}
    </section>
  );
}
