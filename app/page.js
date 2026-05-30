"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { getApiUrl } from '@/lib/config';

const DEFAULT_BLOCKS = {
  impact_1: {},
  impact_2: {},
  impact_3: {},
  partners_header: {
    label: 'Confiance',
    title: 'Des equipes qui cherchent du concret, pas du bruit.',
    description: 'Une base d adoption simple pour les managers, RH et facilitateurs.',
  },
  partner_1: {
    title: 'RH & Talent',
  },
  partner_2: {
    title: 'Managers',
  },
  partner_3: {
    title: 'Facilitation',
  },
  partner_4: {
    title: 'Onboarding',
  },
  partner_5: {
    title: 'Formation',
  },
  partner_6: {
    title: 'Coaching',
  },
  testimonials_header: {
    label: 'Temoignages',
    title: 'Le retour terrain reste le meilleur signal.',
    description: 'Des retours courts, utiles et lisibles pour se projeter vite.',
  },
  testimonial_1: {
    title: 'Directrice RH',
    subtitle: 'Secteur services',
    description: 'Nous avons enfin un format d atelier qui se lance vite, reste lisible pour les participants et donne un vrai debrief.',
  },
  testimonial_2: {
    title: 'Responsable formation',
    subtitle: 'Entreprise multi-sites',
    description: 'La progression est claire, les equipes comprennent vite les regles, et le facilitateur garde la main sans lourdeur technique.',
  },
  testimonial_3: {
    title: 'Manager d equipe',
    subtitle: 'PME industrielle',
    description: 'On voit tout de suite si la session fait parler les bons sujets. C est simple a preparer et beaucoup plus concret que nos anciens icebreakers.',
  },
  flow_header: {
    label: 'Processus',
    title: 'Trois etapes. Un cadre clair.',
  },
  flow_step_1: {
    badge_text: '01',
    title: 'Cadrer l objectif',
    description: 'Selectionnez l enjeu prioritaire de l equipe.',
  },
  flow_step_2: {
    badge_text: '02',
    title: 'Animer en live',
    description: 'Lancez un challenge et gardez le bon rythme.',
  },
  flow_step_3: {
    badge_text: '03',
    title: 'Debrief actionnable',
    description: 'Transformez les signaux en decisions equipe.',
  },
  final_cta_secondary: {
    cta_label: 'Se connecter',
    cta_href: '/login',
  },
};

const CMS_BASELINE_COMPLETE_KEYS = new Set([
  'hero_main',
  'hero_kicker',
  'hero_cta_primary',
  'hero_cta_secondary',
  'hero_trust_1',
  'hero_trust_2',
  'hero_trust_3',
  'hero_image_a',
  'hero_image_b',
  'challenge_1',
  'challenge_2',
  'challenge_3',
  'impact_1',
  'impact_2',
  'impact_3',
  'partners_header',
  'partner_1',
  'partner_2',
  'partner_3',
  'partner_4',
  'partner_5',
  'partner_6',
  'testimonials_header',
  'testimonial_1',
  'testimonial_2',
  'testimonial_3',
  'final_cta',
]);

const LANDING_CMS_REQUIRED_SCHEMA = {
  hero_main: ['title', 'description'],
  hero_kicker: ['title'],
  hero_cta_primary: ['cta_label', 'cta_href'],
  hero_cta_secondary: ['cta_label', 'cta_href'],
  hero_trust_1: ['title'],
  hero_trust_2: ['title'],
  hero_trust_3: ['title'],
  hero_image_a: ['image_url', 'description'],
  hero_image_b: ['image_url', 'description'],
  impact_1: ['title', 'description'],
  impact_2: ['title', 'description'],
  impact_3: ['title', 'description'],
  partners_header: ['label', 'title', 'description'],
  partner_1: ['title'],
  partner_2: ['title'],
  partner_3: ['title'],
  partner_4: ['title'],
  partner_5: ['title'],
  partner_6: ['title'],
  testimonials_header: ['label', 'title', 'description'],
  testimonial_1: ['title', 'subtitle', 'description'],
  testimonial_2: ['title', 'subtitle', 'description'],
  testimonial_3: ['title', 'subtitle', 'description'],
  flow_header: ['label', 'title'],
  flow_step_1: ['badge_text', 'title', 'description'],
  flow_step_2: ['badge_text', 'title', 'description'],
  flow_step_3: ['badge_text', 'title', 'description'],
  final_cta: ['subtitle', 'title', 'description', 'cta_label', 'cta_href'],
  final_cta_secondary: ['cta_label', 'cta_href'],
};

function hasCmsValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function buildLandingCmsAudit(blocksByKey) {
  const missingKeys = [];
  const missingFields = [];

  Object.entries(LANDING_CMS_REQUIRED_SCHEMA).forEach(([key, requiredFields]) => {
    const block = blocksByKey[key];
    if (!block) {
      missingKeys.push(key);
      return;
    }

    const gaps = requiredFields.filter((field) => !hasCmsValue(block[field]));
    if (gaps.length > 0) {
      missingFields.push({ key, fields: gaps });
    }
  });

  return {
    missingKeys,
    missingFields,
  };
}

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

function isCmsBlockComplete(key, dynamicBlocks) {
  const requiredFields = LANDING_CMS_REQUIRED_SCHEMA[key] || [];
  const block = dynamicBlocks[key];
  if (!block) return false;
  return requiredFields.every((field) => hasCmsValue(block[field]));
}

function buildSectionBlocks(sectionKeys, dynamicBlocks) {
  const sectionFullyCovered = sectionKeys.every((key) => isCmsBlockComplete(key, dynamicBlocks));
  const blocks = {};

  sectionKeys.forEach((key) => {
    const keyCoveredInBaseline = CMS_BASELINE_COMPLETE_KEYS.has(key) && isCmsBlockComplete(key, dynamicBlocks);
    blocks[key] = (sectionFullyCovered || keyCoveredInBaseline)
      ? (dynamicBlocks[key] || {})
      : mergeBlock(key, dynamicBlocks);
  });

  return {
    sectionFullyCovered,
    blocks,
  };
}

function safeHref(value, fallback = '/') {
  return hasCmsValue(value) ? value : fallback;
}

export default function HomePage() {
  const [dynamicBlocks, setDynamicBlocks] = useState({});
  const [landingLoaded, setLandingLoaded] = useState(false);
  const isLandingCmsStrict = process.env.NEXT_PUBLIC_LANDING_CMS_STRICT === 'true';

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
      } finally {
        if (!cancelled) {
          setLandingLoaded(true);
        }
      }
    }

    loadLandingContent();
    return () => {
      cancelled = true;
    };
  }, []);

  const heroSection = useMemo(
    () => buildSectionBlocks([
      'hero_main',
      'hero_kicker',
      'hero_cta_primary',
      'hero_cta_secondary',
      'hero_trust_1',
      'hero_trust_2',
      'hero_trust_3',
      'hero_image_a',
      'hero_image_b',
    ], dynamicBlocks),
    [dynamicBlocks]
  );

  const impactSection = useMemo(
    () => buildSectionBlocks(['impact_1', 'impact_2', 'impact_3'], dynamicBlocks),
    [dynamicBlocks]
  );

  const flowSection = useMemo(
    () => buildSectionBlocks(['flow_header', 'flow_step_1', 'flow_step_2', 'flow_step_3'], dynamicBlocks),
    [dynamicBlocks]
  );

  const finalCtaSection = useMemo(
    () => buildSectionBlocks(['final_cta', 'final_cta_secondary'], dynamicBlocks),
    [dynamicBlocks]
  );

  const partnersSection = useMemo(
    () => buildSectionBlocks([
      'partners_header',
      'partner_1',
      'partner_2',
      'partner_3',
      'partner_4',
      'partner_5',
      'partner_6',
    ], dynamicBlocks),
    [dynamicBlocks]
  );

  const testimonialsSection = useMemo(
    () => buildSectionBlocks([
      'testimonials_header',
      'testimonial_1',
      'testimonial_2',
      'testimonial_3',
    ], dynamicBlocks),
    [dynamicBlocks]
  );

  const heroMain = heroSection.blocks.hero_main || {};
  const heroKicker = heroSection.blocks.hero_kicker || {};
  const heroCtaPrimary = heroSection.blocks.hero_cta_primary || {};
  const heroCtaSecondary = heroSection.blocks.hero_cta_secondary || {};
  const heroImageA = heroSection.blocks.hero_image_a || {};
  const heroImageB = heroSection.blocks.hero_image_b || {};
  const flowHeader = flowSection.blocks.flow_header || {};
  const finalCta = finalCtaSection.blocks.final_cta || {};
  const finalCtaSecondary = finalCtaSection.blocks.final_cta_secondary || {};
  const partnersHeader = partnersSection.blocks.partners_header || {};
  const testimonialsHeader = testimonialsSection.blocks.testimonials_header || {};

  const heroTrustItems = useMemo(
    () => ['hero_trust_1', 'hero_trust_2', 'hero_trust_3']
      .map((key) => (heroSection.blocks[key] || {}).title)
      .filter(Boolean),
    [heroSection]
  );

  const impactItems = useMemo(
    () => ['impact_1', 'impact_2', 'impact_3'].map((key) => {
      const item = impactSection.blocks[key] || {};
      return {
        value: item.title || '',
        description: item.description || '',
      };
    }).filter((item) => item.value || item.description),
    [impactSection]
  );

  const flowSteps = useMemo(
    () => ['flow_step_1', 'flow_step_2', 'flow_step_3'].map((key) => {
      const item = flowSection.blocks[key] || {};
      return {
        index: item.badge_text || '',
        title: item.title || '',
        description: item.description || '',
      };
    }),
    [flowSection]
  );

  const partnerItems = useMemo(
    () => ['partner_1', 'partner_2', 'partner_3', 'partner_4', 'partner_5', 'partner_6'].map((key) => {
      const item = partnersSection.blocks[key] || {};
      return {
        title: item.title || '',
      };
    }).filter((item) => item.title),
    [partnersSection]
  );

  const testimonialItems = useMemo(
    () => ['testimonial_1', 'testimonial_2', 'testimonial_3'].map((key) => {
      const item = testimonialsSection.blocks[key] || {};
      return {
        title: item.title || '',
        subtitle: item.subtitle || '',
        description: item.description || '',
      };
    }).filter((item) => item.title || item.description),
    [testimonialsSection]
  );

  const cmsAudit = useMemo(() => buildLandingCmsAudit(dynamicBlocks), [dynamicBlocks]);

  useEffect(() => {
    if (!isLandingCmsStrict || !landingLoaded) return;
    if (cmsAudit.missingKeys.length === 0 && cmsAudit.missingFields.length === 0) return;

    const fieldSummary = cmsAudit.missingFields
      .map((entry) => `${entry.key}: ${entry.fields.join(', ')}`)
      .join(' | ');

    console.warn(
      '[Landing CMS strict mode] Incomplete coverage detected.',
      {
        missingKeys: cmsAudit.missingKeys,
        missingFields: cmsAudit.missingFields,
        fieldSummary,
      }
    );
  }, [isLandingCmsStrict, landingLoaded, cmsAudit]);

  return (
    <>
      <TopNav />
      <main className="shell landing-v2">
        {isLandingCmsStrict && landingLoaded && (cmsAudit.missingKeys.length > 0 || cmsAudit.missingFields.length > 0) ? (
          <section className="feature-card" aria-label="Audit Landing CMS" style={{ borderColor: '#f59e0b', background: 'linear-gradient(180deg, #fff7ed 0%, #fff 100%)' }}>
            <p className="eyebrow" style={{ color: '#9a3412' }}>Audit CMS Strict</p>
            <h2 style={{ marginTop: 0 }}>Couverture CMS incomplete</h2>
            <p style={{ marginBottom: '0.4rem' }}>
              Completer les `block_key` manquants avant suppression des defaults locaux.
            </p>
            {cmsAudit.missingKeys.length > 0 ? (
              <p className="session-meta" style={{ margin: '0.2rem 0' }}>
                Cles manquantes: {cmsAudit.missingKeys.join(', ')}
              </p>
            ) : null}
            {cmsAudit.missingFields.length > 0 ? (
              <p className="session-meta" style={{ margin: '0.2rem 0' }}>
                Champs incomplets: {cmsAudit.missingFields.map((entry) => `${entry.key} (${entry.fields.join(', ')})`).join(' | ')}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="hero-v2 reveal-up" style={{ '--reveal-delay': '40ms' }} aria-label="Presentation TeamBlender">
          <div className="hero-v2-grid">
            <div className="hero-v2-copy">
              <p className="hero-v2-kicker">{heroKicker.title || heroMain.label}</p>
              <h1>
                <span className="hero-v2-title-line">{heroMain.title}</span>
                {heroMain.subtitle ? <span className="hero-v2-title-line">{heroMain.subtitle}</span> : null}
              </h1>
              <p>{heroMain.description}</p>
              <div className="hero-v2-actions">
                <Link href={safeHref(heroCtaPrimary.cta_href, '/signup')} className="btn-primary">{heroCtaPrimary.cta_label}</Link>
                <Link href={safeHref(heroCtaSecondary.cta_href, '/contact')} className="btn-secondary">{heroCtaSecondary.cta_label}</Link>
              </div>
              <div className="hero-v2-trust">
                {heroTrustItems.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>

            <div className="hero-v2-media" aria-label="Apercu visuel TeamBlender">
              <article className="hero-v2-photo-card">
                <img src={heroImageA.image_url} alt={heroImageA.description} loading="lazy" />
                <p>{heroImageA.description}</p>
              </article>
              <article className="hero-v2-photo-card card-b">
                <img src={heroImageB.image_url} alt={heroImageB.description} loading="lazy" />
                <p>{heroImageB.description}</p>
              </article>
            </div>
          </div>
        </section>

        {impactItems.length > 0 ? (
          <section className="landing-impact-band reveal-up" style={{ '--reveal-delay': '90ms' }} aria-label="Indicateurs cles">
            {impactItems.map((item, index) => (
              <article key={`impact-${index}`}>
                <strong>{item.value}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </section>
        ) : null}

        <section className="feature-card reveal-up landing-partners" style={{ '--reveal-delay': '120ms' }} aria-label="Clients et partenaires">
          <div className="panel-head">
            <div>
              <p className="eyebrow">{partnersHeader.label}</p>
              <h2>{partnersHeader.title}</h2>
              <p>{partnersHeader.description}</p>
            </div>
          </div>
          <div className="logo-grid landing-partner-grid" aria-label="Logos clients partenaires">
            {partnerItems.map((item) => (
              <span key={item.title} className="landing-partner-pill">{item.title}</span>
            ))}
          </div>
        </section>

        <section className="feature-card reveal-up landing-testimonials" style={{ '--reveal-delay': '155ms' }} aria-label="Temoignages clients">
          <div className="panel-head">
            <div>
              <p className="eyebrow">{testimonialsHeader.label}</p>
              <h2>{testimonialsHeader.title}</h2>
              <p>{testimonialsHeader.description}</p>
            </div>
          </div>
          <div className="cards-grid landing-testimonials-grid">
            {testimonialItems.map((item) => (
              <article key={`${item.title}-${item.subtitle}`} className="feature-card landing-testimonial-card">
                <p className="landing-testimonial-quote">“{item.description}”</p>
                <div className="landing-testimonial-meta">
                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="feature-card reveal-up landing-flow" style={{ '--reveal-delay': '190ms' }} aria-label="Parcours en 3 etapes">
          <div className="panel-head">
            <div>
              <p className="eyebrow">{flowHeader.label}</p>
              <h2>{flowHeader.title}</h2>
            </div>
          </div>
          <div className="cards-grid landing-flow-grid">
            {flowSteps.map((step, index) => (
              <article key={`flow-step-${index}`} className="feature-card flow-card">
                <span className="flow-index">{step.index}</span>
                <h2>{step.title}</h2>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="feature-card landing-cta-block reveal-up" style={{ '--reveal-delay': '230ms' }} aria-label="Dernier appel a l action">
          <p className="eyebrow">{finalCta.subtitle || finalCta.label}</p>
          <h2>{finalCta.title}</h2>
          <p>{finalCta.description}</p>
          <div className="hero-actions home-hero-actions landing-cta-actions">
            <Link href={safeHref(finalCta.cta_href, '/signup')} className="btn-primary">{finalCta.cta_label}</Link>
            <Link href={safeHref(finalCtaSecondary.cta_href, '/login')} className="btn-secondary">{finalCtaSecondary.cta_label}</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

