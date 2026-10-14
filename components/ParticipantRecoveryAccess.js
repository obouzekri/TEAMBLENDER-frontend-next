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
      sessionStorage.removeItem('tb_recovery_notice');
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
          ? 'Guests can return using the same session code and first and last names. You can also keep a personal link. Explicit logout invalidates your saved links.'
          : 'Les invites peuvent revenir avec le meme code de session et les memes prenom et nom. Vous pouvez aussi conserver un lien personnel. Une deconnexion volontaire invalide vos liens memorises.'}</p>
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
