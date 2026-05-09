"use client";

import Link from 'next/link';
import { toLegacy } from '@/lib/legacy';

export default function AppNav({ userLabel, onLogout }) {
  return (
    <header className="top-nav">
      <div className="shell nav-inner">
        <Link href="/home" className="brand">TEAMSPARK</Link>
        <nav className="nav-links" aria-label="Navigation manager">
          <Link href="/home">Home</Link>
          <a href={toLegacy('/src/pages/session_view.html')}>Session builder</a>
          <a href={toLegacy('/src/ui/admin/admin.html')}>Admin legacy</a>
        </nav>
        <div className="app-user-box">
          <span className="app-user-name">{userLabel || 'Manager'}</span>
          <button type="button" className="btn-secondary" onClick={onLogout}>Se deconnecter</button>
        </div>
      </div>
    </header>
  );
}
