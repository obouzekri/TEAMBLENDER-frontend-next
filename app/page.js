import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';

export default function HomePage() {
  const challengeExamples = [
    {
      category: 'Communication',
      title: 'Phrase Collaborative',
      description: 'Active rapidement la co-construction avec une dynamique claire et des prises de parole equilibrees.',
      image:
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
    },
    {
      category: 'Coordination',
      title: 'Escape Room Live',
      description: 'Fait emerger les reflexes collectifs sous contrainte de temps, priorisation et partage des roles.',
      image:
        'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
    },
    {
      category: 'Decision',
      title: 'Copuzzle Live',
      description: 'Oriente les equipes vers la resolution conjointe de problemes et des decisions argumentees.',
      image:
        'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
    },
  ];

  return (
    <>
      <TopNav />
      <main className="shell landing-v2">
        <section className="hero-v2 reveal-up" aria-label="Presentation TEAMSPARK">
          <div className="hero-v2-grid">
            <div className="hero-v2-copy">
              <p className="hero-v2-kicker">Platforme team performance</p>
              <h1>Faites de chaque session d equipe un moment utile, fluide et memorable.</h1>
              <p>
                TEAMSPARK structure vos ateliers de cohesion avec une approche moderne: preparation en minutes,
                animation guidee en live et debrief directement exploitable.
              </p>
              <div className="hero-v2-actions">
                <Link href="/signup" className="btn-primary">Demarrer gratuitement</Link>
                <Link href="/pricing" className="btn-secondary">Voir les formules</Link>
              </div>
              <div className="hero-v2-trust">
                <span>Temps de mise en place reduit</span>
                <span>Live challenge synchronise</span>
                <span>Insights actionnables</span>
              </div>
            </div>

            <div className="hero-v2-media" aria-label="Apercus d usage TEAMSPARK">
              <article className="hero-v2-photo-card card-a">
                <img
                  src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80"
                  alt="Equipe en atelier collaboratif"
                  loading="lazy"
                />
                <p>Workshop cadence pour equipes hybrides</p>
              </article>
              <article className="hero-v2-photo-card card-b">
                <img
                  src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80"
                  alt="Manager pilotant une session"
                  loading="lazy"
                />
                <p>Pilotage manager en temps reel</p>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-highlights reveal-up" aria-label="Benefices principaux">
          <article className="feature-card highlight-card">
            <p className="eyebrow">Execution</p>
            <h2>Un cadre pro des la premiere session</h2>
            <p>Des parcours clairs pour manager, participant et facilitateur, sans improvisation technique.</p>
          </article>
          <article className="feature-card highlight-card">
            <p className="eyebrow">Impact</p>
            <h2>Un debrief qui sert les decisions</h2>
            <p>Les resultats de session remontent en signaux concrets pour alimenter vos plans d action equipe.</p>
          </article>
          <article className="feature-card highlight-card">
            <p className="eyebrow">Scale</p>
            <h2>Pret pour vos prochains rituels</h2>
            <p>Un socle reutilisable qui passe du test pilote a une pratique recurrente de cohesion.</p>
          </article>
        </section>

        <section className="feature-card reveal-up landing-flow" aria-label="Parcours en 3 etapes">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Processus simple</p>
              <h2>Comment ca se passe avec TEAMSPARK</h2>
            </div>
            <Link href="/signup" className="btn-mini">Lancer une session</Link>
          </div>
          <div className="cards-grid landing-flow-grid">
            <article className="feature-card flow-card">
              <span className="flow-index">01</span>
              <h2>Cadrer l objectif</h2>
              <p>Choisissez votre enjeu d equipe: collaboration, communication ou coordination.</p>
            </article>
            <article className="feature-card flow-card">
              <span className="flow-index">02</span>
              <h2>Animer en live</h2>
              <p>Lancez un challenge adapte et pilotez la session avec un rythme clair.</p>
            </article>
            <article className="feature-card flow-card">
              <span className="flow-index">03</span>
              <h2>Debrief actionnable</h2>
              <p>Repartez avec des insights exploitables pour votre equipe et vos rituels suivants.</p>
            </article>
          </div>
        </section>

        <section className="challenge-showcase reveal-up" aria-label="Exemples de challenges">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Challenge library</p>
              <h2>Exemples de formats disponibles</h2>
            </div>
            <Link href="/signup" className="btn-mini">Explorer la bibliotheque</Link>
          </div>
          <div className="challenge-grid">
            {challengeExamples.map((item) => (
              <article key={item.title} className="challenge-card">
                <div className="challenge-media">
                  <img src={item.image} alt={item.title} loading="lazy" />
                </div>
                <div className="challenge-body">
                  <p className="eyebrow">{item.category}</p>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-proof reveal-up" aria-label="Resultats et confiance">
          <article className="feature-card proof-metrics">
            <h2>Ce que vous gagnez</h2>
            <div className="proof-grid">
              <div>
                <strong>20+</strong>
                <span>formats challenge prets a l emploi</span>
              </div>
              <div>
                <strong>&lt; 60 min</strong>
                <span>pour cadrer puis lancer une session</span>
              </div>
              <div>
                <strong>Hybrid-ready</strong>
                <span>remote, presentiel et formats mixtes</span>
              </div>
            </div>
          </article>
          <article className="feature-card proof-testimonials">
            <h2>Ils en parlent</h2>
            <p>
              "On a enfin un format qui structure nos sessions sans perdre de temps, et le debrief sert vraiment pour la suite."
            </p>
            <p className="session-meta">Manager operationnel, PME tech</p>
            <p>
              "Le niveau de participation est plus eleve car tout est plus clair cote animateur comme cote equipe."
            </p>
            <p className="session-meta">Responsable RH, services</p>
          </article>
        </section>

        <section className="feature-card landing-pricing-cta reveal-up" aria-label="Section tarification">
          <div>
            <p className="eyebrow">Tarification flexible</p>
            <h2>Demarrez avec une formule simple, evoluez quand votre usage grandit.</h2>
            <p>Consultez les offres ou demandez un cadrage adapte a votre contexte entreprise.</p>
          </div>
          <div className="hero-v2-actions">
            <Link href="/pricing" className="btn-primary">Voir la tarification</Link>
            <Link href="/contact" className="btn-secondary">Parler a un expert</Link>
          </div>
        </section>

        <section className="feature-card landing-cta-block reveal-up" aria-label="Dernier appel a l action">
          <p className="eyebrow">Prochaine etape</p>
          <h2>Prets a lancer une session qui compte vraiment pour votre equipe ?</h2>
          <p>
            Creez votre compte, choisissez votre premier challenge et pilotez un format de cohesion moderne.
          </p>
          <div className="hero-actions home-hero-actions">
            <Link href="/signup" className="btn-primary">Creer une session</Link>
            <Link href="/login" className="btn-secondary">Se connecter</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
