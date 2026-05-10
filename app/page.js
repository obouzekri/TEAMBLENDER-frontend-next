import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <TopNav />
      <main className="shell landing landing-home">
        <section className="hero home-hero" aria-label="Presentation TEAMSPARK">
          <div className="landing-hero-layout">
            <div className="landing-hero-copy">
              <div className="hero-kicker-row">
                <p className="eyebrow">TEAMSPARK</p>
                <span className="hero-kicker-pill">Concu pour managers et RH</span>
              </div>
              <h1>Transformez un besoin d equipe en session utile, cadree et vraiment exploitable.</h1>
              <p>
                TEAMSPARK vous aide a cadrer l objectif, choisir le bon format et lancer une
                session guidee qui produit de vrais signaux pour le collectif, sans lourdeur de preparation.
              </p>
              <ul className="hero-bullets" aria-label="Benefices clefs">
                <li>Un cadrage net pour passer d un enjeu d equipe a une session actionnable</li>
                <li>Des formats guides pour faire participer sans flottement ni surcharge d animation</li>
                <li>Un debrief lisible pour repartir avec des decisions et signaux concrets</li>
              </ul>
              <div className="hero-proof-row" aria-label="Repères de confiance">
                <span>Preparation rapide</span>
                <span>Animation lisible</span>
                <span>Takeaway exploitable</span>
              </div>
              <div className="hero-actions home-hero-actions">
                <Link href="/signup" className="btn-primary">Creer une session</Link>
                <Link href="/contact" className="btn-secondary">Decouvrir le fonctionnement</Link>
              </div>
            </div>
            <aside className="feature-card hero-side-card" aria-label="Resume produit">
              <p className="eyebrow">UN CADRE PROFESSIONNEL</p>
              <h2>Un outil de pilotage d equipe, pas une simple animation.</h2>
              <p>
                Definissez l intention, assignez les participants, choisissez le bon challenge et animez
                une experience claire sur desktop comme sur mobile.
              </p>
              <div className="hero-side-metrics">
                <div>
                  <strong>&lt; 60 min</strong>
                  <span>pour cadrer et lancer une session</span>
                </div>
                <div>
                  <strong>Hybride</strong>
                  <span>remote, presentiel ou mixte</span>
                </div>
                <div>
                  <strong>Structure</strong>
                  <span>facilitateur, RH et participants alignes</span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="cards-grid landing-value-grid" aria-label="Pourquoi TEAMSPARK">
          <article className="feature-card landing-value-card">
            <p className="eyebrow">RESULTAT</p>
            <h2>Concu pour des resultats utiles</h2>
            <p>
              TEAMSPARK est pense pour les equipes qui ont besoin d un cadre credible, pas d une
              succession d activites deconnectees de leurs enjeux.
            </p>
            <p className="value-note">Un objectif d equipe a l entree. Un takeaway clair a la sortie.</p>
          </article>
          <article className="feature-card landing-value-card">
            <p className="eyebrow">EXECUTION</p>
            <h2>Professionnel par defaut</h2>
            <p>
              Vous n avez pas besoin d etre expert en facilitation pour lancer une experience serieuse,
              lisible et respectueuse du temps de chacun.
            </p>
            <p className="value-note">Configuration claire, animation guidee, experience fluide des deux cotes.</p>
          </article>
        </section>

        <section className="feature-card landing-steps-block" aria-label="Comment ca marche">
          <div className="panel-head">
            <div>
              <p className="eyebrow">PARCOURS PRODUIT</p>
              <h2>Comment TEAMSPARK fonctionne</h2>
            </div>
            <Link href="/signup" className="btn-mini">Lancer ma premiere session</Link>
          </div>
          <div className="cards-grid landing-steps-grid">
            <article className="feature-card step-card">
              <span className="step-index">1</span>
              <h2>Definissez l objectif</h2>
              <p>Choisissez ce que votre equipe doit renforcer et partez d un besoin reel, pas d un format impose.</p>
            </article>
            <article className="feature-card step-card">
              <span className="step-index">2</span>
              <h2>Configurez et lancez</h2>
              <p>Creez la session, assignez les participants et selectionnez le format adapte a votre contexte.</p>
            </article>
            <article className="feature-card step-card">
              <span className="step-index">3</span>
              <h2>Capturez le takeaway</h2>
              <p>Terminez avec un debrief exploitable pour lire la dynamique du collectif et passer plus vite a l action.</p>
            </article>
          </div>
        </section>

        <section className="feature-card showcase-block" aria-label="Exemples de challenges">
          <div className="panel-head">
            <div>
              <p className="eyebrow">FORMATS GUIDES</p>
              <h2>Des challenges relies a un usage d equipe</h2>
            </div>
            <Link href="/signup" className="btn-mini">Explorer les formats</Link>
          </div>
          <div className="cards-grid showcase-grid">
            <article className="feature-card">
              <p className="eyebrow">COMMUNICATION</p>
              <h2>Phrase collaborative</h2>
              <p>Un format court pour activer la parole, structurer la contribution et installer la co-construction.</p>
            </article>
            <article className="feature-card">
              <p className="eyebrow">COORDINATION</p>
              <h2>Escape Room Live</h2>
              <p>Une progression collective sous contrainte qui revele les reflexes de cooperation et de gestion du temps.</p>
            </article>
            <article className="feature-card">
              <p className="eyebrow">COLLABORATION</p>
              <h2>Copuzzle Live</h2>
              <p>Resolution de problemes en equipe avec repartition des roles, contraintes partagees et alignement collectif.</p>
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

        <section className="feature-card landing-cta-block" aria-label="Dernier appel a l action">
          <p className="eyebrow">PROCHAINE ETAPE</p>
          <h2>Pret a concevoir votre prochaine session d equipe ?</h2>
          <p>
            Lancez un cadre professionnel, assignez vos participants et animez une experience qui
            laisse une trace utile dans le collectif.
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
