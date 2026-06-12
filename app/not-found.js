import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { cookies } from 'next/headers';

export default async function NotFound() {
  const cookieStore = await cookies();
  const locale = String(cookieStore.get('tb_locale')?.value || 'fr').toLowerCase() === 'en' ? 'en' : 'fr';
  const isEn = locale === 'en';
  const withLocalePath = (href) => {
    const path = String(href || '/');
    if (path.startsWith('/en') || path.startsWith('/fr')) return path;
    return `/${locale}${path === '/' ? '' : path}`;
  };

  return (
    <>
      <TopNav />
      <main className="shell landing">
        <section className="hero">
          <p className="eyebrow">{isEn ? 'ERROR 404' : 'ERREUR 404'}</p>
          <h1>{isEn ? 'This page does not exist.' : 'Cette page n existe pas.'}</h1>
          <p>
            {isEn
              ? 'The link may be outdated or the page has been moved during migration. You can go back to the main routes below.'
              : 'Le lien est peut-etre obsolete ou la page a ete deplacee pendant la migration. Vous pouvez revenir vers les parcours principaux ci-dessous.'}
          </p>
          <div className="hero-actions">
            <Link href={withLocalePath('/')} className="btn-primary">{isEn ? 'Home' : 'Accueil'}</Link>
            <Link href={withLocalePath('/login')} className="btn-secondary">{isEn ? 'Log in' : 'Connexion'}</Link>
            <Link href={withLocalePath('/home')} className="btn-secondary">{isEn ? 'Manager space' : 'Espace manager'}</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
