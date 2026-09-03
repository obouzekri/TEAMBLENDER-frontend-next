// Static content and CMS-merge helpers for the landing page (app/page.js).
// Keeps hardcoded copy, per-locale fallbacks and the dynamic-CMS overlay logic
// out of the page component itself.
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  Gauge,
  GraduationCap,
  Handshake,
  Layers,
  MessageCircle,
  PlayCircle,
  Rocket,
  Shield,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';

export const DEFAULT_BLOCKS_BY_LOCALE = {
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
export const LANDING_STATIC_BY_LOCALE = {
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
      heroPrimaryLabel: 'Créer une session',
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
      heroPrimaryLabel: 'Create a session',
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

export function getLocaleDefaultBlocks(locale) {
  return DEFAULT_BLOCKS_BY_LOCALE[locale] || DEFAULT_BLOCKS_BY_LOCALE.fr;
}

export function getLandingStatic(locale) {
  return LANDING_STATIC_BY_LOCALE[locale] || LANDING_STATIC_BY_LOCALE.fr;
}

export const CMS_BASELINE_COMPLETE_KEYS = new Set([
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

export const LANDING_CMS_REQUIRED_SCHEMA = {
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

export function hasCmsValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function buildLandingCmsAudit(blocksByKey) {
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

export function mapByKey(items) {
  const out = {};
  (Array.isArray(items) ? items : []).forEach((item) => {
    const key = String(item?.block_key || '').trim();
    if (!key) return;
    out[key] = item;
  });
  return out;
}

export function mergeBlock(key, dynamicBlocks, defaultBlocks) {
  return {
    ...(defaultBlocks[key] || {}),
    ...(dynamicBlocks[key] || {}),
  };
}

export function isCmsBlockComplete(key, dynamicBlocks) {
  const requiredFields = LANDING_CMS_REQUIRED_SCHEMA[key] || [];
  const block = dynamicBlocks[key];
  if (!block) return false;
  return requiredFields.every((field) => hasCmsValue(block[field]));
}

export function buildSectionBlocks(sectionKeys, dynamicBlocks, defaultBlocks) {
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

export function safeHref(value, fallback = '/') {
  return hasCmsValue(value) ? value : fallback;
}

export function getChallengeExamples(locale) {
  return locale === 'en'
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
}
