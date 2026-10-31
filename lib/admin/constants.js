// Admin console constants: allowed values, default drafts and FR/EN labels.
export const USER_ROLES = new Set(['user', 'admin']);
export const SESSION_STATUSES = new Set(['preparee', 'en_cours', 'terminee']);
export const SESSION_MODALITIES = new Set(['', 'remote', 'hybrid', 'in-person']);
export const CHALLENGE_TYPES = new Set(['individuel', 'equipe']);
export const CHALLENGE_STATUSES = new Set(['actif', 'brouillon', 'archive']);
export const CHALLENGE_SOURCES = new Set(['local', 'external']);
export const PRICING_BILLING_CYCLES = new Set(['monthly', 'yearly', 'one_time', 'custom']);
const SESSION_STATUS_LABELS = {
  preparee: 'En préparation',
  en_cours: 'En cours',
  terminee: 'Terminée',
};

export const DEFAULT_NEW_SESSION = {
  name: '',
  status: 'preparee',
  modality: '',
  format: '',
  session_date: '',
  duration_minutes: '',
};

export const DEFAULT_NEW_CHALLENGE = {
  name: '',
  type: 'individuel',
  status: 'actif',
  source: 'local',
  category: '',
  objectives: [],
  duration: '',
  engine_key: '',
  description: '',
  rules_objective: '',
  rules_facilitator: '',
  rules_participant: '',
  rules_footnote: '',
  player_min: '',
  player_recommended: '',
  player_max: '',
};

export const CHALLENGE_CATEGORY_OPTIONS = [
  { value: 'escape-game', label: 'Escape Game' },
  { value: 'logique-reflexion', label: 'Logique & Réflexion' },
  { value: 'icebreaker', label: 'Icebreaker' },
  { value: 'creativite-innovation', label: 'Créativité & innovation' },
  { value: 'memoire-attention', label: 'Mémoire & attention' },
  { value: 'culture-decouverte', label: 'Culture & découverte' },
];

export const CHALLENGE_OBJECTIVE_OPTIONS = [
  { value: 'cohesion', label: 'Cohésion' },
  { value: 'communication', label: 'Communication' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'resolution-problemes', label: 'Résolution de problèmes' },
  { value: 'intelligence-collective', label: 'Intelligence collective' },
  { value: 'creativite', label: 'Créativité' },
  { value: 'gestion-temps', label: 'Gestion du temps' },
];

export const MAX_CHALLENGE_OBJECTIVES = 3;
export const KNOWN_ENGINE_KEYS = Object.freeze([
  'crossword_live_v1',
  'copuzzle_live_v1',
  'escape_room_v1',
  'icebreaker_v1',
  'labyrinthe_live_v1',
  'local_page_v1',
  'lab_d_innovation_v1',
  'phrase_collaborative_v1',
  'mission_critique_v1',
  'the_quiz_v1',
  'vrai_ou_mensonge_v1',
  'pixel_architect_v1',
]);
export const ADMIN_TAB_IDS = new Set(['dashboard', 'analytics', 'users', 'participants', 'sessions', 'challenges', 'pricing', 'landing']);

export const DEFAULT_NEW_PRICING_PLAN = {
  name: '',
  description: '',
  features: '',
  price: '',
  currency: 'EUR',
  billing_cycle: 'monthly',
  cta_label: 'Choisir cette formule',
  is_active: true,
  highlighted: false,
  max_users: '',
  max_sessions_per_month: '',
  support_level: '',
  trial_days: '',
  display_order: '0',
};

export const DEFAULT_NEW_LANDING_BLOCK = {
  block_key: '',
  label: '',
  title: '',
  subtitle: '',
  description: '',
  image_url: '',
  cta_label: '',
  cta_href: '',
  badge_text: '',
  is_active: true,
  display_order: '0',
};

export const LANDING_ALLOWED_BLOCK_KEYS = [
  'hero_main',
  'hero_kicker',
  'hero_cta_primary',
  'hero_cta_secondary',
  'hero_trust_1',
  'hero_trust_2',
  'hero_trust_3',
  'hero_image_a',
  'hero_image_b',
  'impact_1',
  'impact_2',
  'impact_3',
  'flow_header',
  'flow_step_1',
  'flow_step_2',
  'flow_step_3',
  'final_cta',
  'final_cta_secondary',
];

export const LANDING_ALLOWED_BLOCK_KEY_SET = new Set(LANDING_ALLOWED_BLOCK_KEYS);
export const PLATFORM_ADMIN_EMAIL = 'admin@admin.com';
export const COPUZZLE_ADMIN_REFERENCE_IMAGES = [
  { id: 'default_1', title: 'Image administrateur 1', src: '/copuzzle/default-blue.svg' },
  { id: 'default_2', title: 'Image administrateur 2', src: '/copuzzle/default-grid.svg' },
  { id: 'default_3', title: 'Image administrateur 3', src: '/copuzzle/default-sunrise.svg' },
];

export const CHALLENGE_CATEGORY_LABELS = {
  'escape-game': { fr: 'Escape Game', en: 'Escape room' },
  'logique-reflexion': { fr: 'Logique & Réflexion', en: 'Logic & critical thinking' },
  icebreaker: { fr: 'Icebreaker', en: 'Icebreaker' },
  'creativite-innovation': { fr: 'Créativité & innovation', en: 'Creativity & innovation' },
  'memoire-attention': { fr: 'Mémoire & attention', en: 'Memory & attention' },
  'culture-decouverte': { fr: 'Culture & découverte', en: 'Culture & discovery' },
};

export const CHALLENGE_OBJECTIVE_LABELS = {
  cohesion: { fr: 'Cohésion', en: 'Cohesion' },
  communication: { fr: 'Communication', en: 'Communication' },
  collaboration: { fr: 'Collaboration', en: 'Collaboration' },
  leadership: { fr: 'Leadership', en: 'Leadership' },
  'resolution-problemes': { fr: 'Résolution de problèmes', en: 'Problem solving' },
  'intelligence-collective': { fr: 'Intelligence collective', en: 'Collective intelligence' },
  creativite: { fr: 'Créativité', en: 'Creativity' },
  'gestion-temps': { fr: 'Gestion du temps', en: 'Time management' },
};

export const SESSION_STATUS_OPTION_LABELS = {
  preparee: { fr: 'En préparation', en: 'Preparing' },
  en_cours: { fr: 'En cours', en: 'Live' },
  terminee: { fr: 'Terminée', en: 'Completed' },
};

export const SESSION_MODALITY_OPTION_LABELS = {
  '': { fr: 'Non définie', en: 'Not set' },
  remote: { fr: 'À distance', en: 'Remote' },
  hybrid: { fr: 'Hybride', en: 'Hybrid' },
  'in-person': { fr: 'Présentiel', en: 'In person' },
};

export const CHALLENGE_TYPE_OPTION_LABELS = {
  individuel: { fr: 'Individuel', en: 'Individual' },
  equipe: { fr: 'Équipe', en: 'Team' },
};

export const CHALLENGE_STATUS_OPTION_LABELS = {
  actif: { fr: 'Actif', en: 'Active' },
  brouillon: { fr: 'Brouillon', en: 'Draft' },
  archive: { fr: 'Archivé', en: 'Archived' },
};

export const CHALLENGE_SOURCE_OPTION_LABELS = {
  local: { fr: 'Local', en: 'Local' },
  external: { fr: 'Externe', en: 'External' },
};

export const PRICING_BILLING_CYCLE_LABELS = {
  monthly: { fr: 'Mensuel', en: 'Monthly' },
  yearly: { fr: 'Annuel', en: 'Yearly' },
  one_time: { fr: 'Paiement unique', en: 'One-time payment' },
  custom: { fr: 'Personnalisé', en: 'Custom' },
};

export const LANDING_ALLOWED_BLOCK_KEY_HINT = LANDING_ALLOWED_BLOCK_KEYS.join(', ');
