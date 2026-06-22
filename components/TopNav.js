"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import NavItem from './NavItem';
import AvatarMenu from './AvatarMenu';
import useI18n from '@/lib/i18n/useI18n';
import { stripLocaleFromPath } from '@/lib/i18n/routing';

export default function TopNav({ compact = false }) {
  const router = useRouter();
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
  const roleLabel = sessionUser?.role === 'participant' ? t('nav.participant') : sessionUser?.role === 'admin' ? t('nav.admin') : t('nav.manager');
  const mobileLoginHref = withLocalePath('/login');
  const mobileSignupHref = withLocalePath('/signup');

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

          <div className="nav-mobile-cta" aria-label={t('nav.accountAria')}>
            <Link href={mobileLoginHref} className="btn-mini nav-mobile-login-btn">
              {t('nav.login')}
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
              <NavItem href={withLocalePath('/')} active={isActive('/')} onClick={() => setIsMenuOpen(false)}>{t('nav.product')}</NavItem>
              <NavItem href={withLocalePath('/pricing')} active={isActive('/pricing')} onClick={() => setIsMenuOpen(false)}>{t('nav.pricing')}</NavItem>
              <NavItem href={withLocalePath('/contact')} active={isActive('/contact')} onClick={() => setIsMenuOpen(false)}>{t('nav.contact')}</NavItem>
            </nav>
          </div>

          <div className="nav-actions" aria-label={t('nav.accountAria')}>
            <LanguageSwitcher />
            {sessionUser ? (
              <AvatarMenu
                userLabel={avatarLabel}
                roleLabel={roleLabel}
                avatarUrl={avatarUrl}
                avatarInitials={avatarInitials}
                triggerLabel={t('nav.userMenuOf', { name: avatarLabel })}
                menuLabel={t('nav.userMenu')}
                closeSignal={pathname}
                items={[
                  {
                    key: 'account',
                    label: t('nav.myAccount'),
                    href: withLocalePath(accountHref),
                  },
                  {
                    key: 'logout',
                    label: t('appNav.logout'),
                    danger: true,
                    onClick: () => {
                      localStorage.removeItem('jwt');
                      sessionStorage.removeItem('jwt');
                      sessionStorage.removeItem('currentUser');
                      router.push(withLocalePath('/login'));
                    },
                  },
                ]}
              />
            ) : (
              <>
                <NavItem href={withLocalePath('/login')} active={isActive('/login')} onClick={() => setIsMenuOpen(false)}>{t('nav.login')}</NavItem>
                <NavItem href={withLocalePath('/signup')} active={isActive('/signup')} onClick={() => setIsMenuOpen(false)}>{t('nav.signup')}</NavItem>
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

