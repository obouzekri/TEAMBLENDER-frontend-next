"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import AuthCard from '@/components/AuthCard';
import AuthField from '@/components/AuthField';
import AuthSocialButtons from '@/components/AuthSocialButtons';
import { identifyAnalyticsUser, trackGtmEvent, trackPosthogEvent, trackProductUserEvent } from '@/lib/analytics';
import {
  clearOAuthCallbackParamsFromUrl,
  ensureCsrfToken,
  getOAuthStartUrl,
  getRedirectPath,
  joinParticipantInstant,
  loginWithFallback,
  readOAuthCallbackFromLocation,
  resendVerification,
  resolveConnectedUserId,
  setStoredAuthSession,
  shouldStoreParticipantTargetSession
} from '@/lib/auth';
import useI18n from '@/lib/i18n/useI18n';
import { saveRecovery } from '@/lib/participant-recovery';
import { translate } from '@/lib/i18n';

function looksLikeEmail(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function errorMessage(resStatus, data, locale) {
  if (data?.code === 'ACCOUNT_PENDING') return translate(locale, 'auth.yourAccountIsPendingAdminApproval');
  if (data?.code === 'ACCOUNT_REJECTED') return translate(locale, 'auth.yourAccountRequestWasRejectedContact');
  if (data?.code === 'ACCOUNT_DISABLED') return translate(locale, 'auth.thisAccountHasBeenDisabledContact');
  if (data?.code === 'EMAIL_NOT_VERIFIED') return translate(locale, 'auth.pleaseVerifyYourEmailBeforeLogging');
  if (resStatus === 401) return translate(locale, 'auth.invalidEmailOrPassword');
  return data?.error || translate(locale, 'auth.somethingWentWrongPleaseTryAgain');
}

const TAB_JOIN = 'join';
const TAB_LOGIN = 'login';
const REMEMBER_IDENTIFIER_STORAGE_KEY = 'tb_remembered_identifier';

function normalizeJoinCode(rawCode) {
  return String(rawCode || '').trim().toUpperCase();
}

function resolveTabFromSearchParams(searchParams, inviteToken) {
  const mode = String(searchParams.get('mode') || '').trim().toLowerCase();
  const code = String(searchParams.get('code') || '').trim();

  if (mode === TAB_LOGIN) return TAB_LOGIN;
  if (mode === TAB_JOIN || code || inviteToken) return TAB_JOIN;
  return TAB_LOGIN;
}

export default function LoginForm({ requestedSessionId = '', requestedInviteToken = '', requestedMode = '', requestedJoinCode = '' }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale, withLocalePath, t } = useI18n();
  const normalizedRequestedSessionId = useMemo(() => String(requestedSessionId || '').trim(), [requestedSessionId]);
  const microsoftLoginEnabled = String(process.env.NEXT_PUBLIC_MICROSOFT_LOGIN_ENABLED || 'false').toLowerCase() === 'true';
  const normalizedRequestedInviteToken = useMemo(() => String(requestedInviteToken || '').trim(), [requestedInviteToken]);
  const initialTab = useMemo(
    () => resolveTabFromSearchParams(searchParams, normalizedRequestedInviteToken),
    [normalizedRequestedInviteToken, searchParams]
  );

  const [activeTab, setActiveTab] = useState(initialTab);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastAuthScope, setLastAuthScope] = useState('user');
  const [resendStatus, setResendStatus] = useState('idle');
  const [resendMessage, setResendMessage] = useState('');
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState('');
  const [needsVerificationResend, setNeedsVerificationResend] = useState(false);
  const [identifierTouched, setIdentifierTouched] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [joinCodeInvalid, setJoinCodeInvalid] = useState(false);
  const [joinSessionCode, setJoinSessionCode] = useState('');
  const [joinFirstName, setJoinFirstName] = useState('');
  const [joinLastName, setJoinLastName] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [scannerSupported, setScannerSupported] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const joinTabRef = useRef(null);
  const loginTabRef = useRef(null);

  const normalizedIdentifier = useMemo(() => identifier.trim(), [identifier]);
  const identifierIsEmail = useMemo(() => looksLikeEmail(normalizedIdentifier), [normalizedIdentifier]);
  const showIdentifierStatus = identifierTouched && normalizedIdentifier.length > 0 && identifierIsEmail;
  const identifierStatusLabel = identifierIsEmail
    ? t('auth.emailFormatLooksValid')
    : t('auth.participantAliasLoginEnabled');
  const joinSessionCodeRequired = !normalizedRequestedInviteToken;
  const canSubmitJoin = (Boolean(normalizedRequestedInviteToken) || String(joinSessionCode || '').trim().length > 0)
    && String(joinFirstName || '').trim().length > 0
    && String(joinLastName || '').trim().length > 0
    && looksLikeEmail(String(joinEmail || '').replace(/\s+/gu, ''));

  useEffect(() => {
    ensureCsrfToken().catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const remembered = String(localStorage.getItem(REMEMBER_IDENTIFIER_STORAGE_KEY) || '').trim();
      if (remembered) {
        setIdentifier(remembered);
        setRememberMe(true);
      }
    } catch {
      // storage unavailable
    }
  }, []);

  useEffect(() => {
    const hasScanner = typeof window !== 'undefined'
      && typeof navigator !== 'undefined'
      && 'mediaDevices' in navigator
      && typeof window.BarcodeDetector !== 'undefined';
    setScannerSupported(Boolean(hasScanner));
  }, []);

  useEffect(() => {
    const nextTab = resolveTabFromSearchParams(searchParams, normalizedRequestedInviteToken);
    const modeFromServer = String(requestedMode || '').trim().toLowerCase();
    const serverForcedTab = modeFromServer === TAB_LOGIN ? TAB_LOGIN : modeFromServer === TAB_JOIN ? TAB_JOIN : '';
    setActiveTab(serverForcedTab || nextTab);

    const codeFromUrl = normalizeJoinCode(searchParams.get('code'));
    const codeFromServer = normalizeJoinCode(requestedJoinCode);
    const codeFromInvite = normalizeJoinCode(normalizedRequestedInviteToken);
    const resolvedCode = codeFromUrl || codeFromServer || codeFromInvite;
    if (resolvedCode) {
      setJoinSessionCode(resolvedCode);
    }
  }, [normalizedRequestedInviteToken, requestedJoinCode, requestedMode, searchParams]);

  useEffect(() => {
    if (!normalizedRequestedInviteToken) return;
    setJoinMessage(t('auth.secureInvitationDetectedCompleteYourParticipant'));
  }, [locale, normalizedRequestedInviteToken]);

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

    setStoredAuthSession({
      user: oauth.user,
      targetSessionId: shouldStoreParticipantTargetSession(oauth.user?.role, normalizedRequestedSessionId),
    });

    trackPosthogEvent('login_oauth', {
      provider: oauth.provider || 'unknown',
      source: 'frontend',
    });

    trackGtmEvent('login_oauth', {
      provider: oauth.provider || 'unknown',
    });

    const connectedUserId = resolveConnectedUserId(oauth.user);
    identifyAnalyticsUser(connectedUserId, {
      role: String(oauth.user?.role || 'unknown').toLowerCase(),
      auth_method: 'oauth',
    });

    trackProductUserEvent('oauth_login_success', {
      provider: oauth.provider || 'unknown',
      authMethod: 'oauth',
      userId: connectedUserId,
      sessionId: normalizedRequestedSessionId || undefined,
      surface: 'login',
    });

    const redirect = withLocalePath(getRedirectPath(oauth.user.role, normalizedRequestedSessionId, connectedUserId));
    window.location.href = redirect;
  }, [locale, normalizedRequestedSessionId, withLocalePath]);

  function pushTabInUrl(nextTab, nextCode = '') {
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', nextTab);

    if (nextTab === TAB_JOIN) {
      const normalizedCode = normalizeJoinCode(nextCode);
      if (normalizedCode) {
        params.set('code', normalizedCode);
      }
    } else {
      params.delete('code');
    }

    const query = params.toString();
    const target = query ? `${pathname}?${query}` : pathname;
    router.replace(target, { scroll: false });
  }

  function changeTab(nextTab) {
    if (nextTab === activeTab) return;
    setActiveTab(nextTab);
    pushTabInUrl(nextTab, joinSessionCode);
  }

  function onTabKeyDown(event) {
    const tabs = [TAB_JOIN, TAB_LOGIN];
    const currentIndex = tabs.indexOf(activeTab);
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
      const nextTab = tabs[nextIndex];
      changeTab(nextTab);
      if (nextTab === TAB_JOIN) {
        joinTabRef.current?.focus();
      } else {
        loginTabRef.current?.focus();
      }
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      changeTab(TAB_JOIN);
      joinTabRef.current?.focus();
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      changeTab(TAB_LOGIN);
      loginTabRef.current?.focus();
    }
  }

  function startOAuth(provider) {
    const url = getOAuthStartUrl(provider, '/login');
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
    setNeedsVerificationResend(false);
    setResendStatus('idle');
    setResendMessage('');

    if (!normalizedIdentifier || !password) {
      setMessage(t('auth.pleaseFillInAllFields'));
      return;
    }

    setLoading(true);
    try {
      const allowParticipantFallback = true;
      const { response, data, authScope } = await loginWithFallback(normalizedIdentifier, password, { allowParticipantFallback });
      setLastAuthScope(authScope || 'user');
      if (response.ok) {
        const user = data?.user || null;

        if (!user) {
          setMessage(t('auth.invalidLoginResponsePleaseTryAgain'));
          return;
        }

        const connectedUserId = resolveConnectedUserId(user);
        setStoredAuthSession({
          user,
          targetSessionId: shouldStoreParticipantTargetSession(user.role, normalizedRequestedSessionId),
        });
        identifyAnalyticsUser(connectedUserId, {
          role: String(user.role || 'unknown').toLowerCase(),
          auth_method: 'password',
        });

        try {
          if (rememberMe) {
            localStorage.setItem(REMEMBER_IDENTIFIER_STORAGE_KEY, normalizedIdentifier);
          } else {
            localStorage.removeItem(REMEMBER_IDENTIFIER_STORAGE_KEY);
          }
        } catch {
          // storage unavailable
        }

        const redirect = withLocalePath(getRedirectPath(user.role, normalizedRequestedSessionId, connectedUserId));
        trackProductUserEvent('login_success', {
          authMethod: 'password',
          userId: connectedUserId,
          sessionId: normalizedRequestedSessionId || undefined,
          surface: 'login',
        });
        window.location.href = redirect;
        return;
      }

      setNeedsVerificationResend(data?.code === 'EMAIL_NOT_VERIFIED');
      setMessage(errorMessage(response.status, data, locale));
    } catch {
      setMessage(t('auth.unableToReachTheServerCheck'));
    } finally {
      setLoading(false);
    }
  }

  async function onResendVerification() {
    const normalizedEmail = identifier.trim().toLowerCase();
    if (!normalizedEmail || !looksLikeEmail(normalizedEmail)) {
      setResendStatus('error');
      setResendMessage(t('auth.enterAValidEmailToResend'));
      return;
    }

    setResendStatus('sending');
    setResendMessage(t('auth.sending'));
    try {
      const { res, data } = await resendVerification({
        email: normalizedEmail,
        userType: lastAuthScope === 'participant' ? 'participant' : 'user',
        locale,
      });

      if (res.ok && data?.success) {
        setResendStatus('done');
        setResendMessage(data?.message || t('auth.aNewVerificationLinkHasBeen'));
        return;
      }

      setResendStatus('error');
      setResendMessage(data?.message || data?.error || t('auth.unableToResendTheLinkRight'));
    } catch {
      setResendStatus('error');
      setResendMessage(t('auth.unableToReachTheServerCheck2'));
    }
  }

  async function onJoinInstant(event) {
    event.preventDefault();
    setJoinMessage('');
    setJoinCodeInvalid(false);

    const sessionCode = String(joinSessionCode || '').trim();
    const firstName = String(joinFirstName || '').trim();
    const lastName = String(joinLastName || '').trim();
    const email = String(joinEmail || '').trim();
    const inviteToken = normalizedRequestedInviteToken;

    if ((!sessionCode && !inviteToken) || !firstName || !lastName || !email) {
      setJoinMessage(t('auth.sessionCodeFirstNameAndLast'));
      return;
    }

    if (!looksLikeEmail(email)) {
      setJoinMessage(t('auth.enterAValidEmailAddress'));
      return;
    }

    setJoinLoading(true);
    try {
      const { res, data } = await joinParticipantInstant({
        sessionCode,
        inviteToken,
        firstName,
        lastName,
        email,
        nickname: firstName,
      });
      if (!res.ok) {
        const codeRejected = res.status === 404 || data?.code === 'SESSION_NOT_FOUND';
        const loginRequired = data?.code === 'JOIN_LOGIN_REQUIRED';
        const otherOrganization = data?.code === 'PARTICIPANT_EMAIL_OTHER_ORGANIZATION';
        setJoinCodeInvalid(codeRejected);
        setJoinMessage(codeRejected
          ? t('auth.invalidCode')
          : loginRequired
            ? t('auth.thisParticipantAccountIsProtectedSign')
            : otherOrganization
              ? t('auth.emailUsedInAnotherOrganization')
            : (data?.error || t('auth.unableToJoinSessionRightNow')));
        return;
      }

      const user = data?.user || null;
      const resolvedSessionId = String(data?.sessionId || '').trim();
      if (!user) {
        setJoinMessage(t('auth.invalidJoinResponsePleaseTryAgain'));
        return;
      }

      setStoredAuthSession({
        user,
        targetSessionId: shouldStoreParticipantTargetSession('participant', resolvedSessionId),
      });
      try {
        saveRecovery({ ...data, user });
      } catch {
        sessionStorage.setItem('tb_recovery_warning', t('auth.automaticRecognitionCouldNotBeSaved'));
      }
      identifyAnalyticsUser(resolveConnectedUserId(user), {
        role: 'participant',
        auth_method: 'instant_join',
      });

      if (data?.accountCreated) {
        sessionStorage.setItem('participantAccountCreated', '1');
      }

      const redirect = withLocalePath(getRedirectPath('participant', resolvedSessionId, resolveConnectedUserId(user)));
      window.location.href = redirect;
    } catch {
      setJoinMessage(t('auth.unableToReachTheServerCheck3'));
    } finally {
      setJoinLoading(false);
    }
  }

  async function startQrScanner() {
    if (!scannerSupported || scannerActive) return;

    setJoinMessage('');
    setScannerActive(true);

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }
        }
      });

      const video = document.createElement('video');
      video.setAttribute('playsinline', 'true');
      video.srcObject = stream;
      await video.play();

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });

      const stopStream = () => {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      const maxAttempts = 180;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const codes = await detector.detect(video);
        if (Array.isArray(codes) && codes.length > 0) {
          const rawValue = String(codes[0]?.rawValue || '').trim();
          if (rawValue) {
            const match = rawValue.match(/(?:sessionCode|session_code|code|session)=([A-Za-z0-9_-]+)/i);
            const extracted = String(match?.[1] || rawValue).trim().toUpperCase();
            setJoinSessionCode(extracted);
            pushTabInUrl(TAB_JOIN, extracted);
            setJoinMessage(t('auth.qrCodeDetectedSessionCodePre'));
            stopStream();
            setScannerActive(false);
            return;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      stopStream();
      setJoinMessage(t('auth.noQrCodeDetectedPleaseTry'));
    } catch {
      setJoinMessage(t('auth.cameraUnavailableOrPermissionDenied'));
    } finally {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setScannerActive(false);
    }
  }

  return (
    <main className="auth-page auth-page--login">
      <div className={`auth-login-pane auth-login-pane--${activeTab}`}>
        <AuthCard
          footer={<span>{t('auth.newToTeamblender')}<Link href={withLocalePath('/signup')}>{t('auth.createAnAccount')}</Link></span>}
        >
          <div className="auth-tabs" role="tablist" aria-label={t('auth.selectConnectionMode')}>
            <button
              ref={joinTabRef}
              type="button"
              role="tab"
              id="login-tab-join"
              aria-controls="login-panel-join"
              aria-selected={activeTab === TAB_JOIN}
              tabIndex={activeTab === TAB_JOIN ? 0 : -1}
              className={`auth-tab-btn${activeTab === TAB_JOIN ? ' is-active' : ''}`}
              onClick={() => changeTab(TAB_JOIN)}
              onKeyDown={onTabKeyDown}
            >
              {t('auth.joinWithACode')}
            </button>
            <button
              ref={loginTabRef}
              type="button"
              role="tab"
              id="login-tab-login"
              aria-controls="login-panel-login"
              aria-selected={activeTab === TAB_LOGIN}
              tabIndex={activeTab === TAB_LOGIN ? 0 : -1}
              className={`auth-tab-btn${activeTab === TAB_LOGIN ? ' is-active' : ''}`}
              onClick={() => changeTab(TAB_LOGIN)}
              onKeyDown={onTabKeyDown}
            >
              {t('auth.signIn')}
            </button>
          </div>

          <p className="auth-tabs-subtitle" aria-live="polite">
            {activeTab === TAB_JOIN
              ? t('auth.haveASessionCodeEnterIt')
              : t('auth.forOrganizersAndParticipantsRegisteredBy')}
          </p>

          <div
            id="login-panel-join"
            role="tabpanel"
            aria-labelledby="login-tab-join"
            hidden={activeTab !== TAB_JOIN}
            className="auth-tab-panel"
          >
            <form onSubmit={onJoinInstant} className="auth-form auth-form--join" autoComplete="off">
              <AuthField id="join-session-code" label={t('auth.sessionCode')}>
                <input
                  id="join-session-code"
                  type="text"
                  value={joinSessionCode}
                  onChange={(e) => {
                    const value = normalizeJoinCode(e.target.value);
                    setJoinSessionCode(value);
                    pushTabInUrl(TAB_JOIN, value);
                  }}
                  placeholder={t('auth.exAb12')}
                  autoComplete="off"
                  required={joinSessionCodeRequired}
                  className="join-field-input join-session-code-input join-session-code-placeholder"
                  disabled={Boolean(normalizedRequestedInviteToken)}
                />
              </AuthField>
              {scannerSupported && !normalizedRequestedInviteToken ? (
                <button
                  type="button"
                  className="btn-secondary wide"
                  onClick={startQrScanner}
                  disabled={scannerActive}
                  aria-busy={scannerActive}
                >
                  {scannerActive
                    ? t('auth.scanningQr')
                    : t('auth.scanQrWithCamera')}
                </button>
              ) : null}
              <div className="auth-field-grid auth-field-grid--join">
                <AuthField id="join-first-name" label={t('auth.firstName')}>
                  <input
                    id="join-first-name"
                    type="text"
                    value={joinFirstName}
                    onChange={(e) => setJoinFirstName(e.target.value)}
                    placeholder={t('auth.sophie')}
                    autoComplete="given-name"
                    className="join-field-input"
                    required
                  />
                </AuthField>
                <AuthField id="join-last-name" label={t('auth.lastName')}>
                  <input
                    id="join-last-name"
                    type="text"
                    value={joinLastName}
                    onChange={(e) => setJoinLastName(e.target.value)}
                    placeholder={t('auth.martin')}
                    autoComplete="family-name"
                    className="join-field-input"
                    required
                  />
                </AuthField>
              </div>
              <AuthField
                id="join-email"
                label={t('auth.workEmail')}
                help={(
                  <span id="join-email-help" className="auth-field-help">
                    {t('auth.professionalEmailForTeamIdentity')}
                  </span>
                )}
              >
                <input
                  id="join-email"
                  type="email"
                  value={joinEmail}
                    onChange={(e) => setJoinEmail(e.target.value.replace(/\s+/gu, ''))}
                  placeholder={t('auth.sophieCompanyCom')}
                  autoComplete="email"
                  className="join-field-input"
                  aria-describedby="join-email-help"
                  required
                />
              </AuthField>
              <button
                type="submit"
                className="btn-primary wide login-submit-btn join-submit-btn"
                disabled={joinLoading || !canSubmitJoin}
                aria-busy={joinLoading}
              >
                {joinLoading ? t('auth.joining') : <>{t('auth.joinSession')} <span className="rtl-flip" aria-hidden="true">→</span></>}
              </button>
              {joinMessage ? (
                <p className="form-error">
                  {joinMessage}
                  {joinCodeInvalid ? (
                    <>
                      {' '}
                      {t('auth.noCodeYet')}
                      <Link href={withLocalePath('/contact')} className="auth-inline-help-link">
                        {t('auth.contactYourOrganizer')}
                      </Link>
                    </>
                  ) : null}
                </p>
              ) : null}
            </form>
            <p className="auth-required-note">* {t('auth.requiredFields')}</p>
          </div>

          <div
            id="login-panel-login"
            role="tabpanel"
            aria-labelledby="login-tab-login"
            hidden={activeTab !== TAB_LOGIN}
            className="auth-tab-panel"
          >
            <AuthSocialButtons
              loading={loading}
              loadingProvider={oauthLoadingProvider}
              microsoftEnabled={microsoftLoginEnabled}
              stacked
              googleLabelOverride={t('auth.continueWithGoogle')}
              separatorLabelOverride={t('auth.orContinueWithYourEmail')}
              onProviderClick={(provider) => startOAuth(provider)}
            />

            <form onSubmit={onSubmit} className="auth-form" autoComplete="off">
              <AuthField
                id="login-email"
                label={t('auth.emailOrParticipantAlias')}
                icon={<Mail size={18} strokeWidth={1.9} />}
                after={showIdentifierStatus ? (
                  <span className={`auth-input-status${identifierIsEmail ? ' is-valid' : ''}`} aria-label={identifierStatusLabel} title={identifierStatusLabel}>
                    <CheckCircle2 size={16} strokeWidth={2} />
                  </span>
                ) : null}
              >
                <input
                  id="login-email"
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setIdentifierTouched(true);
                  }}
                  onBlur={() => setIdentifierTouched(true)}
                  required
                  placeholder={t('auth.youCompanyComOrSophie')}
                  autoComplete="email"
                  aria-label={t('auth.emailOrParticipantAlias')}
                  aria-invalid={showIdentifierStatus ? String(false) : undefined}
                />
              </AuthField>

              <AuthField id="login-password" label={t('auth.password')} icon={<LockKeyhole size={18} strokeWidth={1.9} />} className="auth-field--password">
                <div className="password-input-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder={t('auth.yourPassword')}
                    autoComplete="current-password"
                    aria-label={t('auth.password')}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-controls="login-password"
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={18} strokeWidth={1.9} aria-hidden="true" /> : <Eye size={18} strokeWidth={1.9} aria-hidden="true" />}
                  </button>
                </div>
              </AuthField>

              <div className="auth-form-row auth-form-row--options">
                <label className="auth-remember-me" htmlFor="login-remember-me">
                  <input
                    id="login-remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>{t('auth.rememberMe')}</span>
                </label>
                <Link href={withLocalePath('/forgot-password')} className="auth-inline-help-link">
                  {t('auth.forgotPassword')}
                </Link>
              </div>

              <button type="submit" className="btn-primary wide login-submit-btn" disabled={loading} aria-busy={loading}>
                {loading ? (
                  <>
                    <LoaderCircle className="login-submit-spinner" size={18} strokeWidth={2.2} />
                    <span>{t('auth.signingIn')}</span>
                  </>
                ) : (
                  t('auth.logIn')
                )}
              </button>

              {message ? <p className="form-error">{message}</p> : null}

              {needsVerificationResend ? (
                <>
                  <button
                    type="button"
                    className="btn-secondary wide"
                    onClick={onResendVerification}
                    disabled={resendStatus === 'sending'}
                  >
                    {resendStatus === 'sending' ? t('auth.sending2') : t('auth.resendVerificationLink')}
                  </button>
                  {resendStatus !== 'idle' ? (
                    <p className={resendStatus === 'error' ? 'form-error' : 'form-help'}>{resendMessage}</p>
                  ) : null}
                </>
              ) : null}
            </form>
          </div>
        </AuthCard>
      </div>
    </main>
  );
}
