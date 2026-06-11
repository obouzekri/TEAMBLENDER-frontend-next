"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Briefcase,
  ClipboardList,
  Gauge,
  GraduationCap,
  Handshake,
  Layers,
  MessageCircle,
  PlayCircle,
  Quote,
  Rocket,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import { trackGaEvent } from '@/lib/analytics';
import { getApiUrl } from '@/lib/config';

const DEFAULT_BLOCKS = {
  impact_1: {},
  impact_2: {},
  impact_3: {},
  partners_header: {
    label: '',
    title: 'Créer de la cohésion ne devrait pas être complexe, coûteux ou difficile à déployer.',
    description: 'Pourtant, c’est souvent le cas avec les formats de cohésion traditionnels.',
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
    label: 'Témoignages',
    title: 'Le retour terrain reste le meilleur signal.',
    description: 'Des retours courts, utiles et lisibles pour se projeter vite.',
  },
  testimonial_1: {
    title: 'Sarah Benali',
    subtitle: 'Responsable RH, PME tech',
    description: 'Format structuré, simple à déployer et vraiment utile pour nos équipes.',
  },
  testimonial_2: {
    title: 'Thomas Leroux',
    subtitle: 'Head of People, scale-up SaaS',
    description: 'Nous avons gagné du temps sur l’animation et surtout sur le débrief. Les résultats sont actionnables immédiatement.',
  },
  testimonial_3: {
    title: 'Nadia Costa',
    subtitle: 'Manager Opérations, groupe multi-sites',
    description: 'Enfin un format qui fonctionne autant avec les équipes sur site qu’à distance, sans friction pour les participants.',
  },
  flow_header: {
    label: 'Processus',
    title: 'Trois étapes. Zéro complexité.',
  },
  flow_step_1: {
    badge_text: '01',
    title: 'Cadrez l’objectif',
    description: 'Définissez l’intention de votre session.',
  },
  flow_step_2: {
    badge_text: '02',
    title: 'Animer en live',
    description: 'Lancez et pilotez votre session facilement.',
  },
  flow_step_3: {
    badge_text: '03',
    title: 'Exploitez les résultats',
    description: 'Débriefez et capitalisez sur les insights.',
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

function normalizeCohesionCopy(value, fallback = '') {
  const input = String(value || '').trim();
  const source = input || fallback;
  if (!source) return '';

  const collapsed = source.replace(/\s+/g, ' ').trim();
  const low = collapsed.toLowerCase();

  if (low === 'créez des ateliers collaboratifs gamifiés en quelques minutes.') {
    return 'Créez des ateliers de cohesion gamifies en quelques minutes.';
  }

  return collapsed
    .replace(/team\s*building/gi, 'ateliers de cohesion')
    .replace(/animation(s)?\s+d[’']equipe/gi, 'rituels de cohesion');
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
    value: '✅ +150 équipes accompagnées',
    label: 'Grands groupes, startups, PME et équipes RH',
    detail: 'Déploiements en contexte réel avec des équipes hybrides.',
  },
  {
    value: '✅ 3× plus rapide',
    label: 'Créez une session en quelques minutes',
    detail: 'Préparation simple, animation guidée, restitution immédiate.',
  },
  {
    value: '✅ Hybride par nature',
    label: 'Challenges pour équipes sur site, à distance ou multi-sites',
    detail: 'Une expérience fluide quel que soit le format d’organisation.',
  },
];

const TRUST_LOGO_PLACEHOLDERS = ['NovaTech', 'Helios Groupe', 'Axis Retail', 'BluePeak Conseil', 'Mosaic Industries'];

const PLATFORM_STATEMENT = {
  title: 'TeamBlender est la plateforme B2B pour concevoir, piloter et industrialiser des expériences de team building hybrides.',
  description:
    'Pensée pour les managers et les équipes RH, elle permet de déployer des expériences simples à organiser, engageantes pour les équipes et mesurables dans leurs résultats.',
};

const PLATFORM_OFFER_ITEMS = [
  { icon: Rocket, label: 'Créer une session en quelques clics' },
  { icon: Users, label: 'Inviter et assigner vos équipes' },
  { icon: Target, label: 'Lancer des défis collaboratifs engageants' },
  { icon: PlayCircle, label: 'Animer en temps réel' },
  { icon: Gauge, label: 'Suivre la progression en live' },
  { icon: BarChart3, label: 'Exploiter les résultats post-session' },
];

const PLATFORM_VALUES_ITEMS = [
  { icon: CheckCircle2, label: 'Déploiement rapide sans friction' },
  { icon: Sparkles, label: 'Expérience fluide pour tous les participants' },
  { icon: Layers, label: 'Formats standardisés et réutilisables' },
  { icon: Shield, label: 'Gouvernance claire des sessions et résultats' },
  { icon: Building2, label: 'Passage à l’échelle multi-équipes' },
];

const PLATFORM_BENEFITS_ITEMS = [
  { icon: Handshake, label: 'Cohésion renforcée dans les équipes hybrides' },
  { icon: MessageCircle, label: 'Meilleure communication et collaboration' },
  { icon: ClipboardList, label: 'Gain de temps pour RH et managers' },
  { icon: GraduationCap, label: 'Accélération de l’onboarding' },
  { icon: Sparkles, label: 'Expérience employeur modernisée' },
];

const USE_CASES = [
  'Programmes de cohésion managériale',
  'Onboarding collaborateurs',
  'Alignement multi-sites',
  'Événements RH',
];

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

  function handlePrimaryCtaClick() {
    trackGaEvent('cta_click', {
      cta_name: 'hero_primary',
      cta_label: String(heroCtaPrimary.cta_label || 'Démarrer gratuitement').trim(),
      cta_destination: safeHref(heroCtaPrimary.cta_href, '/signup'),
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  }

  function handleHeroSecondaryCtaClick() {
    trackGaEvent('cta_click', {
      cta_name: 'hero_secondary',
      cta_label: String(heroCtaSecondary.cta_label || 'Voir les offres').trim(),
      cta_destination: safeHref(heroCtaSecondary.cta_href, '/pricing'),
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  }

  function handleFinalSecondaryCtaClick() {
    trackGaEvent('cta_click', {
      cta_name: 'final_secondary',
      cta_label: String(finalCtaSecondary.cta_label || 'Demander une démo').trim(),
      cta_destination: safeHref(finalCtaSecondary.cta_href, '/contact'),
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  }

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
  const heroTitle = normalizeCohesionCopy(heroMain.title, 'Créez des ateliers de cohesion gamifies en quelques minutes.');
  const heroDescription = normalizeCohesionCopy(
    heroMain.description,
    'Le produit aide les equipes a transformer leurs interactions en decisions et alignement.'
  );
  const heroPrimaryLabel = hasCmsValue(heroCtaPrimary.cta_label) ? heroCtaPrimary.cta_label : 'Démarrer gratuitement';
  const heroPrimaryHref = safeHref(heroCtaPrimary.cta_href, '/signup');
  const heroSecondaryLabel = hasCmsValue(heroCtaSecondary.cta_label) ? heroCtaSecondary.cta_label : 'Voir les offres';
  const heroSecondaryHref = safeHref(heroCtaSecondary.cta_href, '/pricing');
  const finalPrimaryLabel = hasCmsValue(finalCta.cta_label) ? finalCta.cta_label : 'Démarrer gratuitement';
  const finalPrimaryHref = safeHref(finalCta.cta_href, '/signup');
  const finalSecondaryLabel = hasCmsValue(finalCtaSecondary.cta_label) ? finalCtaSecondary.cta_label : 'Demander une démo';
  const finalSecondaryHref = safeHref(finalCtaSecondary.cta_href, '/contact');

  const heroTrustItems = useMemo(
    () => ['hero_trust_1', 'hero_trust_2', 'hero_trust_3']
      .map((key) => (heroSection.blocks[key] || {}).title)
      .filter(Boolean),
    [heroSection]
  );

  const structuredHeroTitle = heroTitle === 'Créez des ateliers de cohesion gamifies en quelques minutes.'
    ? 'Créez des expériences collaboratives gamifiées à fort impact, en quelques minutes.'
    : heroTitle;

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
          <div className="landing-hero-aurora pointer-events-none absolute inset-0" />
          <div className="landing-hero-inner relative grid gap-6 lg:grid-cols-[1.16fr_0.84fr] lg:items-start">
            <div className="landing-hero-copy max-w-3xl">
              {(heroKicker.title || heroMain.label) ? (
                <div className="mb-5 flex flex-wrap gap-3">
                  <span className={`${chipClass} landing-hero-kicker-chip`}>
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    {heroKicker.title || heroMain.label}
                  </span>
                </div>
              ) : null}

              <h1 className="landing-hero-title max-w-2xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                <span className="block">{structuredHeroTitle}</span>
                {heroMain.subtitle ? <span className="landing-hero-subtitle mt-2 block bg-gradient-to-r from-slate-900 via-slate-700 to-indigo-700 bg-clip-text text-transparent">{heroMain.subtitle}</span> : null}
              </h1>

              <p className="landing-hero-description mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                {heroDescription === 'Le produit aide les equipes a transformer leurs interactions en decisions et alignement.'
                  ? 'TeamBlender renforce la cohésion des équipes hybrides à travers des challenges en temps réel engageants et mesurables.'
                  : heroDescription}
              </p>

              <p className="landing-hero-keyline mt-4 max-w-2xl text-sm font-semibold tracking-wide text-indigo-700 sm:text-base">
                Préparez, animez et analysez vos sessions sans friction opérationnelle.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={heroPrimaryHref}
                  onClick={handlePrimaryCtaClick}
                  className={`${pillClass} landing-hero-primary-btn group bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/25`}
                >
                  <span>{heroPrimaryLabel}</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href={heroSecondaryHref}
                  onClick={handleHeroSecondaryCtaClick}
                  className={`${pillClass} landing-hero-secondary-btn border border-slate-200 bg-white/80 text-slate-800 shadow-sm hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-md`}
                >
                  {heroSecondaryLabel}
                </Link>
              </div>

              {heroTrustItems.length > 0 ? (
                <p className="landing-hero-trust mt-8 text-sm font-medium leading-7 text-slate-600 sm:text-base">
                  {heroTrustItems.slice(0, 3).join(' • ')}
                </p>
              ) : null}
            </div>

            <div className="landing-hero-product-shell relative lg:translate-x-8 xl:translate-x-14">
              <div className="landing-hero-product-wrap">
                <div className="landing-hero-product-head">
                  <div>
                    <p className="landing-hero-product-label">Product preview</p>
                    <p className="landing-hero-product-title">Expérience live collaborative</p>
                  </div>
                  <div className="landing-hero-product-live">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    En direct
                  </div>
                </div>

                <figure className="landing-hero-product-frame">
                  <Image
                    src="/images/labyrinthe-hero.jpg"
                    alt="Interface TeamBlender Labyrinthe en session live collaborative"
                    width={1200}
                    height={800}
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
                    {heroImageB.description || 'Chat et coordination d’équipe'}
                  </span>
                  <span>
                    <BarChart3 className="h-4 w-4" />
                    Progression collaborative instantanée
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
          className="reveal-up landing-section-full relative overflow-hidden p-8 sm:p-10"
          style={{ '--reveal-delay': '100ms', background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)' }}
          aria-label="Positionnement plateforme"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(99,102,241,0.08),transparent_45%)]" />
          <div className="landing-section-inner relative mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{PLATFORM_STATEMENT.title}</h2>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">{PLATFORM_STATEMENT.description}</p>
          </div>
        </section>

        <section
          className="reveal-up landing-partners landing-section-full relative overflow-hidden p-8 sm:p-12"
          style={{
            '--reveal-delay': '120ms',
            background: 'linear-gradient(180deg, rgba(246,249,255,0.94) 0%, rgba(237,244,255,0.94) 100%)',
          }}
          aria-label="Preuve sociale"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_16%,rgba(99,102,241,0.12),transparent_42%)]" />
          <div className="landing-section-inner relative space-y-8">
            <div className="grid gap-7 lg:grid-cols-[1.22fr_0.78fr] lg:items-end">
              <div>
                {partnersHeader.label ? (
                  <p className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700">
                    {partnersHeader.label}
                  </p>
                ) : null}
                <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  {partnersHeader.title}
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  {partnersHeader.description}
                </p>
              </div>

              <div className="landing-partners-usage rounded-2xl bg-white/80 p-5 shadow-sm shadow-slate-200/60 ring-1 ring-white/80 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cas d’usage</p>
                <div className="mt-3 space-y-2">
                  {USE_CASES.map((useCase) => (
                    <p key={useCase} className="text-sm leading-6 text-slate-700">
                      • {useCase}
                    </p>
                  ))}
                </div>
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

            <div className="landing-metrics-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Indicateurs cles">
              {TRUST_PROOF_METRICS.map((metric) => (
                <TrustProofCard key={metric.value} value={metric.value} label={metric.label} detail={metric.detail} />
              ))}
            </div>

            <div className="landing-partner-grid flex flex-wrap gap-3" aria-label="Segments utilisés par les clients">
              {partnerItems.map((item, index) => (
                <TrustTag key={item.title} title={item.title} isActive={index === 0} />
              ))}
            </div>
          </div>
        </section>

        <section
          className="reveal-up landing-section-full relative overflow-hidden p-6 sm:p-8"
          style={{ '--reveal-delay': '140ms', background: 'linear-gradient(180deg, #f6f8fc 0%, #edf2fb 100%)' }}
          aria-label="Ce que la plateforme offre"
        >
          <div className="landing-section-inner relative">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Plateforme</p>
                <h2>Ce que la plateforme offre</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {PLATFORM_OFFER_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.label} className="rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">{item.label}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          className="reveal-up landing-section-full relative overflow-hidden p-6 sm:p-8"
          style={{ '--reveal-delay': '150ms', background: 'linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)' }}
          aria-label="Valeurs TeamBlender"
        >
          <div className="landing-section-inner relative">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Valeurs</p>
                <h2>Des fondations pensées pour le passage à l’échelle</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {PLATFORM_VALUES_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.label} className="rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">{item.label}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          className="reveal-up landing-section-full relative overflow-hidden p-6 sm:p-8"
          style={{ '--reveal-delay': '160ms', background: 'linear-gradient(180deg, #f2f7ff 0%, #ecf3ff 100%)' }}
          aria-label="Bénéfices TeamBlender"
        >
          <div className="landing-section-inner relative">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Bénéfices</p>
                <h2>Des résultats visibles pour les équipes et les managers</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {PLATFORM_BENEFITS_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.label} className="rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">{item.label}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          className="reveal-up landing-testimonials landing-section-full relative overflow-hidden p-6 sm:p-8"
          style={{
            '--reveal-delay': '155ms',
            background: 'linear-gradient(180deg, #ffffff 0%, #f5f8ff 100%)',
          }}
          aria-label="Témoignages clients"
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
            background: 'linear-gradient(180deg, #f4f8ff 0%, #ecf2ff 100%)',
          }}
          aria-label="Parcours en 3 étapes"
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

        <section className={`landing-cta-block landing-section-full reveal-up p-8 text-center`} style={{ '--reveal-delay': '230ms' }} aria-label="Dernier appel à l’action">
          <div className="landing-section-inner">
            <p className="eyebrow">{finalCta.subtitle || finalCta.label || 'CTA Final'}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{finalCta.title || 'Prêt à structurer vos temps d’équipe ?'}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">{finalCta.description || 'Découvrez TeamBlender et lancez votre premier format pilote en quelques minutes.'}</p>
            <div className="hero-actions home-hero-actions landing-cta-actions mt-7 flex flex-wrap justify-center gap-3">
              <Link href={finalSecondaryHref} onClick={handleFinalSecondaryCtaClick} className={`${pillClass} border border-slate-200 bg-white/80 text-slate-800 shadow-sm hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-md`}>
                <span>{finalSecondaryLabel}</span>
              </Link>
              <Link href={finalPrimaryHref} className={`${pillClass} bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/25`}>
                <span>{finalPrimaryLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

