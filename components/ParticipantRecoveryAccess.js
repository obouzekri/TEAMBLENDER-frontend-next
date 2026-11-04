'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import RecoveryLinkDisplay from './RecoveryLinkDisplay';
import { getAuthHeaders } from '@/lib/auth';
import { fetchWithCsrfRetry } from '@/lib/csrf';
import { getApiUrl } from '@/lib/config';
import { readPersonalLink } from '@/lib/participant-recovery';
import useI18n from '@/lib/i18n/useI18n';

export default function ParticipantRecoveryAccess({ sessionId }) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    try {
      setLink(readPersonalLink(sessionId));
      sessionStorage.removeItem('tb_recovery_notice');
      const warning = sessionStorage.getItem('tb_recovery_warning');
      if (warning) setError(warning);
    } catch (err) { setError(err.message); }
  }, [sessionId]);

  async function generateLink() {
    setBusy(true);
    setError('');
    try {
      const res = await fetchWithCsrfRetry(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}/recovery-link`), {
        method: 'POST', headers: getAuthHeaders(), credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || `Erreur ${res.status}`);
      setLink(data);
      sessionStorage.setItem(`tb_participant_recovery_link:${sessionId}`, JSON.stringify(data));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (!sessionId) return null;
  return (
    <>
      <button type="button" className="btn-mini" onClick={() => setOpen(true)}>{t('participantSpace.saveMyAccess')}</button>
      <Modal open={open} title={t('participantSpace.resumeWithoutLosingYourProgress')} onClose={() => { if (!busy) setOpen(false); }}>
        <p>{t('participantSpace.guestsCanReturnUsingTheSame')}</p>
        <p>{t('participantSpace.yourTeamAndSavedResultsAre')}</p>
        {link ? <RecoveryLinkDisplay {...link} /> : null}
        {error ? <p role="alert">{error}</p> : null}
        <button type="button" className="btn-secondary" disabled={busy} onClick={generateLink}>
          {busy ? t('participantSpace.generating') : link ? t('participantSpace.replacePersonalLink') : t('participantSpace.generatePersonalLink')}
        </button>
        <p>{t('participantSpace.aNewLinkInvalidatesThePrevious')}</p>
      </Modal>
    </>
  );
}
