"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { getApiUrl } from '@/lib/config';

const DEFAULT_BLOCKS = {
  hero_main: {
    title: 'Faites de chaque session d equipe un moment utile, fluide et memorable.',
    description:
      'TEAMSPARK structure vos ateliers de cohesion avec une approche moderne: preparation en minutes, animation guidee en live et debrief directement exploitable.',
  },
  hero_image_a: {
    image_url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80',
    description: 'Workshop cadence pour equipes hybrides',
  },
  hero_image_b: {
    image_url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80',
    description: 'Pilotage manager en temps reel',
  },
  challenge_1: {
    subtitle: 'Communication',
    title: 'Phrase Collaborative',
    description: 'Active rapidement la co-construction avec une dynamique claire et des prises de parole equilibrees.',
    image_url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
  },
  challenge_2: {
    subtitle: 'Coordination',
    title: 'Escape Room Live',
    description: 'Fait emerger les reflexes collectifs sous contrainte de temps, priorisation et partage des roles.',
    image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
  },
  challenge_3: {
    subtitle: 'Decision',
    title: 'Copuzzle Live',
    description: 'Oriente les equipes vers la resolution conjointe de problemes et des decisions argumentees.',
    image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
  },
};

function mapByKey(items) {
  const out = {};
  (Array.isArray(items) ? items : []).forEach((item) => {
    const key = String(item?.block_key || '').trim();
    if (!key) return;
    out[key] = item;
  });
  return out;
}

function mergeBlock(key, dynamicBlocks) {
  return {
    ...(DEFAULT_BLOCKS[key] || {}),
    ...(dynamicBlocks[key] || {}),
  };
}

export default function HomePage() {
  const [dynamicBlocks, setDynamicBlocks] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function loadLandingContent() {
      try {
        const res = await fetch(getApiUrl('/landing-content'));
        const payload = await res.json().catch(() => []);
        if (!res.ok) return;
        if (!cancelled) {
          setDynamicBlocks(mapByKey(payload));
        }
      } catch {
        // Keep defaults when API is unavailable.
      }
    }

    loadLandingContent();
    return () => {
      cancelled = true;
    };
  }, []);

  const challengeExamples = useMemo(
    () => ['challenge_1', 'challenge_2', 'challenge_3'].map((key) => {
      const item = mergeBlock(key, dynamicBlocks);
      return {
        category: item.subtitle || '',
        title: item.title || '',
        description: item.description || '',
        image: item.image_url || '',
      };
    }),
    [dynamicBlocks]
  );

  const heroMain = mergeBlock('hero_main', dynamicBlocks);
  const heroImageA = mergeBlock('hero_image_a', dynamicBlocks);
  const heroImageB = mergeBlock('hero_image_b', dynamicBlocks);

  return (
    <>
      <TopNav />
      <main className="shell landing-v2">
        <section className="hero-v2 reveal-up" aria-label="Presentation TEAMSPARK">
          <div className="hero-v2-grid">
            <div className="hero-v2-copy">
              <p className="hero-v2-kicker">Platforme team performance</p>
              <h1>{heroMain.title || DEFAULT_BLOCKS.hero_main.title}</h1>
              <p>{heroMain.description || DEFAULT_BLOCKS.hero_main.description}</p>
              <div className="hero-v2-actions">
                <Link href="/signup" className="btn-primary">Demarrer mon pilote</Link>
                <Link href="/pricing" className="btn-secondary">Comparer les formules</Link>
              </div>
              <div className="hero-v2-trust">
                <span>Brief manager en moins de 10 min</span>
                <span>Animation live structuree</span>
                <span>Debrief directement exploitable</span>
              </div>
            </div>

            <div className="hero-v2-media" aria-label="Apercus d usage TEAMSPARK">
              <article className="hero-v2-photo-card card-a">
                <img
                  src={heroImageA.image_url || DEFAULT_BLOCKS.hero_image_a.image_url}
                  alt="Equipe en atelier collaboratif"
                  loading="lazy"
                />
                <p>{heroImageA.description || DEFAULT_BLOCKS.hero_image_a.description}</p>
              </article>
              <article className="hero-v2-photo-card card-b">
                <img
                  src={heroImageB.image_url || DEFAULT_BLOCKS.hero_image_b.image_url}
                  alt="Manager pilotant une session"
                  loading="lazy"
                />
                <p>{heroImageB.description || DEFAULT_BLOCKS.hero_image_b.description}</p>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-impact-band reveal-up" aria-label="Indicateurs cles">
          <article>
            <strong>-65%</strong>
            <p>de temps de preparation percu par les managers</p>
          </article>
          <article>
            <strong>3 etapes</strong>
            <p>pour passer d un objectif a un debrief utile</p>
          </article>
          <article>
            <strong>100%</strong>
            <p>navigable mobile et desktop sans installation</p>
          </article>
          <article>
            <strong>1 flow</strong>
            <p>manager, participants et resultats dans un meme cadre</p>
          </article>
        </section>

        <section className="landing-contrast reveal-up" aria-label="Avant et avec TEAMSPARK">
          <article className="feature-card contrast-card contrast-before">
            <p className="eyebrow">Sans TEAMSPARK</p>
            <h2>Preparation eparpillee, energie dispersee</h2>
            <ul>
              <li>Objectif de session flou ou tardif</li>
              <li>Animation heterogene selon l animateur</li>
              <li>Peu de traces exploitables pour la suite</li>
            </ul>
          </article>
          <article className="feature-card contrast-card contrast-after">
            <p className="eyebrow">Avec TEAMSPARK</p>
            <h2>Cadre commun, execution nette, decisions facilites</h2>
            <ul>
              <li>Cadrage explicite de l enjeu equipe</li>
              <li>Parcours guide pour manager et participants</li>
              <li>Debrief concret pour alimenter vos rituels</li>
            </ul>
          </article>
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
