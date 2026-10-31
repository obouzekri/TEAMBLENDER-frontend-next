// Static content and CMS-merge helpers for the landing page (app/page.js).
// Keeps hardcoded copy, per-locale fallbacks and the dynamic-CMS overlay logic
// out of the page component itself.
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  Compass,
  Gauge,
  GraduationCap,
  Handshake,
  House,
  Layers,
  MapPin,
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
      title: 'Simple moments for teams that move forward together.',
      description: 'On-site, remote or across multiple sites, everyone finds their place in the activity.',
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
      description: 'We saved time on facilitation and on the conversations that follow. Results are immediately actionable.',
    },
    testimonial_3: {
      title: 'Nadia Costa',
      subtitle: 'Operations Manager, multi-site group',
      description: 'Finally a format that works both on-site and remote, with no friction for participants.',
    },
    flow_header: {
      label: 'How it works',
      title: 'Three steps, zero preparation',
    },
    flow_step_1: {
      badge_text: '01',
      title: 'Choose',
      description: 'Choose the challenge that fits your team.',
    },
    flow_step_2: {
      badge_text: '02',
      title: 'Share',
      description: 'Share a link: everyone joins from their browser.',
    },
    flow_step_3: {
      badge_text: '03',
      title: 'Enjoy',
      description: 'Enjoy it, then talk about what happened.',
    },
    final_cta_secondary: {
      cta_label: 'Talk to an expert',
      cta_href: '/contact',
    },
  }
};
export const LANDING_STATIC_BY_LOCALE = {
  fr: {
    trustProofMetrics: [
      {
        icon: Users,
        value: 'Pensé pour les équipes hybrides',
        detail: 'Chacun participe, quel que soit son lieu de travail.',
      },
      {
        icon: Compass,
        value: 'Un format guidé',
        detail: 'Les étapes se déroulent naturellement, du lancement aux échanges.',
      },
      {
        icon: Target,
        value: 'Des objectifs concrets',
        detail: 'Choisissez un défi adapté au besoin du moment.',
      },
    ],
    // Illustrative live session shown beside the proof heading (fictional initials).
    proofSessionPreview: {
      ariaLabel: 'Aperçu d’un défi en direct réunissant une équipe au bureau, en télétravail et sur un autre site',
      challenge: 'CoPuzzle',
      live: 'En direct',
      timer: '12:40',
      onlineLabel: 'connectés',
      sites: [
        { icon: Building2, label: 'Bureau de Paris', people: ['AM', 'JL', 'SK'] },
        { icon: House, label: 'En télétravail', people: ['NB', 'TR'] },
        { icon: MapPin, label: 'Site de Lyon', people: ['CL', 'YM', 'EB'] },
      ],
      progressLabel: 'Progression de l’équipe',
      progress: 68,
      message: { from: 'NB', place: 'En télétravail', text: 'Je m’occupe des bords !' },
    },
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
        icon: Users,
        value: 'Built for hybrid teams',
        detail: 'Everyone takes part, wherever they work.',
      },
      {
        icon: Compass,
        value: 'A guided format',
        detail: 'Each step flows naturally, from launch to conversation.',
      },
      {
        icon: Target,
        value: 'Concrete goals',
        detail: 'Choose a challenge that fits what your team needs right now.',
      },
    ],
    proofSessionPreview: {
      ariaLabel: 'Preview of a live challenge bringing together a team in the office, working from home and on another site',
      challenge: 'CoPuzzle',
      live: 'Live',
      timer: '12:40',
      onlineLabel: 'online',
      sites: [
        { icon: Building2, label: 'Paris office', people: ['AM', 'JL', 'SK'] },
        { icon: House, label: 'Working from home', people: ['NB', 'TR'] },
        { icon: MapPin, label: 'Lyon site', people: ['CL', 'YM', 'EB'] },
      ],
      progressLabel: 'Team progress',
      progress: 68,
      message: { from: 'NB', place: 'Working from home', text: 'I’ll take the edges!' },
    },
    platformOfferItems: [],
    platformValuesItems: [
      { icon: CheckCircle2, label: 'An experience that is simple to launch' },
      { icon: Sparkles, label: 'A place for every participant' },
      { icon: Layers, label: 'Challenges that are easy to find again' },
      { icon: Shield, label: 'A clear frame for teams' },
      { icon: Building2, label: 'The same moment across multiple sites' },
    ],
    platformBenefitsItems: [
      { icon: Handshake, label: 'A close-knit team, even remotely', description: 'Everyone truly takes part, in the office or at home.' },
      { icon: MessageCircle, label: 'Conversations you no longer get to have', description: 'Deciding, debating and succeeding together builds bonds that meetings don’t.' },
      { icon: GraduationCap, label: 'An easier start for newcomers', description: 'New hires get to know their colleagues by working alongside them, not by introducing themselves.' },
      { icon: ClipboardList, label: 'A rhythm that sticks', description: '20 minutes fits into any week, with no calendar to block and no logistics.' },
      { icon: Sparkles, label: 'Useful signals', description: 'See who gets involved and what moves the group forward, to inform your next conversations.' },
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
      heroEyebrow: 'The complement to your key team moments',
      heroMicrocopy: 'No installation · Free to get started',
      heroPrimaryLabel: 'Get started free',
      finalPrimaryLabel: 'Get started free',
      finalSecondaryLabel: 'Talk to an expert',
      keyline: '',
      liveSignals: {
        label: 'Live signals',
        timer: 'Live timer',
        chat: 'Team chat and coordination',
        progress: 'Instant team progress',
      },
      productPreview: '',
      liveExperience: 'Live collaborative challenges',
      liveLabel: 'Live',
      platformEyebrow: '',
      platformOfferTitle: 'How it strengthens your team’s cohesion',
      platformOfferSubtitle: '',
      valuesEyebrow: 'Values',
      valuesTitle: 'Foundations designed for scale',
      benefitsEyebrow: 'Benefits',
      benefitsTitle: 'How it strengthens your team’s cohesion',
      audienceEyebrow: 'Who it’s for',
      audienceTitle: 'Designed for the people who bring teams to life',
      hrTag: 'Human resources',
      managerTag: 'Management',
      faqEyebrow: 'Frequently asked questions',
      faqIntro: 'Answers to the questions HR teams and managers ask most often.',
      hrTitle: 'You’re in HR.',
      hrDescription: 'Roll out a simple team ritual across multiple sites, with the same experience for everyone. Track participation without another tool to manage.',
      managerTitle: 'You’re a manager.',
      managerDescription: 'Nothing to prepare, nothing to run alone. You launch it, you take part with your team, and you leave with ideas for your next conversation.',
      outcomesEyebrow: 'After a team moment',
      outcomesTitle: 'What you see after a team moment',
      outcomesDescription: 'Concrete markers to understand participation and inform your next conversations.',
      finalCtaEyebrow: 'Final CTA',
      finalCtaTitle: 'Your team deserves a real moment together.',
      finalCtaDescription: 'Launch your first one in minutes, for free.',
    },
    postSessionOutcomes: [
      { label: 'Participation', description: 'People present, active, and contributions shared during the challenge.' },
      { label: 'Progress per challenge', description: 'Attempts and completed challenges, to see how the group moved forward.' },
      { label: 'Engagement', description: 'Answers shared by the team and each person’s contributions.' },
      { label: 'Results', description: 'Scores available depending on the challenge and the team’s progress.' },
      { label: 'Team view', description: 'Challenges completed, who contributed, and a summary of the conversations.' },
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
        category: 'Cooperate',
        duration: '15–20 min',
        title: 'CoPuzzle',
        description: 'Rebuild a puzzle together in real time. It takes talking, coordinating and deciding as a group.',
        tags: ['Listening', 'Coordination'],
        Icon: Sparkles,
      },
      {
        category: 'Imagine',
        duration: '25–35 min',
        title: 'Lab d’Innovation',
        description: 'Bring an idea to life, defend it, vote. Ideal for teams who love a good debate.',
        tags: ['Ideas', 'Debate', 'Vote'],
        Icon: Users,
      },
      {
        category: 'Organize',
        duration: '20–30 min',
        title: 'Mission Critique',
        description: 'Save a project against the clock by ordering priorities together.',
        tags: ['Priorities', 'Coordination', 'Decision'],
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
