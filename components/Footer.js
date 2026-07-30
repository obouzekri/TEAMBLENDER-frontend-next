"use client";

import Link from 'next/link';
import Logo from './Logo';
import useI18n from '@/lib/i18n/useI18n';

export default function Footer() {
  const { t, withLocalePath } = useI18n();

  const footerGroups = [
    {
      key: 'product',
      label: t('footer.product'),
      links: [
        { href: withLocalePath('/'), label: t('footer.home') },
        { href: withLocalePath('/signup'), label: t('footer.signup') },
        { href: withLocalePath('/pricing'), label: t('footer.pricing') },
      ],
    },
    {
      key: 'resources',
      label: t('footer.resources'),
      links: [
        { href: withLocalePath('/pricing'), label: t('footer.offers') },
        { href: withLocalePath('/contact'), label: t('footer.askDemo') },
        { href: withLocalePath('/login'), label: t('footer.clientArea') },
      ],
    },
    {
      key: 'legal',
      label: t('footer.legal'),
      links: [
        { href: withLocalePath('/cgu'), label: t('footer.terms') },
        { href: withLocalePath('/mentions-legales'), label: t('footer.legalNotice') },
        { href: withLocalePath('/confidentialite'), label: t('footer.privacy') },
        { href: withLocalePath('/contact-rgpd'), label: t('footer.rgpdContact') },
      ],
    },
    {
      key: 'contact',
      label: t('footer.contact'),
      links: [
        { href: withLocalePath('/contact'), label: t('footer.talkToExpert') },
      ],
    },
  ];

  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div className="footer-brand-block">
          <div className="footer-logo" aria-hidden="true">
            <Logo size="compact" />
          </div>
          <p className="footer-copy">{t('footer.brandCopy')}</p>
        </div>
        <div className="footer-columns footer-columns--desktop" aria-label={t('footer.columnsAria')}>
          {footerGroups.map((group) => (
            <nav key={group.key} className="footer-col" aria-label={group.label}>
              <p>{group.label}</p>
              {group.links.map((link) => (
                <Link key={link.href} href={link.href}>{link.label}</Link>
              ))}
            </nav>
          ))}
        </div>

        <div className="footer-columns footer-columns--mobile" aria-label={t('footer.columnsAria')}>
          {footerGroups.map((group) => (
            <nav key={group.key} className="footer-col" aria-label={group.label}>
              <p>{group.label}</p>
              {group.links.map((link) => (
                <Link key={link.href} href={link.href}>{link.label}</Link>
              ))}
            </nav>
          ))}
        </div>

        <div className="footer-social">
          <p className="footer-social__label">{t('footer.followUs')}</p>
          <a
            href="https://www.linkedin.com/company/teamblender/?viewAsMember=true"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-social__link"
            aria-label="TeamBlender LinkedIn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.447 20.452H16.89v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a1.958 1.958 0 1 1 0-3.916 1.958 1.958 0 0 1 0 3.916zm1.959 13.019H3.378V9h3.918v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}

