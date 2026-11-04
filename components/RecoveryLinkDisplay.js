'use client';

import { useEffect, useState } from 'react';
import useI18n from '@/lib/i18n/useI18n';
import { buildRecoveryUrl } from '@/lib/participant-recovery';

export default function RecoveryLinkDisplay({ linkToken, expiresAt }) {
  const { locale, t } = useI18n();
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState('');
  const url = typeof window === 'undefined' ? '' : buildRecoveryUrl(linkToken, window.location.origin, locale);

  useEffect(() => {
    let cancelled = false;
    setCopied(false);
    setError('');
    setQr('');
    import('qrcode').then((module) => module.default.toDataURL(url, { width: 240, margin: 2 }))
      .then((image) => { if (!cancelled) setQr(image); })
      .catch(() => {
        if (!cancelled) setError(t('participantSpace.qrCodeUnavailableUseTheLink'));
      });
    return () => { cancelled = true; };
  }, [url, locale]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError(t('participantSpace.unableToCopySelectAndCopy'));
    }
  }

  return (
    <div className="ph-no-capture" data-private>
      <p>{t('participantSpace.personalSingleUseLinkKeepIt')}</p>
      {qr ? <img src={qr} width={240} height={240} alt={t('participantSpace.scanToResumeParticipation')} /> : null}
      <label>{t('participantSpace.recoveryLink')}
        <input type="text" readOnly value={url} onFocus={(event) => event.target.select()} style={{ width: '100%' }} />
      </label>
      <button type="button" className="btn-secondary" onClick={copy}>{copied ? t('participantSpace.copied') : t('participantSpace.copyLink')}</button>
      <p>{t('participantSpace.validUntil')} {new Date(expiresAt).toLocaleString(locale)}.</p>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
