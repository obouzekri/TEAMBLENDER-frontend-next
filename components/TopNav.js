"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TopNav() {
  const pathname = usePathname();
  const isActive = (href) => (href === '/' ? pathname === '/' : pathname?.startsWith(href));

  return (
    <header className="top-nav">
      <div className="shell nav-inner">
        <Link href="/" className="brand">TEAMSPARK</Link>
        <nav className="nav-links" aria-label="Navigation principale">
          <Link href="/" className={`nav-link ${isActive('/') ? 'is-active' : ''}`} aria-current={isActive('/') ? 'page' : undefined}>Accueil</Link>
          <Link href="/pricing" className={`nav-link ${isActive('/pricing') ? 'is-active' : ''}`} aria-current={isActive('/pricing') ? 'page' : undefined}>Tarification</Link>
          <Link href="/contact" className={`nav-link ${isActive('/contact') ? 'is-active' : ''}`} aria-current={isActive('/contact') ? 'page' : undefined}>Contact</Link>
          <Link href="/login" className={`nav-link ${isActive('/login') ? 'is-active' : ''}`} aria-current={isActive('/login') ? 'page' : undefined}>Connexion</Link>
          <Link href="/signup" className={`btn-mini nav-link nav-cta ${isActive('/signup') ? 'is-active' : ''}`} aria-current={isActive('/signup') ? 'page' : undefined}>Créer un compte</Link>
        </nav>
      </div>
    </header>
  );
}
