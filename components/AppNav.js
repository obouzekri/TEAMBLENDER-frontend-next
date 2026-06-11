"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

export default function AppNav({ userLabel, onLogout, role }) {
  const pathname = usePathname();
  const [activeHomeBlock, setActiveHomeBlock] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isParticipant = role === 'participant';
  const isAdmin = role === 'admin';
  const isParticipantChallengeLive = isParticipant && pathname?.startsWith('/challenges/');
  const isCompact = role === 'participant-live' || isParticipantChallengeLive;
  const isManager = !isParticipant && !isAdmin && !isCompact;
  const isParticipantArea = isParticipant && !isCompact;
  const brandHref = isParticipant ? '/participant' : isAdmin ? '/admin' : '/home';
  const compactReturnHref = isParticipant ? '/participant' : '/home';
  const compactReturnLabel = isParticipant ? 'Retour à mes sessions' : 'Retour au tableau de bord';
  const headerClassName = isCompact ? 'top-nav top-nav--live-inline' : 'top-nav';
  const isManagerHome = isManager && pathname === '/home';
  const isActive = (href) => pathname?.startsWith(href);
  const contextLabel = isParticipant
    ? ''
    : isAdmin
      ? ''
      : isCompact
        ? 'Session live'
        : 'Espace manager';
  const navPanelClassName = `nav-panel${(isManager || isParticipantArea) ? ' nav-panel--manager' : ''}${isMenuOpen ? ' is-open' : ''}`;
  const resolvedUserLabel = userLabel || (isParticipant ? 'Participant' : 'Manager');
  const accountHref = isParticipant ? '/participant' : '/account';
  const roleLabel = isParticipant ? 'Participant' : isAdmin ? 'Admin' : 'Manager';
  const [userAvatarUrl, setUserAvatarUrl] = useState('');

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

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    if (!dropdownOpen) return;
    function isInsideDropdown(event) {
      if (!dropdownRef.current) return false;
      const eventPath = typeof event.composedPath === 'function' ? event.composedPath() : null;
      if (Array.isArray(eventPath) && eventPath.includes(dropdownRef.current)) return true;
      return dropdownRef.current.contains(event.target);
    }

    function handlePointerOutside(event) {
      if (!isInsideDropdown(event)) {
        setDropdownOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerOutside, true);
    document.addEventListener('touchstart', handlePointerOutside, true);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerOutside, true);
      document.removeEventListener('touchstart', handlePointerOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dropdownOpen]);

  // Fermer le dropdown et le menu à la navigation
  useEffect(() => {
    setIsMenuOpen(false);
    setDropdownOpen(false);
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
    window.history.replaceState(null, '', `/home#${blockKey}`);
  }

  const userTrigger = (
    <div
      className={`nav-user-trigger-wrap${isAdmin ? ' nav-user-trigger-wrap--push' : ''}`}
      ref={dropdownRef}
    >
      <button
        type="button"
        className={`nav-user-trigger${dropdownOpen ? ' is-open' : ''}`}
        aria-expanded={dropdownOpen}
        aria-haspopup="menu"
        aria-label={`Menu de ${resolvedUserLabel}`}
        onClick={() => setDropdownOpen((v) => !v)}
      >
        {userAvatarUrl ? (
          <img src={userAvatarUrl} alt={`Avatar de ${resolvedUserLabel}`} className="nav-user-avatar app-user-avatar--photo" />
        ) : (
          <span className="nav-user-avatar" aria-hidden="true">{userInitials}</span>
        )}
        <span className="nav-user-trigger__name">{resolvedUserLabel}</span>
        <svg className="nav-user-trigger__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 4.5l3.5 3 3.5-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="nav-user-dropdown" role="menu" aria-label="Menu utilisateur">
          <div className="nav-user-dropdown__header">
            <span className="nav-user-dropdown__name">{resolvedUserLabel}</span>
            <span className="nav-user-dropdown__role">{roleLabel}</span>
          </div>
          <div className="nav-user-dropdown__divider" />
          <Link
            href={accountHref}
            className="nav-user-dropdown__item"
            role="menuitem"
            onClick={() => setDropdownOpen(false)}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path d="M7.5 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-4 5c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Mon compte
          </Link>
          <button
            type="button"
            className="nav-user-dropdown__item"
            role="menuitem"
            onClick={() => { setDropdownOpen(false); setSettingsOpen(true); }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.75 2.75l1.06 1.06M11.19 11.19l1.06 1.06M2.75 12.25l1.06-1.06M11.19 3.81l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Paramètres
          </button>
          <div className="nav-user-dropdown__divider" />
          <button
            type="button"
            className="nav-user-dropdown__item nav-user-dropdown__item--danger"
            role="menuitem"
            onClick={() => { setDropdownOpen(false); onLogout(); }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path d="M9.5 10.5 13 7.5 9.5 4.5M13 7.5H5.5M5.5 2.5h-3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <header className={headerClassName}>
        <div className={`shell nav-inner${isCompact ? ' nav-inner--live-inline' : ''}`}>
          <div className="nav-top-row">
            <div className="nav-brand-block">
              <Link href={brandHref} className="brand">
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
                aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
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
                  <Link href="/participant" className={`nav-link ${isActive('/participant') ? 'is-active' : ''}`} aria-current={isActive('/participant') ? 'page' : undefined}>Mes sessions</Link>
                </nav>
              </div>
            )}

            {!isParticipant && !isCompact && !isAdmin && (
              <div className="nav-main-block">
                <nav className="nav-links" aria-label="Navigation manager">
                  <Link
                    href="/home#sessions"
                    className={`nav-link nav-link--section ${(isManagerHome && activeHomeBlock === 'sessions') || (!isActive('/account') && !isManagerHome) ? 'is-active' : ''}`}
                    aria-current={(isManagerHome && activeHomeBlock === 'sessions') || (!isActive('/account') && !isManagerHome) ? 'page' : undefined}
                    onClick={(event) => scrollToHomeBlock(event, 'home-sessions-block', 'sessions')}
                  >
                    Sessions
                  </Link>
                  <Link
                    href="/home#participants"
                    className={`nav-link nav-link--section ${isManagerHome && activeHomeBlock === 'participants' ? 'is-active' : ''}`}
                    aria-current={isManagerHome && activeHomeBlock === 'participants' ? 'page' : undefined}
                    onClick={(event) => scrollToHomeBlock(event, 'home-participants-block', 'participants')}
                  >
                    Participants
                  </Link>
                  <Link href="/account" className={`nav-link ${isActive('/account') ? 'is-active' : ''}`} aria-current={isActive('/account') ? 'page' : undefined}>Compte</Link>
                </nav>
              </div>
            )}

            {isAdmin && !isCompact && (
              <div className="nav-main-block">
                <nav className="nav-links" aria-label="Navigation admin">
                  <Link href="/admin" className={`nav-link ${pathname === '/admin' ? 'is-active' : ''}`} aria-current={pathname === '/admin' ? 'page' : undefined}>Retour admin</Link>
                </nav>
              </div>
            )}

            {isCompact && (
              <div className="nav-main-block nav-main-block--compact">
                <nav className="nav-links" aria-label="Navigation session live">
                  <Link href={compactReturnHref} className="nav-link">{compactReturnLabel}</Link>
                </nav>
              </div>
            )}

            {userTrigger}
          </div>
        </div>
      </header>

      {/* Modal Paramètres */}
      {settingsOpen && (
        <div
          className="nav-settings-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Paramètres"
          onClick={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}
        >
          <div className="nav-settings-modal">
            <div className="nav-settings-modal__head">
              <h2 className="nav-settings-modal__title">Paramètres</h2>
              <button
                type="button"
                className="nav-settings-modal__close"
                aria-label="Fermer les paramètres"
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

