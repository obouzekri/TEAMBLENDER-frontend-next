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
    title: 'Créer de la cohésion ne devrait pas vous demander trois outils, dix relances et une journée entière.',
    description: 'TeamBlender vous donne un cadre simple pour lancer un moment d’équipe utile, même avec des collaborateurs répartis sur plusieurs sites.',
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
    title: 'Trois étapes pour lancer, animer et débriefer.',
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
      title: 'Building team cohesion should not require three tools, ten follow-ups, and a full day of prep.',
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
        label: 'Sur site, à distance ou multi-sites',
        detail: 'Un même déroulé pour tous les participants, quel que soit leur lieu de travail.',
      },
      {
        value: 'Un format guidé',
        label: 'Préparez, animez, débriefez',
        detail: 'Les étapes essentielles d’une session sont réunies dans un parcours clair.',
      },
      {
        value: 'Des objectifs concrets',
        label: 'Cohésion, onboarding, alignement',
        detail: 'Choisissez les défis selon le moment et le besoin de votre équipe.',
      },
    ],
    platformOfferItems: [
      {
        icon: Rocket,
        label: 'Lancement en quelques minutes',
        description: 'Vous choisissez les défis, TeamBlender prépare le cadre de session et votre équipe démarre sans installation.',
        tone: 'crimson',
      },
      {
        icon: Users,
        label: 'Organisation claire des participants',
        description: 'Le manager crée sa session, répartit les participants et garde la main sur le rythme du moment.',
        tone: 'orange',
      },
      {
        icon: Target,
        label: 'Défis adaptés à votre objectif',
        description: 'Un défi est une activité (CoPuzzle, Lab d’Innovation, Mission Critique) que vous combinez selon votre besoin d’équipe.',
        tone: 'sky',
      },
      {
        icon: PlayCircle,
        label: 'Animation live maîtrisée',
        description: 'Sur site ou à distance, vos collègues avancent depuis leur ordinateur et vous gardez un déroulé fluide.',
        tone: 'teal',
      },
      {
        icon: Gauge,
        label: 'Suivi en direct pendant la session',
        description: 'Vous voyez la progression des équipes et pouvez ajuster vos relances ou votre débrief au bon moment.',
        tone: 'olive',
      },
      {
        icon: BarChart3,
        label: 'Résultats prêts pour le débrief',
        description: 'Après la session, vous récupérez des indicateurs concrets pour analyser ce qui a fonctionné et préparer la suite.',
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
      { icon: Handshake, label: 'Un vrai moment d’équipe, même en hybride', description: 'Le manager anime une session où chacun contribue, au lieu d’un simple atelier passif.' },
      { icon: MessageCircle, label: 'Des échanges plus utiles entre collègues', description: 'Les défis obligent à argumenter, décider et coopérer, ce qui nourrit le débrief.' },
      { icon: GraduationCap, label: 'Intégration plus rapide des nouveaux arrivants', description: 'Les nouveaux collaborateurs participent dès le départ dans un format guidé et rassurant.' },
      { icon: ClipboardList, label: 'Moins de préparation, plus de temps pour l’animation', description: 'Les RH et managers lancent une session sans repartir de zéro à chaque fois.' },
      { icon: Sparkles, label: 'Des résultats exploitables après chaque session', description: 'Vous repartez avec des indicateurs clairs pour piloter les prochaines actions d’équipe.' },
    ],
    useCases: [
      'Cohésion d’équipe',
      'Onboarding',
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
      heroPrimaryLabel: 'Créer ma première session',
      heroSecondaryLabel: 'Voir un défi en action',
      finalPrimaryLabel: 'Démarrer gratuitement',
      finalSecondaryLabel: 'Demander une démo',
      keyline: 'Un défi = une activité. Une session = le cadre qui regroupe un ou plusieurs défis pour votre équipe.',
      liveSignals: {
        label: 'Signaux en direct',
        timer: 'Chrono en direct',
        chat: 'Chat et coordination d’équipe',
        progress: 'Progression d’équipe instantanée',
      },
      productPreview: 'Aperçu produit',
      liveExperience: 'Défis d’équipe en direct',
      liveLabel: 'En direct',
      platformEyebrow: 'Plateforme',
      platformOfferTitle: 'Ce que la plateforme offre',
      platformOfferSubtitle: 'Ce qu’il faut pour lancer des défis, animer votre session et exploiter les résultats sans friction.',
      valuesEyebrow: 'Valeurs',
      valuesTitle: 'Des fondations pensées pour le passage à l’échelle',
      benefitsEyebrow: 'Bénéfices',
      benefitsTitle: 'Ce que gagnent vos managers, vos équipes et vos RH',
      outcomesEyebrow: 'Après la session',
      outcomesTitle: 'Ce que vous obtenez après une session',
      outcomesDescription: 'Les indicateurs ci-dessous correspondent aux mesures réellement disponibles dans TeamBlender.',
      whyEyebrow: 'Pourquoi TeamBlender',
      whyTitle: 'Pourquoi TeamBlender',
      whyDescription: 'Un format pensé pour les équipes de travail, avec un cadre concret avant, pendant et après la session.',
      finalCtaEyebrow: 'CTA Final',
      finalCtaTitle: 'Prêt à structurer vos temps d’équipe ?',
      finalCtaDescription: 'Découvrez TeamBlender et lancez votre premier format pilote en quelques minutes.',
    },
    postSessionOutcomes: [
      { label: 'Participation', description: 'Participants actifs / participants invités, avec un taux de participation de session.' },
      { label: 'Progression par défi', description: 'Nombre de tentatives, défis terminés et taux de complétion pour chaque défi.' },
      { label: 'Implication', description: 'Nombre de soumissions de réponses au global, par défi et par participant.' },
      { label: 'Performance', description: 'Score moyen global et score moyen par défi/participant quand un score est disponible.' },
      { label: 'Vision équipe', description: 'Défis joués, contributeurs actifs et synthèse des contributions individuelles.' },
    ],
    whyTeamBlenderPoints: [
      { title: 'Des défis structurés, pas un simple quiz', description: 'Chaque défi engage la coopération et la prise de décision, au-delà d’une succession de questions.' },
      { title: 'Hybride dès la conception', description: 'Les collaborateurs participent depuis leur propre ordinateur, au bureau comme à distance, dans une même session.' },
      { title: 'Un cadre clair pour managers et RH', description: 'Le manager anime un moment d’équipe réussi, et les RH récupèrent des résultats concrets pour le débrief.' },
      { title: 'Vocabulaire clair pour piloter', description: 'Un défi est une activité. Une session est le cadre qui regroupe un ou plusieurs défis pour une équipe.' },
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
      { icon: Handshake, label: 'A real team moment, even in hybrid setups', description: 'Managers run a session where everyone contributes instead of a passive activity.' },
      { icon: MessageCircle, label: 'More useful team conversations', description: 'Challenges push people to argue, decide, and collaborate, which strengthens debrief quality.' },
      { icon: GraduationCap, label: 'Faster onboarding for new hires', description: 'New teammates can contribute quickly in a guided and reassuring format.' },
      { icon: ClipboardList, label: 'Less prep, more facilitation', description: 'HR and managers launch sessions without rebuilding the process every time.' },
      { icon: Sparkles, label: 'Actionable outcomes after each session', description: 'You leave with clear metrics to guide your next team actions.' },
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
      benefitsTitle: 'What managers, teams, and HR teams actually gain',
      outcomesEyebrow: 'After the session',
      outcomesTitle: 'What you get after a session',
      outcomesDescription: 'The indicators below match what TeamBlender actually measures today.',
      whyEyebrow: 'Why TeamBlender',
      whyTitle: 'Why TeamBlender',
      whyDescription: 'A format built for work teams, with a concrete frame before, during, and after each session.',
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
    whyTeamBlenderPoints: [
      { title: 'Structured challenges, not just a basic quiz', description: 'Each challenge drives collaboration and decisions, not only isolated questions.' },
      { title: 'Hybrid by design', description: 'Colleagues join from their own computer, in-office or remote, within one shared session.' },
      { title: 'Clear value for managers and HR', description: 'Managers facilitate a successful team moment, and HR gets concrete outcomes for debrief.' },
      { title: 'Clear vocabulary to run operations', description: 'A challenge is one activity. A session is the frame grouping one or multiple challenges.' },
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
