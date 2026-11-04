import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { cookies } from 'next/headers';
import { normalizeLocale, withLocalePath as localizePath } from '@/lib/i18n/routing';
import { LOCALE_COOKIE } from '@/lib/i18n/detectLocale';
import { translate } from '@/lib/i18n';

export default async function NotFound() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const withLocalePath = (href) => localizePath(locale, href);

  return (
    <>
      <TopNav />
      <main className="shell landing">
        <section className="hero">
          <p className="eyebrow">{translate(locale, 'errorPages.error404')}</p>
          <h1>{translate(locale, 'errorPages.thisPageDoesNotExist')}</h1>
          <p>
            {translate(locale, 'errorPages.theLinkMayBeOutdatedOr')}
          </p>
          <div className="hero-actions">
            <Link href={withLocalePath('/')} className="btn-primary">{translate(locale, 'errorPages.home')}</Link>
            <Link href={withLocalePath('/login')} className="btn-secondary">{translate(locale, 'errorPages.logIn')}</Link>
            <Link href={withLocalePath('/home')} className="btn-secondary">{translate(locale, 'errorPages.managerSpace')}</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
