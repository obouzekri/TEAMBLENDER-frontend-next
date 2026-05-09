import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <TopNav />
      <main className="shell landing">
        <section className="hero">
          <p className="eyebrow">TEAMSPARK</p>
          <h1>Team-building professionnel, simple a lancer.</h1>
          <p>
            Une experience guidee pour managers et RH: preparation rapide, animation claire,
            et resultats exploitables pour l equipe.
          </p>
          <div className="hero-actions">
            <Link href="/signup" className="btn-primary">Creer un compte</Link>
            <Link href="/login" className="btn-secondary">Se connecter</Link>
          </div>
        </section>

        <section className="cards-grid" aria-label="Atouts TEAMSPARK">
          <article className="feature-card">
            <h2>Lancement en moins d une heure</h2>
            <p>Un cadre structure pour preparer la session sans surcharge logistique.</p>
          </article>
          <article className="feature-card">
            <h2>Animation lisible pour tous</h2>
            <p>Facilitateur, participants et RH suivent la meme dynamique, sans ambiguite.</p>
          </article>
          <article className="feature-card">
            <h2>Debrief orienté action</h2>
            <p>Les resultats servent a piloter des decisions d equipe concretes.</p>
          </article>
        </section>
      </main>
      <Footer />
    </>
  );
}
