"use client";

import Link from 'next/link';

export default function AppNav({ userLabel, onLogout }) {
  return (
    <header className="top-nav">
      <div className="shell nav-inner">
        <Link href="/home" className="brand">TEAMSPARK</Link>
        <nav className="nav-links" aria-label="Navigation manager">
          <Link href="/home">Home</Link>
          <Link href="/session-builder">Session builder</Link>
        </nav>
        <div className="app-user-box">
          <span className="app-user-name">{userLabel || 'Manager'}</span>
          <button type="button" className="btn-secondary" onClick={onLogout}>Se deconnecter</button>
        </div>
      </div>
    </header>
  );
}
