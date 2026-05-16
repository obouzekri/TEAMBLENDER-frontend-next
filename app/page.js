"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { getApiUrl } from '@/lib/config';

const DEFAULT_BLOCKS = {
  impact_1: {
    title: '-65%',
    description: 'de preparation manager percue',
  },
  impact_2: {
    title: '3 etapes',
    description: 'de l objectif au debrief concret',
  },
  impact_3: {
    title: '100%',
    description: 'navigable mobile et desktop sans installation',
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

  const heroMain = heroSection.blocks.hero_main || {};
  const heroKicker = heroSection.blocks.hero_kicker || {};
  const heroCtaPrimary = heroSection.blocks.hero_cta_primary || {};
  const heroCtaSecondary = heroSection.blocks.hero_cta_secondary || {};
  const heroImageA = heroSection.blocks.hero_image_a || {};
  const heroImageB = heroSection.blocks.hero_image_b || {};
  const flowHeader = flowSection.blocks.flow_header || {};
  const finalCta = finalCtaSection.blocks.final_cta || {};
  const finalCtaSecondary = finalCtaSection.blocks.final_cta_secondary || {};

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
    }),
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

        <section className="landing-impact-band reveal-up" style={{ '--reveal-delay': '90ms' }} aria-label="Indicateurs cles">
          {impactItems.map((item, index) => (
            <article key={`impact-${index}`}>
              <strong>{item.value}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </section>

        <section className="feature-card reveal-up landing-flow" style={{ '--reveal-delay': '140ms' }} aria-label="Parcours en 3 etapes">
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

        <section className="feature-card landing-cta-block reveal-up" style={{ '--reveal-delay': '190ms' }} aria-label="Dernier appel a l action">
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

