"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import NavItem from './NavItem';
import AvatarMenu from './AvatarMenu';
import useI18n from '@/lib/i18n/useI18n';
import { stripLocaleFromPath } from '@/lib/i18n/routing';

export default function AppNav({ userLabel, onLogout, role }) {
  const pathname = usePathname();
  const plainPathname = stripLocaleFromPath(pathname || '/');
  const [activeHomeBlock, setActiveHomeBlock] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { t, withLocalePath } = useI18n();

  const isParticipant = role === 'participant';
  const isAdmin = role === 'admin';
  const isParticipantChallengeLive = isParticipant && plainPathname?.startsWith('/challenges/');
  const isCompact = role === 'participant-live' || isParticipantChallengeLive;
  const isManager = !isParticipant && !isAdmin && !isCompact;
  const isParticipantArea = isParticipant && !isCompact;
  const brandHref = isParticipant ? '/participant' : isAdmin ? '/admin' : '/home';
  const compactReturnHref = isParticipant ? '/participant' : '/home';
  const compactReturnLabel = isParticipant ? t('appNav.backToSessions') : t('appNav.backToDashboard');
  const headerClassName = isCompact ? 'top-nav top-nav--live-inline' : 'top-nav';
  const isManagerHome = isManager && plainPathname === '/home';
  const isActive = (href) => plainPathname?.startsWith(href);
  const contextLabel = isParticipant
    ? t('appNav.participantSpace')
    : isAdmin
      ? t('appNav.adminSpace')
      : isCompact
        ? t('appNav.liveSession')
        : t('appNav.managerSpace');
  const navPanelClassName = `nav-panel${(isManager || isParticipantArea) ? ' nav-panel--manager' : ''}${isMenuOpen ? ' is-open' : ''}`;
  const resolvedUserLabel = userLabel || (isParticipant ? t('appNav.participant') : t('appNav.manager'));
  const accountHref = isParticipant ? '/participant' : '/account';
  const roleLabel = isParticipant ? t('appNav.participant') : isAdmin ? t('appNav.admin') : t('appNav.manager');
  const [userAvatarUrl, setUserAvatarUrl] = useState('');
  const canUseMobileDrawer = !isCompact;
  const menuSignal = `${pathname}:${isMenuOpen ? 'open' : 'closed'}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem('currentUser');
      const parsed = raw ? JSON.parse(raw) : null;
      const candidate = String(parsed?.picture_url || '').trim();
      setUserAvatarUrl(candidate);
    } catch {
      setUserAvatarUrl('');
    }
  }, [pathname]);

  const userInitials = resolvedUserLabel
    .split(' ')
    .map((part) => String(part || '').trim().slice(0, 1).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('') || 'U';

  useEffect(() => {
    if (!isMenuOpen || !canUseMobileDrawer) return undefined;
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen, canUseMobileDrawer]);

  useEffect(() => {
    if (!canUseMobileDrawer || typeof document === 'undefined') return undefined;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    if (isMenuOpen) {
      body.style.overflow = 'hidden';
    }
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen, canUseMobileDrawer]);

  // Fermer le dropdown et le menu à la navigation
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isManagerHome) {
      setActiveHomeBlock('');
      return undefined;
    }

    const sessionsEl = document.getElementById('home-sessions-block');
    const participantsEl = document.getElementById('home-participants-block');
    if (!sessionsEl || !participantsEl) return undefined;

    const computeActive = () => {
      const sessionsTop = Math.abs(sessionsEl.getBoundingClientRect().top - 120);
      const participantsTop = Math.abs(participantsEl.getBoundingClientRect().top - 120);
      setActiveHomeBlock(sessionsTop <= participantsTop ? 'sessions' : 'participants');
    };

    computeActive();

    const observer = new IntersectionObserver(
      () => { computeActive(); },
      { root: null, rootMargin: '-35% 0px -45% 0px', threshold: [0.1, 0.35, 0.6] }
    );

    observer.observe(sessionsEl);
    observer.observe(participantsEl);

    return () => { observer.disconnect(); };
  }, [isManagerHome]);

  function scrollToHomeBlock(event, blockId, blockKey) {
    if (!isManagerHome) return;
    event.preventDefault();
    const target = document.getElementById(blockId);
    if (!target) return;
    setActiveHomeBlock(blockKey);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', withLocalePath(`/home#${blockKey}`));
  }

  return (
    <>
      <header className={headerClassName}>
        <div className={`shell nav-inner${isCompact ? ' nav-inner--live-inline' : ''}`}>
          <div className="nav-top-row">
            <div className="nav-brand-block">
              <Link href={withLocalePath(brandHref)} className="brand">
                <Logo size="default" />
              </Link>
              {!isManager && !isCompact && contextLabel ? <span className="nav-context">{contextLabel}</span> : null}
            </div>

            {!isCompact ? (
              <button
                type="button"
                className={`nav-toggle ${isMenuOpen ? 'is-open' : ''}`}
                aria-expanded={isMenuOpen}
                aria-controls="app-nav-panel"
                aria-label={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
                onClick={() => setIsMenuOpen((current) => !current)}
              >
                <span className="nav-toggle__line" />
                <span className="nav-toggle__line" />
                <span className="nav-toggle__line" />
              </button>
            ) : null}
          </div>

          <div id="app-nav-panel" className={`${navPanelClassName}${isCompact ? ' nav-panel--live-inline' : ''}`}>
            {isParticipant && !isCompact && (
              <div className="nav-main-block">
                <nav className="nav-links" aria-label="Navigation participant">
                  <NavItem
                    href={withLocalePath('/participant')}
                    onClick={() => setIsMenuOpen(false)}
                    active={isActive('/participant')}
                  >
                    {t('appNav.mySessions')}
                  </NavItem>
                </nav>
              </div>
            )}

            {!isParticipant && !isCompact && !isAdmin && (
              <div className="nav-main-block">
                <nav className="nav-links" aria-label="Navigation manager">
                  <NavItem
                    href={withLocalePath('/home#sessions')}
                    active={(isManagerHome && activeHomeBlock === 'sessions') || (!isActive('/account') && !isManagerHome)}
                    className="nav-link--section"
                    onClick={(event) => {
                      setIsMenuOpen(false);
                      scrollToHomeBlock(event, 'home-sessions-block', 'sessions');
                    }}
                  >
                    {t('appNav.sessions')}
                  </NavItem>
                  <NavItem
                    href={withLocalePath('/home#participants')}
                    active={isManagerHome && activeHomeBlock === 'participants'}
                    className="nav-link--section"
                    onClick={(event) => {
                      setIsMenuOpen(false);
                      scrollToHomeBlock(event, 'home-participants-block', 'participants');
                    }}
                  >
                    {t('appNav.participants')}
                  </NavItem>
                  <NavItem
                    href={withLocalePath('/account')}
                    active={isActive('/account')}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('appNav.account')}
                  </NavItem>
                </nav>
              </div>
            )}

            {isAdmin && !isCompact && (
              <div className="nav-main-block">
                <nav className="nav-links" aria-label="Navigation admin">
                  <NavItem
                    href={withLocalePath('/admin')}
                    active={isActive('/admin')}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('appNav.backToAdmin')}
                  </NavItem>
                </nav>
              </div>
            )}

            {isCompact && (
              <div className="nav-main-block nav-main-block--compact">
                <nav className="nav-links" aria-label="Navigation session live">
                  <Link href={withLocalePath(compactReturnHref)} className="nav-link">{compactReturnLabel}</Link>
                </nav>
              </div>
            )}

            <div className="nav-actions" aria-label={t('nav.accountAria')}>
              <LanguageSwitcher />
              <AvatarMenu
                userLabel={resolvedUserLabel}
                roleLabel={roleLabel}
                avatarUrl={userAvatarUrl}
                avatarInitials={userInitials}
                triggerLabel={t('appNav.userMenuOf', { name: resolvedUserLabel })}
                menuLabel={t('appNav.userMenu')}
                closeSignal={menuSignal}
                items={[
                  {
                    key: 'account',
                    label: t('nav.myAccount'),
                    href: withLocalePath(accountHref),
                  },
                  {
                    key: 'settings',
                    label: t('appNav.settings'),
                    onClick: () => setSettingsOpen(true),
                  },
                  {
                    key: 'logout',
                    label: t('appNav.logout'),
                    danger: true,
                    onClick: onLogout,
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </header>

      {isMenuOpen && canUseMobileDrawer ? (
        <button
          type="button"
          className="nav-mobile-overlay"
          aria-label={t('nav.closeMenu')}
          onClick={() => setIsMenuOpen(false)}
        />
      ) : null}

      {/* Modal Paramètres */}
      {settingsOpen && (
        <div
          className="nav-settings-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t('appNav.settings')}
          onClick={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}
        >
          <div className="nav-settings-modal">
            <div className="nav-settings-modal__head">
              <h2 className="nav-settings-modal__title">{t('appNav.settings')}</h2>
              <button
                type="button"
                className="nav-settings-modal__close"
                aria-label={t('appNav.closeSettings')}
                onClick={() => setSettingsOpen(false)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="nav-settings-modal__body">
              <p className="nav-settings-modal__section-label">Notifications</p>
              <label className="nav-settings-toggle">
                <span>Recevoir les rappels de session</span>
                <span className="nav-settings-toggle__switch">
                  <input type="checkbox" defaultChecked />
                  <span className="nav-settings-toggle__track" />
                </span>
              </label>
              <label className="nav-settings-toggle">
                <span>Recevoir les résumés d&apos;activité</span>
                <span className="nav-settings-toggle__switch">
                  <input type="checkbox" />
                  <span className="nav-settings-toggle__track" />
                </span>
              </label>
              <p className="nav-settings-modal__section-label nav-settings-modal__section-label--spaced">Affichage</p>
              <label className="nav-settings-toggle">
                <span>Mode compact (navbar)</span>
                <span className="nav-settings-toggle__switch">
                  <input type="checkbox" />
                  <span className="nav-settings-toggle__track" />
                </span>
              </label>
            </div>

            <div className="nav-settings-modal__foot">
              <button type="button" className="btn-primary" onClick={() => setSettingsOpen(false)}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

