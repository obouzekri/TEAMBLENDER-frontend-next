"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Briefcase,
  GraduationCap,
  Handshake,
  Quote,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { getApiUrl } from '@/lib/config';

const DEFAULT_BLOCKS = {
  impact_1: {},
  impact_2: {},
  impact_3: {},
  partners_header: {
    label: 'Confiance',
    title: 'Des equipes qui veulent des resultats, pas des animations vides.',
    description: 'TeamBlender est utilise en contexte reel par des managers, RH et facilitateurs qui pilotent des decisions d equipe.',
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

const TRUST_TAG_ICON_BY_KEYWORD = [
  { keywords: ['rh', 'talent'], Icon: Briefcase },
  { keywords: ['manager'], Icon: Users },
  { keywords: ['facilitation', 'facilitateur'], Icon: Handshake },
  { keywords: ['onboarding'], Icon: Rocket },
  { keywords: ['formation'], Icon: GraduationCap },
  { keywords: ['coaching'], Icon: Activity },
];

const TRUST_PROOF_METRICS = [
  {
    value: '+150',
    label: 'equipes accompagnees',
    detail: 'Managers, RH et facilitateurs en PME et ETI',
  },
  {
    value: '3x plus rapide',
    label: 'pour lancer une session utile',
    detail: 'Cadre clair, activation immediate, debrief actionnable',
  },
  {
    value: 'Hybride-ready',
    label: 'presentiel, remote et multi-sites',
    detail: 'Meme niveau de lisibilite pour tous les formats',
  },
];

const TRUST_LOGO_PLACEHOLDERS = ['Scaleup SaaS', 'Retail Ops', 'Services B2B', 'Industrie'];

function resolveTrustTagIcon(label) {
  const normalized = String(label || '').trim().toLowerCase();
  const matched = TRUST_TAG_ICON_BY_KEYWORD.find((entry) => entry.keywords.some((keyword) => normalized.includes(keyword)));
  return matched?.Icon || ShieldCheck;
}

function TrustTag({ title, isActive = false }) {
  const Icon = resolveTrustTagIcon(title);

  return (
    <button
      type="button"
      title={`${title} utilise TeamBlender pour un objectif concret.`}
      className={`group inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-300 ease-out ${
        isActive
          ? 'bg-indigo-100/85 shadow-sm shadow-indigo-500/10 ring-1 ring-indigo-200'
          : 'bg-slate-50/90 hover:-translate-y-0.5 hover:bg-indigo-50/85 hover:text-slate-900 hover:shadow-sm hover:shadow-indigo-500/10'
      }`}
      aria-label={`Segment ${title}`}
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-indigo-600 shadow-sm transition-colors duration-300 group-hover:bg-white">
        <Icon className="h-4 w-4" />
      </span>
      <span>{title}</span>
    </button>
  );
}

function TrustProofCard({ value, label, detail }) {
  return (
    <article className="rounded-2xl bg-white/80 px-5 py-4 shadow-sm shadow-slate-200/60 ring-1 ring-white/80 backdrop-blur-sm">
      <p className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p>
    </article>
  );
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
  const glassCardClass = 'rounded-3xl border border-white/60 bg-white/75 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl';
  const pillClass = 'inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 ease-in-out';
  const chipClass = 'inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-md transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-md';

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

        <section
          className="landing-hero-full reveal-up relative overflow-hidden px-6 py-7 sm:px-8 lg:px-10 lg:py-9"
          style={{ '--reveal-delay': '40ms' }}
          aria-label="Presentation TeamBlender"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_30%)]" />
          <div className="landing-hero-inner relative grid gap-6 lg:grid-cols-[1.16fr_0.84fr] lg:items-start">
            <div className="max-w-3xl">
              <div className="mb-5 flex flex-wrap gap-3">
                <span className={chipClass}>
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  {heroKicker.title || heroMain.label || 'SaaS team building'}
                </span>
              </div>

              <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                <span className="block">{heroMain.title}</span>
                {heroMain.subtitle ? <span className="mt-2 block bg-gradient-to-r from-slate-900 via-slate-700 to-indigo-700 bg-clip-text text-transparent">{heroMain.subtitle}</span> : null}
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                {heroMain.description}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={safeHref(heroCtaPrimary.cta_href, '/signup')}
                  className={`${pillClass} group bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/25`}
                >
                  <span>{heroCtaPrimary.cta_label}</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href={safeHref(heroCtaSecondary.cta_href, '/contact')}
                  className={`${pillClass} border border-slate-200 bg-white/80 text-slate-800 shadow-sm hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-md`}
                >
                  {heroCtaSecondary.cta_label}
                </Link>
              </div>

              {heroTrustItems.length > 0 ? (
                <p className="mt-8 text-sm font-medium leading-7 text-slate-600 sm:text-base">
                  {heroTrustItems.slice(0, 3).join(' • ')}
                </p>
              ) : null}
            </div>

            <div className="landing-hero-product-shell relative lg:translate-x-8 xl:translate-x-14">
              <div className="landing-hero-product-wrap">
                <div className="landing-hero-product-head">
                  <div>
                    <p className="landing-hero-product-label">Product preview</p>
                    <p className="landing-hero-product-title">Experience live collaborative</p>
                  </div>
                  <div className="landing-hero-product-live">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    En direct
                  </div>
                </div>

                <figure className="landing-hero-product-frame">
                  <img
                    src="/images/labyrinthe-hero.jpg"
                    alt="Interface TeamBlender Labyrinthe en session live collaborative"
                    loading="lazy"
                    className="landing-hero-product-image"
                  />
                </figure>

                <div className="landing-hero-product-signals" aria-label="Signaux en direct">
                  <span>
                    <Activity className="h-4 w-4" />
                    Chrono en direct
                  </span>
                  <span>
                    <Users className="h-4 w-4" />
                    {heroImageB.description || 'Chat et coordination equipe'}
                  </span>
                  <span>
                    <BarChart3 className="h-4 w-4" />
                    Progression collaborative instantanee
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {impactItems.length > 0 ? (
          <section className="landing-impact-band landing-section-full reveal-up" style={{ '--reveal-delay': '90ms' }} aria-label="Indicateurs cles">
            <div className="landing-section-inner grid gap-4 md:grid-cols-3">
              {impactItems.map((item, index) => (
                <article key={`impact-${index}`} className={`${glassCardClass} p-6`}>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <strong className="block text-2xl font-semibold tracking-tight text-slate-950">{item.value}</strong>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section
          className="reveal-up landing-partners landing-section-full relative overflow-hidden p-7 sm:p-10"
          style={{
            '--reveal-delay': '120ms',
            background: 'linear-gradient(180deg, rgba(248,250,252,0.9) 0%, rgba(238,242,255,0.9) 100%)',
          }}
          aria-label="Confiance et preuve sociale"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_16%,rgba(99,102,241,0.12),transparent_42%)]" />
          <div className="landing-section-inner relative space-y-8">
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <p className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700">
                  {partnersHeader.label}
                </p>
                <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  {partnersHeader.title}
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  {partnersHeader.description}
                </p>
              </div>

              <div className="rounded-2xl bg-white/80 p-4 shadow-sm shadow-slate-200/60 ring-1 ring-white/80 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Usage reel</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Adopte pour l onboarding, la facilitation d ateliers et les rituels d equipe dans des environnements hybrides exigeants.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {TRUST_LOGO_PLACEHOLDERS.map((logo) => (
                    <span
                      key={logo}
                      className="inline-flex items-center rounded-full bg-slate-100/90 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      {logo}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Indicateurs de confiance">
              {TRUST_PROOF_METRICS.map((metric) => (
                <TrustProofCard key={metric.value} value={metric.value} label={metric.label} detail={metric.detail} />
              ))}
            </div>

            <div className="landing-partner-grid flex flex-wrap gap-3" aria-label="Segments utilises par les clients">
              {partnerItems.map((item, index) => (
                <TrustTag key={item.title} title={item.title} isActive={index === 0} />
              ))}
            </div>
          </div>
        </section>

        <section
          className="reveal-up landing-testimonials landing-section-full relative overflow-hidden p-6 sm:p-8"
          style={{
            '--reveal-delay': '155ms',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          }}
          aria-label="Temoignages clients"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(99,102,241,0.10),transparent_44%)]" />
          <div className="landing-section-inner relative">
            <div className="panel-head">
              <div>
                <p className="eyebrow">{testimonialsHeader.label}</p>
                <h2>{testimonialsHeader.title}</h2>
                <p>{testimonialsHeader.description}</p>
              </div>
            </div>
            <div className="cards-grid landing-testimonials-grid relative mt-6 grid gap-4 md:grid-cols-3">
              {testimonialItems.map((item, index) => (
                <article
                  key={`${item.title}-${item.subtitle}`}
                  className={`rounded-3xl p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                    index === 0
                      ? 'bg-gradient-to-b from-indigo-50/70 to-white ring-1 ring-indigo-100'
                      : index === 1
                        ? 'bg-gradient-to-b from-cyan-50/60 to-white ring-1 ring-cyan-100'
                        : 'bg-gradient-to-b from-slate-50 to-white ring-1 ring-slate-100'
                  }`}
                >
                  <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/85 text-indigo-600 shadow-sm">
                    <Quote className="h-4 w-4" />
                  </div>
                  <p className="text-base leading-7 text-slate-700">“{item.description}”</p>
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
                    <div>
                      <strong className="block text-sm font-semibold text-slate-950">{item.title}</strong>
                      <span className="text-sm text-slate-500">{item.subtitle}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="reveal-up landing-flow landing-section-full relative overflow-hidden p-6 sm:p-8"
          style={{
            '--reveal-delay': '190ms',
            background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
          }}
          aria-label="Parcours en 3 etapes"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(14,165,233,0.10),transparent_40%)]" />
          <div className="landing-section-inner relative">
            <div className="panel-head">
              <div>
                <p className="eyebrow">{flowHeader.label}</p>
                <h2>{flowHeader.title}</h2>
              </div>
            </div>
            <div className="cards-grid landing-flow-grid relative mt-6 grid gap-4 md:grid-cols-3">
              {flowSteps.map((step, index) => (
                <article
                  key={`flow-step-${index}`}
                  className={`rounded-3xl p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                    index === 0
                      ? 'bg-white/88 ring-1 ring-indigo-100'
                      : index === 1
                        ? 'bg-white/90 ring-1 ring-cyan-100'
                        : 'bg-white/92 ring-1 ring-slate-200/80'
                  }`}
                >
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-lg ${
                    index === 0
                      ? 'bg-gradient-to-br from-indigo-500 to-violet-500 shadow-indigo-500/20'
                      : index === 1
                        ? 'bg-gradient-to-br from-cyan-500 to-sky-500 shadow-cyan-500/20'
                        : 'bg-gradient-to-br from-slate-500 to-slate-700 shadow-slate-500/20'
                  }`}>{step.index}</span>
                  <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">{step.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`landing-cta-block landing-section-full reveal-up p-8 text-center`} style={{ '--reveal-delay': '230ms' }} aria-label="Dernier appel a l action">
          <div className="landing-section-inner">
            <p className="eyebrow">{finalCta.subtitle || finalCta.label}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{finalCta.title}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">{finalCta.description}</p>
            <div className="hero-actions home-hero-actions landing-cta-actions mt-7 flex flex-wrap justify-center gap-3">
              <Link href={safeHref(finalCta.cta_href, '/signup')} className={`${pillClass} bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/25`}>
                <span>{finalCta.cta_label}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href={safeHref(finalCtaSecondary.cta_href, '/login')} className={`${pillClass} border border-slate-200 bg-white/80 text-slate-800 shadow-sm hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-md`}>
                {finalCtaSecondary.cta_label}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

