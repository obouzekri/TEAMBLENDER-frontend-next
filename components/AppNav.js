"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppNav({ userLabel, onLogout, role }) {
  const pathname = usePathname();
  const isParticipant = role === 'participant';
  const isAdmin = role === 'admin';
  const brandHref = isParticipant ? '/participant' : isAdmin ? '/admin' : '/home';
  const isCompact = role === 'participant-live';
  const headerClassName = isCompact ? 'top-nav top-nav--compact' : 'top-nav';
  const isActive = (href) => pathname?.startsWith(href);

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
