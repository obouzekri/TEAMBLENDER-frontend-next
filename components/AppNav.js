"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

export default function AppNav({ userLabel, onLogout, role, connectionState = '' }) {
  const pathname = usePathname();
  const [activeHomeBlock, setActiveHomeBlock] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isParticipant = role === 'participant';
  const isAdmin = role === 'admin';
  const isCompact = role === 'participant-live';
  const isManager = !isParticipant && !isAdmin && !isCompact;
  const brandHref = isParticipant ? '/participant' : isAdmin ? '/admin' : '/home';
  const headerClassName = isCompact ? 'top-nav top-nav--live-inline' : 'top-nav';
  const isManagerHome = isManager && pathname === '/home';
  const isActive = (href) => pathname?.startsWith(href);
  const contextLabel = isParticipant
    ? 'Espace participant'
    : isAdmin
      ? 'Console admin'
      : isCompact
        ? 'Session live'
        : 'Espace manager';
  const navPanelClassName = `nav-panel${isManager ? ' nav-panel--manager' : ''}${isMenuOpen ? ' is-open' : ''}`;
  const userBoxClassName = `app-user-box${(isManager || isCompact) ? ' app-user-box--inline' : ''}`;
  const resolvedUserLabel = userLabel || (isParticipant ? 'Participant' : 'Manager');
  const normalizedConnectionState = ['connected', 'reconnecting', 'offline'].includes(String(connectionState || '').trim())
    ? String(connectionState).trim()
    : '';
  const connectionLabel = normalizedConnectionState === 'connected'
    ? 'Connecte'
    : normalizedConnectionState === 'reconnecting'
      ? 'Reconnexion'
      : normalizedConnectionState === 'offline'
        ? 'Hors ligne'
        : '';

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
      () => {
        computeActive();
      },
      {
        root: null,
        rootMargin: '-35% 0px -45% 0px',
        threshold: [0.1, 0.35, 0.6],
      }
    );

    observer.observe(sessionsEl);
    observer.observe(participantsEl);

    return () => {
      observer.disconnect();
    };
  }, [isManagerHome]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  function scrollToHomeBlock(event, blockId, blockKey) {
    if (!isManagerHome) return;
    event.preventDefault();
    const target = document.getElementById(blockId);
    if (!target) return;
    setActiveHomeBlock(blockKey);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `/home#${blockKey}`);
  }

  return (
    <header className={headerClassName}>
      <div className={`shell nav-inner${isCompact ? ' nav-inner--live-inline' : ''}`}>
        <div className="nav-top-row">
          <div className="nav-brand-block">
            <Link href={brandHref} className="brand">
              <Logo size="default" />
            </Link>
            {!isManager && !isCompact ? <span className="nav-context">{contextLabel}</span> : null}
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
                  Participant
                </Link>
                <Link href="/account" className={`nav-link ${isActive('/account') ? 'is-active' : ''}`} aria-current={isActive('/account') ? 'page' : undefined}>Compte</Link>
              </nav>
            </div>
          )}

          {!isParticipant && isCompact && (
            <div className="nav-main-block nav-main-block--compact">
              <nav className="nav-links" aria-label="Navigation session live">
                <Link href="/home" className="nav-link">Retour au tableau de bord</Link>
              </nav>
            </div>
          )}

          <div className={userBoxClassName}>
            <div className="app-user-meta">
              <span className="app-user-name">{resolvedUserLabel}</span>
              {normalizedConnectionState ? (
                <span
                  className={`nav-connection-indicator is-${normalizedConnectionState}`}
                  aria-live="polite"
                  role="status"
                >
                  {connectionLabel}
                </span>
              ) : null}
            </div>
            <button type="button" className="btn-secondary" onClick={onLogout}>Se deconnecter</button>
          </div>
        </div>
      </div>
    </header>
  );
}

