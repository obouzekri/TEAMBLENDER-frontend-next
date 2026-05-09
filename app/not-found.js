import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';

export default function NotFound() {
  return (
    <>
      <TopNav />
      <main className="shell landing">
        <section className="hero">
          <p className="eyebrow">ERREUR 404</p>
          <h1>Cette page n existe pas.</h1>
          <p>
            Le lien est peut-etre obsolete ou la page a ete deplacee pendant la migration.
            Vous pouvez revenir vers les parcours principaux ci-dessous.
          </p>
          <div className="hero-actions">
            <Link href="/" className="btn-primary">Accueil</Link>
            <Link href="/login" className="btn-secondary">Connexion</Link>
            <Link href="/home" className="btn-secondary">Espace manager</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
