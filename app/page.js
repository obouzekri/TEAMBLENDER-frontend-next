"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
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
  X,
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
        value: '+150 équipes accompagnées',
        label: 'Grands groupes, startups, PME et équipes RH',
        detail: 'Déploiements en contexte réel avec des équipes hybrides.',
      },
      {
        value: '3× plus rapide',
        label: 'Créez une session en quelques minutes',
        detail: 'Préparation simple, animation guidée, restitution immédiate.',
      },
      {
        value: 'Hybride par nature',
        label: 'Challenges pour équipes sur site, à distance ou multi-sites',
        detail: 'Une expérience fluide quel que soit le format d’organisation.',
      },
    ],
    platformStatement: {
      title: 'La plateforme B2B moderne pour concevoir, piloter et déployer vos initiatives d’équipe.',
      description:
        'Pensée pour les managers et les équipes RH, elle permet de déployer des expériences simples à organiser, engageantes pour les équipes et mesurables dans leurs résultats.',
    },
    platformOfferItems: [
      {
        icon: Rocket,
        label: 'Lancement ultra-rapide',
        description: 'Créez une session guidée en quelques clics et démarrez sans complexité opérationnelle.',
        tone: 'crimson',
      },
      {
        icon: Users,
        label: 'Attribution intelligente des équipes',
        description: 'Invitez et répartissez les participants avec une structure claire pour les managers et RH.',
        tone: 'orange',
      },
      {
        icon: Target,
        label: 'Challenges orientés objectifs',
        description: 'Déployez des activités collaboratives pensées pour la cohésion, l’alignement et la progression.',
        tone: 'sky',
      },
      {
        icon: PlayCircle,
        label: 'Animation live maîtrisée',
        description: 'Pilotez le rythme de la session en temps réel, en présentiel comme en hybride.',
        tone: 'teal',
      },
      {
        icon: Gauge,
        label: 'Suivi instantané de l’engagement',
        description: 'Visualisez la progression des équipes pendant la session pour ajuster au bon moment.',
        tone: 'olive',
      },
      {
        icon: BarChart3,
        label: 'Mesure d’impact post-session',
        description: 'Transformez les résultats en insights actionnables pour le debrief et les prochains formats.',
        tone: 'blue',
      },
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
    trustedCompanies: {
      title: 'Ils nous font confiance dans 32+ entreprises',
      logos: [
        { mark: 'NV', name: 'Novacore', meta: 'Industrie', accent: '#245ab8' },
        { mark: 'AR', name: 'Asterion', meta: 'Retail', accent: '#1f7ae0' },
        { mark: 'LM', name: 'Lumaris', meta: 'Conseil & Tech', accent: '#2f6ba6' },
        { mark: 'OR', name: 'Oravia', meta: 'Telecom', accent: '#d97706' },
        { mark: 'SY', name: 'Synora', meta: 'Sante', accent: '#0f766e' },
        { mark: 'BL', name: 'Bluehive', meta: 'SaaS RH', accent: '#2563eb' },
      ],
    },
    fallback: {
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
      liveExperience: 'Interactive team building experience',
      liveLabel: 'En direct',
      platformEyebrow: 'Plateforme',
      platformOfferTitle: 'Ce que la plateforme offre',
      platformOfferSubtitle: 'Tout ce qu’il faut pour déployer des expériences de cohésion efficaces, mesurables et scalables.',
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
        value: '150+ teams supported',
        label: 'Enterprise, scale-ups, SMBs and HR teams',
        detail: 'Deployments in real-world hybrid team contexts.',
      },
      {
        value: '3× faster setup',
        label: 'Create a session in minutes',
        detail: 'Simple setup, guided facilitation, instant recap.',
      },
      {
        value: 'Hybrid by design',
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
      {
        icon: Rocket,
        label: 'Fast Session Launch',
        description: 'Create a guided session in a few clicks and start without operational friction.',
        tone: 'crimson',
      },
      {
        icon: Users,
        label: 'Smart Team Assignment',
        description: 'Invite and structure participants with a clear flow for managers and HR teams.',
        tone: 'orange',
      },
      {
        icon: Target,
        label: 'Goal-Driven Challenges',
        description: 'Run collaborative activities designed for cohesion, alignment, and measurable progress.',
        tone: 'sky',
      },
      {
        icon: PlayCircle,
        label: 'Confident Live Facilitation',
        description: 'Control session rhythm in real time across in-person, remote, and hybrid teams.',
        tone: 'teal',
      },
      {
        icon: Gauge,
        label: 'Real-Time Engagement Tracking',
        description: 'Monitor team progression during the session and adjust at the right moment.',
        tone: 'olive',
      },
      {
        icon: BarChart3,
        label: 'Post-Session Impact Insights',
        description: 'Turn outcomes into actionable insights for debriefs and future team formats.',
        tone: 'blue',
      },
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
    trustedCompanies: {
      title: 'Trusted by 32+ companies around the world',
      logos: [
        { mark: 'NV', name: 'Novacore', meta: 'Industry', accent: '#245ab8' },
        { mark: 'AR', name: 'Asterion', meta: 'Retail', accent: '#1f7ae0' },
        { mark: 'LM', name: 'Lumaris', meta: 'Consulting & Tech', accent: '#2f6ba6' },
        { mark: 'OR', name: 'Oravia', meta: 'Telecom', accent: '#d97706' },
        { mark: 'SY', name: 'Synora', meta: 'Healthcare', accent: '#0f766e' },
        { mark: 'BL', name: 'Bluehive', meta: 'HR SaaS', accent: '#2563eb' },
      ],
    },
    fallback: {
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
      liveExperience: 'Interactive team building experience',
      liveLabel: 'Live',
      platformEyebrow: 'Platform',
      platformOfferTitle: 'What the platform offers',
      platformOfferSubtitle: 'Everything you need to make team learning effective, measurable, and scalable.',
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
    value: '+150 équipes accompagnées',
    label: 'Grands groupes, startups, PME et équipes RH',
    detail: 'Déploiements en contexte réel avec des équipes hybrides.',
  },
  {
    value: '3× plus rapide',
    label: 'Créez une session en quelques minutes',
    detail: 'Préparation simple, animation guidée, restitution immédiate.',
  },
  {
    value: 'Hybride par nature',
    label: 'Challenges pour équipes sur site, à distance ou multi-sites',
    detail: 'Une expérience fluide quel que soit le format d’organisation.',
  },
];

const METRIC_ICON_SET = [Building2, Gauge, Layers];
const FLOW_ICON_SET = [Target, PlayCircle, BarChart3];

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

function TrustedCompanyLogo({ company }) {
  const mark = String(company?.mark || '').toUpperCase();
  const name = String(company?.name || '').trim().toLowerCase();

  switch (name || mark) {
    case 'novacore':
    case 'NV':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path d="M3.8 18.8 11.9 4.9l8.3 13.9h-3.3l-1.6-2.9H8.8l-1.6 2.9z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M10.3 13.4h3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'asterion':
    case 'AR':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path d="M6.2 6.2h7.2a5.6 5.6 0 0 1 0 11.2H6.2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M10.1 9.7h6.2M10.1 14.3h6.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'lumaris':
    case 'LM':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="15.2" cy="14.8" r="3.9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M6.2 15.1c1.3 1.8 3.4 2.8 5.8 2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'oravia':
    case 'OR':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <rect x="5.2" y="5.2" width="13.6" height="13.6" rx="2.8" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8.9 12h6.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="11" cy="8.9" r="1.1" fill="currentColor" opacity="0.8" />
        </svg>
      );
    case 'synora':
    case 'SY':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <path d="M9.4 6.6c1.7 0 3 1.4 3 3 0 2.2-3 4.8-3 4.8s-3-2.6-3-4.8c0-1.6 1.3-3 3-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M16.2 9.2c1.2 0 2.2 1 2.2 2.2 0 1.5-2.2 3.4-2.2 3.4s-2.2-1.9-2.2-3.4c0-1.2 1-2.2 2.2-2.2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case 'bluehive':
    case 'BL':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <rect x="5.2" y="6" width="13.6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9.2 12h5.6M12 9.2v5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.8" opacity="0.9" />
          <path d="M8.2 8.4h7.2M8.2 12h4.8M8.2 15.6h5.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
  }
}

function resolveHeroTrustIcon(title, index = 0) {
  const low = String(title || '').toLowerCase();
  if (/rapid|vite|quick|faster|speed|temps|setup/.test(low)) return Gauge;
  if (/live|sync|synchron|temps reel|real time|challenge/.test(low)) return PlayCircle;
  if (/result|insight|mesur|impact|outcome/.test(low)) return BarChart3;
  if (/hybrid|distance|remote|multi/.test(low)) return Layers;
  return METRIC_ICON_SET[index % METRIC_ICON_SET.length] || ShieldCheck;
}

function resolveUseCaseIcon(label, index = 0) {
  const low = String(label || '').toLowerCase();
  if (/onboarding|integration|learn|formation/.test(low)) return GraduationCap;
  if (/rh|hr|talent|people/.test(low)) return Briefcase;
  if (/multi|site/.test(low)) return Building2;
  if (/cohes|cohesion|team/.test(low)) return Handshake;
  if (/manager/.test(low)) return Users;
  return FLOW_ICON_SET[index % FLOW_ICON_SET.length] || Target;
}

function resolveMetricIcon(index = 0) {
  return METRIC_ICON_SET[index % METRIC_ICON_SET.length] || Sparkles;
}

function resolveFlowStepIcon(index = 0) {
  return FLOW_ICON_SET[index % FLOW_ICON_SET.length] || PlayCircle;
}

const GAMIFIED_ICON_TONES = ['indigo', 'cyan', 'teal', 'slate'];

function resolveGamifiedIconTone(index = 0) {
  return GAMIFIED_ICON_TONES[index % GAMIFIED_ICON_TONES.length] || 'indigo';
}

function GamifiedIcon({ Icon, index = 0, size = 'md' }) {
  const tone = resolveGamifiedIconTone(index);

  return (
    <span className={`landing-orb-icon landing-orb-icon--${size} landing-orb-icon--${tone}`} aria-hidden="true">
      <span className="landing-orb-icon__halo" />
      <span className="landing-orb-icon__core">
        <Icon className="h-4 w-4" />
      </span>
      <span className="landing-orb-icon__pulse" />
    </span>
  );
}

function TrustProofCard({ value, label, detail, Icon, index = 0 }) {
  return (
    <article className="landing-metric-card rounded-2xl bg-white/80 px-5 py-4 shadow-sm shadow-slate-200/60 ring-1 ring-white/80 backdrop-blur-sm">
      <div className="landing-metric-card__head">
        <span className={`landing-metric-card__icon landing-metric-card__icon--${index % 3}`} aria-hidden="true">
          <GamifiedIcon Icon={Icon} index={index} size="sm" />
        </span>
        <p className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{value}</p>
      </div>
      <p className="mt-1 text-sm font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p>
    </article>
  );
}

export default function HomePage() {
  const { locale, t, withLocalePath } = useI18n();
  const defaultBlocks = useMemo(() => getLocaleDefaultBlocks(locale), [locale]);
  const landingStatic = useMemo(() => getLandingStatic(locale), [locale]);
  const [dynamicBlocks, setDynamicBlocks] = useState({});
  const [landingLoaded, setLandingLoaded] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const heroSentinelRef = useRef(null);
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
  const heroImageB = heroSection.blocks.hero_image_b || {};
  const flowHeader = flowSection.blocks.flow_header || {};
  const finalCta = finalCtaSection.blocks.final_cta || {};
  const finalCtaSecondary = finalCtaSection.blocks.final_cta_secondary || {};
  const partnersHeader = partnersSection.blocks.partners_header || {};
  const testimonialsHeader = testimonialsSection.blocks.testimonials_header || {};
  const heroTitle = t('landing.heroTitle');
  const heroDescription = t('landing.heroDescription');
  const heroPrimaryLabel = hasCmsValue(heroCtaPrimary.cta_label) ? heroCtaPrimary.cta_label : landingStatic.fallback.heroPrimaryLabel;
  const heroPrimaryHref = withLocalePath(safeHref(heroCtaPrimary.cta_href, '/signup'));
  const heroSecondaryLabel = hasCmsValue(heroCtaSecondary.cta_label) ? heroCtaSecondary.cta_label : landingStatic.fallback.heroSecondaryLabel;
  const heroSecondaryHref = withLocalePath(safeHref(heroCtaSecondary.cta_href, '/pricing'));
  const finalPrimaryLabel = hasCmsValue(finalCta.cta_label) ? finalCta.cta_label : landingStatic.fallback.finalPrimaryLabel;
  const finalPrimaryHref = withLocalePath(safeHref(finalCta.cta_href, '/signup'));
  const finalSecondaryLabel = hasCmsValue(finalCtaSecondary.cta_label) ? finalCtaSecondary.cta_label : landingStatic.fallback.finalSecondaryLabel;
  const finalSecondaryHref = withLocalePath(safeHref(finalCtaSecondary.cta_href, '/contact'));

  const heroTrustItems = ['Team challenge', 'Live engagement', 'Team cohesion'];

  const heroTrustBadges = useMemo(
    () => heroTrustItems.slice(0, 3).map((title, index) => ({
      title,
      Icon: resolveHeroTrustIcon(title, index),
    })),
    [heroTrustItems]
  );

  const structuredHeroTitle = heroTitle;

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
      const initials = String(item.title || '')
        .split(' ')
        .map((part) => String(part || '').trim().slice(0, 1).toUpperCase())
        .filter(Boolean)
        .slice(0, 2)
        .join('');
      return {
        title: item.title || '',
        subtitle: item.subtitle || '',
        description: item.description || '',
        initials: initials || 'TB',
      };
    }).filter((item) => item.title || item.description),
    [testimonialsSection]
  );

  const cmsAudit = useMemo(() => buildLandingCmsAudit(dynamicBlocks), [dynamicBlocks]);
  const TRUST_PROOF_METRICS = landingStatic.trustProofMetrics;
  const PLATFORM_STATEMENT = landingStatic.platformStatement;
  const PLATFORM_OFFER_ITEMS = landingStatic.platformOfferItems;
  const PLATFORM_BENEFITS_ITEMS = landingStatic.platformBenefitsItems;
  const USE_CASES = landingStatic.useCases;
  const TRUSTED_COMPANIES = landingStatic.trustedCompanies;
  const useCaseChips = useMemo(
    () => USE_CASES.map((label, index) => ({
      label,
      Icon: resolveUseCaseIcon(label, index),
    })),
    [USE_CASES]
  );
  const flowStepsWithIcons = useMemo(
    () => flowSteps.map((step, index) => ({
      ...step,
      Icon: resolveFlowStepIcon(index),
    })),
    [flowSteps]
  );
  const glassCardClass = 'rounded-3xl border border-white/60 bg-white/75 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl';
  const pillClass = 'inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 ease-in-out';
  const chipClass = 'inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-md transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-md';
  const challengeExamples = locale === 'en'
    ? [
      {
        category: 'Collaboration',
        duration: '15–20 min',
        title: 'CoPuzzle',
        description: 'Solve a live collaborative puzzle through shared coordination and collective decision-making.',
        tags: ['Collaboration', 'Coordination'],
        Icon: Sparkles,
      },
      {
        category: 'Ideation',
        duration: '25–35 min',
        title: 'Lab d’Innovation',
        description: 'Move through four collaborative phases to generate, prioritize, and defend an innovative idea.',
        tags: ['Ideation', 'Prioritization', 'Collective vote'],
        Icon: Users,
      },
      {
        category: 'Project management',
        duration: '20–30 min',
        title: 'Mission Critique',
        description: 'Organize a project timeline, manage dependencies, and optimize the team’s final score.',
        tags: ['Prioritization', 'Dependencies', 'Collaboration'],
        Icon: Target,
      },
    ]
    : [
      {
        category: 'Collaboration',
        duration: '15–20 min',
        title: 'CoPuzzle',
        description: 'Résolvez un puzzle collaboratif en temps réel grâce à la coordination et aux décisions collectives.',
        tags: ['Collaboration', 'Coordination'],
        Icon: Sparkles,
      },
      {
        category: 'Idéation',
        duration: '25–35 min',
        title: 'Lab d’Innovation',
        description: 'Faites émerger, priorisez et défendez une idée innovante à travers quatre phases collaboratives.',
        tags: ['Idéation', 'Priorisation', 'Vote collectif'],
        Icon: Users,
      },
      {
        category: 'Gestion de projet',
        duration: '20–30 min',
        title: 'Mission Critique',
        description: 'Ordonnez une timeline de projet, gérez les dépendances et optimisez le score final de l’équipe.',
        tags: ['Priorisation', 'Dépendances', 'Collaboration'],
        Icon: Target,
      },
    ];

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

  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return undefined;
    const sentinel = heroSentinelRef.current;
    if (!sentinel) return undefined;

    const mobileQuery = window.matchMedia('(max-width: 768px)');
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyCta(Boolean(mobileQuery.matches && !entry.isIntersecting));
      },
      { threshold: 0.08, rootMargin: '0px 0px -24% 0px' }
    );

    observer.observe(sentinel);

    const handleResize = () => {
      if (!mobileQuery.matches) {
        setShowStickyCta(false);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isPreviewExpanded) return undefined;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsPreviewExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPreviewExpanded]);

  return (
    <>
      <TopNav />
      <main className="landing-v2">
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
          className="landing-hero-full relative overflow-hidden px-0 py-4 sm:py-5 lg:py-6"
          style={{ '--reveal-delay': '40ms' }}
          aria-label={locale === 'en' ? 'TeamBlender overview' : 'Presentation TeamBlender'}
        >
          <div className="landing-hero-aurora pointer-events-none absolute inset-0" />
          <div className="landing-hero-inner relative grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="landing-hero-copy max-w-3xl">
              {(heroKicker.title || heroMain.label) ? (
                <div className="mb-5 flex flex-wrap gap-3">
                  <span className={`${chipClass} landing-hero-kicker-chip`}>
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    {heroKicker.title || heroMain.label}
                  </span>
                </div>
              ) : null}

              <span className="block h-2" aria-hidden="true" />

              <h1 className="landing-hero-title max-w-2xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                <span className="block">{structuredHeroTitle}</span>
                {heroMain.subtitle ? <span className="landing-hero-subtitle mt-2 block bg-gradient-to-r from-slate-900 via-slate-700 to-indigo-700 bg-clip-text text-transparent">{heroMain.subtitle}</span> : null}
              </h1>

              <span className="block h-2" aria-hidden="true" />

              <p className="landing-hero-description mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                {heroDescription}
              </p>

              <p className="landing-hero-keyline mt-3 max-w-2xl text-sm font-semibold tracking-wide text-indigo-700 sm:text-base">
                {t('landing.heroKeyline')}
              </p>

              <span className="block h-6" aria-hidden="true" />

              <div className="landing-hero-actions mt-6 flex flex-wrap gap-3">
                <Link
                  href={heroPrimaryHref}
                  onClick={handlePrimaryCtaClick}
                  className={`${pillClass} landing-cta-primary landing-hero-primary-btn group text-white`}
                >
                  <span>{heroPrimaryLabel}</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href={heroSecondaryHref}
                  onClick={handleHeroSecondaryCtaClick}
                  className={`${pillClass} landing-cta-secondary landing-hero-secondary-btn`}
                >
                  <span>{heroSecondaryLabel}</span>
                </Link>
              </div>

              {heroTrustBadges.length > 0 ? (
                <ul className="landing-hero-trust mt-6" aria-label={locale === 'en' ? 'Trust points' : 'Points de confiance'}>
                  {heroTrustBadges.map(({ title, Icon }, index) => (
                    <li key={`hero-trust-${index}-${title}`} className="landing-hero-trust-item">
                      <span className="landing-hero-trust-icon" aria-hidden="true">
                        <GamifiedIcon Icon={Icon} index={index} size="xs" />
                      </span>
                      <span>{title}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="landing-hero-product-shell relative lg:translate-x-8 xl:translate-x-14">
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

                <button
                  type="button"
                  className="landing-hero-product-button"
                  aria-label={locale === 'en' ? 'Open the live preview in fullscreen' : 'Ouvrir l’aperçu produit en plein écran'}
                  onClick={() => setIsPreviewExpanded(true)}
                >
                  <figure className="landing-hero-product-frame landing-hero-product-frame--interactive">
                    <Image
                      src="/images/teamblender-collab-challenges-illustration.svg"
                      alt="Illustration de défis collaboratifs engageants sur TeamBlender"
                      width={1200}
                      height={800}
                      priority
                      className="landing-hero-product-image"
                    />
                  </figure>
                </button>

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

              <div className="landing-hero-mobile-cta mt-5">
                <Link
                  href={heroPrimaryHref}
                  onClick={handlePrimaryCtaClick}
                  className={`${pillClass} landing-cta-primary landing-hero-primary-btn group text-white`}
                >
                  <span>{heroPrimaryLabel}</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div ref={heroSentinelRef} className="landing-hero-sentinel" aria-hidden="true" />

        {impactItems.length > 0 ? (
          <section className="landing-impact-band landing-section-full" style={{ '--reveal-delay': '90ms' }} aria-label={locale === 'en' ? 'Key metrics' : 'Indicateurs cles'}>
            <div className="landing-section-inner grid gap-4 md:grid-cols-3 landing-impact-carousel">
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
            <div className="landing-swipe-dots landing-impact-dots" aria-hidden="true">
              {impactItems.map((_, index) => (
                <span key={`impact-dot-${index}`} className={`landing-swipe-dot${index === 0 ? ' is-active' : ''}`} />
              ))}
            </div>
          </section>
        ) : null}

        <section
          className="landing-section-full landing-section-full--statement relative overflow-hidden p-8 sm:p-10"
          style={{ '--reveal-delay': '100ms', background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)' }}
          aria-label={locale === 'en' ? 'Platform positioning' : 'Positionnement plateforme'}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(99,102,241,0.08),transparent_45%)]" />
          <div className="landing-section-inner relative mx-auto max-w-4xl text-center">
            <span className="landing-statement-break" aria-hidden="true" />
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{PLATFORM_STATEMENT.title}</h2>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">{PLATFORM_STATEMENT.description}</p>
          </div>
        </section>

        <section
          className="landing-partners landing-section-full landing-section-full--proof relative overflow-hidden p-8 sm:p-12"
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
                <p className="landing-partners-title">{locale === 'en' ? 'Teams using TeamBlender' : 'Équipes qui utilisent TeamBlender'}</p>
                <div className="landing-platform-scent landing-usecase-chips" aria-label={locale === 'en' ? 'Use cases' : 'Cas d’usage'}>
                  {useCaseChips.map(({ label, Icon }, index) => (
                    <span key={`use-case-${index}-${label}`} className="landing-usecase-chip">
                      <GamifiedIcon Icon={Icon} index={index} size="xs" />
                      <span>{label}</span>
                    </span>
                  ))}
                </div>
                <p className="landing-partners-summary text-sm leading-6 text-slate-300">
                  {locale === 'en'
                    ? 'One modern platform, one clear rhythm, and one shared team experience.'
                    : 'Une plateforme moderne, un rythme clair et une expérience d’équipe partagée.'}
                </p>
              </div>
            </div>

            <div className="landing-metrics-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={locale === 'en' ? 'Key metrics' : 'Indicateurs clés'}>
              {TRUST_PROOF_METRICS.map((metric, index) => (
                <TrustProofCard
                  key={`${metric.value}-${index}`}
                  value={metric.value}
                  label={metric.label}
                  detail={metric.detail}
                  Icon={resolveMetricIcon(index)}
                  index={index}
                />
              ))}
            </div>

          </div>
        </section>

        <section
          className="landing-section-full landing-offer-section relative overflow-hidden p-6 sm:p-9"
          style={{ '--reveal-delay': '140ms' }}
          aria-label={landingStatic.fallback.platformOfferTitle}
        >
          <div className="landing-section-rupture landing-section-rupture--accent" />
          <div className="landing-section-inner relative">
            <div className="panel-head landing-offer-head landing-offer-head--center">
              <div className="landing-offer-head-content">
                <p className="eyebrow landing-section-eyebrow">{landingStatic.fallback.platformEyebrow}</p>
                <h2 className="landing-section-title">{landingStatic.fallback.platformOfferTitle}</h2>
                <p className="landing-offer-subtitle">{landingStatic.fallback.platformOfferSubtitle}</p>
              </div>
            </div>
            <ul className="landing-core-features-grid" aria-label={landingStatic.fallback.platformOfferTitle}>
              {PLATFORM_OFFER_ITEMS.map((item, index) => {
                const Icon = item.icon;
                const featureTitleId = `platform-feature-title-${index}`;
                return (
                  <li
                    key={item.label}
                    className="landing-core-feature-card"
                    style={{ '--feature-index': index + 1 }}
                  >
                    <span className={`landing-core-feature-icon landing-core-feature-icon--${item.tone || 'blue'}`} aria-hidden="true">
                      <Icon className="h-6 w-6" strokeWidth={2.2} />
                    </span>
                    <h3 id={featureTitleId} className="landing-core-feature-title">{item.label}</h3>
                    <p className="landing-core-feature-description">{item.description}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section
          className="landing-challenges-section landing-section-full relative overflow-hidden p-6 sm:p-10"
          style={{ '--reveal-delay': '150ms' }}
          aria-label={locale === 'en' ? 'Challenge examples' : 'Exemples de défis'}
        >
          <div className="landing-section-rupture landing-section-rupture--accent" />
          <div className="landing-section-inner relative">
            <div className="landing-challenges-head">
              <div>
                <p className="eyebrow landing-section-eyebrow">{locale === 'en' ? 'Challenge library' : 'Bibliothèque de défis'}</p>
                <h2 className="landing-section-title text-white">
                  {locale === 'en' ? 'Explore interactive challenge formats' : 'Exemples de défis prêts à l’emploi'}
                </h2>
                <p className="landing-challenges-subtitle">
                  {locale === 'en'
                    ? 'Short, structured formats designed for every team objective.'
                    : 'Des formats courts, structurés et adaptés à tous vos enjeux d’équipe.'}
                </p>
              </div>
            </div>

            <div className="landing-challenges-grid" role="list" aria-label={locale === 'en' ? 'Challenge examples' : 'Exemples de défis'}>
              {challengeExamples.map(({ category, duration, title, description, tags, Icon }) => (
                <article key={title} className="landing-challenge-card" role="listitem">
                  <div className="landing-challenge-card__topline">
                    <span className="landing-challenge-card__icon" aria-hidden="true">
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </span>
                    <span className="landing-challenge-card__meta">{category} · {duration}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <div className="landing-challenge-card__tags" aria-label={locale === 'en' ? 'Challenge objectives' : 'Objectifs du challenge'}>
                    {tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="landing-section-full landing-benefits-section relative overflow-hidden p-6 sm:p-10"
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
            <div className="landing-benefits-orbit mt-6">
              <div className="landing-benefits-orbit-center" aria-label={locale === 'en' ? 'Core platform value' : 'Valeur centrale'}>
                <span className="landing-benefits-orbit-center__eyebrow">{locale === 'en' ? 'Core value' : 'Valeur centrale'}</span>
                <div className="landing-benefits-orbit-center__halo" aria-hidden="true" />
                <div className="landing-benefits-orbit-center__badge" aria-hidden="true">
                  <Sparkles className="h-5 w-5" strokeWidth={2.2} />
                </div>
                <strong>{locale === 'en' ? 'One platform to run hybrid team experiences that feel clear, connected, and measurable.' : 'Une seule plateforme pour orchestrer des expériences d’équipe hybrides, claires, connectées et mesurables.'}</strong>
                <p>{locale === 'en' ? 'Designed for managers and HR teams who need a simple system with real business impact.' : 'Pensée pour les managers et RH qui veulent un système simple avec un vrai impact business.'}</p>
              </div>

              {PLATFORM_BENEFITS_ITEMS.slice(0, 5).map((item, index) => {
                const Icon = item.icon;
                const metricByIndex = [
                  locale === 'en' ? '-60% prep time' : '-60% de temps de préparation',
                  locale === 'en' ? '95% participation' : '95% de participation',
                  locale === 'en' ? '3× faster onboarding' : 'Onboarding 3× plus rapide',
                  locale === 'en' ? 'Instant debrief' : 'Débrief immédiat',
                  locale === 'en' ? 'Premium employer brand' : 'Image employeur premium',
                ];
                return (
                  <article
                    key={item.label}
                    className={`landing-benefits-orbit-item landing-benefits-orbit-item--${index + 1}`}
                    tabIndex={0}
                  >
                    <div className="landing-benefits-orbit-item__line" aria-hidden="true" />
                    <span className="landing-benefits-orbit-icon" aria-hidden="true">
                      <GamifiedIcon Icon={Icon} index={index} size="sm" />
                    </span>
                    <h3>{item.label}</h3>
                    <p>{item.description}</p>
                    <strong className="landing-benefits-orbit-metric">{metricByIndex[index]}</strong>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          className="landing-trusted landing-section-full relative overflow-hidden bg-slate-50 p-6 sm:p-10"
          style={{ '--reveal-delay': '165ms' }}
          aria-label={locale === 'en' ? 'Trusted companies' : 'Entreprises de confiance'}
        >
          <div className="landing-section-inner relative">
            <h2 className="landing-trusted-title text-center text-xl font-semibold tracking-normal text-slate-800 sm:text-2xl">
              {TRUSTED_COMPANIES.title}
            </h2>
            <p className="landing-trusted-subtitle mx-auto mt-2 max-w-[820px] text-center text-sm leading-6 text-slate-500">
              {locale === 'en'
                ? 'Leading teams in industry, retail, healthcare and technology rely on structured collaborative formats.'
                : 'Des equipes exigeantes de l\'industrie, du retail, de la sante et de la tech s\'appuient sur des formats collaboratifs structures.'}
            </p>
            <div className="landing-trusted-marquee">
              <div className="landing-trusted-marquee-track">
                <ul
                  className="landing-trusted-logos"
                  aria-label={locale === 'en' ? 'Trusted company logos' : 'Logos des entreprises'}
                >
                  {TRUSTED_COMPANIES.logos.map((company) => (
                    <li
                      key={company.name}
                      className="landing-trusted-logo-item opacity-60 grayscale transition-opacity duration-200 hover:opacity-100"
                      title={company.name}
                      style={{ '--trusted-accent': company.accent || '#35507b' }}
                    >
                      <span className="landing-trusted-logo-mark" aria-hidden="true">
                        <TrustedCompanyLogo company={company} />
                      </span>
                      <span className="landing-trusted-logo-name">{company.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section
          className="landing-testimonials landing-section-full relative overflow-hidden p-6 sm:p-10"
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
                <h2 className="landing-section-title text-slate-950">{testimonialsHeader.title}</h2>
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
                    <GamifiedIcon Icon={Quote} index={index} size="xs" />
                  </div>
                  <div className="landing-testimonial-head">
                    <div className="landing-testimonial-avatar" aria-hidden="true">{item.initials}</div>
                    <div>
                      <strong className="block text-sm font-semibold text-slate-950">{item.title}</strong>
                      <span className="text-sm text-slate-500">{item.subtitle}</span>
                    </div>
                  </div>
                  <p className="text-base leading-7 text-slate-700">“{item.description}”</p>
                </article>
              ))}
            </div>
            <div className="landing-swipe-dots landing-testimonial-dots" aria-hidden="true">
              {testimonialItems.map((_, index) => (
                <span key={`testimonial-dot-${index}`} className={`landing-swipe-dot${index === 0 ? ' is-active' : ''}`} />
              ))}
            </div>
          </div>
        </section>

        <section
          className="landing-flow landing-section-full relative overflow-hidden p-6 sm:p-8"
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
              {flowStepsWithIcons.map((step, index) => (
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
                  <div className="landing-flow-card-title mt-4">
                    <span className="landing-flow-card-title-icon" aria-hidden="true">
                      <GamifiedIcon Icon={step.Icon} index={index} size="sm" />
                    </span>
                    <h2 className="text-lg font-semibold tracking-tight text-slate-950">{step.title}</h2>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`landing-cta-block landing-section-full p-8 text-center`} style={{ '--reveal-delay': '240ms' }} aria-label={locale === 'en' ? 'Final call to action' : 'Dernier appel à l’action'}>
          <div className="landing-section-inner">
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{finalCta.title || landingStatic.fallback.finalCtaTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">{finalCta.description || landingStatic.fallback.finalCtaDescription}</p>
            <div className="hero-actions home-hero-actions landing-cta-actions mt-7 flex flex-wrap justify-center gap-3">
              <Link href={finalPrimaryHref} className={`${pillClass} landing-cta-primary landing-hero-primary-btn !text-white`}>
                <span>{finalPrimaryLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {isPreviewExpanded ? (
          <div
            className="landing-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label={locale === 'en' ? 'Live preview fullscreen view' : 'Vue plein écran de l’aperçu produit'}
            onClick={() => setIsPreviewExpanded(false)}
          >
            <div className="landing-preview-modal__panel" onClick={(event) => event.stopPropagation()}>
              <div className="landing-preview-modal__head">
                <div>
                  <p className="landing-hero-product-label">{landingStatic.fallback.productPreview}</p>
                  <p className="landing-hero-product-title">{landingStatic.fallback.liveExperience}</p>
                </div>
                <button
                  type="button"
                  className="landing-preview-modal__close"
                  aria-label={locale === 'en' ? 'Close fullscreen preview' : 'Fermer l’aperçu plein écran'}
                  onClick={() => setIsPreviewExpanded(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="landing-preview-modal__copy">
                {locale === 'en'
                  ? 'A short looping preview keeps the interface readable on mobile, with a fullscreen tap when users want details.'
                  : 'Un aperçu animé court garde l’interface lisible sur mobile, avec un tap plein écran pour les détails.'}
              </p>
              <Image
                src="/images/labyrinthe-hero.jpg"
                alt="Interface TeamBlender Labyrinthe en session live collaborative"
                width={1600}
                height={1067}
                className="landing-preview-modal__image"
              />
            </div>
          </div>
        ) : null}

        {showStickyCta ? (
          <div className="landing-sticky-cta" role="region" aria-label={locale === 'en' ? 'Quick signup action' : 'Action rapide d’inscription'}>
            <Link href={heroPrimaryHref} onClick={handlePrimaryCtaClick} className="landing-sticky-cta__button">
              <span>{locale === 'en' ? 'Start for free' : 'Démarrer gratuitement'}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </main>
      <Footer />
    </>
  );
}

