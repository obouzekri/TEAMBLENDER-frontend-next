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
            <Link href="/contact" className="btn-secondary">Demander une demo</Link>
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

        <section className="feature-card showcase-block" aria-label="Exemples de challenges">
          <div className="panel-head">
            <h2>Exemples de challenges</h2>
            <Link href="/signup" className="btn-mini">Tester en equipe</Link>
          </div>
          <div className="cards-grid showcase-grid">
            <article className="feature-card">
              <p className="eyebrow">ICEBREAKER</p>
              <h2>Phrase collaborative</h2>
              <p>Un lancement rapide pour activer la parole et la co-construction.</p>
            </article>
            <article className="feature-card">
              <p className="eyebrow">COOPERATION</p>
              <h2>Escape Room Live</h2>
              <p>Progression collective avec enigmes synchronisees et gestion du temps.</p>
            </article>
            <article className="feature-card">
              <p className="eyebrow">STRATEGIE</p>
              <h2>Copuzzle Live</h2>
              <p>Resolution de problemes en equipe avec roles et contraintes partagees.</p>
            </article>
          </div>
        </section>

        <section className="feature-card metrics-block" aria-label="Chiffres cles">
          <h2>Chiffres cles de la plateforme</h2>
          <div className="metrics-grid">
            <article className="feature-card">
              <p className="eyebrow">CATALOGUE</p>
              <h2>20+</h2>
              <p>formats de challenges prets a animer</p>
            </article>
            <article className="feature-card">
              <p className="eyebrow">DEMARRAGE</p>
              <h2>&lt; 60 min</h2>
              <p>pour preparer et lancer une session</p>
            </article>
            <article className="feature-card">
              <p className="eyebrow">FORMAT</p>
              <h2>Hybride</h2>
              <p>remote, presentiel et mixte sur le meme cadre</p>
            </article>
          </div>
        </section>

        <section className="feature-card logo-strip" aria-label="Clients et partenaires">
          <h2>Ils utilisent TEAMSPARK</h2>
          <div className="logo-grid">
            <span>ALPHA GROUP</span>
            <span>NOVA PEOPLE</span>
            <span>ATLAS INDUSTRIE</span>
            <span>BLUE ORBIT</span>
          </div>
        </section>

        <section className="feature-card" aria-label="Temoignages">
          <h2>Ce qu ils disent de nous</h2>
          <div className="cards-grid testimonials-grid">
            <article className="feature-card">
              <p>
                "Enfin un format qui nous permet de lancer des sessions regulières sans mobiliser 3 semaines de preparation."
              </p>
              <p className="session-meta">Responsable RH, secteur services</p>
            </article>
            <article className="feature-card">
              <p>
                "Le debrief est directement exploitable: on repart avec des actions concretes pour le collectif."
              </p>
              <p className="session-meta">Manager operationnel, PME tech</p>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
