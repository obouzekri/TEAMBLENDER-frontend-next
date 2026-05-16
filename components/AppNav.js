"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

export default function AppNav({ userLabel, onLogout, role }) {
  const pathname = usePathname();
  const [activeHomeBlock, setActiveHomeBlock] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isParticipant = role === 'participant';
  const isAdmin = role === 'admin';
  const isCompact = role === 'participant-live';
  const isManager = !isParticipant && !isAdmin && !isCompact;
  const brandHref = isParticipant ? '/participant' : isAdmin ? '/admin' : '/home';
  const headerClassName = isCompact ? 'top-nav top-nav--compact' : 'top-nav';
  const isManagerHome = isManager && pathname === '/home';
  const isActive = (href) => pathname?.startsWith(href);
  const contextLabel = isParticipant
    ? 'Espace participant'
    : isAdmin
      ? 'Console admin'
      : isCompact
        ? 'Session live'
        : 'Espace manager';
  const resolvedUserLabel = userLabel || (isParticipant ? 'Participant' : 'Manager');

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
      <div className="shell nav-inner">
        <div className="nav-top-row">
          <div className="nav-brand-block">
            <Link href={brandHref} className="brand">
              <Logo size={isCompact ? 'compact' : 'default'} />
            </Link>
            <span className="nav-context">{contextLabel}</span>
          </div>

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
        </div>

        <div id="app-nav-panel" className={`nav-panel ${isMenuOpen ? 'is-open' : ''}`}>
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
                {isManagerHome ? (
                  <>
                    <Link
                      href="/home#sessions"
                      className={`nav-link nav-link--section ${activeHomeBlock === 'sessions' ? 'is-active' : ''}`}
                      aria-current={activeHomeBlock === 'sessions' ? 'page' : undefined}
                      onClick={(event) => scrollToHomeBlock(event, 'home-sessions-block', 'sessions')}
                    >
                      Sessions
                    </Link>
                    <Link
                      href="/home#participants"
                      className={`nav-link nav-link--section ${activeHomeBlock === 'participants' ? 'is-active' : ''}`}
                      aria-current={activeHomeBlock === 'participants' ? 'page' : undefined}
                      onClick={(event) => scrollToHomeBlock(event, 'home-participants-block', 'participants')}
                    >
                      Participants
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/home" className={`nav-link ${isActive('/home') ? 'is-active' : ''}`} aria-current={isActive('/home') ? 'page' : undefined}>Tableau de bord</Link>
                  </>
                )}
              </nav>

              {!isAdmin && (
                <div className="nav-actions" aria-label="Actions manager">
                  <Link href="/session-builder" className={`btn-mini nav-cta ${isActive('/session-builder') ? 'is-active' : ''}`} aria-current={isActive('/session-builder') ? 'page' : undefined}>Nouvelle session</Link>
                </div>
              )}
            </div>
          )}

          {!isParticipant && isCompact && (
            <div className="nav-main-block nav-main-block--compact">
              <nav className="nav-links" aria-label="Navigation session live">
                <Link href="/home" className="btn-mini">Retour tableau de bord</Link>
              </nav>
            </div>
          )}

          <div className="app-user-box">
            <div className="app-user-meta">
              <span className="app-user-name">{resolvedUserLabel}</span>
            </div>
            <button type="button" className="btn-secondary" onClick={onLogout}>Se deconnecter</button>
          </div>
        </div>
      </div>
    </header>
  );
}

