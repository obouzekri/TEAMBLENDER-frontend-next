"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { getApiUrl } from '@/lib/config';

const DEFAULT_BLOCKS = {
  hero_main: {
    title: 'Créez de la cohésion au sein de vos équipes,',
    description:
      'avec des résultats concrets et mesurables.',
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
    description: 'Active la co-construction avec un cadre clair et engageant.',
    image_url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
  },
  challenge_2: {
    subtitle: 'Coordination',
    title: 'Escape Room Live',
    description: 'Developpe les reflexes collectifs sous contrainte de temps.',
    image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
  },
  challenge_3: {
    subtitle: 'Decision',
    title: 'Copuzzle Live',
    description: 'Favorise la resolution conjointe et des choix argumentes.',
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

  const heroImageA = mergeBlock('hero_image_a', dynamicBlocks);
  const heroImageB = mergeBlock('hero_image_b', dynamicBlocks);

  return (
    <>
      <TopNav />
      <main className="shell landing-v2">
        <section className="hero-v2 reveal-up" aria-label="Presentation TeamBlender">
          <div className="hero-v2-grid">
            <div className="hero-v2-copy">
              <p className="hero-v2-kicker">Produit SaaS pour managers et RH</p>
              <h1>
                <span className="hero-v2-title-line">Créez de la cohésion au sein de vos équipes,</span>
                <span className="hero-v2-title-line">avec des résultats concrets et mesurables.</span>
              </h1>
              <p>Structurez vos sessions d equipe, animez-les avec clarte et pilotez des actions mesurables en sortie.</p>
              <div className="hero-v2-actions">
                <Link href="/signup" className="btn-primary">Creer une session</Link>
                <Link href="/contact" className="btn-secondary">Voir une demo</Link>
              </div>
              <div className="hero-v2-trust">
                <span>+120 equipes accompagnees</span>
                <span>Activation en moins de 10 min</span>
                <span>Debrief actionnable des la premiere session</span>
              </div>
            </div>

            <div className="hero-v2-media" aria-label="Apercu visuel TeamBlender">
              <article className="hero-v2-photo-card">
                <img src={heroImageA.image_url || DEFAULT_BLOCKS.hero_image_a.image_url} alt={heroImageA.description || DEFAULT_BLOCKS.hero_image_a.description} loading="lazy" />
                <p>{heroImageA.description || DEFAULT_BLOCKS.hero_image_a.description}</p>
              </article>
              <article className="hero-v2-photo-card card-b">
                <img src={heroImageB.image_url || DEFAULT_BLOCKS.hero_image_b.image_url} alt={heroImageB.description || DEFAULT_BLOCKS.hero_image_b.description} loading="lazy" />
                <p>{heroImageB.description || DEFAULT_BLOCKS.hero_image_b.description}</p>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-impact-band reveal-up" aria-label="Indicateurs cles">
          <article>
            <strong>-65%</strong>
            <p>de preparation manager percue</p>
          </article>
          <article>
            <strong>3 etapes</strong>
            <p>de l objectif au debrief concret</p>
          </article>
          <article>
            <strong>100%</strong>
            <p>navigable mobile et desktop sans installation</p>
          </article>
        </section>

        <section className="feature-card reveal-up landing-flow" aria-label="Parcours en 3 etapes">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Processus</p>
              <h2>Trois etapes. Un cadre clair.</h2>
            </div>
              <Link href="/signup" className="btn-primary">Lancer une session</Link>
          </div>
          <div className="cards-grid landing-flow-grid">
            <article className="feature-card flow-card">
              <span className="flow-index">01</span>
              <h2>Cadrer l objectif</h2>
              <p>Selectionnez l enjeu prioritaire de l equipe.</p>
            </article>
            <article className="feature-card flow-card">
              <span className="flow-index">02</span>
              <h2>Animer en live</h2>
              <p>Lancez un challenge et gardez le bon rythme.</p>
            </article>
            <article className="feature-card flow-card">
              <span className="flow-index">03</span>
              <h2>Debrief actionnable</h2>
              <p>Transformez les signaux en decisions equipe.</p>
            </article>
          </div>
        </section>

        <section className="challenge-showcase reveal-up" aria-label="Exemples de challenges">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Formats</p>
              <h2>Bibliotheque de challenges prets a lancer</h2>
            </div>
              <Link href="/signup" className="btn-secondary">Explorer</Link>
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

        <section className="feature-card landing-cta-block reveal-up" aria-label="Dernier appel a l action">
          <p className="eyebrow">Prochaine etape</p>
          <h2>Passez de l intention a la session active.</h2>
          <p>Creer le compte, choisir le format, lancer votre premiere session.</p>
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

