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
          <div>
            <p className="footer-brand">TeamBlender</p>
            <p className="footer-copy">{t('footer.brandCopy')}</p>
          </div>
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

        <div className="footer-accordion" aria-label={t('footer.columnsAria')}>
          {footerGroups.map((group) => (
            <details key={group.key} className="footer-accordion__item" open>
              <summary className="footer-accordion__summary">
                <span>{group.label}</span>
                <span className="footer-accordion__toggle" aria-hidden="true">+</span>
              </summary>
              <div className="footer-accordion__body">
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href}>{link.label}</Link>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </footer>
  );
}

