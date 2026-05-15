"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

export default function TopNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isActive = (href) => (href === '/' ? pathname === '/' : pathname?.startsWith(href));

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <header className="top-nav">
      <div className="shell nav-inner">
        <div className="nav-top-row">
          <div className="nav-brand-block">
            <Link href="/" className="brand">
              <Logo />
            </Link>
          </div>

          <button
            type="button"
            className={`nav-toggle ${isMenuOpen ? 'is-open' : ''}`}
            aria-expanded={isMenuOpen}
            aria-controls="top-nav-panel"
            aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <span className="nav-toggle__line" />
            <span className="nav-toggle__line" />
            <span className="nav-toggle__line" />
          </button>
        </div>

        <div id="top-nav-panel" className={`nav-panel ${isMenuOpen ? 'is-open' : ''}`}>
          <div className="nav-main-block">
            <nav className="nav-links" aria-label="Navigation principale">
              <Link href="/" className={`nav-link ${isActive('/') ? 'is-active' : ''}`} aria-current={isActive('/') ? 'page' : undefined}>Produit</Link>
              <Link href="/pricing" className={`nav-link ${isActive('/pricing') ? 'is-active' : ''}`} aria-current={isActive('/pricing') ? 'page' : undefined}>Tarifs</Link>
              <Link href="/contact" className={`nav-link ${isActive('/contact') ? 'is-active' : ''}`} aria-current={isActive('/contact') ? 'page' : undefined}>Contact</Link>
            </nav>

            <div className="nav-actions" aria-label="Acces compte">
              <Link href="/login" className={`btn-mini btn-mini--secondary ${isActive('/login') ? 'is-active' : ''}`} aria-current={isActive('/login') ? 'page' : undefined}>Connexion</Link>
              <Link href="/signup" className={`nav-cta-btn ${isActive('/signup') ? 'is-active' : ''}`} aria-current={isActive('/signup') ? 'page' : undefined}>Créer une session</Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

