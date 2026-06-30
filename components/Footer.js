"use client";

import Link from 'next/link';
import Logo from './Logo';
import useI18n from '@/lib/i18n/useI18n';

export default function Footer() {
  const { t, withLocalePath } = useI18n();

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
        <div className="footer-columns" aria-label={t('footer.columnsAria')}>
          <nav className="footer-col" aria-label={t('footer.product')}>
            <p>{t('footer.product')}</p>
            <Link href={withLocalePath('/')}>{t('footer.home')}</Link>
            <Link href={withLocalePath('/signup')}>{t('footer.signup')}</Link>
            <Link href={withLocalePath('/pricing')}>{t('footer.pricing')}</Link>
          </nav>

          <nav className="footer-col" aria-label={t('footer.resources')}>
            <p>{t('footer.resources')}</p>
            <Link href={withLocalePath('/pricing')}>{t('footer.offers')}</Link>
            <Link href={withLocalePath('/contact')}>{t('footer.askDemo')}</Link>
            <Link href={withLocalePath('/login')}>{t('footer.clientArea')}</Link>
          </nav>

          <nav className="footer-col" aria-label={t('footer.legal')}>
            <p>{t('footer.legal')}</p>
            <Link href={withLocalePath('/cgu')}>{t('footer.terms')}</Link>
            <Link href={withLocalePath('/mentions-legales')}>{t('footer.legalNotice')}</Link>
            <Link href={withLocalePath('/confidentialite')}>{t('footer.privacy')}</Link>
            <Link href={withLocalePath('/contact-rgpd')}>{t('footer.rgpdContact')}</Link>
          </nav>

          <nav className="footer-col" aria-label={t('footer.contact')}>
            <p>{t('footer.contact')}</p>
            <Link href={withLocalePath('/contact')}>{t('footer.talkToExpert')}</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

