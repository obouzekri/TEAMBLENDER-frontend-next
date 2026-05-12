"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppNav({ userLabel, onLogout, role }) {
  const pathname = usePathname();
  const [activeHomeBlock, setActiveHomeBlock] = useState('');
  const isParticipant = role === 'participant';
  const isAdmin = role === 'admin';
  const brandHref = isParticipant ? '/participant' : isAdmin ? '/admin' : '/home';
  const isCompact = role === 'participant-live';
  const headerClassName = isCompact ? 'top-nav top-nav--compact' : 'top-nav';
  const isManagerHome = !isParticipant && !isAdmin && !isCompact && pathname === '/home';
  const isActive = (href) => pathname?.startsWith(href);

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
        <Link href={brandHref} className="brand">TEAMSPARK</Link>
        {isParticipant && !isCompact && (
          <nav className="nav-links" aria-label="Navigation participant">
            <Link href="/participant" className={`nav-link ${isActive('/participant') ? 'is-active' : ''}`} aria-current={isActive('/participant') ? 'page' : undefined}>Sessions</Link>
          </nav>
        )}
        {!isParticipant && !isCompact && (
          <nav className="nav-links" aria-label="Navigation manager">
            {isAdmin ? (
              <>
                <Link href="/admin" className={`nav-link ${isActive('/admin') ? 'is-active' : ''}`} aria-current={isActive('/admin') ? 'page' : undefined}>Console admin</Link>
              </>
            ) : isManagerHome ? (
              <>
                <Link
                  href="/home"
                  className={`nav-link ${activeHomeBlock ? '' : 'is-active'}`}
                  aria-current={!activeHomeBlock ? 'page' : undefined}
                >
                  Home
                </Link>
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
                <Link href="/home" className={`nav-link ${isActive('/home') ? 'is-active' : ''}`} aria-current={isActive('/home') ? 'page' : undefined}>Home</Link>
              </>
            )}
          </nav>
        )}
        {!isParticipant && isCompact && (
          <nav className="nav-links" aria-label="Navigation session live">
            <Link href="/home" className="btn-mini">Retour Home</Link>
          </nav>
        )}
        <div className="app-user-box">
          <span className="app-user-name">{userLabel || (isParticipant ? 'Participant' : 'Manager')}</span>
          <button type="button" className="btn-secondary" onClick={onLogout}>Se deconnecter</button>
        </div>
      </div>
    </header>
  );
}
