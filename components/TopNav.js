"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import useI18n from '@/lib/i18n/useI18n';
import { stripLocaleFromPath } from '@/lib/i18n/routing';

export default function TopNav({ compact = false }) {
  const pathname = usePathname();
  const plainPathname = stripLocaleFromPath(pathname || '/');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const { t, withLocalePath } = useI18n();
  const isActive = (href) => (href === '/' ? plainPathname === '/' : plainPathname?.startsWith(href));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem('currentUser');
      setSessionUser(raw ? JSON.parse(raw) : null);
    } catch {
      setSessionUser(null);
    }
  }, [pathname]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const avatarLabel = String(sessionUser?.name || sessionUser?.first_name || sessionUser?.email || 'Utilisateur').trim();
  const avatarInitials = avatarLabel
    .split(' ')
    .map((part) => String(part || '').trim().slice(0, 1).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('') || 'U';
  const avatarUrl = String(sessionUser?.picture_url || '').trim();
  const accountHref = sessionUser?.role === 'participant' ? '/participant' : '/account';

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    if (isMenuOpen) {
      body.style.overflow = 'hidden';
    }
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  return (
    <header className={`top-nav${compact ? ' top-nav--compact' : ''}`}>
      <div className="shell nav-inner">
        <div className="nav-top-row">
          <div className="nav-brand-block">
            <Link href={withLocalePath('/')} className="brand">
              <Logo />
            </Link>
          </div>

          <button
            type="button"
            className={`nav-toggle ${isMenuOpen ? 'is-open' : ''}`}
            aria-expanded={isMenuOpen}
            aria-controls="top-nav-panel"
            aria-label={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <span className="nav-toggle__line" />
            <span className="nav-toggle__line" />
            <span className="nav-toggle__line" />
          </button>
        </div>

        <div id="top-nav-panel" className={`nav-panel ${isMenuOpen ? 'is-open' : ''}`}>
          <div className="nav-main-block">
            <nav className="nav-links" aria-label={t('nav.mainAria')}>
              <Link href={withLocalePath('/')} className={`nav-link ${isActive('/') ? 'is-active' : ''}`} aria-current={isActive('/') ? 'page' : undefined} onClick={() => setIsMenuOpen(false)}>{t('nav.product')}</Link>
              <Link href={withLocalePath('/pricing')} className={`nav-link ${isActive('/pricing') ? 'is-active' : ''}`} aria-current={isActive('/pricing') ? 'page' : undefined} onClick={() => setIsMenuOpen(false)}>{t('nav.pricing')}</Link>
              <Link href={withLocalePath('/contact')} className={`nav-link ${isActive('/contact') ? 'is-active' : ''}`} aria-current={isActive('/contact') ? 'page' : undefined} onClick={() => setIsMenuOpen(false)}>{t('nav.contact')}</Link>
            </nav>
          </div>

          <div className="nav-actions" aria-label={t('nav.accountAria')}>
            <LanguageSwitcher />
            {sessionUser ? (
              <Link href={withLocalePath(accountHref)} className="btn-mini btn-mini--secondary" onClick={() => setIsMenuOpen(false)}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={t('nav.avatarAlt', { name: avatarLabel })} className="app-user-avatar app-user-avatar--photo" />
                ) : (
                  <span className="app-user-avatar" aria-hidden="true">{avatarInitials}</span>
                )}
                {t('nav.myAccount')}
              </Link>
            ) : (
              <>
                <Link href={withLocalePath('/login')} className={`btn-mini btn-mini--secondary ${isActive('/login') ? 'is-active' : ''}`} aria-current={isActive('/login') ? 'page' : undefined} onClick={() => setIsMenuOpen(false)}>{t('nav.login')}</Link>
                <Link href={withLocalePath('/signup')} className={`nav-cta-btn ${isActive('/signup') ? 'is-active' : ''}`} aria-current={isActive('/signup') ? 'page' : undefined} onClick={() => setIsMenuOpen(false)}>{t('nav.signup')}</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {isMenuOpen ? (
        <button
          type="button"
          className="nav-mobile-overlay"
          aria-label={t('nav.closeMenu')}
          onClick={() => setIsMenuOpen(false)}
        />
      ) : null}
    </header>
  );
}

