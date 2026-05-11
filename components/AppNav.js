"use client";

import Link from 'next/link';

export default function AppNav({ userLabel, onLogout, role }) {
  const isParticipant = role === 'participant';
  const isAdmin = role === 'admin';
  const brandHref = isParticipant ? '/participant' : isAdmin ? '/admin' : '/home';
  const isCompact = role === 'participant-live';
  const headerClassName = isCompact ? 'top-nav top-nav--compact' : 'top-nav';

  return (
    <header className={headerClassName}>
      <div className="shell nav-inner">
        <Link href={brandHref} className="brand">TEAMSPARK</Link>
        {!isParticipant && (
          <nav className="nav-links" aria-label="Navigation manager">
            {isAdmin ? (
              <>
                <Link href="/admin">Console admin</Link>
              </>
            ) : (
              <>
                <Link href="/home">Home</Link>
              </>
            )}
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
