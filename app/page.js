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
import useI18n from '@/lib/i18n/useI18n';

const DEFAULT_BLOCKS_BY_LOCALE = {
  fr: {
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
  },
  en: {
    impact_1: {},
    impact_2: {},
    impact_3: {},
    partners_header: {
      label: '',
      title: 'Building cohesion should not be complex, expensive, or hard to deploy.',
      description: 'Yet this is often what traditional team formats create.',
    },
    partner_1: {
      title: 'HR & Talent',
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
      title: 'Learning',
    },
    partner_6: {
      title: 'Coaching',
    },
    testimonials_header: {
      label: 'Testimonials',
      title: 'Real-world feedback remains the strongest signal.',
      description: 'Short, useful and concrete testimonials to project quickly.',
    },
    testimonial_1: {
      title: 'Sarah Benali',
      subtitle: 'HR Lead, Tech SMB',
      description: 'A structured format, easy to deploy, and truly useful for our teams.',
    },
    testimonial_2: {
      title: 'Thomas Leroux',
      subtitle: 'Head of People, SaaS scale-up',
      description: 'We saved time on facilitation and, most importantly, on debriefing. Results are immediately actionable.',
    },
    testimonial_3: {
      title: 'Nadia Costa',
      subtitle: 'Operations Manager, multi-site group',
      description: 'Finally a format that works both on-site and remote, with no friction for participants.',
    },
    flow_header: {
      label: 'Process',
      title: 'Three steps. Zero complexity.',
    },
    flow_step_1: {
      badge_text: '01',
      title: 'Frame the objective',
      description: 'Define the intent of your session.',
    },
    flow_step_2: {
      badge_text: '02',
      title: 'Run live',
      description: 'Launch and facilitate your session with confidence.',
    },
    flow_step_3: {
      badge_text: '03',
      title: 'Use outcomes',
      description: 'Debrief and activate insights quickly.',
    },
    final_cta_secondary: {
      cta_label: 'Log in',
      cta_href: '/login',
    },
  }
};

const LANDING_STATIC_BY_LOCALE = {
  fr: {
    trustProofMetrics: [
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
    ],
    platformStatement: {
      title: 'TeamBlender est la plateforme B2B pour concevoir, piloter et industrialiser des expériences de team building hybrides.',
      description:
        'Pensée pour les managers et les équipes RH, elle permet de déployer des expériences simples à organiser, engageantes pour les équipes et mesurables dans leurs résultats.',
    },
    platformOfferItems: [
      { icon: Rocket, label: 'Créer une session en quelques clics' },
      { icon: Users, label: 'Inviter et assigner vos équipes' },
      { icon: Target, label: 'Lancer des défis collaboratifs engageants' },
      { icon: PlayCircle, label: 'Animer en temps réel' },
      { icon: Gauge, label: 'Suivre la progression en live' },
      { icon: BarChart3, label: 'Exploiter les résultats post-session' },
    ],
    platformValuesItems: [
      { icon: CheckCircle2, label: 'Déploiement rapide sans friction' },
      { icon: Sparkles, label: 'Expérience fluide pour tous les participants' },
      { icon: Layers, label: 'Formats standardisés et réutilisables' },
      { icon: Shield, label: 'Gouvernance claire des sessions et résultats' },
      { icon: Building2, label: 'Passage à l’échelle multi-équipes' },
    ],
    platformBenefitsItems: [
      { icon: Handshake, label: 'Cohésion renforcée dans les équipes hybrides' },
      { icon: MessageCircle, label: 'Meilleure communication et collaboration' },
      { icon: ClipboardList, label: 'Gain de temps pour RH et managers' },
      { icon: GraduationCap, label: 'Accélération de l’onboarding' },
      { icon: Sparkles, label: 'Expérience employeur modernisée' },
    ],
    useCases: [
      'Programmes de cohésion managériale',
      'Onboarding collaborateurs',
      'Alignement multi-sites',
      'Événements RH',
    ],
    fallback: {
      heroTitle: 'Créez des ateliers de cohesion gamifies en quelques minutes.',
      heroTitleStructured: 'Créez des expériences collaboratives gamifiées à fort impact, en quelques minutes.',
      heroDescription: 'Le produit aide les equipes a transformer leurs interactions en decisions et alignement.',
      heroDescriptionStructured: 'TeamBlender renforce la cohésion des équipes hybrides à travers des challenges en temps réel engageants et mesurables.',
      heroPrimaryLabel: 'Démarrer gratuitement',
      heroSecondaryLabel: 'Voir les offres',
      finalPrimaryLabel: 'Démarrer gratuitement',
      finalSecondaryLabel: 'Demander une démo',
      keyline: 'Préparez, animez et analysez vos sessions sans friction opérationnelle.',
      liveSignals: {
        label: 'Signaux en direct',
        timer: 'Chrono en direct',
        chat: 'Chat et coordination d’équipe',
        progress: 'Progression collaborative instantanée',
      },
      productPreview: 'Product preview',
      liveExperience: 'Expérience live collaborative',
      liveLabel: 'En direct',
      platformEyebrow: 'Plateforme',
      platformOfferTitle: 'Ce que la plateforme offre',
      valuesEyebrow: 'Valeurs',
      valuesTitle: 'Des fondations pensées pour le passage à l’échelle',
      benefitsEyebrow: 'Bénéfices',
      benefitsTitle: 'Des résultats visibles pour les équipes et les managers',
      finalCtaEyebrow: 'CTA Final',
      finalCtaTitle: 'Prêt à structurer vos temps d’équipe ?',
      finalCtaDescription: 'Découvrez TeamBlender et lancez votre premier format pilote en quelques minutes.',
    },
  },
  en: {
    trustProofMetrics: [
      {
        value: '✅ 150+ teams supported',
        label: 'Enterprise, scale-ups, SMBs and HR teams',
        detail: 'Deployments in real-world hybrid team contexts.',
      },
      {
        value: '✅ 3× faster setup',
        label: 'Create a session in minutes',
        detail: 'Simple setup, guided facilitation, instant recap.',
      },
      {
        value: '✅ Hybrid by design',
        label: 'Challenges for on-site, remote and multi-site teams',
        detail: 'A smooth experience regardless of work format.',
      },
    ],
    platformStatement: {
      title: 'TeamBlender is the B2B platform to design, run and scale hybrid team-building experiences.',
      description:
        'Built for managers and HR teams, it delivers sessions that are easy to run, engaging for teams, and measurable in outcomes.',
    },
    platformOfferItems: [
      { icon: Rocket, label: 'Create a session in a few clicks' },
      { icon: Users, label: 'Invite and assign your teams' },
      { icon: Target, label: 'Launch engaging collaborative challenges' },
      { icon: PlayCircle, label: 'Facilitate in real time' },
      { icon: Gauge, label: 'Track live progression' },
      { icon: BarChart3, label: 'Use post-session insights' },
    ],
    platformValuesItems: [
      { icon: CheckCircle2, label: 'Fast rollout with low friction' },
      { icon: Sparkles, label: 'Smooth participant experience' },
      { icon: Layers, label: 'Standardized and reusable formats' },
      { icon: Shield, label: 'Clear governance of sessions and outcomes' },
      { icon: Building2, label: 'Scales across multiple teams' },
    ],
    platformBenefitsItems: [
      { icon: Handshake, label: 'Stronger cohesion in hybrid teams' },
      { icon: MessageCircle, label: 'Better communication and collaboration' },
      { icon: ClipboardList, label: 'Time saved for HR and managers' },
      { icon: GraduationCap, label: 'Faster onboarding' },
      { icon: Sparkles, label: 'Modernized employee experience' },
    ],
    useCases: [
      'Manager cohesion programs',
      'Employee onboarding',
      'Multi-site alignment',
      'HR events',
    ],
    fallback: {
      heroTitle: 'Build high-impact collaborative sessions in minutes.',
      heroTitleStructured: 'Build high-impact collaborative sessions in minutes.',
      heroDescription: 'The platform helps teams turn interactions into decisions and alignment.',
      heroDescriptionStructured: 'TeamBlender strengthens hybrid team cohesion through engaging, measurable real-time challenges.',
      heroPrimaryLabel: 'Get started free',
      heroSecondaryLabel: 'View plans',
      finalPrimaryLabel: 'Get started free',
      finalSecondaryLabel: 'Request a demo',
      keyline: 'Prepare, facilitate and analyze sessions without operational friction.',
      liveSignals: {
        label: 'Live signals',
        timer: 'Live timer',
        chat: 'Team chat and coordination',
        progress: 'Instant collaborative progression',
      },
      productPreview: 'Product preview',
      liveExperience: 'Live collaborative experience',
      liveLabel: 'Live',
      platformEyebrow: 'Platform',
      platformOfferTitle: 'What the platform offers',
      valuesEyebrow: 'Values',
      valuesTitle: 'Foundations designed for scale',
      benefitsEyebrow: 'Benefits',
      benefitsTitle: 'Visible outcomes for teams and managers',
      finalCtaEyebrow: 'Final CTA',
      finalCtaTitle: 'Ready to structure your team sessions?',
      finalCtaDescription: 'Discover TeamBlender and launch your first pilot format in minutes.',
    },
  },
};

function getLocaleDefaultBlocks(locale) {
  return DEFAULT_BLOCKS_BY_LOCALE[locale] || DEFAULT_BLOCKS_BY_LOCALE.fr;
}

function getLandingStatic(locale) {
  return LANDING_STATIC_BY_LOCALE[locale] || LANDING_STATIC_BY_LOCALE.fr;
}

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

function mergeBlock(key, dynamicBlocks, defaultBlocks) {
  return {
    ...(defaultBlocks[key] || {}),
    ...(dynamicBlocks[key] || {}),
  };
}

function isCmsBlockComplete(key, dynamicBlocks) {
  const requiredFields = LANDING_CMS_REQUIRED_SCHEMA[key] || [];
  const block = dynamicBlocks[key];
  if (!block) return false;
  return requiredFields.every((field) => hasCmsValue(block[field]));
}

function buildSectionBlocks(sectionKeys, dynamicBlocks, defaultBlocks) {
  const sectionFullyCovered = sectionKeys.every((key) => isCmsBlockComplete(key, dynamicBlocks));
  const blocks = {};

  sectionKeys.forEach((key) => {
    const keyCoveredInBaseline = CMS_BASELINE_COMPLETE_KEYS.has(key) && isCmsBlockComplete(key, dynamicBlocks);
    blocks[key] = (sectionFullyCovered || keyCoveredInBaseline)
      ? (dynamicBlocks[key] || {})
      : mergeBlock(key, dynamicBlocks, defaultBlocks);
  });

  return {
    sectionFullyCovered,
    blocks,
  };
}

function safeHref(value, fallback = '/') {
  return hasCmsValue(value) ? value : fallback;
}

function normalizeCohesionCopy(value, fallback = '', locale = 'fr') {
  const input = String(value || '').trim();
  const source = input || fallback;
  if (!source) return '';

  const collapsed = source.replace(/\s+/g, ' ').trim();
  if (locale === 'en') return collapsed;

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
  title: 'TeamBlender est la plateforme pour organiser des expériences de team building hybrides.',
  description:
    'Pensée pour les managers et les équipes RH, elle permet de déployer des expériences simples à organiser, engageantes pour les équipes et utiles au quotidien.',
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

const HERO_TEAM_AVATARS = ['AL', 'MK', 'SR', 'NO', 'JD'];

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
  const { locale, withLocalePath } = useI18n();
  const defaultBlocks = useMemo(() => getLocaleDefaultBlocks(locale), [locale]);
  const landingStatic = useMemo(() => getLandingStatic(locale), [locale]);
  const [dynamicBlocks, setDynamicBlocks] = useState({});
  const [landingLoaded, setLandingLoaded] = useState(false);
  const isLandingCmsStrict = process.env.NEXT_PUBLIC_LANDING_CMS_STRICT === 'true';

  function handlePrimaryCtaClick() {
    trackGaEvent('cta_click', {
      cta_name: 'hero_primary',
      cta_label: String(heroCtaPrimary.cta_label || landingStatic.fallback.heroPrimaryLabel).trim(),
      cta_destination: safeHref(heroCtaPrimary.cta_href, '/signup'),
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  }

  function handleHeroSecondaryCtaClick() {
    trackGaEvent('cta_click', {
      cta_name: 'hero_secondary',
      cta_label: String(heroCtaSecondary.cta_label || landingStatic.fallback.heroSecondaryLabel).trim(),
      cta_destination: safeHref(heroCtaSecondary.cta_href, '/pricing'),
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  }

  function handleFinalSecondaryCtaClick() {
    trackGaEvent('cta_click', {
      cta_name: 'final_secondary',
      cta_label: String(finalCtaSecondary.cta_label || landingStatic.fallback.finalSecondaryLabel).trim(),
      cta_destination: safeHref(finalCtaSecondary.cta_href, '/contact'),
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  }

  useEffect(() => {
    let cancelled = false;
    async function loadLandingContent() {
      try {
        const res = await fetch(getApiUrl(`/landing-content?locale=${encodeURIComponent(locale)}`));
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
  }, [locale]);

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
    ], dynamicBlocks, defaultBlocks),
    [defaultBlocks, dynamicBlocks]
  );

  const impactSection = useMemo(
    () => buildSectionBlocks(['impact_1', 'impact_2', 'impact_3'], dynamicBlocks, defaultBlocks),
    [defaultBlocks, dynamicBlocks]
  );

  const flowSection = useMemo(
    () => buildSectionBlocks(['flow_header', 'flow_step_1', 'flow_step_2', 'flow_step_3'], dynamicBlocks, defaultBlocks),
    [defaultBlocks, dynamicBlocks]
  );

  const finalCtaSection = useMemo(
    () => buildSectionBlocks(['final_cta', 'final_cta_secondary'], dynamicBlocks, defaultBlocks),
    [defaultBlocks, dynamicBlocks]
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
    ], dynamicBlocks, defaultBlocks),
    [defaultBlocks, dynamicBlocks]
  );

  const testimonialsSection = useMemo(
    () => buildSectionBlocks([
      'testimonials_header',
      'testimonial_1',
      'testimonial_2',
      'testimonial_3',
    ], dynamicBlocks, defaultBlocks),
    [defaultBlocks, dynamicBlocks]
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
  const heroTitle = normalizeCohesionCopy(heroMain.title, landingStatic.fallback.heroTitle, locale);
  const heroDescription = normalizeCohesionCopy(
    heroMain.description,
    landingStatic.fallback.heroDescription,
    locale
  );
  const heroPrimaryLabel = hasCmsValue(heroCtaPrimary.cta_label) ? heroCtaPrimary.cta_label : landingStatic.fallback.heroPrimaryLabel;
  const heroPrimaryHref = withLocalePath(safeHref(heroCtaPrimary.cta_href, '/signup'));
  const heroSecondaryLabel = hasCmsValue(heroCtaSecondary.cta_label) ? heroCtaSecondary.cta_label : landingStatic.fallback.heroSecondaryLabel;
  const heroSecondaryHref = withLocalePath(safeHref(heroCtaSecondary.cta_href, '/pricing'));
  const finalPrimaryLabel = hasCmsValue(finalCta.cta_label) ? finalCta.cta_label : landingStatic.fallback.finalPrimaryLabel;
  const finalPrimaryHref = withLocalePath(safeHref(finalCta.cta_href, '/signup'));
  const finalSecondaryLabel = hasCmsValue(finalCtaSecondary.cta_label) ? finalCtaSecondary.cta_label : landingStatic.fallback.finalSecondaryLabel;
  const finalSecondaryHref = withLocalePath(safeHref(finalCtaSecondary.cta_href, '/contact'));

  const heroTrustItems = useMemo(
    () => ['hero_trust_1', 'hero_trust_2', 'hero_trust_3']
      .map((key) => (heroSection.blocks[key] || {}).title)
      .filter(Boolean),
    [heroSection]
  );

  const structuredHeroTitle = heroTitle === landingStatic.fallback.heroTitle
    ? landingStatic.fallback.heroTitleStructured
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
  const TRUST_PROOF_METRICS = landingStatic.trustProofMetrics;
  const PLATFORM_STATEMENT = landingStatic.platformStatement;
  const PLATFORM_OFFER_ITEMS = landingStatic.platformOfferItems;
  const PLATFORM_VALUES_ITEMS = landingStatic.platformValuesItems;
  const PLATFORM_BENEFITS_ITEMS = landingStatic.platformBenefitsItems;
  const USE_CASES = landingStatic.useCases;
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
            <h2 style={{ marginTop: 0 }}>{locale === 'en' ? 'Incomplete CMS coverage' : 'Couverture CMS incomplete'}</h2>
            <p style={{ marginBottom: '0.4rem' }}>
              {locale === 'en'
                ? 'Complete missing block keys before removing local defaults.'
                : 'Completer les block_key manquants avant suppression des defaults locaux.'}
            </p>
            {cmsAudit.missingKeys.length > 0 ? (
              <p className="session-meta" style={{ margin: '0.2rem 0' }}>
                {locale === 'en' ? 'Missing keys:' : 'Cles manquantes:'} {cmsAudit.missingKeys.join(', ')}
              </p>
            ) : null}
            {cmsAudit.missingFields.length > 0 ? (
              <p className="session-meta" style={{ margin: '0.2rem 0' }}>
                {locale === 'en' ? 'Incomplete fields:' : 'Champs incomplets:'} {cmsAudit.missingFields.map((entry) => `${entry.key} (${entry.fields.join(', ')})`).join(' | ')}
              </p>
            ) : null}
          </section>
        ) : null}

        <section
          className="landing-hero-full reveal-up relative overflow-hidden px-6 py-7 sm:px-8 lg:px-10 lg:py-9"
          style={{ '--reveal-delay': '40ms' }}
          aria-label={locale === 'en' ? 'TeamBlender overview' : 'Presentation TeamBlender'}
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
                {heroDescription === landingStatic.fallback.heroDescription
                  ? landingStatic.fallback.heroDescriptionStructured
                  : heroDescription}
              </p>

              <p className="landing-hero-keyline mt-4 max-w-2xl text-sm font-semibold tracking-wide text-indigo-700 sm:text-base">
                {landingStatic.fallback.keyline}
              </p>

              <div className="landing-hero-human mt-5">
                <div className="landing-hero-avatars" aria-label={locale === 'en' ? 'Team members' : 'Membres de l equipe'}>
                  {HERO_TEAM_AVATARS.map((avatar) => (
                    <span key={avatar} className="landing-hero-avatar">{avatar}</span>
                  ))}
                </div>
                <p>{locale === 'en' ? 'Live session energy: managers, HR and teams in one shared space.' : 'Energie live: managers, RH et equipes reunis dans un meme espace.'}</p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={heroPrimaryHref}
                  onClick={handlePrimaryCtaClick}
                  className={`${pillClass} landing-cta-primary landing-hero-primary-btn group text-white`}
                >
                  <span>{heroPrimaryLabel}</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </div>

              <Link
                href={heroSecondaryHref}
                onClick={handleHeroSecondaryCtaClick}
                className="landing-hero-secondary-link mt-4 inline-flex items-center gap-2 text-sm font-semibold"
              >
                <span>{heroSecondaryLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              {heroTrustItems.length > 0 ? (
                <p className="landing-hero-trust mt-8 text-sm font-medium leading-7 text-slate-600 sm:text-base">
                  {heroTrustItems.slice(0, 3).join(' • ')}
                </p>
              ) : null}
            </div>

            <div className="landing-hero-product-shell relative lg:translate-x-8 xl:translate-x-14">
              <div className="landing-hero-floating-note landing-hero-floating-note--top">
                <Users className="h-4 w-4" />
                {locale === 'en' ? '28 participants active' : '28 participants actifs'}
              </div>
              <div className="landing-hero-floating-note landing-hero-floating-note--bottom">
                <Sparkles className="h-4 w-4" />
                {locale === 'en' ? 'Cohesion score +18%' : 'Score cohesion +18%'}
              </div>

              <div className="landing-hero-product-wrap">
                <div className="landing-hero-product-head">
                  <div>
                    <p className="landing-hero-product-label">{landingStatic.fallback.productPreview}</p>
                    <p className="landing-hero-product-title">{landingStatic.fallback.liveExperience}</p>
                  </div>
                  <div className="landing-hero-product-live">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    {landingStatic.fallback.liveLabel}
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

                <div className="landing-hero-product-signals" aria-label={landingStatic.fallback.liveSignals.label}>
                  <span>
                    <Activity className="h-4 w-4" />
                    {landingStatic.fallback.liveSignals.timer}
                  </span>
                  <span>
                    <Users className="h-4 w-4" />
                    {heroImageB.description || landingStatic.fallback.liveSignals.chat}
                  </span>
                  <span>
                    <BarChart3 className="h-4 w-4" />
                    {landingStatic.fallback.liveSignals.progress}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {impactItems.length > 0 ? (
          <section className="landing-impact-band landing-section-full reveal-up" style={{ '--reveal-delay': '90ms' }} aria-label={locale === 'en' ? 'Key metrics' : 'Indicateurs cles'}>
            <div className="landing-section-inner grid gap-4 md:grid-cols-3">
              {impactItems.map((item, index) => (
                <article
                  key={`impact-${index}`}
                  className={`${glassCardClass} landing-impact-card p-6 ${index === 0 ? 'landing-impact-card--primary' : index === 1 ? 'landing-impact-card--secondary' : 'landing-impact-card--tertiary'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg ${index === 1 ? 'bg-gradient-to-br from-cyan-500 to-sky-500 shadow-cyan-500/20' : index === 2 ? 'bg-gradient-to-br from-slate-700 to-slate-500 shadow-slate-500/20' : 'bg-gradient-to-br from-indigo-500 to-violet-500 shadow-indigo-500/20'}`}>
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
          className="reveal-up landing-section-full landing-section-full--statement relative overflow-hidden p-8 sm:p-10"
          style={{ '--reveal-delay': '100ms', background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)' }}
          aria-label={locale === 'en' ? 'Platform positioning' : 'Positionnement plateforme'}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(99,102,241,0.08),transparent_45%)]" />
          <div className="landing-section-inner relative mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{PLATFORM_STATEMENT.title}</h2>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">{PLATFORM_STATEMENT.description}</p>
          </div>
        </section>

        <section
          className="reveal-up landing-partners landing-section-full landing-section-full--proof relative overflow-hidden p-8 sm:p-12"
          style={{
            '--reveal-delay': '110ms',
            background: 'linear-gradient(180deg, #07111f 0%, #0b1730 100%)',
          }}
          aria-label={locale === 'en' ? 'Social proof' : 'Preuve sociale'}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_16%,rgba(96,165,250,0.18),transparent_42%)]" />
          <div className="landing-section-inner relative space-y-6">
            <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
              <div>
                {partnersHeader.label ? (
                  <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200 ring-1 ring-white/10">
                    {partnersHeader.label}
                  </p>
                ) : null}
                <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {partnersHeader.title}
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  {partnersHeader.description}
                </p>
              </div>

              <div className="landing-partners-usage rounded-2xl bg-white/6 p-5 shadow-sm ring-1 ring-white/12 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">{locale === 'en' ? 'Teams using TeamBlender' : 'Equipes qui utilisent TeamBlender'}</p>
                <p className="landing-platform-scent mt-3">
                  {USE_CASES.map((useCase, index) => (
                    <span key={useCase}>
                      {useCase}
                      {index < USE_CASES.length - 1 ? '' : ''}
                    </span>
                  ))}
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-300">
                  {locale === 'en'
                    ? 'One modern platform, one clear rhythm, and one shared team experience.'
                    : 'Une plateforme moderne, un rythme clair et une experience d equipe partagee.'}
                </p>
              </div>
            </div>

            <div className="landing-metrics-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={locale === 'en' ? 'Key metrics' : 'Indicateurs cles'}>
              {TRUST_PROOF_METRICS.map((metric) => (
                <TrustProofCard key={metric.value} value={metric.value} label={metric.label} detail={metric.detail} />
              ))}
            </div>

            <div className="landing-partner-line" aria-label={locale === 'en' ? 'Client segments' : 'Segments utilisés par les clients'}>
              <p className="landing-partner-line-text">
                {partnerItems.map((item) => item.title).join(' . ')}
              </p>
            </div>
          </div>
        </section>

        <section
          className="reveal-up landing-section-full landing-offer-section relative overflow-hidden p-6 sm:p-9"
          style={{ '--reveal-delay': '140ms' }}
          aria-label={landingStatic.fallback.platformOfferTitle}
        >
          <div className="landing-section-rupture landing-section-rupture--accent" />
          <div className="landing-section-inner relative">
            <div className="panel-head landing-offer-head">
              <div>
                <p className="eyebrow landing-section-eyebrow">{landingStatic.fallback.platformEyebrow}</p>
                <h2 className="landing-section-title">{landingStatic.fallback.platformOfferTitle}</h2>
              </div>
            </div>
            <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {PLATFORM_OFFER_ITEMS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.label}
                    className="landing-feature-card landing-utility-card rounded-2xl p-5"
                    style={{ '--feature-index': index + 1 }}
                  >
                    <span className="landing-feature-icon inline-flex h-10 w-10 items-center justify-center rounded-xl">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="mt-4 text-base font-semibold leading-6 text-slate-800">{item.label}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          className="reveal-up landing-section-full landing-values-section relative overflow-hidden p-6 sm:p-10"
          style={{ '--reveal-delay': '150ms' }}
          aria-label={landingStatic.fallback.valuesTitle}
        >
          <div className="landing-section-rupture landing-section-rupture--light" />
          <div className="landing-section-inner relative">
            <div className="panel-head landing-values-head">
              <div>
                <p className="eyebrow landing-section-eyebrow">{landingStatic.fallback.valuesEyebrow}</p>
                <h2 className="landing-section-title">{landingStatic.fallback.valuesTitle}</h2>
              </div>
            </div>
            <ol className="landing-values-timeline mt-7" aria-label={landingStatic.fallback.valuesTitle}>
              {PLATFORM_VALUES_ITEMS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <li key={item.label} className="landing-values-step">
                    <span className="landing-values-step-dot" aria-hidden="true" />
                    <article className="landing-values-step-card">
                      <div className="landing-values-step-head">
                        <span className="landing-values-step-index">{String(index + 1).padStart(2, '0')}</span>
                        <span className="landing-values-step-icon" aria-hidden="true">
                          <Icon className="h-5 w-5" />
                        </span>
                      </div>
                      <p className="landing-values-step-label">{item.label}</p>
                    </article>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section
          className="reveal-up landing-section-full landing-benefits-section relative overflow-hidden p-6 sm:p-10"
          style={{ '--reveal-delay': '160ms' }}
          aria-label={landingStatic.fallback.benefitsTitle}
        >
          <div className="landing-section-rupture landing-section-rupture--dark" />
          <div className="landing-section-inner relative">
            <div className="panel-head landing-benefits-head">
              <div>
                <p className="eyebrow landing-section-eyebrow">{landingStatic.fallback.benefitsEyebrow}</p>
                <h2 className="landing-section-title">{landingStatic.fallback.benefitsTitle}</h2>
              </div>
            </div>
            <div className="landing-benefits-split mt-8">
              <div className="landing-benefits-copy reveal-left" style={{ '--reveal-delay': '180ms' }}>
                <ul className="landing-benefits-list">
                  {PLATFORM_BENEFITS_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.label} className="landing-benefits-item">
                        <span className="landing-benefits-item-icon" aria-hidden="true">
                          <Icon className="h-5 w-5" />
                        </span>
                        <p>{item.label}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="landing-benefits-visual reveal-right" style={{ '--reveal-delay': '210ms' }}>
                <figure className="landing-benefits-media-frame">
                  <Image
                    src="/images/labyrinthe-hero.jpg"
                    alt={locale === 'en' ? 'Hybrid team workshop in progress on TeamBlender' : 'Atelier equipe hybride en cours sur TeamBlender'}
                    width={1200}
                    height={800}
                    loading="lazy"
                    className="landing-benefits-media-image"
                  />
                  <figcaption>{locale === 'en' ? 'Hybrid-ready, manager-friendly and measurable.' : 'Hybride, simple pour managers et mesurable.'}</figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>

        <section
          className="reveal-up landing-testimonials landing-section-full relative overflow-hidden p-6 sm:p-10"
          style={{
            '--reveal-delay': '170ms',
            background: 'linear-gradient(145deg, #f6fbff 0%, #eef6ff 100%)',
          }}
          aria-label={locale === 'en' ? 'Customer testimonials' : 'Témoignages clients'}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(99,102,241,0.10),transparent_44%)]" />
          <div className="landing-section-inner relative">
            <div className="panel-head landing-testimonials-head">
              <div>
                <p className="eyebrow landing-section-eyebrow">{testimonialsHeader.label}</p>
                <h2 className="landing-section-title">{testimonialsHeader.title}</h2>
                <p className="landing-section-description">{testimonialsHeader.description}</p>
              </div>
            </div>
            <div className="landing-testimonials-carousel mt-7" role="region" aria-label={locale === 'en' ? 'Testimonials carousel' : 'Carrousel de temoignages'}>
              {testimonialItems.map((item, index) => (
                <article
                  key={`${item.title}-${item.subtitle}`}
                  className={`landing-testimonial-card landing-testimonial-slide rounded-3xl p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                    index === 0
                      ? 'landing-testimonial-card--featured ring-1 ring-indigo-200/45'
                      : index === 1
                        ? 'landing-testimonial-card--accent ring-1 ring-cyan-200/40'
                        : 'ring-1 ring-slate-200/35'
                  }`}
                >
                  <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-indigo-600 shadow-sm">
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
            background: 'linear-gradient(180deg, #0b1223 0%, #111b36 100%)',
          }}
          aria-label={locale === 'en' ? 'Three-step journey' : 'Parcours en 3 étapes'}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(14,165,233,0.10),transparent_40%)]" />
          <div className="landing-section-inner relative">
            <div className="panel-head">
              <div>
                <p className="eyebrow landing-section-eyebrow">{flowHeader.label}</p>
                <h2 className="landing-section-title text-white">{flowHeader.title}</h2>
              </div>
            </div>
            <div className="landing-flow-timeline mt-8" role="list" aria-label={locale === 'en' ? 'How TeamBlender works in three steps' : 'Comment TeamBlender fonctionne en trois etapes'}>
              {flowSteps.map((step, index) => (
                <article
                  key={`flow-step-${index}`}
                  role="listitem"
                  className={`landing-flow-card landing-flow-node rounded-3xl p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                    index === 0
                      ? 'landing-flow-card--primary bg-white/94 ring-1 ring-indigo-100'
                      : index === 1
                        ? 'landing-flow-card--secondary bg-white/92 ring-1 ring-cyan-100'
                        : 'landing-flow-card--tertiary bg-white/90 ring-1 ring-slate-200/80'
                  }`}
                >
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-lg ${
                    index === 0
                      ? 'bg-gradient-to-br from-indigo-500 to-violet-500 shadow-indigo-500/20'
                      : index === 1
                        ? 'bg-gradient-to-br from-cyan-500 to-sky-500 shadow-cyan-500/20'
                        : 'bg-gradient-to-br from-slate-500 to-slate-700 shadow-slate-500/20'
                  }`}>{String(index + 1).padStart(2, '0')}</span>
                  <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">{step.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`landing-cta-block landing-section-full reveal-up p-8 text-center`} style={{ '--reveal-delay': '240ms' }} aria-label={locale === 'en' ? 'Final call to action' : 'Dernier appel à l’action'}>
          <div className="landing-section-inner">
            <p className="eyebrow landing-cta-eyebrow">{finalCta.subtitle || finalCta.label || landingStatic.fallback.finalCtaEyebrow}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{finalCta.title || landingStatic.fallback.finalCtaTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">{finalCta.description || landingStatic.fallback.finalCtaDescription}</p>
            <div className="hero-actions home-hero-actions landing-cta-actions mt-7 flex flex-wrap justify-center gap-3">
              <Link href={finalSecondaryHref} onClick={handleFinalSecondaryCtaClick} className={`${pillClass} border border-slate-200 bg-white/80 text-slate-800 shadow-sm hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-md`}>
                <span>{finalSecondaryLabel}</span>
              </Link>
              <Link href={finalPrimaryHref} className={`${pillClass} landing-cta-primary text-white`}>
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

