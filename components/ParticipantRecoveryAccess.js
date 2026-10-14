'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import RecoveryLinkDisplay from './RecoveryLinkDisplay';
import { getAuthHeaders } from '@/lib/auth';
import { getApiUrl } from '@/lib/config';
import { readPersonalLink } from '@/lib/participant-recovery';
import useI18n from '@/lib/i18n/useI18n';

export default function ParticipantRecoveryAccess({ sessionId }) {
  const { locale } = useI18n();
  const isEn = locale === 'en';
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    try {
      setLink(readPersonalLink(sessionId));
      if (sessionStorage.getItem('tb_recovery_notice') === '1') {
        sessionStorage.removeItem('tb_recovery_notice');
        setOpen(true);
      }
      const warning = sessionStorage.getItem('tb_recovery_warning');
      if (warning) setError(warning);
    } catch (err) { setError(err.message); }
  }, [sessionId]);

  async function generateLink() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(getApiUrl(`/sessions/${encodeURIComponent(sessionId)}/recovery-link`), {
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
      <button type="button" className="btn-mini" onClick={() => setOpen(true)}>{isEn ? 'Save my access' : 'Conserver mon acces'}</button>
      <Modal open={open} title={isEn ? 'Resume without losing your progress' : 'Reprendre sans perdre votre progression'} onClose={() => { if (!busy) setOpen(false); }}>
        <p>{isEn
          ? 'On this device, the sign-in page can recognise your participation for up to 30 days. Save a personal link to recover it on another device. Explicit logout invalidates your saved access.'
          : 'Sur cet appareil, la page de connexion peut retrouver votre participation pendant 30 jours maximum. Conservez un lien personnel pour la retrouver sur un autre appareil. Une deconnexion volontaire invalide vos acces memorises.'}</p>
        <p>{isEn ? 'Your team and saved results are retained. You will rejoin the current step, not restart a challenge.' : 'Votre equipe et vos resultats enregistres sont conserves. Vous rejoindrez l etape actuelle, sans relancer de challenge.'}</p>
        {link ? <RecoveryLinkDisplay {...link} /> : null}
        {error ? <p role="alert">{error}</p> : null}
        <button type="button" className="btn-secondary" disabled={busy} onClick={generateLink}>
          {busy ? (isEn ? 'Generating...' : 'Generation...') : link ? (isEn ? 'Replace personal link' : 'Remplacer le lien personnel') : (isEn ? 'Generate personal link' : 'Generer le lien personnel')}
        </button>
        <p>{isEn ? 'A new link invalidates the previous personal link. If you lose all access, contact your facilitator.' : 'Un nouveau lien invalide le lien personnel precedent. Si vous perdez tous vos acces, contactez votre animateur.'}</p>
      </Modal>
    </>
  );
}
