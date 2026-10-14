'use client';

import { useEffect, useState } from 'react';
import useI18n from '@/lib/i18n/useI18n';
import { buildRecoveryUrl } from '@/lib/participant-recovery';

export default function RecoveryLinkDisplay({ linkToken, expiresAt }) {
  const { locale } = useI18n();
  const isEn = locale === 'en';
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
        if (!cancelled) setError(isEn ? 'QR code unavailable. Use the link below.' : 'QR code indisponible. Utilisez le lien ci-dessous.');
      });
    return () => { cancelled = true; };
  }, [url, isEn]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError(isEn ? 'Unable to copy. Select and copy the link manually.' : 'Copie impossible. Selectionnez et copiez le lien manuellement.');
    }
  }

  return (
    <div className="ph-no-capture" data-private>
      <p>{isEn ? 'Personal, single-use link. Keep it private: it grants access to this participation.' : 'Lien personnel a usage unique. Gardez-le secret : il donne acces a cette participation.'}</p>
      {qr ? <img src={qr} width={240} height={240} alt={isEn ? 'Scan to resume participation' : 'Scanner pour reprendre la participation'} /> : null}
      <label>{isEn ? 'Recovery link' : 'Lien de reprise'}
        <input type="text" readOnly value={url} onFocus={(event) => event.target.select()} style={{ width: '100%' }} />
      </label>
      <button type="button" className="btn-secondary" onClick={copy}>{copied ? (isEn ? 'Copied' : 'Copie') : (isEn ? 'Copy link' : 'Copier le lien')}</button>
      <p>{isEn ? 'Valid until' : 'Valable jusqu au'} {new Date(expiresAt).toLocaleString(locale)}.</p>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
