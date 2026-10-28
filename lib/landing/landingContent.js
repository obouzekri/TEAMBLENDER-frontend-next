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
    title: 'Des moments simples, pour des équipes qui avancent ensemble.',
    description: 'Sur site, à distance ou sur plusieurs sites, chacun trouve sa place dans l’activité.',
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
    label: 'Comment ça marche',
    title: 'Trois étapes, aucune préparation',
  },
  flow_step_1: {
    badge_text: '01',
    title: 'Choisissez',
    description: 'Choisissez le défi qui correspond à votre équipe.',
  },
  flow_step_2: {
    badge_text: '02',
    title: 'Partagez',
    description: 'Partagez un lien : chacun rejoint depuis son navigateur.',
  },
  flow_step_3: {
    badge_text: '03',
    title: 'Profitez',
    description: "Profitez, puis échangez sur ce qui s'est passé.",
  },
  final_cta_secondary: {
    cta_label: 'Parler à un expert',
    cta_href: '/contact',
  },
  },
  en: {
    impact_1: {},
    impact_2: {},
    impact_3: {},
    partners_header: {
      label: '',
      title: 'A team building platform for cohesion, without juggling multiple tools.',
      description: 'TeamBlender gives you a clear structure to run a useful team moment, even when people are split across locations.',
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
      title: 'Three steps to launch, facilitate, and debrief.',
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
        value: 'Pensé pour les équipes hybrides',
        label: 'Au bureau, à distance ou sur plusieurs sites',
        detail: 'Chacun participe, quel que soit son lieu de travail.',
      },
      {
        value: 'Un format guidé',
        label: 'Simple à lancer, facile à suivre',
        detail: 'Les étapes se déroulent naturellement, du lancement aux échanges.',
      },
      {
        value: 'Des objectifs concrets',
        label: 'Cohésion, intégration, collaboration',
        detail: 'Choisissez un défi adapté au besoin du moment.',
      },
    ],
    platformOfferItems: [],
    platformValuesItems: [
      { icon: CheckCircle2, label: 'Une expérience simple à lancer' },
      { icon: Sparkles, label: 'Une place pour chaque participant' },
      { icon: Layers, label: 'Des défis faciles à retrouver' },
      { icon: Shield, label: 'Un cadre clair pour les équipes' },
      { icon: Building2, label: 'Un même moment sur plusieurs sites' },
    ],
    platformBenefitsItems: [
      { icon: Handshake, label: 'Une équipe soudée, même à distance', description: 'Chacun participe vraiment, au bureau comme chez soi.' },
      { icon: MessageCircle, label: "Des échanges qu'on n'a plus l'occasion d'avoir", description: 'Décider, argumenter et réussir ensemble crée des liens que les réunions ne créent pas.' },
      { icon: GraduationCap, label: 'Une arrivée plus facile', description: 'Les nouveaux découvrent leurs collègues en agissant avec eux, pas en se présentant.' },
      { icon: ClipboardList, label: 'Un rythme qui s’installe', description: '20 minutes se glissent dans une semaine, sans agenda à bloquer ni logistique.' },
      { icon: Sparkles, label: 'Des signaux utiles', description: 'Voyez qui s’implique et ce qui fait avancer le groupe, pour nourrir vos prochains échanges.' },
    ],
    useCases: [
      'Cohésion d’équipe',
      'Intégration',
      'Alignement multi-sites',
      'Temps forts RH',
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
      heroEyebrow: "Le complément de vos temps forts d'équipe",
      heroMicrocopy: 'Aucune installation · Gratuit pour démarrer',
      heroPrimaryLabel: 'Démarrer gratuitement',
      heroSecondaryLabel: 'Voir un défi en action',
      finalPrimaryLabel: 'Démarrer gratuitement',
      finalSecondaryLabel: 'Parler à un expert',
      keyline: '',
      liveSignals: {
        label: 'Signaux en direct',
        timer: 'Chrono en direct',
        chat: 'Chat et coordination d’équipe',
        progress: 'Progression d’équipe instantanée',
      },
      productPreview: '',
      liveExperience: 'Défis collaboratifs en direct',
      liveLabel: 'En direct',
      platformEyebrow: '',
      platformOfferTitle: "Ce que ça change pour la cohésion de vos équipes",
      platformOfferSubtitle: '',
      valuesEyebrow: 'Valeurs',
      valuesTitle: 'Des fondations pensées pour le passage à l’échelle',
      benefitsEyebrow: 'Bénéfices',
      benefitsTitle: "Ce que ça change pour la cohésion de vos équipes",
      audienceEyebrow: 'Pour qui',
      audienceTitle: 'Pensé pour ceux qui font vivre les équipes',
      hrTag: 'Ressources humaines',
      managerTag: 'Management',
      faqEyebrow: 'Questions fréquentes',
      faqIntro: 'Les réponses aux questions que se posent le plus souvent les RH et les managers.',
      hrTitle: 'Vous êtes RH.',
      hrDescription: "Déployez un rituel d'équipe simple sur plusieurs sites, avec la même expérience pour tous. Suivez la participation sans outil de plus à gérer.",
      managerTitle: 'Vous êtes manager.',
      managerDescription: "Rien à préparer, rien à animer seul. Vous lancez, vous participez avec votre équipe, et vous repartez avec des pistes pour votre prochain échange.",
      outcomesEyebrow: 'Après un moment d’équipe',
      outcomesTitle: 'Ce que vous observez après un moment d’équipe',
      outcomesDescription: 'Des repères concrets pour comprendre la participation et nourrir vos prochains échanges.',
      finalCtaEyebrow: 'CTA Final',
      finalCtaTitle: 'Votre équipe mérite un vrai moment ensemble.',
      finalCtaDescription: 'Lancez le premier en quelques minutes, gratuitement.',
    },
    postSessionOutcomes: [
      { label: 'Participation', description: 'Personnes présentes, actives et contributions partagées au cours du défi.' },
      { label: 'Progression par défi', description: 'Tentatives et défis terminés, pour voir comment le groupe a avancé.' },
      { label: 'Implication', description: 'Réponses partagées par l’équipe et contributions de chacun.' },
      { label: 'Résultats', description: 'Scores disponibles selon le défi proposé et l’avancée de l’équipe.' },
      { label: 'Vision d’équipe', description: 'Défis réalisés, personnes qui ont contribué et synthèse des échanges.' },
    ],
  },
  en: {
    trustProofMetrics: [
      {
        value: 'Built for hybrid teams',
        label: 'On-site, remote, or multi-site',
        detail: 'One shared flow for every participant, wherever they work.',
      },
      {
        value: 'A guided format',
        label: 'Prepare, facilitate, debrief',
        detail: 'The essential steps of a session are brought together in one clear flow.',
      },
      {
        value: 'Concrete objectives',
        label: 'Cohesion, onboarding, alignment',
        detail: 'Choose challenges based on the moment and needs of your team.',
      },
    ],
    platformOfferItems: [
      {
        icon: Rocket,
        label: 'Launch in minutes',
        description: 'You pick the challenges, TeamBlender prepares the session frame, and your team starts without installation.',
        tone: 'crimson',
      },
      {
        icon: Users,
        label: 'Clear participant organization',
        description: 'Managers create a session, assign participants, and keep control of the facilitation rhythm.',
        tone: 'orange',
      },
      {
        icon: Target,
        label: 'Challenges matched to your objective',
        description: 'A challenge is one activity (CoPuzzle, Innovation Lab, Critical Mission) that you can combine in a session.',
        tone: 'sky',
      },
      {
        icon: PlayCircle,
        label: 'Confident live facilitation',
        description: 'Onsite or remote, colleagues collaborate from their own computer while you keep a smooth flow.',
        tone: 'teal',
      },
      {
        icon: Gauge,
        label: 'Live session tracking',
        description: 'Follow team progression in real time and adjust prompts or debrief timing when needed.',
        tone: 'olive',
      },
      {
        icon: BarChart3,
        label: 'Debrief-ready outcomes',
        description: 'After the session, you get concrete metrics to debrief what worked and prepare the next run.',
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
      { icon: Handshake, label: 'One team, wherever you work', description: 'Everyone joins the challenge, on-site or remotely.' },
      { icon: MessageCircle, label: 'Useful conversations', description: 'Challenges get people discussing, deciding, and collaborating.' },
      { icon: GraduationCap, label: 'Easier onboarding', description: 'A guided format helps new teammates contribute right away.' },
      { icon: ClipboardList, label: 'Less preparation', description: 'Launch a session without starting from scratch.' },
      { icon: Sparkles, label: 'Actionable results', description: 'Clear metrics help guide what your team does next.' },
    ],
    useCases: [
      'Team cohesion',
      'Onboarding',
      'Multi-site alignment',
      'HR moments',
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
      heroPrimaryLabel: 'Create my first session',
      heroSecondaryLabel: 'See a challenge in action',
      finalPrimaryLabel: 'Get started free',
      finalSecondaryLabel: 'Request a demo',
      keyline: 'A challenge is one activity. A session is the frame that groups one or multiple challenges for a team.',
      liveSignals: {
        label: 'Live signals',
        timer: 'Live timer',
        chat: 'Team chat and coordination',
        progress: 'Instant team progression',
      },
      productPreview: 'Product preview',
      liveExperience: 'Live team challenges',
      liveLabel: 'Live',
      platformEyebrow: 'Platform',
      platformOfferTitle: 'What the platform offers',
      platformOfferSubtitle: 'What you need to launch challenges, run the session, and use outcomes without operational friction.',
      valuesEyebrow: 'Values',
      valuesTitle: 'Foundations designed for scale',
      benefitsEyebrow: 'Benefits',
      benefitsTitle: 'Benefits for the whole team',
      outcomesEyebrow: 'After the session',
      outcomesTitle: 'What you get after a session',
      outcomesDescription: 'The indicators below match what TeamBlender actually measures today.',
      finalCtaEyebrow: 'Final CTA',
      finalCtaTitle: 'Ready to structure your team sessions?',
      finalCtaDescription: 'Discover TeamBlender and launch your first pilot format in minutes.',
    },
    postSessionOutcomes: [
      { label: 'Participation', description: 'Active participants versus invited participants, with a session participation rate.' },
      { label: 'Progress per challenge', description: 'Attempts, completed runs, and completion rate for each challenge.' },
      { label: 'Engagement', description: 'Answer submissions tracked globally, per challenge, and per participant.' },
      { label: 'Performance', description: 'Overall average score plus average score per challenge/participant when scoring is available.' },
      { label: 'Team visibility', description: 'Challenges played, active contributors, and a participant contribution summary.' },
    ],
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
        category: 'Coopérer',
        duration: '15–20 min',
        title: 'CoPuzzle',
        description: 'Reconstituez ensemble un puzzle en temps réel. Il faut se parler, se coordonner et décider à plusieurs.',
        tags: ['Écoute', 'Coordination'],
        Icon: Sparkles,
      },
      {
        category: 'Imaginer',
        duration: '25–35 min',
        title: 'Lab d’Innovation',
        description: 'Faites émerger une idée, défendez-la, votez. Idéal pour les équipes qui aiment débattre.',
        tags: ['Idées', 'Débat', 'Vote'],
        Icon: Users,
      },
      {
        category: "S'organiser",
        duration: '20–30 min',
        title: 'Mission Critique',
        description: 'Sauvez un projet contre la montre en ordonnant les priorités à plusieurs.',
        tags: ['Priorités', 'Coordination', 'Décision'],
        Icon: Target,
      },
    ];
}
