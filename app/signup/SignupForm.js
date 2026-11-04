"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Circle, CheckCircle2, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, User } from 'lucide-react';
import AuthCard from '@/components/AuthCard';
import AuthField from '@/components/AuthField';
import AuthSocialButtons from '@/components/AuthSocialButtons';
import Logo from '@/components/Logo';
import { identifyAnalyticsUser, trackGtmEvent, trackPosthogEvent, trackProductUserEvent } from '@/lib/analytics';
import {
  clearOAuthCallbackParamsFromUrl,
  ensureCsrfToken,
  getOAuthStartUrl,
  getRedirectPath,
  readOAuthCallbackFromLocation,
  registerUser,
  resolveConnectedUserId,
  setStoredAuthSession,
} from '@/lib/auth';
import useI18n from '@/lib/i18n/useI18n';

export default function SignupForm() {
  const { locale, withLocalePath, t } = useI18n();
  const microsoftLoginEnabled = String(process.env.NEXT_PUBLIC_MICROSOFT_LOGIN_ENABLED || 'false').toLowerCase() === 'true';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState('');
  const [touched, setTouched] = useState({});

  const passwordChecks = useMemo(() => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }), [password]);

  const passwordScore = Object.values(passwordChecks).filter(Boolean).length;
  const passwordLevel = password.length === 0 ? null
    : passwordScore <= 1 ? 'weak'
    : passwordScore <= 2 ? 'fair'
    : passwordScore <= 3 ? 'good'
    : passwordScore <= 4 ? 'strong'
    : 'excellent';

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const emailLooksValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail), [normalizedEmail]);
  const showEmailStatus = Boolean(touched.email) && normalizedEmail.length > 0;
  const emailStatusLabel = emailLooksValid
    ? t('auth.emailFormatLooksValid')
    : t('auth.enterAValidEmailAddress2');

  useEffect(() => {
    ensureCsrfToken().catch(() => {});
  }, []);

  useEffect(() => {
    const oauth = readOAuthCallbackFromLocation();
    if (!oauth.hasOAuthPayload) return;

    clearOAuthCallbackParamsFromUrl();

    if (oauth.error) {
      setMessage(oauth.errorDescription || t('auth.socialLoginFailedPleaseTryAgain'));
      return;
    }

    if (!oauth.user) {
      setMessage(t('auth.invalidOauthResponsePleaseTryAgain'));
      return;
    }

    setStoredAuthSession({ user: oauth.user });

    trackPosthogEvent('signup_oauth', {
      provider: oauth.provider || 'unknown',
      source: 'frontend',
    });
    trackGtmEvent('signup_oauth', { provider: oauth.provider || 'unknown' });

    const connectedUserId = resolveConnectedUserId(oauth.user);
    identifyAnalyticsUser(connectedUserId, {
      role: String(oauth.user?.role || 'unknown').toLowerCase(),
      auth_method: 'oauth',
    });

    trackProductUserEvent('oauth_signup_success', {
      provider: oauth.provider || 'unknown',
      authMethod: 'oauth',
      userId: connectedUserId,
      surface: 'signup',
    });

    const redirect = withLocalePath(getRedirectPath(oauth.user.role, '', connectedUserId));
    window.location.href = redirect;
  }, [locale, withLocalePath]);

  function startOAuth(provider) {
    const url = getOAuthStartUrl(provider, '/signup');
    if (!url) {
      setMessage(provider === 'microsoft'
        ? t('auth.microsoftLoginWillBeAvailableSoon')
        : t('auth.oauthConfigurationUnavailable'));
      return;
    }

    setMessage('');
    setOauthLoadingProvider(provider);
    window.location.href = url;
  }

  async function onSubmit(event) {
    event.preventDefault();
    setMessage('');

    const f = firstName.trim();
    const l = lastName.trim();
    const e = normalizedEmail;

    if (!f || !l || !e || !password) {
      setMessage(t('auth.pleaseFillInAllFields'));
      return;
    }
    if (password.length < 8) {
      setMessage(t('auth.passwordMustBeAtLeast8'));
      return;
    }

    setLoading(true);
    try {
      const { res, data, text } = await registerUser({
        email: e,
        password,
        first_name: f,
        last_name: l,
        locale,
      });

      if (res.status === 201) {
        trackProductUserEvent('signup_success', {
          authMethod: 'password',
          surface: 'signup',
        });
        setDone(true);
        setMessage(t('auth.yourAccountHasBeenCreatedA'));
        return;
      }

      if (res.status === 409) {
        setMessage(t('auth.thisEmailIsAlreadyInUse'));
        return;
      }

      setMessage(data?.message || data?.error || text || t('auth.somethingWentWrongPleaseTryAgain'));
    } catch {
      setMessage(t('auth.unableToReachTheServerCheck'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page auth-page--signup">
      <AuthCard
        title={t('auth.createYourTeamblenderAccount')}
        brand={<Link href={withLocalePath('/')} className="auth-card-brand-link" aria-label={t('auth.backToTeamblenderHome')}><Logo size="compact" /></Link>}
        footer={<span>{t('auth.alreadyHaveAnAccount')}<Link href={withLocalePath('/login')}>{t('auth.logIn')}</Link></span>}
      >
        {done ? (
          <div className="success-box">
            <p>{message}</p>
            <Link href={withLocalePath('/login')} className="btn-primary wide">{t('auth.backToLogin')}</Link>
          </div>
        ) : (
          <>
            <AuthSocialButtons
              loading={loading}
              loadingProvider={oauthLoadingProvider}
              microsoftEnabled={microsoftLoginEnabled}
              stacked
              googleLabelOverride={t('auth.continueWithGoogle')}
              separatorLabelOverride={t('auth.orContinueWithYourEmailAddress')}
              onProviderClick={(provider) => startOAuth(provider)}
            />

            <form onSubmit={onSubmit} className="auth-form" autoComplete="off">
            <input type="text" name="fake_signup_username" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
            <input type="password" name="fake_signup_password" autoComplete="current-password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
            <div className="auth-field-grid">
              <AuthField id="signup-first-name" label={t('auth.firstName2')} icon={<User size={18} strokeWidth={1.9} />}>
                <input id="signup-first-name" type="text" name="signup_first_name" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} onBlur={() => setTouched(t => ({ ...t, firstName: true }))} required placeholder={t('auth.yourFirstName')} aria-label={t('auth.firstName2')} />
              </AuthField>

              <AuthField id="signup-last-name" label={t('auth.lastName2')} icon={<User size={18} strokeWidth={1.9} />}>
                <input id="signup-last-name" type="text" name="signup_last_name" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} onBlur={() => setTouched(t => ({ ...t, lastName: true }))} required placeholder={t('auth.yourLastName')} aria-label={t('auth.lastName2')} />
              </AuthField>
            </div>

            <AuthField
              id="signup-email"
              label={t('auth.workEmail')}
              icon={<Mail size={18} strokeWidth={1.9} />}
              after={showEmailStatus ? (
                <span className={`auth-input-status${emailLooksValid ? ' is-valid' : ''}`} aria-label={emailStatusLabel} title={emailStatusLabel}>
                  <CheckCircle2 size={16} strokeWidth={2} />
                </span>
              ) : null}
            >
              <input
                id="signup-email"
                type="email"
                name="signup_email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                required
                placeholder={t('auth.youCompanyCom')}
                aria-label={t('auth.workEmail')}
                aria-invalid={showEmailStatus ? String(!emailLooksValid) : undefined}
              />
            </AuthField>

            <AuthField id="signup-password" label={t('auth.password')} icon={<LockKeyhole size={18} strokeWidth={1.9} />} className="auth-field--password">
              <div className="password-input-wrap">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  name="signup_password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, password: true }))}
                  required
                  minLength={8}
                  placeholder={t('auth.minimum8Characters')}
                  aria-label={t('auth.password')}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-controls="signup-password"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={1.9} aria-hidden="true" /> : <Eye size={18} strokeWidth={1.9} aria-hidden="true" />}
                </button>
              </div>
            </AuthField>

            {password && (
              <div className="password-strength-wrap">
                <div className="password-strength-bars" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={`psb ${passwordScore >= i ? `psb--${passwordLevel}` : ''}`} />
                  ))}
                </div>
                <ul className="password-criteria" aria-label={t('auth.passwordRequirements')}>
                  {[
                    { key: 'length', label: t('auth.atLeast8Characters') },
                    { key: 'upper', label: t('auth.oneUppercaseLetter') },
                    { key: 'number', label: t('auth.oneNumber') },
                    { key: 'special', label: t('auth.oneSpecialCharacter') },
                  ].map(({ key, label }) => (
                    <li key={key} className={passwordChecks[key] ? 'pc-met' : 'pc-unmet'}>
                      {passwordChecks[key]
                        ? <CheckCircle size={12} strokeWidth={2.5} aria-hidden="true" />
                        : <Circle size={12} strokeWidth={2} aria-hidden="true" />}
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button type="submit" className="btn-primary wide login-submit-btn" disabled={loading} aria-busy={loading}>
              {loading ? (
                <>
                  <LoaderCircle className="login-submit-spinner" size={18} strokeWidth={2.2} />
                  <span>{t('auth.creating')}</span>
                </>
              ) : (
                t('auth.createAccount')
              )}
            </button>

            {message ? <p className="form-error">{message}</p> : null}
            </form>
          </>
        )}
      </AuthCard>
    </main>
  );
}
