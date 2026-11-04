import useI18n from '@/lib/i18n/useI18n';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true" width="20" height="20">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c6.9 0 9.1-4.8 9.1-7.3 0-.5 0-.9-.1-1.3H12z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true" width="20" height="20">
      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

function SocialButton({ label, provider, icon, busy, onClick, unavailable = false, unavailableLabel }) {
  function handleClick() {
    if (busy) return;
    onClick(provider, unavailable);
  }

  function onKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }

  return (
    <button
      type="button"
      className={`social-auth-btn social-auth-btn--${provider} ${unavailable ? 'social-auth-btn--pending' : ''}`}
      onClick={handleClick}
      onKeyDown={onKeyDown}
      disabled={busy}
      aria-label={label}
      aria-disabled={unavailable ? 'true' : undefined}
      title={unavailable ? unavailableLabel : label}
    >
      <span className="social-auth-icon">{icon}</span>
      <span className="social-auth-label">{label}</span>
      {unavailable ? <span className="social-auth-pill" aria-label={unavailableLabel}>{unavailableLabel}</span> : null}
    </button>
  );
}

export default function AuthSocialButtons({
  loading = false,
  loadingProvider = '',
  onProviderClick,
  microsoftEnabled = false,
  stacked = false,
  googleLabelOverride = '',
  separatorLabelOverride = '',
}) {
  const { locale, t } = useI18n();
  const busy = loading || loadingProvider !== '';
  const unavailableLabel = t('auth.comingSoon');
  const socialGroupLabel = t('auth.socialSignIns');
  const continueWithEmail = separatorLabelOverride || t('auth.orContinueWithYourEmailAddress');
  const googleLabel = googleLabelOverride || (loadingProvider === 'google'
    ? t('auth.redirectingToGoogle')
    : t('auth.continueWithGmail'));
  const microsoftLabel = loadingProvider === 'microsoft'
    ? t('auth.redirectingToMicrosoft')
    : t('auth.continueWithMicrosoft');

  return (
    <div className="social-auth-stack">
      <div className={`social-auth-row${stacked ? ' social-auth-row--stacked' : ''}`} role="group" aria-label={socialGroupLabel}>
        <SocialButton
          label={googleLabel}
          provider="google"
          icon={<GoogleIcon />}
          busy={busy}
          onClick={onProviderClick}
          unavailableLabel={unavailableLabel}
        />
        <SocialButton
          label={microsoftLabel}
          provider="microsoft"
          icon={<MicrosoftIcon />}
          busy={busy}
          onClick={onProviderClick}
          unavailable={!microsoftEnabled}
          unavailableLabel={unavailableLabel}
        />
      </div>
      <div className="social-auth-separator" role="separator" aria-label={continueWithEmail}>
        <span>{continueWithEmail}</span>
      </div>
    </div>
  );
}