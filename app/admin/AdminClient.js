"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import AppNav from '@/components/AppNav';
import Footer from '@/components/Footer';
import Modal from '@/components/ui/Modal';
import { getApiUrl, normalizeBackendAssetUrl, normalizeUploadResultUrl } from '@/lib/config';
import { resolveChallengePlayerRange } from '@/lib/challenges/playerRange';

const USER_ROLES = new Set(['user', 'admin']);
const SESSION_STATUSES = new Set(['preparee', 'en_cours', 'terminee']);
const SESSION_MODALITIES = new Set(['', 'remote', 'hybrid', 'in-person']);
const CHALLENGE_TYPES = new Set(['individuel', 'equipe']);
const CHALLENGE_STATUSES = new Set(['actif', 'brouillon', 'archive']);
const CHALLENGE_SOURCES = new Set(['local', 'external']);
const PRICING_BILLING_CYCLES = new Set(['monthly', 'yearly', 'one_time', 'custom']);
const SESSION_STATUS_LABELS = {
  preparee: 'En préparation',
  en_cours: 'En cours',
  terminee: 'Terminée',
};

const DEFAULT_NEW_SESSION = {
  name: '',
  status: 'preparee',
  modality: '',
  format: '',
  session_date: '',
  duration_minutes: '',
};

const DEFAULT_NEW_CHALLENGE = {
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

const CHALLENGE_CATEGORY_OPTIONS = [
  { value: 'escape-game', label: 'Escape Game' },
  { value: 'logique-reflexion', label: 'Logique & Réflexion' },
  { value: 'icebreaker', label: 'Icebreaker' },
  { value: 'creativite-innovation', label: 'Créativité & innovation' },
  { value: 'memoire-attention', label: 'Mémoire & attention' },
  { value: 'culture-decouverte', label: 'Culture & découverte' },
];

const CHALLENGE_OBJECTIVE_OPTIONS = [
  { value: 'cohesion', label: 'Cohésion' },
  { value: 'communication', label: 'Communication' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'resolution-problemes', label: 'Résolution de problèmes' },
  { value: 'intelligence-collective', label: 'Intelligence collective' },
  { value: 'creativite', label: 'Créativité' },
  { value: 'gestion-temps', label: 'Gestion du temps' },
];

const MAX_CHALLENGE_OBJECTIVES = 3;

const DEFAULT_NEW_PRICING_PLAN = {
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

const DEFAULT_NEW_LANDING_BLOCK = {
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

const LANDING_ALLOWED_BLOCK_KEYS = [
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

const LANDING_ALLOWED_BLOCK_KEY_SET = new Set(LANDING_ALLOWED_BLOCK_KEYS);
const PLATFORM_ADMIN_EMAIL = 'admin@admin.com';
const COPUZZLE_ADMIN_REFERENCE_IMAGES = [
  { id: 'default_1', title: 'Image administrateur 1', src: '/copuzzle/default-blue.svg' },
  { id: 'default_2', title: 'Image administrateur 2', src: '/copuzzle/default-grid.svg' },
  { id: 'default_3', title: 'Image administrateur 3', src: '/copuzzle/default-sunrise.svg' },
];

const PIXEL_ARCHITECT_CATALOG_ENTRY = {
  id: 'pixel_architect_001',
  name: 'Pixel Architect',
  type: 'equipe',
  status: 'actif',
  source: 'local',
  category: 'creativite-innovation',
  objectives: ['collaboration', 'communication', 'gestion-temps'],
  duration: '15-25 min',
  engine_key: 'pixel_architect_v1',
  description: 'Construction 3D collaborative sous contraintes de temps, ressources et communication.',
  rules_objective: {
    fr: 'Construire une structure 3D en cubes sous contraintes.',
    en: 'Build a constrained 3D structure with cubes.',
  },
  rules_facilitator: {
    fr: ['Démarrez le chrono quand l’équipe est prête.', 'Surveillez les contraintes de cubes et de couleurs.'],
    en: ['Start the timer once the team is ready.', 'Monitor cube and color constraints.'],
  },
  rules_participant: {
    fr: ['Communiquez clairement.', 'Respectez la limite de ressources.', 'Contribuez à la structure finale.'],
    en: ['Communicate clearly.', 'Respect resource limits.', 'Contribute to the final structure.'],
  },
  rules_footnote: {
    fr: '',
    en: '',
  },
  engine_config: {
    participants: {
      min_count: 3,
      recommended_count: 6,
      max_count: 12,
    },
    mode: 'replication',
    collaborationMode: 'standard',
    settings: {
      timeLimitSeconds: 900,
      maxCubes: 50,
      maxColors: 3,
      hintsEnabled: true,
      chatEnabled: true,
      timerEnabled: true,
    },
    replication: {
      modelSource: 'template',
      templateId: 'tour_signal',
    },
    creative: {
      theme: 'Construisez une structure qui symbolise la collaboration.',
    },
  },
};

const THE_QUIZ_CATALOG_ENTRY = {
  id: 'the_quiz_001',
  name: 'The Quiz',
  type: 'individuel',
  status: 'actif',
  source: 'local',
  category: 'culture-decouverte',
  objectives: ['culture-decouverte', 'communication', 'intelligence-collective'],
  duration: '15-25 min',
  engine_key: 'the_quiz_v1',
  description: 'Quiz multijoueur en temps reel avec timer, reponses verrouillees et leaderboard dynamique.',
  rules_objective: {
    fr: 'Repondre vite et correctement pour monter au classement live.',
    en: 'Answer quickly and accurately to climb the live leaderboard.',
  },
  rules_facilitator: {
    fr: ['Lancez la session quand les participants sont prets.', 'Cadrez le rythme entre les manches.'],
    en: ['Start the session when participants are ready.', 'Set the pace between rounds.'],
  },
  rules_participant: {
    fr: ['Validez une seule reponse par question.', 'Restez attentif au chrono et au leaderboard.'],
    en: ['Submit one answer per question.', 'Keep an eye on the timer and leaderboard.'],
  },
  rules_footnote: {
    fr: '',
    en: '',
  },
  engine_config: {
    participants: {
      min_count: 4,
      recommended_count: 8,
      max_count: 30,
    },
    preset: 'medium',
    question_count: 9,
    question_duration_seconds: 30,
    chat: {
      enabled: true,
      quick_reactions_enabled: true,
    },
    leaderboard: {
      enabled: true,
    },
    timer: {
      enabled: true,
      duration_seconds: 30,
      warning_threshold_seconds: 10,
    },
  },
};

function ensurePixelArchitectChallenge(challenges) {
  const list = Array.isArray(challenges) ? [...challenges] : [];
  const existingIndex = list.findIndex((challenge) => String(challenge?.engine_key || '').trim() === 'pixel_architect_v1');

  if (existingIndex >= 0) {
    const current = list[existingIndex] || {};
    list[existingIndex] = {
      ...PIXEL_ARCHITECT_CATALOG_ENTRY,
      ...current,
      engine_config: {
        ...PIXEL_ARCHITECT_CATALOG_ENTRY.engine_config,
        ...(current.engine_config && typeof current.engine_config === 'object' ? current.engine_config : {}),
      },
    };
    return list;
  }

  return [...list, PIXEL_ARCHITECT_CATALOG_ENTRY];
}

function ensureTheQuizChallenge(challenges) {
  const list = Array.isArray(challenges) ? [...challenges] : [];
  const existingIndex = list.findIndex((challenge) => String(challenge?.engine_key || '').trim() === 'the_quiz_v1');

  if (existingIndex >= 0) {
    const current = list[existingIndex] || {};
    list[existingIndex] = {
      ...THE_QUIZ_CATALOG_ENTRY,
      ...current,
      engine_config: {
        ...THE_QUIZ_CATALOG_ENTRY.engine_config,
        ...(current.engine_config && typeof current.engine_config === 'object' ? current.engine_config : {}),
      },
    };
    return list;
  }

  return [...list, THE_QUIZ_CATALOG_ENTRY];
}

function ensureAdminCatalogChallenges(challenges) {
  return ensureTheQuizChallenge(ensurePixelArchitectChallenge(challenges));
}

function toPositiveIntOrNull(value) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function applyPlayerRangeToEngineConfig(engineConfig, rangeDraft) {
  const minCount = toPositiveIntOrNull(rangeDraft?.player_min);
  const recommendedCount = toPositiveIntOrNull(rangeDraft?.player_recommended);
  const maxCount = toPositiveIntOrNull(rangeDraft?.player_max);

  return {
    ...(engineConfig && typeof engineConfig === 'object' ? engineConfig : {}),
    participants: {
      ...(engineConfig?.participants && typeof engineConfig.participants === 'object' ? engineConfig.participants : {}),
      min_count: minCount,
      recommended_count: recommendedCount,
      max_count: maxCount,
    },
  };
}

const LANDING_ALLOWED_BLOCK_KEY_HINT = LANDING_ALLOWED_BLOCK_KEYS.join(', ');

function getParticipantFirstName(participant) {
  return String(participant?.first_name || participant?.firstname || '').trim();
}

function getParticipantLastName(participant) {
  return String(participant?.last_name || participant?.lastname || '').trim();
}

function getParticipantDisplayName(participant) {
  const first = getParticipantFirstName(participant);
  const last = getParticipantLastName(participant);
  const full = `${first} ${last}`.trim();
  return full || participant?.email || `Participant #${participant?.id || '?'}`;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function isPlatformAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === PLATFORM_ADMIN_EMAIL;
}

function normalizeObjectivesInput(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(
      value
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )).slice(0, MAX_CHALLENGE_OBJECTIVES);
  }

  const raw = String(value || '').trim();
  if (!raw) return [];

  return Array.from(new Set(
    raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  )).slice(0, MAX_CHALLENGE_OBJECTIVES);
}

function toggleObjectiveSelection(currentValue, objectiveValue) {
  const list = normalizeObjectivesInput(currentValue);
  if (list.includes(objectiveValue)) {
    return list.filter((entry) => entry !== objectiveValue);
  }
  if (list.length >= MAX_CHALLENGE_OBJECTIVES) {
    return list;
  }
  return [...list, objectiveValue];
}

function parseList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.sessions)) return payload.sessions;
  if (Array.isArray(payload?.challenges)) return payload.challenges;
  if (Array.isArray(payload?.members)) return payload.members;
  return [];
}

function pickUserLabel(user) {
  if (!user) return 'Admin';
  const first = String(user.first_name || user.firstName || '').trim();
  const last = String(user.last_name || user.lastName || '').trim();
  const full = `${first} ${last}`.trim();
  return full || user.email || 'Admin';
}

function cloneJson(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

function ensureEscapeRoomE5Image(engineConfig, imageUrl) {
  const normalizedImageUrl = normalizeBackendAssetUrl(imageUrl);
  const nextConfig = cloneJson(engineConfig, {}) || {};
  const enigmes = Array.isArray(nextConfig.enigmes) ? nextConfig.enigmes : [];
  const e5Index = enigmes.findIndex((e) => String(e?.id || '').toLowerCase() === 'e5');

  if (e5Index >= 0) {
    const e5 = enigmes[e5Index] && typeof enigmes[e5Index] === 'object' ? enigmes[e5Index] : {};
    enigmes[e5Index] = {
      ...e5,
      image: {
        ...(e5.image && typeof e5.image === 'object' ? e5.image : {}),
        src: normalizedImageUrl,
      },
    };
    nextConfig.enigmes = enigmes;
    return nextConfig;
  }

  // Fallback safety: create e5 entry if missing.
  nextConfig.enigmes = [
    ...enigmes,
    {
      id: 'e5',
      label: 'Énigme visuelle',
      image: { src: normalizedImageUrl, fit: 'cover' },
    },
  ];
  return nextConfig;
}

function getEscapeRoomE5ImageSrc(engineConfig) {
  const enigmes = Array.isArray(engineConfig?.enigmes) ? engineConfig.enigmes : [];
  const e5 = enigmes.find((e) => String(e?.id || '').toLowerCase() === 'e5');
  return normalizeBackendAssetUrl(String(e5?.image?.src || '').trim());
}

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function ensureCopuzzleConfig(engineConfig) {
  const current = cloneJson(engineConfig, {}) || {};
  const rows = clampInt(current?.grid?.rows, 4, 2, 16);
  const cols = clampInt(current?.grid?.cols, 4, 2, 16);
  const normalizedDefaultImages = (Array.isArray(current?.default_images) ? current.default_images : [])
    .map((item, index) => {
      const src = normalizeBackendAssetUrl(String(item?.src || item?.url || item?.value || '').trim());
      if (!src) return null;
      return {
        id: String(item?.id || `default_${index + 1}`),
        title: String(item?.title || '').trim() || `Image ${index + 1}`,
        src,
      };
    })
    .filter(Boolean)
    .slice(0, 3);

  const defaultImages = normalizedDefaultImages.length > 0
    ? normalizedDefaultImages
    : COPUZZLE_ADMIN_REFERENCE_IMAGES;

  const selectedDefaultImageId = String(current?.default_image_id || defaultImages[0]?.id || '').trim();
  const selectedDefaultImage = defaultImages.find((item) => item.id === selectedDefaultImageId) || defaultImages[0] || null;
  const imageSrc = normalizeBackendAssetUrl(
    String(current?.image?.src || current?.image_url || selectedDefaultImage?.src || '').trim()
  ) || '/copuzzle/default-blue.svg';
  const rawParticipants = current?.participants && typeof current.participants === 'object'
    ? current.participants
    : {};
  const {
    expected_count: _ignoredExpectedCount,
    expected_count_auto: _ignoredExpectedCountAuto,
    assigned_count: _ignoredAssignedCount,
    ...participantsConfig
  } = rawParticipants;

  return {
    ...current,
    default_images: defaultImages,
    default_image_id: selectedDefaultImage?.id || null,
    image_source_mode: String(current?.image_source_mode || 'defaults').toLowerCase() === 'custom' ? 'custom' : 'defaults',
    image_url: imageSrc,
    image: {
      ...(current?.image && typeof current.image === 'object' ? current.image : {}),
      src: imageSrc,
      fit: String(current?.image?.fit || 'contain').toLowerCase() === 'cover' ? 'cover' : 'contain',
    },
    grid: {
      ...(current?.grid && typeof current.grid === 'object' ? current.grid : {}),
      rows,
      cols,
    },
    timer: {
      ...(current?.timer && typeof current.timer === 'object' ? current.timer : {}),
      enabled: current?.timer?.enabled !== false,
      duration_seconds: clampInt(current?.timer?.duration_seconds, 1200, 30, 7200),
      warning_threshold_seconds: clampInt(current?.timer?.warning_threshold_seconds, 60, 10, 600),
    },
    chat: {
      ...(current?.chat && typeof current.chat === 'object' ? current.chat : {}),
      enabled: current?.chat?.enabled !== false,
    },
    participants: {
      ...participantsConfig,
    },
  };
}

function getCopuzzleDefaultImages(engineConfig) {
  const config = ensureCopuzzleConfig(engineConfig);
  return Array.isArray(config.default_images) ? config.default_images : COPUZZLE_ADMIN_REFERENCE_IMAGES;
}

function getCopuzzleImageSrc(engineConfig) {
  const config = ensureCopuzzleConfig(engineConfig);
  const defaultImages = getCopuzzleDefaultImages(config);
  const selectedDefault = defaultImages.find((item) => item.id === String(config.default_image_id || '').trim()) || defaultImages[0] || null;
  return normalizeBackendAssetUrl(
    String(config?.image?.src || config?.image_url || selectedDefault?.src || '').trim()
  ) || '/copuzzle/default-blue.svg';
}

function parseRulesTextarea(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildChallengeRulesPayload(draft) {
  const objective = String(draft?.rules_objective || '').trim();
  const facilitator = parseRulesTextarea(draft?.rules_facilitator);
  const participant = parseRulesTextarea(draft?.rules_participant);
  const footnote = String(draft?.rules_footnote || '').trim();

  const hasRules = Boolean(objective || footnote || facilitator.length > 0 || participant.length > 0);
  if (!hasRules) return null;

  return {
    objective,
    facilitator,
    participant,
    footnote,
  };
}

function mergeChallengeRulesIntoEngineConfig(engineConfig, draft) {
  const nextEngineConfig = cloneJson(engineConfig, {}) || {};
  const rules = buildChallengeRulesPayload(draft);

  if (rules) {
    nextEngineConfig.rules = rules;
  } else if (nextEngineConfig.rules && typeof nextEngineConfig.rules === 'object') {
    delete nextEngineConfig.rules;
  }

  return nextEngineConfig;
}

function planToDraft(plan) {
  return {
    id: plan.id,
    name: plan.name || '',
    description: plan.description || '',
    features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
    price: typeof plan.price === 'number' ? String(plan.price) : '',
    currency: plan.currency || 'EUR',
    billing_cycle: plan.billing_cycle || 'monthly',
    cta_label: plan.cta_label || 'Choisir cette formule',
    is_active: Boolean(plan.is_active),
    highlighted: Boolean(plan.highlighted),
    max_users: plan.max_users ?? '',
    max_sessions_per_month: plan.max_sessions_per_month ?? '',
    support_level: plan.support_level || '',
    trial_days: plan.trial_days ?? '',
    display_order: plan.display_order ?? 0,
  };
}

function landingBlockToDraft(block) {
  return {
    id: block.id,
    block_key: block.block_key || '',
    label: block.label || '',
    title: block.title || '',
    subtitle: block.subtitle || '',
    description: block.description || '',
    image_url: block.image_url || '',
    cta_label: block.cta_label || '',
    cta_href: block.cta_href || '',
    badge_text: block.badge_text || '',
    is_active: Boolean(block.is_active),
    display_order: block.display_order ?? 0,
  };
}

function isAllowedLandingBlockKey(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return LANDING_ALLOWED_BLOCK_KEY_SET.has(normalized);
}

async function fetchAdminJson(path, token) {
  const response = await fetch(getApiUrl(path), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || `HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.code = payload?.code;
    throw err;
  }

  return payload;
}

function isTokenAuthError(error) {
  const status = Number(error?.status);
  const code = String(error?.code || '').trim().toUpperCase();
  const message = String(error?.message || '').toLowerCase();

  if (code === 'TOKEN_INVALID' || code === 'TOKEN_EXPIRED' || code === 'UNAUTHORIZED') {
    return true;
  }

  if (status !== 401) return false;

  return (
    message.includes('token invalide')
    || message.includes('token manquant')
    || message.includes('token expired')
    || message.includes('jwt')
    || message.includes('utilisateur inconnu')
    || message.includes('participant inconnu')
  );
}

function formatDurationSeconds(value) {
  const totalSeconds = Math.max(0, Math.round(Number(value) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function formatCurrency(value, currency = 'EUR') {
  const amount = Number(value || 0);
  const safeCurrency = String(currency || 'EUR').trim().toUpperCase() || 'EUR';

  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${safeCurrency}`;
  }
}

function csvEscape(value) {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
}

function downloadTextFile(content, filename, mimeType = 'text/plain;charset=utf-8;') {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminClient() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [pricingPlans, setPricingPlans] = useState([]);
  const [landingBlocks, setLandingBlocks] = useState([]);
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [selectedVisitorCountry, setSelectedVisitorCountry] = useState('');
  const [showAllCitiesForCountry, setShowAllCitiesForCountry] = useState(false);

  const [busyApprovalId, setBusyApprovalId] = useState(null);
  const [busyDeleteKey, setBusyDeleteKey] = useState('');
  const [busySaveKey, setBusySaveKey] = useState('');
  const noticeTimer = useRef(null);
  const [userQuery, setUserQuery] = useState('');
  const [participantQuery, setParticipantQuery] = useState('');
  const [sessionQuery, setSessionQuery] = useState('');
  const [challengeQuery, setChallengeQuery] = useState('');
  const [pricingQuery, setPricingQuery] = useState('');
  const [landingQuery, setLandingQuery] = useState('');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [showNewParticipantForm, setShowNewParticipantForm] = useState(false);
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [showNewChallengeForm, setShowNewChallengeForm] = useState(false);
  const [showNewPricingPlanForm, setShowNewPricingPlanForm] = useState(false);
  const [showNewLandingBlockForm, setShowNewLandingBlockForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [editingPricingPlan, setEditingPricingPlan] = useState(null);
  const [editingLandingBlock, setEditingLandingBlock] = useState(null);
  const [challengeImageUploadBusy, setChallengeImageUploadBusy] = useState(false);
  const [challengeImageUploadError, setChallengeImageUploadError] = useState('');

  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'user',
  });
  const [newUserMessage, setNewUserMessage] = useState('');
  const [newParticipant, setNewParticipant] = useState({
    owner_id: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    job_title: '',
    department: '',
  });
  const [newParticipantMessage, setNewParticipantMessage] = useState('');
  const [newSession, setNewSession] = useState(DEFAULT_NEW_SESSION);
  const [newSessionMessage, setNewSessionMessage] = useState('');
  const [newSessionMemberIds, setNewSessionMemberIds] = useState([]);
  const [newSessionMemberQuery, setNewSessionMemberQuery] = useState('');
  const [newChallenge, setNewChallenge] = useState(DEFAULT_NEW_CHALLENGE);
  const [newChallengeMessage, setNewChallengeMessage] = useState('');
  const [newPricingPlan, setNewPricingPlan] = useState(DEFAULT_NEW_PRICING_PLAN);
  const [newPricingMessage, setNewPricingMessage] = useState('');
  const [newLandingBlock, setNewLandingBlock] = useState(DEFAULT_NEW_LANDING_BLOCK);
  const [newLandingMessage, setNewLandingMessage] = useState('');

  const getPreferredAuthToken = useCallback(() => {
    const sessionToken = String(sessionStorage.getItem('jwt') || '').trim();
    const localToken = String(localStorage.getItem('jwt') || '').trim();
    return sessionToken || localToken;
  }, []);

  const getAuthTokenCandidates = useCallback(() => {
    const sessionToken = String(sessionStorage.getItem('jwt') || '').trim();
    const localToken = String(localStorage.getItem('jwt') || '').trim();
    const candidates = [];

    if (sessionToken) candidates.push(sessionToken);
    if (localToken && localToken !== sessionToken) candidates.push(localToken);

    return candidates;
  }, []);

  const readStoredCurrentUser = useCallback(() => {
    const raw = sessionStorage.getItem('currentUser');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const persistCurrentUser = useCallback((nextUser) => {
    if (!nextUser) {
      sessionStorage.removeItem('currentUser');
      return;
    }

    try {
      sessionStorage.setItem('currentUser', JSON.stringify(nextUser));
    } catch {
      // Ignore storage write errors and keep runtime state as source of truth.
    }
  }, []);

  const getFallbackAuthToken = useCallback((activeToken) => {
    const active = String(activeToken || '').trim();
    const sessionToken = String(sessionStorage.getItem('jwt') || '').trim();
    const localToken = String(localStorage.getItem('jwt') || '').trim();

    if (sessionToken && sessionToken !== active) return sessionToken;
    if (localToken && localToken !== active) return localToken;
    return '';
  }, []);

  const forceReauth = useCallback(() => {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    window.location.replace('/login');
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initAdminContext = async () => {
      const fallbackToken = getPreferredAuthToken();
      const tokenCandidates = getAuthTokenCandidates();
      const storedCurrentUser = readStoredCurrentUser();
      let lastNonAdminUser =
        storedCurrentUser && String(storedCurrentUser.role || '').toLowerCase() !== 'admin'
          ? storedCurrentUser
          : null;

      const candidates = tokenCandidates.length > 0
        ? tokenCandidates
        : (fallbackToken ? [fallbackToken] : []);

      if (candidates.length === 0) {
        forceReauth();
        return;
      }

      for (const candidateToken of candidates) {
        try {
          const mePayload = await fetchAdminJson('/users/me', candidateToken);
          const me = mePayload?.user && typeof mePayload.user === 'object' ? mePayload.user : mePayload;
          const role = String(me?.role || '').toLowerCase();

          if (!me || typeof me !== 'object') {
            continue;
          }

          if (role !== 'admin') {
            lastNonAdminUser = me;
            continue;
          }

          if (cancelled) return;
          persistCurrentUser(me);
          setToken(candidateToken);
          setUser(me);
          setLoading(false);
          return;
        } catch (err) {
          const message = String(err?.message || '').toLowerCase();
          const roleMismatch = message.includes('insufficient role');

          if (isTokenAuthError(err) || roleMismatch) {
            continue;
          }

          if (cancelled) return;
          setError('Impossible de verifier la session admin. Veuillez reessayer.');
          setLoading(false);
          return;
        }
      }

      if (cancelled) return;

      if (lastNonAdminUser) {
        persistCurrentUser(lastNonAdminUser);
        window.location.replace('/home');
        return;
      }

      forceReauth();
    };

    initAdminContext();

    return () => {
      cancelled = true;
    };
  }, [forceReauth, getAuthTokenCandidates, getPreferredAuthToken, persistCurrentUser, readStoredCurrentUser]);

  const loadAnalytics = useCallback(async (daysOverride = null) => {
    if (!token) return;
    setAnalyticsLoading(true);

    try {
      const days = Number(daysOverride || analyticsDays || 30);
      const payload = await fetchAdminJson(`/admin-analytics/overview?days=${days}`, token);
      setAnalyticsOverview(payload && typeof payload === 'object' ? payload : null);
    } catch {
      // Analytics is optional: keep dashboard functional even if provider is unavailable.
      setAnalyticsOverview(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsDays, token]);

  const loadAll = useCallback(async () => {
    if (!token) return;
    setError('');

    try {
      const requests = [
        ['users', '/users'],
        ['pendingUsers', '/users/pending'],
        ['sessions', '/sessions'],
        ['challenges', '/challenges'],
        ['participants', '/participants?includeDisabled=true'],
        ['pricingPlans', '/pricing-plans/admin'],
        ['landingBlocks', '/landing-content/admin'],
      ];

      const results = await Promise.allSettled(
        requests.map(([, path]) => fetchAdminJson(path, token))
      );

      const failures = [];

      // Check for 401 on critical endpoints — if token expired, force reauth.
      // (landingBlocks is optional, so 401 there doesn't trigger reauth)
      const hasInvalidTokenOnCriticalEndpoint = results.some((result, index) => {
        const [key] = requests[index];
        return (
          key !== 'landingBlocks' &&
          result.status === 'rejected' &&
          isTokenAuthError(result.reason)
        );
      });

      if (hasInvalidTokenOnCriticalEndpoint) {
        const fallbackToken = getFallbackAuthToken(token);
        if (fallbackToken) {
          setToken(fallbackToken);
          return;
        }

        setError('Session expirée ou invalide. Veuillez vous reconnecter.');
        forceReauth();
        return;
      }

      results.forEach((result, index) => {
        const [key] = requests[index];

        if (result.status === 'fulfilled') {
          const value = parseList(result.value);
          if (key === 'users') setUsers(value);
          if (key === 'pendingUsers') setPendingUsers(value);
          if (key === 'sessions') setSessions(value);
          if (key === 'challenges') setChallenges(ensureAdminCatalogChallenges(value));
          if (key === 'participants') setParticipants(value);
          if (key === 'pricingPlans') setPricingPlans(value);
          if (key === 'landingBlocks') setLandingBlocks(value);
          return;
        }

        const reasonRaw = String(result.reason?.message || 'Erreur inconnue');
        const reasonMessage = reasonRaw.toLowerCase().includes('insufficient role')
          ? 'Role insuffisant (admin requis)'
          : reasonRaw;

        // Landing CMS is optional for the rest of admin loading.
        if (key === 'landingBlocks') {
          if (key === 'landingBlocks') {
            setLandingBlocks([]);
          }
          return;
        }

        failures.push(`${key}: ${reasonMessage}`);

        if (key === 'users') setUsers([]);
        if (key === 'pendingUsers') setPendingUsers([]);
        if (key === 'sessions') setSessions([]);
        if (key === 'challenges') setChallenges([]);
        if (key === 'participants') setParticipants([]);
        if (key === 'pricingPlans') setPricingPlans([]);
        if (key === 'landingBlocks') setLandingBlocks([]);
      });

      if (failures.length > 0) {
        const hasRoleMismatch = failures.some((entry) => entry.includes('Role insuffisant (admin requis)'));
        const hint = hasRoleMismatch
          ? ' Verifiez que votre session active correspond bien a un compte admin.'
          : '';
        setError(`Certaines donnees admin n'ont pas pu etre chargees: ${failures.join(' | ')}${hint}`);
      }

    } catch (err) {
      setError(err.message || 'Erreur de chargement admin.');
    }
  }, [forceReauth, getFallbackAuthToken, token]);

  useEffect(() => {
    if (!token) return;
    loadAll();
  }, [token, loadAll]);

  useEffect(() => {
    if (!token) return;
    loadAnalytics();
  }, [analyticsDays, loadAnalytics, token]);

  async function updateApproval(id, approval_status) {
    if (!token) return;
    setBusyApprovalId(id);
    setError('');

    try {
      const response = await fetch(getApiUrl(`/users/${id}/approval`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approval_status }),
      });

      if (!response.ok) {
        throw new Error('Action admin refusee.');
      }

      await loadAll();
      showNotice(approval_status === 'approved' ? 'Compte validé avec succès.' : 'Compte refusé avec succès.');
    } catch (err) {
      setError(err.message || 'Erreur pendant la mise à jour.');
    } finally {
      setBusyApprovalId(null);
    }
  }

  async function submitNewUser(event) {
    event.preventDefault();
    setNewUserMessage('');

    if (!newUser.first_name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      setNewUserMessage('Prénom, email et mot de passe sont obligatoires.');
      return;
    }

    if (!isValidEmail(newUser.email)) {
      setNewUserMessage('Email invalide.');
      return;
    }

    if (!USER_ROLES.has(newUser.role)) {
      setNewUserMessage('Rôle invalide.');
      return;
    }

    try {
      const response = await fetch(getApiUrl('/users'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setNewUserMessage(payload.error || 'Création utilisateur impossible.');
        return;
      }

      setNewUser({ first_name: '', last_name: '', email: '', password: '', role: 'user' });
      setNewUserMessage('Utilisateur créé avec succès.');
      setShowNewUserForm(false);
      await loadAll();
      showNotice('Utilisateur créé avec succès.');
    } catch {
      setNewUserMessage('Erreur réseau pendant la création.');
    }
  }

  async function handleDeleteUser(targetUser) {
    if (!token || !targetUser?.id) return;
    if (String(targetUser.id) === String(user?.id)) {
      setError('Vous ne pouvez pas supprimer votre propre compte admin.');
      return;
    }

    const accepted = window.confirm(`Supprimer l'utilisateur ${targetUser.email || targetUser.id} ?`);
    if (!accepted) return;

    const key = `user:${targetUser.id}`;
    setBusyDeleteKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/users/${targetUser.id}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Suppression impossible (${response.status})`);
      }

      await loadAll();
      showNotice('Utilisateur supprimé avec succès.');
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression utilisateur.');
    } finally {
      setBusyDeleteKey('');
    }
  }

  async function handleToggleUserStatus(targetUser) {
    if (!token || !targetUser?.id) return;
    if (String(targetUser.id) === String(user?.id)) {
      setError('Vous ne pouvez pas désactiver votre propre compte admin.');
      return;
    }

    const currentlyDisabled = Boolean(targetUser.disabled);
    const accepted = window.confirm(
      currentlyDisabled
        ? `Réactiver ${targetUser.email || 'cet utilisateur'} ?`
        : `Désactiver ${targetUser.email || 'cet utilisateur'} ?`
    );
    if (!accepted) return;

    const key = `status:user:${targetUser.id}`;
    setBusySaveKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/users/${targetUser.id}/status`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: currentlyDisabled }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Mise à jour statut impossible (${response.status})`);
      }

      await loadAll();
      showNotice(currentlyDisabled ? 'Utilisateur réactivé.' : 'Utilisateur désactivé.');
    } catch (err) {
      setError(err.message || 'Erreur lors du changement de statut utilisateur.');
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleResetUserPassword(targetUser) {
    if (!token || !targetUser?.id) return;

    const custom = window.prompt(
      `Nouveau mot de passe pour ${targetUser.email || `user #${targetUser.id}`} (laisser vide pour generation automatique):`,
      ''
    );
    if (custom === null) return;

    const key = `password:user:${targetUser.id}`;
    setBusySaveKey(key);
    setError('');

    try {
      const body = custom.trim() ? { password: custom.trim() } : {};
      const response = await fetch(getApiUrl(`/users/${targetUser.id}/password`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Reset mot de passe impossible (${response.status})`);
      }

      const tempPassword = payload?.tempPassword ? ` Mot de passe: ${payload.tempPassword}` : '';
      showNotice(`Mot de passe utilisateur réinitialisé.${tempPassword}`);
    } catch (err) {
      setError(err.message || 'Erreur lors du reset du mot de passe utilisateur.');
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleResendVerificationLink(targetUser) {
    if (!targetUser?.email) return;

    const key = `verify:user:${targetUser.id}`;
    setBusySaveKey(key);
    setError('');

    try {
      const response = await fetch(getApiUrl('/auth/resend-verification'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: String(targetUser.email).trim().toLowerCase(),
          userType: 'user',
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.message || `Renvoi impossible (${response.status})`);
      }

      showNotice(payload.message || 'Lien de verification renvoye.');
    } catch (err) {
      setError(err.message || 'Erreur lors du renvoi du lien de verification.');
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleAdminUserVerificationOverride(targetUser) {
    if (!token || !targetUser?.id) return;

    const key = `verify-admin:user:${targetUser.id}`;
    setBusySaveKey(key);
    setError('');

    try {
      const response = await fetch(getApiUrl(`/users/${targetUser.id}/email-verification`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.message || `Validation manuelle impossible (${response.status})`);
      }

      await loadAll();
      showNotice(payload.message || 'Compte validé manuellement.');
    } catch (err) {
      setError(err.message || 'Erreur pendant la validation manuelle du compte.');
    } finally {
      setBusySaveKey('');
    }
  }

  function beginEditUser(targetUser) {
    setShowNewUserForm(false);
    setEditingUser({
      id: targetUser.id,
      first_name: targetUser.first_name || '',
      last_name: targetUser.last_name || '',
      email: targetUser.email || '',
      role: targetUser.role || 'user',
      job_title: targetUser.job_title || '',
      department: targetUser.department || '',
      password: '',
    });
  }

  async function submitEditUser(event) {
    event.preventDefault();
    if (!token || !editingUser?.id) return;

    if (!editingUser.first_name.trim() || !isValidEmail(editingUser.email)) {
      setError('Le prénom et un email valide sont requis.');
      return;
    }

    if (!USER_ROLES.has(editingUser.role)) {
      setError('Rôle utilisateur invalide.');
      return;
    }

    const key = `save:user:${editingUser.id}`;
    setBusySaveKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/users/${editingUser.id}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
          email: editingUser.email,
          role: editingUser.role,
          job_title: editingUser.job_title,
          department: editingUser.department,
          ...(editingUser.password ? { password: editingUser.password } : {}),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.details || `Mise à jour impossible (${response.status})`);
      }

      setEditingUser(null);
      await loadAll();
      showNotice('Utilisateur mis à jour avec succès.');
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour utilisateur.');
    } finally {
      setBusySaveKey('');
    }
  }

  async function submitNewParticipant(event) {
    event.preventDefault();
    setNewParticipantMessage('');

    if (!token) return;

    if (!newParticipant.owner_id || !newParticipant.first_name.trim() || !newParticipant.email.trim() || !newParticipant.password.trim()) {
      setNewParticipantMessage('Createur, prenom, email et mot de passe sont obligatoires.');
      return;
    }

    if (!isValidEmail(newParticipant.email)) {
      setNewParticipantMessage('Email invalide.');
      return;
    }

    const key = 'create:participant';
    setBusySaveKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/users/${newParticipant.owner_id}/participants`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newParticipant.email.trim().toLowerCase(),
          first_name: newParticipant.first_name.trim(),
          last_name: newParticipant.last_name.trim() || null,
          password: newParticipant.password,
          job_title: newParticipant.job_title.trim() || null,
          department: newParticipant.department.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Création participant impossible (${response.status})`);
      }

      setNewParticipant({
        owner_id: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        job_title: '',
        department: '',
      });
      setShowNewParticipantForm(false);
      const tempPassword = payload?.tempPassword ? ` Mot de passe: ${payload.tempPassword}` : '';
      setNewParticipantMessage(`Participant créé avec succès.${tempPassword}`);
      await loadAll();
      showNotice('Participant créé avec succès.');
    } catch (err) {
      setNewParticipantMessage(err.message || 'Création participant impossible.');
    } finally {
      setBusySaveKey('');
    }
  }

  function beginEditParticipant(participant) {
    setShowNewParticipantForm(false);
    setEditingParticipant({
      id: participant.id,
      email: participant.email || '',
      first_name: getParticipantFirstName(participant),
      last_name: getParticipantLastName(participant),
      disabled: Boolean(participant.disabled),
      password: '',
      job_title: participant.job_title || '',
      department: participant.department || '',
    });
  }

  async function submitEditParticipant(event) {
    event.preventDefault();
    if (!token || !editingParticipant?.id) return;

    if (!editingParticipant.first_name.trim() || !isValidEmail(editingParticipant.email)) {
      setError('Le prenom participant et un email valide sont requis.');
      return;
    }

    const key = `save:participant:${editingParticipant.id}`;
    setBusySaveKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/participants/${editingParticipant.id}`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: editingParticipant.email.trim().toLowerCase(),
          first_name: editingParticipant.first_name.trim(),
          last_name: editingParticipant.last_name.trim() || null,
          disabled: Boolean(editingParticipant.disabled),
          ...(editingParticipant.password ? { password: editingParticipant.password } : {}),
          job_title: editingParticipant.job_title.trim() || null,
          department: editingParticipant.department.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Mise à jour participant impossible (${response.status})`);
      }

      setEditingParticipant(null);
      await loadAll();
      showNotice('Participant mis à jour avec succès.');
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour participant.');
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleToggleParticipantStatus(participant) {
    if (!token || !participant?.id) return;
    const currentlyDisabled = Boolean(participant.disabled);
    const accepted = window.confirm(
      currentlyDisabled
        ? `Réactiver ${getParticipantDisplayName(participant)} ?`
        : `Désactiver ${getParticipantDisplayName(participant)} ?`
    );
    if (!accepted) return;

    const key = `status:participant:${participant.id}`;
    setBusySaveKey(key);
    setError('');

    try {
      const response = await fetch(getApiUrl(`/participants/${participant.id}`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ disabled: !currentlyDisabled }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Mise à jour statut participant impossible (${response.status})`);
      }

      await loadAll();
      showNotice(currentlyDisabled ? 'Participant réactivé.' : 'Participant désactivé.');
    } catch (err) {
      setError(err.message || 'Erreur lors du changement de statut participant.');
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleDeleteParticipant(participant) {
    if (!token || !participant?.id) return;
    const accepted = window.confirm(`Supprimer ${getParticipantDisplayName(participant)} ?`);
    if (!accepted) return;

    const key = `participant:${participant.id}`;
    setBusyDeleteKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/participants/${participant.id}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Suppression participant impossible (${response.status})`);
      }

      if (editingParticipant && String(editingParticipant.id) === String(participant.id)) {
        setEditingParticipant(null);
      }
      await loadAll();
      showNotice('Participant supprimé avec succès.');
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression participant.');
    } finally {
      setBusyDeleteKey('');
    }
  }

  async function handleResetParticipantPassword(participant) {
    if (!token || !participant?.id) return;

    const custom = window.prompt(
      `Nouveau mot de passe pour ${getParticipantDisplayName(participant)} (laisser vide pour generation automatique):`,
      ''
    );
    if (custom === null) return;

    const key = `password:participant:${participant.id}`;
    setBusySaveKey(key);
    setError('');

    try {
      const body = custom.trim() ? { password: custom.trim() } : {};
      const response = await fetch(getApiUrl(`/participants/${participant.id}/password`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Reset mot de passe participant impossible (${response.status})`);
      }

      const tempPassword = payload?.tempPassword ? ` Mot de passe: ${payload.tempPassword}` : '';
      showNotice(`Mot de passe participant réinitialisé.${tempPassword}`);
    } catch (err) {
      setError(err.message || 'Erreur lors du reset mot de passe participant.');
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleResendParticipantVerificationLink(participant) {
    if (!participant?.email) return;

    const key = `verify:participant:${participant.id}`;
    setBusySaveKey(key);
    setError('');

    try {
      const response = await fetch(getApiUrl('/auth/resend-verification'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: String(participant.email).trim().toLowerCase(),
          userType: 'participant',
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.message || `Renvoi impossible (${response.status})`);
      }

      showNotice(payload.message || 'Lien de verification participant renvoye.');
    } catch (err) {
      setError(err.message || 'Erreur lors du renvoi du lien de verification participant.');
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleAdminParticipantVerificationOverride(participant) {
    if (!token || !participant?.id) return;

    const key = `verify-admin:participant:${participant.id}`;
    setBusySaveKey(key);
    setError('');

    try {
      const response = await fetch(getApiUrl(`/participants/${participant.id}/email-verification`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.message || `Validation manuelle impossible (${response.status})`);
      }

      await loadAll();
      showNotice(payload.message || 'Participant validé manuellement.');
    } catch (err) {
      setError(err.message || 'Erreur pendant la validation manuelle du participant.');
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleDeleteSession(sessionItem) {
    if (!token || !sessionItem?.id) return;
    const isLive = sessionItem.status === 'en_cours';
    const accepted = window.confirm(
      isLive
        ? `La session ${sessionItem.name || sessionItem.id} est en cours. Confirmer la suppression ?`
        : `Supprimer la session ${sessionItem.name || sessionItem.id} ?`
    );
    if (!accepted) return;

    const key = `session:${sessionItem.id}`;
    setBusyDeleteKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/sessions/${sessionItem.id}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Suppression impossible (${response.status})`);
      }

      await loadAll();
      showNotice('Session supprimée avec succès.');
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression session.');
    } finally {
      setBusyDeleteKey('');
    }
  }

  function beginEditSession(sessionItem) {
    setShowNewSessionForm(false);
    setEditingSession({
      id: sessionItem.id,
      name: sessionItem.name || '',
      status: sessionItem.status || 'preparee',
      format: sessionItem.format || '',
      modality: sessionItem.modality || '',
      session_date: sessionItem.session_date ? String(sessionItem.session_date).slice(0, 10) : '',
      duration_minutes: sessionItem.duration_minutes || '',
    });
  }

  async function submitEditSession(event) {
    event.preventDefault();
    if (!token || !editingSession?.id) return;

    if (!editingSession.name.trim()) {
      setError('Le nom de session est requis.');
      return;
    }

    if (!SESSION_STATUSES.has(editingSession.status)) {
      setError('Statut de session invalide.');
      return;
    }

    if (!SESSION_MODALITIES.has(editingSession.modality || '')) {
      setError('Modalité invalide. Utilisez remote, hybrid ou in-person.');
      return;
    }

    if (editingSession.duration_minutes && Number(editingSession.duration_minutes) <= 0) {
      setError('La durée doit être supérieure à 0.');
      return;
    }

    const key = `save:session:${editingSession.id}`;
    setBusySaveKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/sessions/${editingSession.id}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingSession.name,
          status: editingSession.status,
          format: editingSession.format || null,
          modality: editingSession.modality || null,
          session_date: editingSession.session_date || null,
          duration_minutes: editingSession.duration_minutes ? Number(editingSession.duration_minutes) : null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.details || `Mise à jour impossible (${response.status})`);
      }

      setEditingSession(null);
      await loadAll();
      showNotice('Session mise à jour avec succès.');
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour session.');
    } finally {
      setBusySaveKey('');
    }
  }

  async function submitNewSession(event) {
    event.preventDefault();
    if (!token) return;

    setNewSessionMessage('');

    if (!newSession.name.trim()) {
      setNewSessionMessage('Le nom de session est requis.');
      return;
    }

    if (!SESSION_STATUSES.has(newSession.status)) {
      setNewSessionMessage('Statut de session invalide.');
      return;
    }

    if (!SESSION_MODALITIES.has(newSession.modality || '')) {
      setNewSessionMessage('Modalité invalide. Utilisez remote, hybrid ou in-person.');
      return;
    }

    if (newSession.duration_minutes && Number(newSession.duration_minutes) <= 0) {
      setNewSessionMessage('La durée doit être supérieure à 0.');
      return;
    }

    const key = 'create:session';
    setBusySaveKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl('/sessions'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSession.name.trim(),
          status: newSession.status,
          format: newSession.format.trim() || null,
          modality: newSession.modality || null,
          session_date: newSession.session_date || null,
          duration_minutes: newSession.duration_minutes ? Number(newSession.duration_minutes) : null,
          participant_ids: newSessionMemberIds.map((id) => Number(id)).filter(Number.isInteger),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.details || `Création session impossible (${response.status})`);
      }

      const createdSession = payload?.session || payload;
      setNewSession(DEFAULT_NEW_SESSION);
      setNewSessionMemberIds([]);
      setNewSessionMemberQuery('');
      setNewSessionMessage('Session créée avec succès.');
      setShowNewSessionForm(false);
      await loadAll();
      setActiveTab('sessions');
      setSessionQuery('');
      if (createdSession?.id) {
        setEditingSession({
          id: createdSession.id,
          name: createdSession.name || '',
          status: createdSession.status || 'preparee',
          format: createdSession.format || '',
          modality: createdSession.modality || '',
          session_date: createdSession.session_date ? String(createdSession.session_date).slice(0, 10) : '',
          duration_minutes: createdSession.duration_minutes || '',
        });
      }
      showNotice('Session creee avec succès depuis la console admin.');
    } catch (err) {
      setNewSessionMessage(err.message || 'Création session impossible.');
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleDeleteChallenge(challengeItem) {
    if (!token || !challengeItem?.id) return;
    const label = challengeItem.name || challengeItem.title || challengeItem.id;
    const accepted = window.confirm(`Supprimer le challenge ${label} ?`);
    if (!accepted) return;

    const key = `challenge:${challengeItem.id}`;
    setBusyDeleteKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/challenges/${challengeItem.id}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Suppression impossible (${response.status})`);
      }

      await loadAll();
      showNotice('Challenge supprimé avec succès.');
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression challenge.');
    } finally {
      setBusyDeleteKey('');
    }
  }

  async function submitNewChallenge(event) {
    event.preventDefault();
    if (!token) return;

    setNewChallengeMessage('');

    if (!newChallenge.name.trim()) {
      setNewChallengeMessage('Le nom du challenge est requis.');
      return;
    }

    if (!CHALLENGE_TYPES.has(newChallenge.type)) {
      setNewChallengeMessage('Type de challenge invalide.');
      return;
    }

    if (!CHALLENGE_STATUSES.has(newChallenge.status)) {
      setNewChallengeMessage('Statut de challenge invalide.');
      return;
    }

    if (!CHALLENGE_SOURCES.has(newChallenge.source)) {
      setNewChallengeMessage('Source de challenge invalide.');
      return;
    }

    const key = 'create:challenge';
    setBusySaveKey(key);
    setError('');

    try {
      const normalizedObjectives = normalizeObjectivesInput(newChallenge.objectives);
      const engineConfig = applyPlayerRangeToEngineConfig(
        mergeChallengeRulesIntoEngineConfig({}, newChallenge),
        newChallenge
      );
      const response = await fetch(getApiUrl('/challenges'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newChallenge.name.trim(),
          type: newChallenge.type,
          status: newChallenge.status,
          source: newChallenge.source,
          category: newChallenge.category || null,
          objectives: normalizedObjectives.length ? normalizedObjectives.join(', ') : null,
          duration: newChallenge.duration || null,
          engine_key: newChallenge.engine_key || null,
          description: newChallenge.description || null,
          engine_config: engineConfig,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.details || `Création challenge impossible (${response.status})`);
      }

      setNewChallenge(DEFAULT_NEW_CHALLENGE);
      setNewChallengeMessage('Challenge cree avec succès.');
      setShowNewChallengeForm(false);
      await loadAll();
      showNotice('Challenge cree avec succès.');
    } catch (err) {
      setNewChallengeMessage(err.message || 'Création challenge impossible.');
    } finally {
      setBusySaveKey('');
    }
  }

  function beginEditChallenge(challengeItem) {
    setChallengeImageUploadError('');
    setShowNewChallengeForm(false);
    const isCopuzzle = String(challengeItem?.engine_key || '').toLowerCase() === 'copuzzle_live_v1';
    const normalizedEngineConfig = isCopuzzle
      ? ensureCopuzzleConfig(challengeItem.engine_config)
      : cloneJson(challengeItem.engine_config, {}) || {};
    const rulesSource =
      normalizedEngineConfig && typeof normalizedEngineConfig.rules === 'object'
        ? normalizedEngineConfig.rules
        : {};
    const playerRange = resolveChallengePlayerRange({ engine_config: normalizedEngineConfig });

    setEditingChallenge({
      id: challengeItem.id,
      name: challengeItem.name || '',
      type: challengeItem.type || 'individuel',
      status: challengeItem.status || 'actif',
      category: challengeItem.category || '',
      objectives: normalizeObjectivesInput(challengeItem.objectives),
      duration: challengeItem.duration || '',
      engine_key: challengeItem.engine_key || '',
      description: challengeItem.description || '',
      engine_config: normalizedEngineConfig,
      rules_objective: String(rulesSource.objective || ''),
      rules_facilitator: Array.isArray(rulesSource.facilitator) ? rulesSource.facilitator.join('\n') : '',
      rules_participant: Array.isArray(rulesSource.participant) ? rulesSource.participant.join('\n') : '',
      rules_footnote: String(rulesSource.footnote || ''),
      player_min: playerRange.min || '',
      player_recommended: playerRange.recommended || '',
      player_max: playerRange.max || '',
    });
  }

  async function persistChallengeEngineConfig(challengeId, nextEngineConfig) {
    const response = await fetch(getApiUrl(`/challenges/${challengeId}`), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        engine_config: nextEngineConfig,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || payload.details || `Sauvegarde challenge impossible (${response.status})`);
    }

    const persistedConfig = cloneJson(payload?.engine_config, null) || cloneJson(nextEngineConfig, {}) || {};

    setChallenges((prev) => prev.map((item) => (
      String(item?.id || '') === String(challengeId)
        ? { ...item, engine_config: persistedConfig }
        : item
    )));

    setEditingChallenge((prev) => {
      if (!prev) return prev;
      if (String(prev.id || '') !== String(challengeId)) return prev;
      return {
        ...prev,
        engine_config: persistedConfig,
      };
    });

    return persistedConfig;
  }

  async function handleUploadEscapeRoomImage(event) {
    if (!token || !editingChallenge) return;

    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setChallengeImageUploadError('');

    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setChallengeImageUploadError('Format non supporte. Utilisez JPG ou PNG.');
      event.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setChallengeImageUploadError('Image trop volumineuse (max 8 Mo).');
      event.target.value = '';
      return;
    }

    setChallengeImageUploadBusy(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(getApiUrl('/challenges/upload-image'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Upload impossible (${response.status})`);
      }

      const uploadedUrl = normalizeUploadResultUrl(payload);
      if (!uploadedUrl) {
        throw new Error('URL image manquante dans la reponse upload.');
      }

      const nextEngineConfig = ensureEscapeRoomE5Image(editingChallenge.engine_config, uploadedUrl);
      await persistChallengeEngineConfig(editingChallenge.id, nextEngineConfig);
      showNotice('Image enigme 5 uploadee et sauvegardee automatiquement.');
    } catch (err) {
      setChallengeImageUploadError(err.message || 'Upload image impossible.');
    } finally {
      setChallengeImageUploadBusy(false);
      event.target.value = '';
    }
  }

  async function handleUploadCopuzzleDefaultImage(event, imageIndex) {
    if (!token || !editingChallenge) return;

    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setChallengeImageUploadError('');

    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setChallengeImageUploadError('Format non supporte. Utilisez JPG ou PNG.');
      event.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setChallengeImageUploadError('Image trop volumineuse (max 8 Mo).');
      event.target.value = '';
      return;
    }

    setChallengeImageUploadBusy(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(getApiUrl('/challenges/upload-image'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Upload impossible (${response.status})`);
      }

      const uploadedUrl = normalizeUploadResultUrl(payload);
      if (!uploadedUrl) {
        throw new Error('URL image manquante dans la reponse upload.');
      }

      const currentConfig = ensureCopuzzleConfig(editingChallenge.engine_config);
      const defaultImages = getCopuzzleDefaultImages(currentConfig).map((item) => ({ ...item }));
      const safeIndex = Math.max(0, Math.min(defaultImages.length - 1, Number(imageIndex) || 0));
      const currentItem = defaultImages[safeIndex] || {
        id: `default_${safeIndex + 1}`,
        title: `Image ${safeIndex + 1}`,
        src: '',
      };

      defaultImages[safeIndex] = {
        ...currentItem,
        src: uploadedUrl,
      };

      const selectedDefaultImageId = String(currentConfig.default_image_id || defaultImages[0]?.id || '').trim();
      const selectedDefault = defaultImages.find((item) => item.id === selectedDefaultImageId) || defaultImages[0] || null;
      const nextEngineConfig = {
        ...currentConfig,
        default_images: defaultImages,
        image_url: String(selectedDefault?.src || uploadedUrl),
        image: {
          ...(currentConfig.image || {}),
          src: String(selectedDefault?.src || uploadedUrl),
        },
      };

      await persistChallengeEngineConfig(editingChallenge.id, nextEngineConfig);
      showNotice('Image de reference Copuzzle uploadee et sauvegardee automatiquement.');
    } catch (err) {
      setChallengeImageUploadError(err.message || 'Upload image impossible.');
    } finally {
      setChallengeImageUploadBusy(false);
      event.target.value = '';
    }
  }

  async function submitEditChallenge(event) {
    event.preventDefault();
    if (!token || !editingChallenge?.id) return;

    if (!editingChallenge.name.trim()) {
      setError('Le nom du challenge est requis.');
      return;
    }

    if (!CHALLENGE_TYPES.has(editingChallenge.type)) {
      setError('Type de challenge invalide.');
      return;
    }

    if (!CHALLENGE_STATUSES.has(editingChallenge.status)) {
      setError('Statut de challenge invalide.');
      return;
    }

    const key = `save:challenge:${editingChallenge.id}`;
    setBusySaveKey(key);
    setError('');
    try {
      const normalizedObjectives = normalizeObjectivesInput(editingChallenge.objectives);
      const engineConfig = applyPlayerRangeToEngineConfig(
        mergeChallengeRulesIntoEngineConfig(editingChallenge.engine_config || {}, editingChallenge),
        editingChallenge
      );
      const response = await fetch(getApiUrl(`/challenges/${editingChallenge.id}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingChallenge.name,
          type: editingChallenge.type,
          status: editingChallenge.status,
          category: editingChallenge.category || null,
          objectives: normalizedObjectives.length ? normalizedObjectives.join(', ') : null,
          duration: editingChallenge.duration || null,
          engine_key: editingChallenge.engine_key || null,
          description: editingChallenge.description || null,
          engine_config: engineConfig,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.details || `Mise à jour impossible (${response.status})`);
      }

      setEditingChallenge(null);
      await loadAll();
      showNotice('Challenge mis à jour avec succès.');
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour challenge.');
    } finally {
      setBusySaveKey('');
    }
  }

  function buildPricingPayloadFromDraft(draft) {
    const features = String(draft.features || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      name: String(draft.name || '').trim(),
      description: String(draft.description || '').trim() || null,
      features,
      price: draft.price === '' ? null : Number(String(draft.price).replace(',', '.')),
      currency: String(draft.currency || 'EUR').trim().toUpperCase(),
      billing_cycle: String(draft.billing_cycle || 'monthly').trim().toLowerCase(),
      cta_label: String(draft.cta_label || '').trim() || null,
      is_active: Boolean(draft.is_active),
      highlighted: Boolean(draft.highlighted),
      max_users: draft.max_users === '' ? null : Number(draft.max_users),
      max_sessions_per_month: draft.max_sessions_per_month === '' ? null : Number(draft.max_sessions_per_month),
      support_level: String(draft.support_level || '').trim() || null,
      trial_days: draft.trial_days === '' ? null : Number(draft.trial_days),
      display_order: draft.display_order === '' ? 0 : Number(draft.display_order),
    };
  }

  async function submitNewPricingPlan(event) {
    event.preventDefault();
    if (!token) return;

    setNewPricingMessage('');
    const payload = buildPricingPayloadFromDraft(newPricingPlan);

    if (!payload.name) {
      setNewPricingMessage('Le nom de la formule est requis.');
      return;
    }

    if (!Number.isFinite(payload.price) || payload.price < 0) {
      setNewPricingMessage('Le prix est requis et doit etre positif.');
      return;
    }

    if (!PRICING_BILLING_CYCLES.has(payload.billing_cycle)) {
      setNewPricingMessage('Cycle de facturation invalide.');
      return;
    }

    const key = 'create:pricing-plan';
    setBusySaveKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl('/pricing-plans'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || `Création formule impossible (${response.status})`);
      }

      setNewPricingPlan(DEFAULT_NEW_PRICING_PLAN);
      setNewPricingMessage('Formule creee avec succès.');
      setShowNewPricingPlanForm(false);
      await loadAll();
      showNotice('Formule tarifaire creee.');
    } catch (err) {
      setNewPricingMessage(err.message || 'Création formule impossible.');
    } finally {
      setBusySaveKey('');
    }
  }

  function beginEditPricingPlan(plan) {
    setShowNewPricingPlanForm(false);
    setEditingPricingPlan(planToDraft(plan));
  }

  async function submitEditPricingPlan(event) {
    event.preventDefault();
    if (!token || !editingPricingPlan?.id) return;

    const payload = buildPricingPayloadFromDraft(editingPricingPlan);
    if (!payload.name) {
      setError('Le nom de la formule est requis.');
      return;
    }

    if (!Number.isFinite(payload.price) || payload.price < 0) {
      setError('Le prix doit etre valide et positif.');
      return;
    }

    if (!PRICING_BILLING_CYCLES.has(payload.billing_cycle)) {
      setError('Cycle de facturation invalide.');
      return;
    }

    const key = `save:pricing-plan:${editingPricingPlan.id}`;
    setBusySaveKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/pricing-plans/${editingPricingPlan.id}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || `Mise à jour formule impossible (${response.status})`);
      }

      setEditingPricingPlan(null);
      await loadAll();
      showNotice('Formule tarifaire mise à jour.');
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour de la formule.');
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleDeletePricingPlan(plan) {
    if (!token || !plan?.id) return;
    const accepted = window.confirm(`Supprimer la formule ${plan.name || plan.id} ?`);
    if (!accepted) return;

    const key = `pricing-plan:${plan.id}`;
    setBusyDeleteKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/pricing-plans/${plan.id}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Suppression formule impossible (${response.status})`);
      }

      if (editingPricingPlan && String(editingPricingPlan.id) === String(plan.id)) {
        setEditingPricingPlan(null);
      }
      await loadAll();
      showNotice('Formule tarifaire supprimée.');
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression de la formule.');
    } finally {
      setBusyDeleteKey('');
    }
  }

  function buildLandingPayloadFromDraft(draft) {
    return {
      label: String(draft.label || '').trim() || null,
      title: String(draft.title || '').trim() || null,
      subtitle: String(draft.subtitle || '').trim() || null,
      description: String(draft.description || '').trim() || null,
      image_url: String(draft.image_url || '').trim() || null,
      cta_label: String(draft.cta_label || '').trim() || null,
      cta_href: String(draft.cta_href || '').trim() || null,
      badge_text: String(draft.badge_text || '').trim() || null,
      is_active: Boolean(draft.is_active),
      display_order: draft.display_order === '' ? 0 : Number(draft.display_order),
    };
  }

  async function submitNewLandingBlock(event) {
    event.preventDefault();
    if (!token) return;

    const blockKey = String(newLandingBlock.block_key || '').trim().toLowerCase();
    if (!blockKey) {
      setNewLandingMessage('La cle du bloc est requise.');
      return;
    }

    if (!isAllowedLandingBlockKey(blockKey)) {
      setNewLandingMessage(`Cle bloc non autorisee. Utilisez uniquement: ${LANDING_ALLOWED_BLOCK_KEY_HINT}`);
      return;
    }

    const payload = buildLandingPayloadFromDraft(newLandingBlock);
    const key = `create:landing:${blockKey}`;
    setBusySaveKey(key);
    setError('');
    setNewLandingMessage('');

    try {
      const response = await fetch(getApiUrl(`/landing-content/${encodeURIComponent(blockKey)}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || `Création bloc impossible (${response.status})`);
      }

      setNewLandingBlock(DEFAULT_NEW_LANDING_BLOCK);
      setNewLandingMessage('Bloc landing enregistré.');
      setShowNewLandingBlockForm(false);
      await loadAll();
      showNotice('Bloc landing créé/mis à jour.');
    } catch (err) {
      setNewLandingMessage(err.message || 'Erreur création bloc landing.');
    } finally {
      setBusySaveKey('');
    }
  }

  function beginEditLandingBlock(block) {
    setShowNewLandingBlockForm(false);
    setEditingLandingBlock(landingBlockToDraft(block));
  }

  async function submitEditLandingBlock(event) {
    event.preventDefault();
    if (!token || !editingLandingBlock?.block_key) return;

    const blockKey = String(editingLandingBlock.block_key || '').trim().toLowerCase();
    if (!blockKey) {
      setError('La cle du bloc est requise.');
      return;
    }

    if (!isAllowedLandingBlockKey(blockKey)) {
      setError(`Cle bloc non autorisee. Utilisez uniquement: ${LANDING_ALLOWED_BLOCK_KEY_HINT}`);
      return;
    }

    const payload = buildLandingPayloadFromDraft(editingLandingBlock);
    const key = `save:landing:${blockKey}`;
    setBusySaveKey(key);
    setError('');

    try {
      const response = await fetch(getApiUrl(`/landing-content/${encodeURIComponent(blockKey)}`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || `Mise à jour bloc impossible (${response.status})`);
      }

      setEditingLandingBlock(null);
      await loadAll();
      showNotice('Bloc landing mis à jour.');
    } catch (err) {
      setError(err.message || 'Erreur mise à jour bloc landing.');
    } finally {
      setBusySaveKey('');
    }
  }

  async function handleDeleteLandingBlock(block) {
    if (!token || !block?.block_key) return;
    const accepted = window.confirm(`Supprimer le bloc ${block.block_key} ?`);
    if (!accepted) return;

    const key = `landing:${block.block_key}`;
    setBusyDeleteKey(key);
    setError('');
    try {
      const response = await fetch(getApiUrl(`/landing-content/${encodeURIComponent(block.block_key)}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Suppression bloc impossible (${response.status})`);
      }

      if (editingLandingBlock && editingLandingBlock.block_key === block.block_key) {
        setEditingLandingBlock(null);
      }

      await loadAll();
      showNotice('Bloc landing supprime.');
    } catch (err) {
      setError(err.message || 'Erreur suppression bloc landing.');
    } finally {
      setBusyDeleteKey('');
    }
  }

  function logout() {
    localStorage.removeItem('jwt');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('currentUser');
    window.location.replace('/login');
  }

  function showNotice(msg) {
    setNotice(msg);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 4000);
  }

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const stats = useMemo(
    () => ({
      users: users.length,
      activeUsers: users.filter((u) => !u.disabled).length,
      disabledUsers: users.filter((u) => Boolean(u.disabled)).length,
      pending: pendingUsers.length,
      participants: participants.length,
      activeParticipants: participants.filter((p) => !p.disabled).length,
      sessions: sessions.length,
      activeSessions: sessions.filter((s) => s.status === 'en_cours').length,
      challenges: challenges.length,
      pricingPlans: pricingPlans.length,
      landingBlocks: landingBlocks.length,
    }),
    [users, pendingUsers, participants, sessions, challenges, pricingPlans, landingBlocks]
  );

  const analyticsSnapshot = useMemo(() => {
    const source = analyticsOverview && typeof analyticsOverview === 'object' ? analyticsOverview : {};
    return {
      configured: Boolean(source.configured),
      degraded: Boolean(source.degraded),
      reason: String(source.reason || '').trim(),
      lookbackDays: Number(source.lookbackDays || 30),
      users: source.users || {},
      engagement: source.engagement || {},
      conversion: source.conversion || {},
      performance: source.performance || {},
      business: source.business || {},
      visitors: source.visitors || {},
      generatedAt: String(source.generatedAt || ''),
    };
  }, [analyticsOverview]);

  const visitorCountries = useMemo(
    () => (Array.isArray(analyticsSnapshot.visitors.countries) ? analyticsSnapshot.visitors.countries : []),
    [analyticsSnapshot.visitors.countries]
  );

  const visitorCities = useMemo(
    () => (Array.isArray(analyticsSnapshot.visitors.cities) ? analyticsSnapshot.visitors.cities : []),
    [analyticsSnapshot.visitors.cities]
  );

  const visitorCitiesByCountry = useMemo(
    () => (Array.isArray(analyticsSnapshot.visitors.citiesByCountry) ? analyticsSnapshot.visitors.citiesByCountry : []),
    [analyticsSnapshot.visitors.citiesByCountry]
  );

  const effectiveSelectedCountry = useMemo(() => {
    const fallbackCountry = String(visitorCountries[0]?.label || '').trim();
    if (!selectedVisitorCountry) return fallbackCountry;
    const selectedExists = visitorCountries.some((item) => String(item?.label || '').trim() === selectedVisitorCountry);
    return selectedExists ? selectedVisitorCountry : fallbackCountry;
  }, [selectedVisitorCountry, visitorCountries]);

  const citiesForSelectedCountry = useMemo(() => {
    const selectedCountry = String(effectiveSelectedCountry || '').trim();
    if (!selectedCountry) return [];

    const grouped = new Map();
    visitorCitiesByCountry.forEach((row) => {
      if (String(row?.country || '').trim() !== selectedCountry) return;
      const city = String(row?.city || '').trim() || 'Inconnue';
      const value = Math.max(0, Number(row?.value || 0));
      grouped.set(city, (grouped.get(city) || 0) + value);
    });

    return Array.from(grouped.entries())
      .map(([label, value]) => ({ label, value }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [effectiveSelectedCountry, visitorCitiesByCountry]);

  const displayedCitiesForAnalytics = useMemo(() => {
    const source = citiesForSelectedCountry.length > 0 ? citiesForSelectedCountry : visitorCities;
    if (showAllCitiesForCountry) return source;
    return source.slice(0, 6);
  }, [citiesForSelectedCountry, showAllCitiesForCountry, visitorCities]);

  const canExpandCitiesForCountry = useMemo(
    () => citiesForSelectedCountry.length > 6,
    [citiesForSelectedCountry]
  );

  useEffect(() => {
    setShowAllCitiesForCountry(false);
  }, [effectiveSelectedCountry]);

  function exportAnalyticsCsv() {
    const rows = [
      ['metric', 'value', 'unit', 'window_days', 'generated_at'],
      ['users_active_total', Number(analyticsSnapshot.users.totalActive || 0), 'count', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['users_new', Number(analyticsSnapshot.users.newUsers || 0), 'count', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['users_returning', Number(analyticsSnapshot.users.returningUsers || 0), 'count', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['engagement_page_views', Number(analyticsSnapshot.engagement.pageViews || 0), 'count', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['engagement_avg_session_duration', Number(analyticsSnapshot.engagement.avgSessionDurationSec || 0), 'seconds', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['conversion_signup_count', Number(analyticsSnapshot.conversion.signupCount || 0), 'count', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['conversion_purchase_count', Number(analyticsSnapshot.conversion.purchaseCount || 0), 'count', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['conversion_key_action_count', Number(analyticsSnapshot.conversion.keyActionCount || 0), 'count', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['performance_avg_page_load', Number(analyticsSnapshot.performance.avgPageLoadMs || 0), 'milliseconds', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['performance_frontend_error_count', Number(analyticsSnapshot.performance.frontendErrorCount || 0), 'count', analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['business_revenue', Number(analyticsSnapshot.business.revenue || 0), String(analyticsSnapshot.business.currency || 'EUR').toUpperCase(), analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
      ['business_avg_basket', Number(analyticsSnapshot.business.avgBasket || 0), String(analyticsSnapshot.business.currency || 'EUR').toUpperCase(), analyticsSnapshot.lookbackDays, analyticsSnapshot.generatedAt],
    ];

    const csv = rows
      .map((row) => row.map((cell) => csvEscape(cell)).join(';'))
      .join('\n');

    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `analytics-admin-${analyticsSnapshot.lookbackDays}j-${stamp}.csv`;
    downloadTextFile(csv, filename, 'text/csv;charset=utf-8;');
  }

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u) => {
      const haystack = [u.first_name, u.last_name, u.email, u.role, u.job_title, u.department]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [users, userQuery]);

  const filteredParticipants = useMemo(() => {
    const query = participantQuery.trim().toLowerCase();
    if (!query) return participants;
    return participants.filter((p) => {
      const haystack = [
        p.email,
        p.first_name,
        p.firstname,
        p.last_name,
        p.lastname,
        p.job_title,
        p.department,
        p.creator?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [participants, participantQuery]);

  const filteredSessions = useMemo(() => {
    const query = sessionQuery.trim().toLowerCase();
    if (!query) return sessions;
    return sessions.filter((s) => {
      const haystack = [s.name, s.status, s.format, s.modality]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [sessions, sessionQuery]);

  const filteredChallenges = useMemo(() => {
    const query = challengeQuery.trim().toLowerCase();
    if (!query) return challenges;
    return challenges.filter((c) => {
      const haystack = [c.name, c.title, c.engine_key, c.type, c.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [challenges, challengeQuery]);

  const filteredPricingPlans = useMemo(() => {
    const query = pricingQuery.trim().toLowerCase();
    if (!query) return pricingPlans;
    return pricingPlans.filter((plan) => {
      const haystack = [
        plan.name,
        plan.description,
        plan.currency,
        plan.billing_cycle,
        plan.support_level,
        ...(Array.isArray(plan.features) ? plan.features : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [pricingPlans, pricingQuery]);

  const filteredLandingBlocks = useMemo(() => {
    const query = landingQuery.trim().toLowerCase();
    if (!query) return landingBlocks;
    return landingBlocks.filter((block) => {
      const haystack = [
        block.block_key,
        block.label,
        block.title,
        block.subtitle,
        block.description,
        block.image_url,
        block.cta_label,
        block.cta_href,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [landingBlocks, landingQuery]);

  const filteredAssignableMembers = useMemo(() => {
    const query = newSessionMemberQuery.trim().toLowerCase();
    const source = participants.filter((participant) => !Boolean(participant?.disabled));
    if (!query) return source;
    return source.filter((participant) => {
      const haystack = [
        participant.first_name,
        participant.firstname,
        participant.last_name,
        participant.lastname,
        participant.email,
        participant.department,
        participant.job_title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [participants, newSessionMemberQuery]);

  function toggleNewSessionMember(memberId) {
    setNewSessionMemberIds((prev) => {
      const normalized = String(memberId);
      if (prev.includes(normalized)) {
        return prev.filter((id) => id !== normalized);
      }
      return [...prev, normalized];
    });
  }

  if (loading) {
    return (
      <main className="shell auth-page">
        <section className="feature-card">
          <h1>Verification de la session admin...</h1>
          <p>Chargement en cours.</p>
        </section>
      </main>
    );
  }

  const TAB_ITEMS = [
    { id: 'dashboard', label: 'Tableau de bord', badge: null },
    { id: 'analytics', label: 'Analytics', badge: null },
    { id: 'users', label: 'Utilisateurs', badge: stats.pending > 0 ? stats.pending : null },
    { id: 'participants', label: 'Participants', badge: null },
    { id: 'sessions', label: 'Sessions', badge: stats.activeSessions > 0 ? stats.activeSessions : null },
    { id: 'challenges', label: 'Challenges', badge: null },
    { id: 'billing', label: 'Paiements', badge: null, href: '/admin/billing' },
    { id: 'pricing', label: 'Tarification', badge: stats.pricingPlans > 0 ? stats.pricingPlans : null },
    { id: 'landing', label: 'Landing CMS', badge: stats.landingBlocks > 0 ? stats.landingBlocks : null },
  ];

  function handleAdminTabClick(tab) {
    if (tab?.href) {
      window.location.href = tab.href;
      return;
    }
    setActiveTab(tab.id);
  }

  return (
    <>
      <AppNav userLabel={pickUserLabel(user)} onLogout={logout} role="admin" />
      <div className="admin-console-layout" style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg, #f8f9fa)' }}>

        {/* Sidebar - responsive via CSS media query */}
        <aside style={{
          width: '220px',
          minWidth: '220px',
          background: 'var(--color-surface, #fff)',
          borderRight: '1px solid var(--color-border, #e5e7eb)',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}>
          <div style={{
            padding: '20px 20px 14px',
            borderBottom: '1px solid var(--color-border, #e5e7eb)',
          }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--color-muted, #6b7280)', textTransform: 'uppercase', margin: 0 }}>TeamBlender</p>
          </div>

          <nav style={{ flex: 1, padding: '12px 0' }}>
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleAdminTabClick(tab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '10px 20px',
                  background: activeTab === tab.id ? 'var(--color-primary-light, #eef2ff)' : 'transparent',
                  border: 'none',
                  borderLeft: activeTab === tab.id ? '3px solid var(--color-primary, #4f46e5)' : '3px solid transparent',
                  color: activeTab === tab.id ? 'var(--color-primary, #4f46e5)' : 'var(--color-text, #374151)',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  fontSize: '14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {tab.label}
                {tab.badge != null ? (
                  <span style={{
                    background: 'var(--color-primary, #4f46e5)',
                    color: '#fff',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    minWidth: '20px',
                    textAlign: 'center',
                  }}>{tab.badge}</span>
                ) : null}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: '24px 24px', overflowY: 'auto' }}>

          {/* Notifications */}
          {error ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: '#b91c1c',
              fontSize: '14px',
            }}>
              <span>{error}</span>
              <button type="button" aria-label="Fermer le message d'erreur" onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: '16px', lineHeight: 1, padding: '0 0 0 12px' }}>✕</button>
            </div>
          ) : null}

          {notice ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: '#15803d',
              fontSize: '14px',
            }}>
              <span>{notice}</span>
              <button type="button" aria-label="Fermer le message d'information" onClick={() => setNotice('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803d', fontSize: '16px', lineHeight: 1, padding: '0 0 0 12px' }}>✕</button>
            </div>
          ) : null}

          <div className="admin-mobile-tabs" aria-label="Navigation admin mobile">
            {TAB_ITEMS.map((tab) => (
              <button
                key={`mobile-${tab.id}`}
                type="button"
                className={`admin-mobile-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => handleAdminTabClick(tab)}
              >
                {tab.label}
                {tab.badge != null ? <span className="admin-mobile-tab-badge">{tab.badge}</span> : null}
              </button>
            ))}
          </div>

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' ? (
            <div>
              <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 6px' }}>Tableau de bord</h1>
                <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>Vue d'ensemble de la plateforme en temps reel.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                  { value: stats.users, label: 'Utilisateurs' },
                  { value: stats.activeUsers, label: 'Utilisateurs actifs' },
                  { value: stats.disabledUsers, label: 'Utilisateurs inactifs' },
                  { value: stats.pending, label: 'Demandes en attente', highlight: stats.pending > 0 },
                  { value: stats.participants, label: 'Participants' },
                  { value: stats.activeParticipants, label: 'Participants actifs' },
                  { value: stats.sessions, label: 'Sessions' },
                  { value: stats.activeSessions, label: 'Sessions en cours', highlight: stats.activeSessions > 0 },
                  { value: stats.challenges, label: 'Challenges' },
                  { value: stats.pricingPlans, label: 'Formules tarifaires' },
                  { value: stats.landingBlocks, label: 'Blocs landing CMS' },
                ].map((item) => (
                    <div key={item.label} style={{
                    background: 'var(--color-surface, #fff)',
                    border: item.highlight ? '1px solid var(--color-primary, #4f46e5)' : '1px solid var(--color-border, #e5e7eb)',
                    borderRadius: '10px',
                      padding: '14px 12px',
                    textAlign: 'center',
                  }}>
                    <p style={{ fontSize: '24px', fontWeight: 700, color: item.highlight ? 'var(--color-primary, #4f46e5)' : 'var(--color-text, #111)', margin: '0 0 2px' }}>{item.value}</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-muted, #6b7280)', margin: 0 }}>{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Pending approvals on dashboard */}
              {pendingUsers.length > 0 ? (
                <div style={{
                  background: 'var(--color-surface, #fff)',
                  border: '1px solid var(--color-primary, #4f46e5)',
                  borderRadius: '10px',
                  padding: '20px 24px',
                }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, marginTop: 0, marginBottom: '16px' }}>Demandes en attente ({pendingUsers.length})</h2>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {pendingUsers.map((u) => (
                      <li key={String(u.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px 0', borderBottom: '1px solid var(--color-border, #e5e7eb)' }}>
                        <div>
                          <p style={{ fontWeight: 600, margin: '0 0 2px', fontSize: '14px' }}>{u.first_name || ''} {u.last_name || ''}</p>
                          <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '13px' }}>{u.email}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          <button type="button" className="btn-primary" disabled={busyApprovalId === u.id} onClick={() => updateApproval(u.id, 'approved')} style={{ fontSize: '13px', padding: '6px 14px' }}>Valider</button>
                          <button type="button" className="btn-secondary" disabled={busyApprovalId === u.id} onClick={() => updateApproval(u.id, 'rejected')} style={{ fontSize: '13px', padding: '6px 14px' }}>Refuser</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* ── ANALYTICS ── */}
          {activeTab === 'analytics' ? (
            <div>
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Analytics PostHog</h1>
                  <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>
                    Synthese des {analyticsSnapshot.lookbackDays} derniers jours pour le pilotage produit et business.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {[7, 30, 90].map((days) => (
                    <button
                      key={`analytics-period-${days}`}
                      type="button"
                      className="btn-secondary"
                      onClick={() => setAnalyticsDays(days)}
                      disabled={analyticsLoading || analyticsDays === days}
                      style={{
                        fontSize: '12px',
                        padding: '6px 10px',
                        borderColor: analyticsDays === days ? 'var(--color-primary, #4f46e5)' : undefined,
                        color: analyticsDays === days ? 'var(--color-primary, #4f46e5)' : undefined,
                      }}
                    >
                      {days}j
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={exportAnalyticsCsv}
                    disabled={analyticsLoading}
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
                {analyticsSnapshot.configured ? (
                  <p style={{ margin: 0, fontSize: '13px', color: '#15803d', fontWeight: 600 }}>
                    ✓ PostHog connecte
                    {analyticsSnapshot.degraded ? <span style={{ color: '#b45309', fontWeight: 400 }}> (mode degrade)</span> : null}
                  </p>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: '13px', color: '#b45309', fontWeight: 600 }}>⚠ Analytics non configure</p>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--color-muted, #6b7280)', lineHeight: 1.55 }}>
                      Ajoutez <code style={{ fontFamily: 'monospace', background: '#f3f4f6', padding: '1px 4px', borderRadius: '3px' }}>POSTHOG_PROJECT_ID</code> et{' '}
                      <code style={{ fontFamily: 'monospace', background: '#f3f4f6', padding: '1px 4px', borderRadius: '3px' }}>POSTHOG_PERSONAL_API_KEY</code>{' '}
                      dans le fichier <code style={{ fontFamily: 'monospace', background: '#f3f4f6', padding: '1px 4px', borderRadius: '3px' }}>.env</code> du backend puis redemarrez le serveur.
                    </p>
                  </>
                )}
                {analyticsSnapshot.configured && analyticsSnapshot.degraded && analyticsSnapshot.reason ? (
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#92400e', lineHeight: 1.5 }}>
                    Raison: {analyticsSnapshot.reason}
                  </p>
                ) : null}
                {analyticsSnapshot.generatedAt ? (
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--color-muted, #6b7280)' }}>
                    Genere le {new Date(analyticsSnapshot.generatedAt).toLocaleString('fr-FR')}
                  </p>
                ) : null}
              </div>

              {analyticsLoading ? (
                <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                  <p style={{ margin: 0, color: 'var(--color-muted, #6b7280)' }}>Chargement des donnees analytics...</p>
                </div>
              ) : null}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: 'Utilisateurs actifs', value: Number(analyticsSnapshot.users.totalActive || 0) },
                  { label: 'Nouveaux utilisateurs', value: Number(analyticsSnapshot.users.newUsers || 0) },
                  { label: 'Utilisateurs recurrents', value: Number(analyticsSnapshot.users.returningUsers || 0) },
                  { label: 'Pages vues', value: Number(analyticsSnapshot.engagement.pageViews || 0) },
                  { label: 'Duree session moyenne', value: formatDurationSeconds(analyticsSnapshot.engagement.avgSessionDurationSec) },
                  { label: 'Inscriptions', value: Number(analyticsSnapshot.conversion.signupCount || 0) },
                  { label: 'Achats (checkout)', value: Number(analyticsSnapshot.conversion.purchaseCount || 0) },
                  { label: 'Action cle (sessions creees)', value: Number(analyticsSnapshot.conversion.keyActionCount || 0) },
                  { label: 'Temps de chargement moyen', value: `${Math.round(Number(analyticsSnapshot.performance.avgPageLoadMs || 0))} ms` },
                  { label: 'Erreurs frontend', value: Number(analyticsSnapshot.performance.frontendErrorCount || 0) },
                  {
                    label: `Revenus (${String(analyticsSnapshot.business.currency || 'EUR').toUpperCase()})`,
                    value: formatCurrency(analyticsSnapshot.business.revenue, analyticsSnapshot.business.currency),
                  },
                  {
                    label: 'Panier moyen',
                    value: formatCurrency(analyticsSnapshot.business.avgBasket, analyticsSnapshot.business.currency),
                  },
                ].map((item) => (
                  <div key={item.label} style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '14px 12px' }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '20px', color: 'var(--color-text, #111)' }}>{item.value}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-muted, #6b7280)' }}>{item.label}</p>
                  </div>
                ))}
              </div>

              {analyticsSnapshot.configured ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  {[
                    {
                      title: 'Top pays',
                      list: visitorCountries,
                      interactive: true,
                    },
                    {
                      title: effectiveSelectedCountry
                        ? `Villes - ${effectiveSelectedCountry}`
                        : 'Top villes',
                      list: displayedCitiesForAnalytics,
                      expandable: canExpandCitiesForCountry,
                    },
                    { title: 'Top navigateurs', list: Array.isArray(analyticsSnapshot.visitors.browsers) ? analyticsSnapshot.visitors.browsers : [] },
                    { title: 'Top systemes', list: Array.isArray(analyticsSnapshot.visitors.os) ? analyticsSnapshot.visitors.os : [] },
                  ].map((block) => (
                    <div key={block.title} style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '14px 14px' }}>
                      <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700 }}>{block.title}</p>
                      {block.list.length > 0 ? (
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {block.list.slice(0, 6).map((item) => (
                            <li key={`${block.title}-${item.label}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '12px' }}>
                              {block.interactive ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedVisitorCountry(String(item.label || '').trim())}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    padding: 0,
                                    margin: 0,
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: String(item.label || '').trim() === effectiveSelectedCountry
                                      ? 'var(--color-primary, #4f46e5)'
                                      : 'var(--color-text, #111)',
                                    fontWeight: String(item.label || '').trim() === effectiveSelectedCountry ? 700 : 400,
                                  }}
                                  title={`Afficher les villes pour ${item.label}`}
                                >
                                  {item.label}
                                </button>
                              ) : (
                                <span style={{ color: 'var(--color-text, #111)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                              )}
                              <strong style={{ color: 'var(--color-primary, #4f46e5)', flexShrink: 0 }}>{item.value}</strong>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {block.expandable ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setShowAllCitiesForCountry((current) => !current)}
                          style={{ marginTop: '10px', fontSize: '12px', padding: '4px 8px' }}
                        >
                          {showAllCitiesForCountry ? 'Voir moins' : 'Voir toutes les villes'}
                        </button>
                      ) : (
                        block.list.length === 0 ? <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-muted, #6b7280)' }}>Aucune donnee disponible.</p> : null
                      )}
                    </div>
                  ))}
                </div>
              ) : null}


            </div>
          ) : null}

          {/* ── UTILISATEURS ── */}
          {activeTab === 'users' ? (
            <div>
              <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Utilisateurs</h1>
                  <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>Gestion des comptes utilisateurs et demandes d'acces.</p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setEditingUser(null);
                    setNewUserMessage('');
                    setShowNewUserForm((current) => !current);
                  }}
                >
                  {showNewUserForm ? 'Fermer le formulaire' : 'Creer un utilisateur'}
                </button>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                  <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>Demandes en attente {pendingUsers.length > 0 ? `(${pendingUsers.length})` : ''}</h2>
                  {pendingUsers.length === 0 ? <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '13px' }}>Aucune demande.</p> : null}
                  {pendingUsers.length > 0 ? (
                    <ul className="session-list" style={{ margin: 0 }}>
                      {pendingUsers.map((u) => (
                        <li key={String(u.id)} className="session-item" style={{ alignItems: 'center' }}>
                          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                            <p className="session-title">{u.first_name || ''} {u.last_name || ''}</p>
                            <p className="session-meta">{u.email}</p>
                          </div>
                          <div className="session-item-actions" style={{ flexShrink: 0 }}>
                            <button type="button" className="btn-primary" disabled={busyApprovalId === u.id} onClick={() => updateApproval(u.id, 'approved')} style={{ fontSize: '12px', padding: '5px 10px' }}>Valider</button>
                            <button type="button" className="btn-secondary" disabled={busyApprovalId === u.id} onClick={() => updateApproval(u.id, 'rejected')} style={{ fontSize: '12px', padding: '5px 10px' }}>Refuser</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                {showNewUserForm ? (
                  <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>Creer un compte</h2>
                    <form className="auth-form" onSubmit={submitNewUser} autoComplete="off">
                      <input type="text" name="fake_username" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
                      <input type="password" name="fake_password" autoComplete="current-password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
                      <label>Prenom<input name="create_user_first_name" autoComplete="off" value={newUser.first_name} onChange={(e) => setNewUser((p) => ({ ...p, first_name: e.target.value }))} required /></label>
                      <label>Nom<input name="create_user_last_name" autoComplete="off" value={newUser.last_name} onChange={(e) => setNewUser((p) => ({ ...p, last_name: e.target.value }))} /></label>
                      <label>Email<input type="email" name="create_user_email" autoComplete="off" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} required /></label>
                      <label>Mot de passe<input type="password" name="create_user_password" autoComplete="new-password" minLength={8} value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} required /></label>
                      <label>Role
                        <select value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
                          <option value="user">Utilisateur</option>
                          <option value="admin">Admin</option>
                        </select>
                      </label>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <button type="submit" className="btn-primary">Creer le compte</button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setShowNewUserForm(false);
                            setNewUserMessage('');
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                    {newUserMessage ? <p className="session-meta" style={{ marginTop: '8px' }}>{newUserMessage}</p> : null}
                  </div>
                ) : null}

                <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                      Liste {users.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>({filteredUsers.length}/{users.length})</span> : null}
                    </h2>
                    <input
                      type="search"
                      className="inline-input"
                      placeholder="Rechercher..."
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      style={{ width: 'min(360px, 100%)' }}
                    />
                  </div>
                  <ul className="session-list" style={{ margin: 0 }}>
                    {filteredUsers.length === 0 ? <li className="list-empty">Aucun utilisateur ne correspond.</li> : null}
                    {filteredUsers.map((u) => (
                      <li key={String(u.id)} className="session-item" style={{ alignItems: 'center' }}>
                        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                          <p className="session-title">{u.first_name || ''} {u.last_name || ''}</p>
                          <p className="session-meta">
                            {u.email} · {u.role || 'user'} · {u.disabled ? 'Inactif' : 'Actif'}
                            {isPlatformAdminEmail(u.email) ? ' · Verification non requise' : ''}
                          </p>
                        </div>
                        <div className="session-item-actions icon-only-actions" style={{ flexShrink: 0 }}>
                          {!isPlatformAdminEmail(u.email) ? (
                            <button
                              type="button"
                              className="icon-action-btn"
                              onClick={() => handleAdminUserVerificationOverride(u)}
                              disabled={busySaveKey === `verify-admin:user:${u.id}`}
                              title="Validation manuelle admin"
                              aria-label="Validation manuelle admin"
                            >
                              {busySaveKey === `verify-admin:user:${u.id}` ? '…' : '✓'}
                            </button>
                          ) : null}
                          {!isPlatformAdminEmail(u.email) ? (
                            <button
                              type="button"
                              className="icon-action-btn"
                              onClick={() => handleResendVerificationLink(u)}
                              disabled={busySaveKey === `verify:user:${u.id}`}
                              title="Renvoyer lien verification"
                              aria-label="Renvoyer lien verification"
                            >
                              {busySaveKey === `verify:user:${u.id}` ? '…' : '✉'}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => beginEditUser(u)}
                            title="Modifier"
                            aria-label="Modifier utilisateur"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={busySaveKey === `status:user:${u.id}` || String(u.id) === String(user?.id)}
                            title={u.disabled ? 'Activer' : 'Désactiver'}
                            aria-label={u.disabled ? 'Activer utilisateur' : 'Désactiver utilisateur'}
                          >
                            {busySaveKey === `status:user:${u.id}` ? '…' : u.disabled ? '↺' : '⏸'}
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn icon-action-danger"
                            onClick={() => handleDeleteUser(u)}
                            disabled={busyDeleteKey === `user:${u.id}` || String(u.id) === String(user?.id)}
                            title="Supprimer"
                            aria-label="Supprimer utilisateur"
                          >
                            {busyDeleteKey === `user:${u.id}` ? '…' : '🗑'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── PARTICIPANTS ── */}
          {activeTab === 'participants' ? (
            <div>
              <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Participants</h1>
                  <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>Gestion des participants rattaches aux utilisateurs.</p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setEditingParticipant(null);
                    setNewParticipantMessage('');
                    setShowNewParticipantForm((current) => !current);
                  }}
                >
                  {showNewParticipantForm ? 'Fermer le formulaire' : 'Creer un participant'}
                </button>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                {showNewParticipantForm ? (
                  <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>Creer un participant</h2>
                    <form className="auth-form" onSubmit={submitNewParticipant} autoComplete="off">
                      <input type="text" name="fake_participant_username" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
                      <input type="password" name="fake_participant_password" autoComplete="current-password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
                      <label>Createur
                        <select value={newParticipant.owner_id} onChange={(e) => setNewParticipant((prev) => ({ ...prev, owner_id: e.target.value }))} required>
                          <option value="">Selectionner un utilisateur</option>
                          {users.filter((u) => String(u.role || '') === 'user').map((u) => (
                            <option key={String(u.id)} value={String(u.id)}>{u.first_name || ''} {u.last_name || ''} ({u.email})</option>
                          ))}
                        </select>
                      </label>
                      <label>Prenom<input name="create_participant_first_name" autoComplete="off" value={newParticipant.first_name} onChange={(e) => setNewParticipant((prev) => ({ ...prev, first_name: e.target.value }))} required /></label>
                      <label>Nom<input name="create_participant_last_name" autoComplete="off" value={newParticipant.last_name} onChange={(e) => setNewParticipant((prev) => ({ ...prev, last_name: e.target.value }))} /></label>
                      <label>Email<input type="email" name="create_participant_email" autoComplete="off" value={newParticipant.email} onChange={(e) => setNewParticipant((prev) => ({ ...prev, email: e.target.value }))} required /></label>
                      <label>Mot de passe<input type="password" name="create_participant_password" autoComplete="new-password" minLength={8} value={newParticipant.password} onChange={(e) => setNewParticipant((prev) => ({ ...prev, password: e.target.value }))} required /></label>
                      <label>Fonction<input value={newParticipant.job_title} onChange={(e) => setNewParticipant((prev) => ({ ...prev, job_title: e.target.value }))} /></label>
                      <label>Departement<input value={newParticipant.department} onChange={(e) => setNewParticipant((prev) => ({ ...prev, department: e.target.value }))} /></label>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <button type="submit" className="btn-primary" disabled={busySaveKey === 'create:participant'}>{busySaveKey === 'create:participant' ? 'Création...' : 'Creer participant'}</button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setShowNewParticipantForm(false);
                            setNewParticipantMessage('');
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                    {newParticipantMessage ? <p className="session-meta" style={{ marginTop: '8px' }}>{newParticipantMessage}</p> : null}
                  </div>
                ) : null}

                <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                      Liste {participants.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>({filteredParticipants.length}/{participants.length})</span> : null}
                    </h2>
                    <input
                      type="search"
                      className="inline-input"
                      placeholder="Rechercher..."
                      value={participantQuery}
                      onChange={(e) => setParticipantQuery(e.target.value)}
                      style={{ width: 'min(360px, 100%)' }}
                    />
                  </div>
                  <ul className="session-list" style={{ margin: 0 }}>
                    {filteredParticipants.length === 0 ? <li className="list-empty">Aucun participant ne correspond.</li> : null}
                    {filteredParticipants.map((p) => (
                      <li key={String(p.id)} className="session-item" style={{ alignItems: 'center' }}>
                        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                          <p className="session-title">{getParticipantDisplayName(p)}</p>
                          <p className="session-meta">{p.email} · {p.disabled ? 'Inactif' : 'Actif'} · {p.creator?.email || `Createur #${p.created_by || '?'}`}</p>
                        </div>
                        <div className="session-item-actions icon-only-actions" style={{ flexShrink: 0 }}>
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => handleAdminParticipantVerificationOverride(p)}
                            disabled={busySaveKey === `verify-admin:participant:${p.id}`}
                            title="Validation manuelle admin"
                            aria-label="Validation manuelle participant"
                          >
                            {busySaveKey === `verify-admin:participant:${p.id}` ? '…' : '✓'}
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => handleResendParticipantVerificationLink(p)}
                            disabled={busySaveKey === `verify:participant:${p.id}`}
                            title="Renvoyer lien verification"
                            aria-label="Renvoyer lien verification participant"
                          >
                            {busySaveKey === `verify:participant:${p.id}` ? '…' : '✉'}
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => beginEditParticipant(p)}
                            title="Modifier"
                            aria-label="Modifier participant"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => handleToggleParticipantStatus(p)}
                            disabled={busySaveKey === `status:participant:${p.id}`}
                            title={p.disabled ? 'Activer' : 'Désactiver'}
                            aria-label={p.disabled ? 'Activer participant' : 'Désactiver participant'}
                          >
                            {busySaveKey === `status:participant:${p.id}` ? '…' : p.disabled ? '↺' : '⏸'}
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn icon-action-danger"
                            onClick={() => handleDeleteParticipant(p)}
                            disabled={busyDeleteKey === `participant:${p.id}`}
                            title="Supprimer"
                            aria-label="Supprimer participant"
                          >
                            {busyDeleteKey === `participant:${p.id}` ? '…' : '🗑'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          <Modal
            open={Boolean(editingUser)}
            title="Modifier utilisateur"
            onClose={() => setEditingUser(null)}
            dialogClassName="admin-edit-modal"
            bodyClassName="admin-edit-modal-body"
          >
            {editingUser ? (
              <form className="auth-form" onSubmit={submitEditUser}>
                <label>Prenom<input value={editingUser.first_name} onChange={(e) => setEditingUser((p) => ({ ...p, first_name: e.target.value }))} required /></label>
                <label>Nom<input value={editingUser.last_name} onChange={(e) => setEditingUser((p) => ({ ...p, last_name: e.target.value }))} /></label>
                <label>Email<input type="email" value={editingUser.email} onChange={(e) => setEditingUser((p) => ({ ...p, email: e.target.value }))} required /></label>
                <label>Role
                  <select value={editingUser.role} onChange={(e) => setEditingUser((p) => ({ ...p, role: e.target.value }))}>
                    <option value="user">Utilisateur</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label>Fonction<input value={editingUser.job_title} onChange={(e) => setEditingUser((p) => ({ ...p, job_title: e.target.value }))} /></label>
                <label>Departement<input value={editingUser.department} onChange={(e) => setEditingUser((p) => ({ ...p, department: e.target.value }))} /></label>
                <label>Nouveau mot de passe (optionnel)<input type="password" minLength={8} value={editingUser.password} onChange={(e) => setEditingUser((p) => ({ ...p, password: e.target.value }))} /></label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn-primary" disabled={busySaveKey === `save:user:${editingUser.id}`}>{busySaveKey === `save:user:${editingUser.id}` ? 'Enregistrement...' : 'Enregistrer'}</button>
                  <button type="button" className="btn-secondary" onClick={() => setEditingUser(null)}>Annuler</button>
                </div>
              </form>
            ) : null}
          </Modal>

          <Modal
            open={Boolean(editingParticipant)}
            title="Modifier participant"
            onClose={() => setEditingParticipant(null)}
            dialogClassName="admin-edit-modal"
            bodyClassName="admin-edit-modal-body"
          >
            {editingParticipant ? (
              <form className="auth-form" onSubmit={submitEditParticipant}>
                <label>Prenom<input value={editingParticipant.first_name} onChange={(e) => setEditingParticipant((prev) => ({ ...prev, first_name: e.target.value }))} required /></label>
                <label>Nom<input value={editingParticipant.last_name} onChange={(e) => setEditingParticipant((prev) => ({ ...prev, last_name: e.target.value }))} /></label>
                <label>Email<input type="email" value={editingParticipant.email} onChange={(e) => setEditingParticipant((prev) => ({ ...prev, email: e.target.value }))} required /></label>
                <label>Statut
                  <select value={editingParticipant.disabled ? 'disabled' : 'active'} onChange={(e) => setEditingParticipant((prev) => ({ ...prev, disabled: e.target.value === 'disabled' }))}>
                    <option value="active">Actif</option>
                    <option value="disabled">Inactif</option>
                  </select>
                </label>
                <label>Fonction<input value={editingParticipant.job_title} onChange={(e) => setEditingParticipant((prev) => ({ ...prev, job_title: e.target.value }))} /></label>
                <label>Departement<input value={editingParticipant.department} onChange={(e) => setEditingParticipant((prev) => ({ ...prev, department: e.target.value }))} /></label>
                <label>Nouveau mot de passe (optionnel)<input type="password" minLength={8} value={editingParticipant.password} onChange={(e) => setEditingParticipant((prev) => ({ ...prev, password: e.target.value }))} /></label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn-primary" disabled={busySaveKey === `save:participant:${editingParticipant.id}`}>{busySaveKey === `save:participant:${editingParticipant.id}` ? 'Enregistrement...' : 'Enregistrer'}</button>
                  <button type="button" className="btn-secondary" onClick={() => setEditingParticipant(null)}>Annuler</button>
                </div>
              </form>
            ) : null}
          </Modal>

          {/* ── SESSIONS ── */}
          {activeTab === 'sessions' ? (
            <div>
              <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Sessions</h1>
                  <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>Création, supervision et modification des sessions depuis la console admin.</p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setEditingSession(null);
                    setNewSessionMessage('');
                    setShowNewSessionForm((current) => !current);
                  }}
                >
                  {showNewSessionForm ? 'Fermer le formulaire' : 'Creer une session'}
                </button>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                {showNewSessionForm ? (
                  <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>Creer une session</h2>
                    <form className="auth-form" onSubmit={submitNewSession}>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted, #6b7280)' }}>Etape 1</p>
                      <label>Nom<input value={newSession.name} onChange={(e) => setNewSession((p) => ({ ...p, name: e.target.value }))} required /></label>
                      <label>Statut
                        <select value={newSession.status} onChange={(e) => setNewSession((p) => ({ ...p, status: e.target.value }))}>
                          <option value="preparee">En preparation</option>
                          <option value="en_cours">En cours</option>
                          <option value="terminee">Terminee</option>
                        </select>
                      </label>
                      <label>Format<input value={newSession.format} onChange={(e) => setNewSession((p) => ({ ...p, format: e.target.value }))} placeholder="Ex: atelier" /></label>
                      <label>Modalite
                        <select value={newSession.modality} onChange={(e) => setNewSession((p) => ({ ...p, modality: e.target.value }))}>
                          <option value="">Non definie</option>
                          <option value="remote">A distance</option>
                          <option value="hybrid">Hybride</option>
                          <option value="in-person">Presentiel</option>
                        </select>
                      </label>
                      <label>Date<input type="date" value={newSession.session_date} onChange={(e) => setNewSession((p) => ({ ...p, session_date: e.target.value }))} /></label>
                      <label>Duree (minutes)<input type="number" min={1} value={newSession.duration_minutes} onChange={(e) => setNewSession((p) => ({ ...p, duration_minutes: e.target.value }))} /></label>

                      <div style={{ border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '12px' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted, #6b7280)' }}>Etape 2 (optionnelle)</p>
                        <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--color-muted, #6b7280)' }}>
                          Assignez des participants maintenant pour qu'ils voient directement la session.
                        </p>
                        <input
                          type="search"
                          className="inline-input"
                          placeholder="Rechercher un participant..."
                          value={newSessionMemberQuery}
                          onChange={(e) => setNewSessionMemberQuery(e.target.value)}
                          style={{ marginBottom: '8px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setNewSessionMemberIds(filteredAssignableMembers.map((m) => String(m.id)))}
                            disabled={filteredAssignableMembers.length === 0}
                          >
                            Tout selectionner
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setNewSessionMemberIds([])}
                            disabled={newSessionMemberIds.length === 0}
                          >
                            Tout deselectionner
                          </button>
                        </div>
                        <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '8px', padding: '8px' }}>
                          {filteredAssignableMembers.length === 0 ? (
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-muted, #6b7280)' }}>Aucun participant disponible.</p>
                          ) : (
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '6px' }}>
                              {filteredAssignableMembers.map((member) => {
                                const selected = newSessionMemberIds.includes(String(member.id));
                                return (
                                  <li key={String(member.id)}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                      <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={() => toggleNewSessionMember(member.id)}
                                      />
                                      <span style={{ fontSize: '13px' }}>
                                        {getParticipantDisplayName(member)}
                                        {member.email ? <span style={{ color: 'var(--color-muted, #6b7280)' }}> · {member.email}</span> : null}
                                      </span>
                                    </label>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                        <p className="session-meta" style={{ marginTop: '8px' }}>
                          {newSessionMemberIds.length} participant{newSessionMemberIds.length > 1 ? 's' : ''} assigne{newSessionMemberIds.length > 1 ? 's' : ''}
                        </p>
                      </div>

                      <button type="submit" className="btn-primary" disabled={busySaveKey === 'create:session'}>
                        {busySaveKey === 'create:session' ? 'Création...' : 'Creer la session'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setShowNewSessionForm(false);
                          setNewSessionMessage('');
                        }}
                      >
                        Annuler
                      </button>
                    </form>
                    {newSessionMessage ? <p className="session-meta" style={{ marginTop: '8px' }}>{newSessionMessage}</p> : null}
                  </div>
                ) : null}

                {editingSession ? (
                  <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-primary, #4f46e5)', borderRadius: '10px', padding: '20px 24px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>Modifier une session</h2>
                    <form className="auth-form" onSubmit={submitEditSession}>
                        <label>Nom<input value={editingSession.name} onChange={(e) => setEditingSession((p) => ({ ...p, name: e.target.value }))} required /></label>
                        <label>Statut
                          <select value={editingSession.status} onChange={(e) => setEditingSession((p) => ({ ...p, status: e.target.value }))}>
                            <option value="preparee">En preparation</option>
                            <option value="en_cours">En cours</option>
                            <option value="terminee">Terminee</option>
                          </select>
                        </label>
                        <label>Format<input value={editingSession.format} onChange={(e) => setEditingSession((p) => ({ ...p, format: e.target.value }))} /></label>
                        <label>Modalite
                          <select value={editingSession.modality} onChange={(e) => setEditingSession((p) => ({ ...p, modality: e.target.value }))}>
                            <option value="">Non definie</option>
                            <option value="remote">A distance</option>
                            <option value="hybrid">Hybride</option>
                            <option value="in-person">Presentiel</option>
                          </select>
                        </label>
                        <label>Date<input type="date" value={editingSession.session_date} onChange={(e) => setEditingSession((p) => ({ ...p, session_date: e.target.value }))} /></label>
                        <label>Duree (minutes)<input type="number" min={1} value={editingSession.duration_minutes} onChange={(e) => setEditingSession((p) => ({ ...p, duration_minutes: e.target.value }))} /></label>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button type="submit" className="btn-primary" disabled={busySaveKey === `save:session:${editingSession.id}`}>{busySaveKey === `save:session:${editingSession.id}` ? 'Enregistrement...' : 'Enregistrer'}</button>
                          <button type="button" className="btn-secondary" onClick={() => setEditingSession(null)}>Annuler</button>
                        </div>
                    </form>
                  </div>
                ) : null}

                <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                      Liste {sessions.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>({filteredSessions.length}/{sessions.length})</span> : null}
                    </h2>
                    <input
                      type="search"
                      className="inline-input"
                      placeholder="Rechercher..."
                      value={sessionQuery}
                      onChange={(e) => setSessionQuery(e.target.value)}
                      style={{ width: 'min(360px, 100%)' }}
                    />
                  </div>
                  <ul className="session-list" style={{ margin: 0 }}>
                    {filteredSessions.length === 0 ? <li className="list-empty">Aucune session ne correspond.</li> : null}
                    {filteredSessions.map((s) => (
                      <li key={String(s.id)} className="session-item" style={{ alignItems: 'center' }}>
                        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                          <p className="session-title">{s.name || `Session #${s.id}`}</p>
                          <p className="session-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className={`status-pill status-${s.status || 'preparee'}`}>
                              {SESSION_STATUS_LABELS[s.status] || SESSION_STATUS_LABELS.preparee}
                            </span>
                            {s.modality ? <span>Modalite: {s.modality}</span> : null}
                          </p>
                        </div>
                        <div className="session-item-actions" style={{ flexShrink: 0 }}>
                          <button type="button" className="btn-secondary" onClick={() => beginEditSession(s)}>Modifier</button>
                          <button type="button" className="btn-secondary" onClick={() => handleDeleteSession(s)} disabled={busyDeleteKey === `session:${s.id}`}>
                            {busyDeleteKey === `session:${s.id}` ? '...' : 'Supprimer'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── CHALLENGES ── */}
          {activeTab === 'challenges' ? (
            <div>
              <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Challenges</h1>
                  <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>Gestion du catalogue de challenges disponibles.</p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setEditingChallenge(null);
                    setChallengeImageUploadError('');
                    setNewChallengeMessage('');
                    setShowNewChallengeForm((current) => !current);
                  }}
                >
                  {showNewChallengeForm ? 'Fermer le formulaire' : 'Ajouter un challenge'}
                </button>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                {showNewChallengeForm ? (
                  <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>Ajouter un challenge</h2>
                    <form className="auth-form" onSubmit={submitNewChallenge}>
                      <label>Nom<input value={newChallenge.name} onChange={(e) => setNewChallenge((p) => ({ ...p, name: e.target.value }))} required /></label>
                      <label>Type
                        <select value={newChallenge.type} onChange={(e) => setNewChallenge((p) => ({ ...p, type: e.target.value }))}>
                          <option value="individuel">Individuel</option>
                          <option value="equipe">Equipe</option>
                        </select>
                      </label>
                      <label>Statut
                        <select value={newChallenge.status} onChange={(e) => setNewChallenge((p) => ({ ...p, status: e.target.value }))}>
                          <option value="actif">Actif</option>
                          <option value="brouillon">Brouillon</option>
                          <option value="archive">Archive</option>
                        </select>
                      </label>
                      <label>Source
                        <select value={newChallenge.source} onChange={(e) => setNewChallenge((p) => ({ ...p, source: e.target.value }))}>
                          <option value="local">Local</option>
                          <option value="external">Externe</option>
                        </select>
                      </label>
                      <label>Categorie
                        <select value={newChallenge.category} onChange={(e) => setNewChallenge((p) => ({ ...p, category: e.target.value }))}>
                          <option value="">--- Selectioner ---</option>
                          {CHALLENGE_CATEGORY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label>Objectifs
                        <div style={{ display: 'grid', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '13px', color: 'var(--color-muted, #6b7280)' }}>
                            <span>Choisissez jusqu'à {MAX_CHALLENGE_OBJECTIVES} objectifs.</span>
                            <strong>{normalizeObjectivesInput(newChallenge.objectives).length}/{MAX_CHALLENGE_OBJECTIVES}</strong>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {CHALLENGE_OBJECTIVE_OPTIONS.map((option) => {
                              const selectedObjectives = normalizeObjectivesInput(newChallenge.objectives);
                              const isSelected = selectedObjectives.includes(option.value);
                              const limitReached = selectedObjectives.length >= MAX_CHALLENGE_OBJECTIVES;
                              const disabled = !isSelected && limitReached;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => setNewChallenge((p) => ({ ...p, objectives: toggleObjectiveSelection(p.objectives, option.value) }))}
                                  disabled={disabled}
                                  style={{
                                    border: isSelected ? '1px solid #0f766e' : '1px solid #cbd5e1',
                                    background: isSelected ? 'rgba(15, 118, 110, 0.12)' : '#fff',
                                    color: isSelected ? '#115e59' : '#334155',
                                    borderRadius: '999px',
                                    padding: '6px 12px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: disabled ? 'not-allowed' : 'pointer',
                                    opacity: disabled ? 0.5 : 1,
                                  }}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                          {normalizeObjectivesInput(newChallenge.objectives).length >= MAX_CHALLENGE_OBJECTIVES ? (
                            <p className="session-meta" style={{ margin: 0 }}>Limite atteinte: retirez un objectif pour en sélectionner un autre.</p>
                          ) : null}
                        </div>
                      </label>
                      <label>Duree<input value={newChallenge.duration} onChange={(e) => setNewChallenge((p) => ({ ...p, duration: e.target.value }))} /></label>
                      <label>Engine key<input value={newChallenge.engine_key} onChange={(e) => setNewChallenge((p) => ({ ...p, engine_key: e.target.value }))} /></label>
                      <label>Description<textarea rows={4} value={newChallenge.description} onChange={(e) => setNewChallenge((p) => ({ ...p, description: e.target.value }))} /></label>
                      <div style={{ border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '8px', padding: '12px', display: 'grid', gap: '10px' }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>Règles du challenge</p>
                        <p className="session-meta" style={{ margin: 0 }}>Ce contenu alimente le brief affiché aux facilitateurs et aux participants dans le challenge.</p>
                        <label>Brief de mission
                          <textarea rows={3} value={newChallenge.rules_objective} onChange={(e) => setNewChallenge((p) => ({ ...p, rules_objective: e.target.value }))} placeholder="Décrivez l'objectif principal du challenge" />
                        </label>
                        <label>Instructions facilitateur (1 ligne = 1 règle)
                          <textarea rows={4} value={newChallenge.rules_facilitator} onChange={(e) => setNewChallenge((p) => ({ ...p, rules_facilitator: e.target.value }))} placeholder="Cadrez le challenge&#10;Lancez le timer" />
                        </label>
                        <label>Instructions participants (1 ligne = 1 règle)
                          <textarea rows={4} value={newChallenge.rules_participant} onChange={(e) => setNewChallenge((p) => ({ ...p, rules_participant: e.target.value }))} placeholder="Ecoutez le brief&#10;Collaborez en équipe" />
                        </label>
                        <label>Note de clôture
                          <textarea rows={2} value={newChallenge.rules_footnote} onChange={(e) => setNewChallenge((p) => ({ ...p, rules_footnote: e.target.value }))} placeholder="Message de synthèse optionnel" />
                        </label>
                        <div style={{ borderTop: '1px dashed var(--color-border, #e5e7eb)', paddingTop: '10px', display: 'grid', gap: '10px' }}>
                          <p style={{ margin: 0, fontWeight: 600 }}>Joueurs (Min / Recommandé / Max)</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                            <label>Min
                              <input type="number" min="1" value={newChallenge.player_min} onChange={(e) => setNewChallenge((p) => ({ ...p, player_min: e.target.value }))} />
                            </label>
                            <label>Recommandé
                              <input type="number" min="1" value={newChallenge.player_recommended} onChange={(e) => setNewChallenge((p) => ({ ...p, player_recommended: e.target.value }))} />
                            </label>
                            <label>Max
                              <input type="number" min="1" value={newChallenge.player_max} onChange={(e) => setNewChallenge((p) => ({ ...p, player_max: e.target.value }))} />
                            </label>
                          </div>
                        </div>
                      </div>
                      <button type="submit" className="btn-primary" disabled={busySaveKey === 'create:challenge'}>
                        {busySaveKey === 'create:challenge' ? 'Création...' : 'Creer le challenge'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setShowNewChallengeForm(false);
                          setNewChallengeMessage('');
                        }}
                      >
                        Annuler
                      </button>
                    </form>
                    {newChallengeMessage ? <p className="session-meta" style={{ marginTop: '8px' }}>{newChallengeMessage}</p> : null}
                  </div>
                ) : null}

                {editingChallenge ? (
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}
                    onClick={(e) => { if (e.target === e.currentTarget) { setEditingChallenge(null); setChallengeImageUploadError(''); } }}
                  >
                    <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-primary, #4f46e5)', borderRadius: '12px', padding: '24px 28px', width: '100%', maxWidth: '640px', position: 'relative', marginBottom: '40px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Modifier un challenge</h2>
                        <button type="button" onClick={() => { setEditingChallenge(null); setChallengeImageUploadError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--color-muted, #6b7280)', padding: '2px 8px', lineHeight: 1 }} aria-label="Fermer la fenêtre">✕</button>
                      </div>
                    <form className="auth-form" onSubmit={submitEditChallenge}>
                        <label>Nom<input value={editingChallenge.name} onChange={(e) => setEditingChallenge((p) => ({ ...p, name: e.target.value }))} required /></label>
                        <label>Type
                          <select value={editingChallenge.type} onChange={(e) => setEditingChallenge((p) => ({ ...p, type: e.target.value }))}>
                            <option value="individuel">Individuel</option>
                            <option value="equipe">Equipe</option>
                          </select>
                        </label>
                        <label>Statut
                          <select value={editingChallenge.status} onChange={(e) => setEditingChallenge((p) => ({ ...p, status: e.target.value }))}>
                            <option value="actif">Actif</option>
                            <option value="brouillon">Brouillon</option>
                            <option value="archive">Archive</option>
                          </select>
                        </label>
                        <label>Categorie
                          <select value={editingChallenge.category} onChange={(e) => setEditingChallenge((p) => ({ ...p, category: e.target.value }))}>
                            <option value="">--- Selectioner ---</option>
                            {CHALLENGE_CATEGORY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label>Objectifs
                          <div style={{ display: 'grid', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '13px', color: 'var(--color-muted, #6b7280)' }}>
                              <span>Choisissez jusqu'à {MAX_CHALLENGE_OBJECTIVES} objectifs.</span>
                              <strong>{normalizeObjectivesInput(editingChallenge.objectives).length}/{MAX_CHALLENGE_OBJECTIVES}</strong>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {CHALLENGE_OBJECTIVE_OPTIONS.map((option) => {
                                const selectedObjectives = normalizeObjectivesInput(editingChallenge.objectives);
                                const isSelected = selectedObjectives.includes(option.value);
                                const limitReached = selectedObjectives.length >= MAX_CHALLENGE_OBJECTIVES;
                                const disabled = !isSelected && limitReached;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setEditingChallenge((p) => ({ ...p, objectives: toggleObjectiveSelection(p.objectives, option.value) }))}
                                    disabled={disabled}
                                    style={{
                                      border: isSelected ? '1px solid #0f766e' : '1px solid #cbd5e1',
                                      background: isSelected ? 'rgba(15, 118, 110, 0.12)' : '#fff',
                                      color: isSelected ? '#115e59' : '#334155',
                                      borderRadius: '999px',
                                      padding: '6px 12px',
                                      fontSize: '13px',
                                      fontWeight: 600,
                                      cursor: disabled ? 'not-allowed' : 'pointer',
                                      opacity: disabled ? 0.5 : 1,
                                    }}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                            {normalizeObjectivesInput(editingChallenge.objectives).length >= MAX_CHALLENGE_OBJECTIVES ? (
                              <p className="session-meta" style={{ margin: 0 }}>Limite atteinte: retirez un objectif pour en sélectionner un autre.</p>
                            ) : null}
                          </div>
                        </label>
                        <label>Duree<input value={editingChallenge.duration} onChange={(e) => setEditingChallenge((p) => ({ ...p, duration: e.target.value }))} /></label>
                        <label>Engine key<input value={editingChallenge.engine_key} onChange={(e) => setEditingChallenge((p) => ({ ...p, engine_key: e.target.value }))} /></label>
                        <label>Description<textarea rows={4} value={editingChallenge.description} onChange={(e) => setEditingChallenge((p) => ({ ...p, description: e.target.value }))} /></label>
                        <div style={{ border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '8px', padding: '12px', display: 'grid', gap: '10px' }}>
                          <p style={{ margin: 0, fontWeight: 600 }}>Règles du challenge</p>
                          <p className="session-meta" style={{ margin: 0 }}>Ce contenu alimente le brief affiché aux facilitateurs et aux participants dans le challenge.</p>
                          <label>Brief de mission
                            <textarea rows={3} value={editingChallenge.rules_objective || ''} onChange={(e) => setEditingChallenge((p) => ({ ...p, rules_objective: e.target.value }))} placeholder="Décrivez l'objectif principal du challenge" />
                          </label>
                          <label>Instructions facilitateur (1 ligne = 1 règle)
                            <textarea rows={4} value={editingChallenge.rules_facilitator || ''} onChange={(e) => setEditingChallenge((p) => ({ ...p, rules_facilitator: e.target.value }))} placeholder="Cadrez le challenge&#10;Lancez le timer" />
                          </label>
                          <label>Instructions participants (1 ligne = 1 règle)
                            <textarea rows={4} value={editingChallenge.rules_participant || ''} onChange={(e) => setEditingChallenge((p) => ({ ...p, rules_participant: e.target.value }))} placeholder="Ecoutez le brief&#10;Collaborez en équipe" />
                          </label>
                          <label>Note de clôture
                            <textarea rows={2} value={editingChallenge.rules_footnote || ''} onChange={(e) => setEditingChallenge((p) => ({ ...p, rules_footnote: e.target.value }))} placeholder="Message de synthèse optionnel" />
                          </label>
                          <div style={{ borderTop: '1px dashed var(--color-border, #e5e7eb)', paddingTop: '10px', display: 'grid', gap: '10px' }}>
                            <p style={{ margin: 0, fontWeight: 600 }}>Joueurs (Min / Recommandé / Max)</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                              <label>Min
                                <input
                                  type="number"
                                  min="1"
                                  value={editingChallenge.player_min || ''}
                                  onChange={(e) => setEditingChallenge((p) => ({ ...p, player_min: e.target.value }))}
                                />
                              </label>
                              <label>Recommandé
                                <input
                                  type="number"
                                  min="1"
                                  value={editingChallenge.player_recommended || ''}
                                  onChange={(e) => setEditingChallenge((p) => ({ ...p, player_recommended: e.target.value }))}
                                />
                              </label>
                              <label>Max
                                <input
                                  type="number"
                                  min="1"
                                  value={editingChallenge.player_max || ''}
                                  onChange={(e) => setEditingChallenge((p) => ({ ...p, player_max: e.target.value }))}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                        {(editingChallenge.engine_key || '').toLowerCase() === 'escape_room_v1' ? (
                          <div style={{ border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '8px', padding: '10px' }}>
                            <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Image énigme 5 (Salle secrète)</p>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg"
                              onChange={handleUploadEscapeRoomImage}
                              disabled={challengeImageUploadBusy}
                            />
                            {challengeImageUploadBusy ? (
                              <p className="session-meta" style={{ marginTop: '8px' }}>Upload en cours...</p>
                            ) : null}
                            {challengeImageUploadError ? (
                              <p className="session-meta" style={{ marginTop: '8px', color: '#dc2626' }}>{challengeImageUploadError}</p>
                            ) : null}
                            {getEscapeRoomE5ImageSrc(editingChallenge.engine_config) ? (
                              <Image
                                src={getEscapeRoomE5ImageSrc(editingChallenge.engine_config)}
                                alt="Aperçu énigme 5"
                                unoptimized
                                width={640}
                                height={360}
                                loading="lazy"
                                style={{ marginTop: '8px', maxWidth: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                              />
                            ) : (
                              <p className="session-meta" style={{ marginTop: '8px' }}>Aucune image configurée pour e5.</p>
                            )}
                          </div>
                        ) : null}
                        {(editingChallenge.engine_key || '').toLowerCase() === 'copuzzle_live_v1' ? (
                          <div style={{ border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '8px', padding: '12px', display: 'grid', gap: '10px' }}>
                            <p style={{ margin: 0, fontWeight: 600 }}>Configuration Copuzzle (3 images de référence administrateur)</p>
                            <p className="session-meta" style={{ margin: 0 }}>
                              Définissez jusqu'à 3 images de référence avec leur titre. Elles seront proposées au facilitateur dans le Session Builder.
                            </p>

                            {getCopuzzleDefaultImages(editingChallenge.engine_config).map((imageItem, imageIndex) => {
                              const slotIndex = imageIndex + 1;
                              return (
                                <div key={imageItem.id || `copuzzle-default-${slotIndex}`} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px', display: 'grid', gap: '8px' }}>
                                  <p style={{ margin: 0, fontWeight: 600 }}>Image de référence {slotIndex}</p>

                                  <label>Titre
                                    <input
                                      value={String(imageItem.title || '')}
                                      onChange={(e) => {
                                        const nextTitle = String(e.target.value || '').trimStart();
                                        setEditingChallenge((prev) => {
                                          if (!prev) return prev;
                                          const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                          const defaultImages = getCopuzzleDefaultImages(currentConfig).map((item) => ({ ...item }));
                                          defaultImages[imageIndex] = {
                                            ...(defaultImages[imageIndex] || {}),
                                            id: defaultImages[imageIndex]?.id || `default_${slotIndex}`,
                                            src: String(defaultImages[imageIndex]?.src || imageItem.src || '').trim(),
                                            title: nextTitle || `Image ${slotIndex}`,
                                          };

                                          return {
                                            ...prev,
                                            engine_config: {
                                              ...currentConfig,
                                              default_images: defaultImages,
                                            },
                                          };
                                        });
                                      }}
                                      placeholder={`Image ${slotIndex}`}
                                    />
                                  </label>

                                  <label>URL image
                                    <input
                                      value={String(imageItem.src || '')}
                                      onChange={(e) => {
                                        const nextSrc = String(e.target.value || '').trim();
                                        setEditingChallenge((prev) => {
                                          if (!prev) return prev;
                                          const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                          const defaultImages = getCopuzzleDefaultImages(currentConfig).map((item) => ({ ...item }));
                                          defaultImages[imageIndex] = {
                                            ...(defaultImages[imageIndex] || {}),
                                            id: defaultImages[imageIndex]?.id || `default_${slotIndex}`,
                                            title: String(defaultImages[imageIndex]?.title || imageItem.title || `Image ${slotIndex}`),
                                            src: nextSrc,
                                          };
                                          const selectedDefaultImageId = String(currentConfig.default_image_id || defaultImages[0]?.id || '').trim();
                                          const selectedDefault = defaultImages.find((item) => item.id === selectedDefaultImageId) || defaultImages[0] || null;
                                          return {
                                            ...prev,
                                            engine_config: {
                                              ...currentConfig,
                                              default_images: defaultImages,
                                              image_url: String(selectedDefault?.src || nextSrc),
                                              image: {
                                                ...(currentConfig.image || {}),
                                                src: String(selectedDefault?.src || nextSrc),
                                              },
                                            },
                                          };
                                        });
                                      }}
                                      placeholder="https://... ou /copuzzle/default-blue.svg"
                                    />
                                  </label>

                                  <label>Uploader (JPG/PNG)
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/jpg"
                                      onChange={(event) => handleUploadCopuzzleDefaultImage(event, imageIndex)}
                                      disabled={challengeImageUploadBusy}
                                    />
                                  </label>

                                  {String(imageItem.src || '').trim() ? (
                                    <Image
                                      src={String(imageItem.src || '').trim()}
                                      alt={`Aperçu image ${slotIndex}`}
                                      unoptimized
                                      width={640}
                                      height={360}
                                      loading="lazy"
                                      style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                                    />
                                  ) : null}

                                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                      type="radio"
                                      name="copuzzle-default-image"
                                      checked={String(ensureCopuzzleConfig(editingChallenge.engine_config).default_image_id || '') === String(imageItem.id || '')}
                                      onChange={() => {
                                        setEditingChallenge((prev) => {
                                          if (!prev) return prev;
                                          const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                          const defaultImages = getCopuzzleDefaultImages(currentConfig);
                                          const selected = defaultImages.find((item) => item.id === imageItem.id) || defaultImages[0] || null;
                                          return {
                                            ...prev,
                                            engine_config: {
                                              ...currentConfig,
                                              default_image_id: String(imageItem.id || selected?.id || ''),
                                              image_url: String(selected?.src || currentConfig.image_url || ''),
                                              image: {
                                                ...(currentConfig.image || {}),
                                                src: String(selected?.src || currentConfig.image?.src || currentConfig.image_url || ''),
                                              },
                                            },
                                          };
                                        });
                                      }}
                                    />
                                    Image sélectionnée par défaut
                                  </label>
                                </div>
                              );
                            })}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <label>Matrice (rows)
                                <input
                                  type="number"
                                  min="2"
                                  max="16"
                                  value={ensureCopuzzleConfig(editingChallenge.engine_config).grid.rows}
                                  onChange={(e) => {
                                    const value = Number(e.target.value || 4);
                                    setEditingChallenge((prev) => {
                                      if (!prev) return prev;
                                      const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                      return {
                                        ...prev,
                                        engine_config: {
                                          ...currentConfig,
                                          grid: {
                                            ...(currentConfig.grid || {}),
                                            rows: value,
                                          },
                                        },
                                      };
                                    });
                                  }}
                                />
                              </label>
                              <label>Matrice (cols)
                                <input
                                  type="number"
                                  min="2"
                                  max="16"
                                  value={ensureCopuzzleConfig(editingChallenge.engine_config).grid.cols}
                                  onChange={(e) => {
                                    const value = Number(e.target.value || 4);
                                    setEditingChallenge((prev) => {
                                      if (!prev) return prev;
                                      const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                      return {
                                        ...prev,
                                        engine_config: {
                                          ...currentConfig,
                                          grid: {
                                            ...(currentConfig.grid || {}),
                                            cols: value,
                                          },
                                        },
                                      };
                                    });
                                  }}
                                />
                              </label>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <label>Timer (secondes)
                                <input
                                  type="number"
                                  min="30"
                                  max="7200"
                                  value={ensureCopuzzleConfig(editingChallenge.engine_config).timer.duration_seconds}
                                  onChange={(e) => {
                                    const value = Number(e.target.value || 1200);
                                    setEditingChallenge((prev) => {
                                      if (!prev) return prev;
                                      const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                      return {
                                        ...prev,
                                        engine_config: {
                                          ...currentConfig,
                                          timer: {
                                            ...(currentConfig.timer || {}),
                                            duration_seconds: value,
                                          },
                                        },
                                      };
                                    });
                                  }}
                                />
                              </label>
                              <label>Seuil alerte (secondes)
                                <input
                                  type="number"
                                  min="10"
                                  max="600"
                                  value={ensureCopuzzleConfig(editingChallenge.engine_config).timer.warning_threshold_seconds}
                                  onChange={(e) => {
                                    const value = Number(e.target.value || 60);
                                    setEditingChallenge((prev) => {
                                      if (!prev) return prev;
                                      const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                      return {
                                        ...prev,
                                        engine_config: {
                                          ...currentConfig,
                                          timer: {
                                            ...(currentConfig.timer || {}),
                                            warning_threshold_seconds: value,
                                          },
                                        },
                                      };
                                    });
                                  }}
                                />
                              </label>
                            </div>

                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="checkbox"
                                checked={ensureCopuzzleConfig(editingChallenge.engine_config).timer.enabled}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setEditingChallenge((prev) => {
                                    if (!prev) return prev;
                                    const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                    return {
                                      ...prev,
                                      engine_config: {
                                        ...currentConfig,
                                        timer: {
                                          ...(currentConfig.timer || {}),
                                          enabled: checked,
                                        },
                                      },
                                    };
                                  });
                                }}
                              />
                              Timer actif
                            </label>

                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="checkbox"
                                checked={ensureCopuzzleConfig(editingChallenge.engine_config).chat.enabled}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setEditingChallenge((prev) => {
                                    if (!prev) return prev;
                                    const currentConfig = ensureCopuzzleConfig(prev.engine_config);
                                    return {
                                      ...prev,
                                      engine_config: {
                                        ...currentConfig,
                                        chat: {
                                          ...(currentConfig.chat || {}),
                                          enabled: checked,
                                        },
                                      },
                                    };
                                  });
                                }}
                              />
                              Chat actif
                            </label>

                            {challengeImageUploadBusy ? (
                              <p className="session-meta" style={{ marginTop: '8px' }}>Upload en cours...</p>
                            ) : null}
                            {challengeImageUploadError ? (
                              <p className="session-meta" style={{ marginTop: '8px', color: '#dc2626' }}>{challengeImageUploadError}</p>
                            ) : null}

                            <Image
                              src={getCopuzzleImageSrc(editingChallenge.engine_config)}
                              alt="Apercu Copuzzle"
                              unoptimized
                              width={840}
                              height={840}
                              loading="lazy"
                              style={{ marginTop: '6px', maxWidth: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              onLoad={(e) => { e.currentTarget.style.display = 'block'; }}
                            />
                          </div>
                        ) : null}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button type="submit" className="btn-primary" disabled={busySaveKey === `save:challenge:${editingChallenge.id}`}>{busySaveKey === `save:challenge:${editingChallenge.id}` ? 'Enregistrement...' : 'Enregistrer'}</button>
                          <button type="button" className="btn-secondary" onClick={() => { setEditingChallenge(null); setChallengeImageUploadError(''); }}>Annuler</button>
                        </div>
                    </form>
                    </div>
                  </div>
                ) : null}

                <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                      Liste {challenges.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>({filteredChallenges.length}/{challenges.length})</span> : null}
                    </h2>
                    <input
                      type="search"
                      className="inline-input"
                      placeholder="Rechercher..."
                      value={challengeQuery}
                      onChange={(e) => setChallengeQuery(e.target.value)}
                      style={{ width: 'min(360px, 100%)' }}
                    />
                  </div>
                  <ul className="session-list" style={{ margin: 0 }}>
                    {filteredChallenges.length === 0 ? <li className="list-empty">Aucun challenge ne correspond.</li> : null}
                    {filteredChallenges.map((c) => (
                      <li key={String(c.id)} className="session-item" style={{ alignItems: 'center' }}>
                        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                          <p className="session-title">{c.name || c.title || `Challenge #${c.id}`}</p>
                          <p className="session-meta">{c.type || 'individuel'} · {c.status || 'actif'} {c.engine_key ? `· ${c.engine_key}` : ''}</p>
                          {(() => {
                            const playerRange = resolveChallengePlayerRange(c);
                            if (!playerRange.hasRange) return null;
                            return (
                              <p className="session-meta" style={{ marginTop: '4px' }}>
                                Ideal: ~{playerRange.recommended || '-'} joueurs · Min {playerRange.min || '-'} · Max {playerRange.max || '-'}
                              </p>
                            );
                          })()}
                        </div>
                        <div className="session-item-actions icon-only-actions" style={{ flexShrink: 0 }}>
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => beginEditChallenge(c)}
                            title="Modifier"
                            aria-label="Modifier challenge"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn icon-action-danger"
                            onClick={() => handleDeleteChallenge(c)}
                            disabled={busyDeleteKey === `challenge:${c.id}`}
                            title="Supprimer"
                            aria-label="Supprimer challenge"
                          >
                            {busyDeleteKey === `challenge:${c.id}` ? '…' : '🗑'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── TARIFICATION ── */}
          {activeTab === 'pricing' ? (
            <div>
              <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Tarification</h1>
                  <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>
                    Creez et administrez vos offres commerciales (nom, fonctionnalites, prix et options avancees).
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setEditingPricingPlan(null);
                    setNewPricingMessage('');
                    setShowNewPricingPlanForm((current) => !current);
                  }}
                >
                  {showNewPricingPlanForm ? 'Fermer le formulaire' : 'Creer une formule'}
                </button>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                {showNewPricingPlanForm ? (
                  <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>Creer une formule</h2>
                    <form className="auth-form" onSubmit={submitNewPricingPlan}>
                      <label>Nom de l offre<input value={newPricingPlan.name} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, name: e.target.value }))} required /></label>
                      <label>Description courte<textarea rows={3} value={newPricingPlan.description} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, description: e.target.value }))} /></label>
                      <label>Fonctionnalites incluses (une ligne = un point)
                        <textarea rows={5} value={newPricingPlan.features} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, features: e.target.value }))} placeholder={'Ex: Dashboard manager\nSession live\nSupport email'} />
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label>Prix<input type="number" min="0" step="0.01" value={newPricingPlan.price} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, price: e.target.value }))} required /></label>
                        <label>Devise<input value={newPricingPlan.currency} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} maxLength={3} /></label>
                      </div>
                      <label>Cycle de facturation
                        <select value={newPricingPlan.billing_cycle} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, billing_cycle: e.target.value }))}>
                          <option value="monthly">Mensuel</option>
                          <option value="yearly">Annuel</option>
                          <option value="one_time">Paiement unique</option>
                          <option value="custom">Personnalise</option>
                        </select>
                      </label>
                      <label>Label bouton CTA<input value={newPricingPlan.cta_label} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, cta_label: e.target.value }))} /></label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label>Max utilisateurs<input type="number" min="0" value={newPricingPlan.max_users} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, max_users: e.target.value }))} /></label>
                        <label>Max sessions/mois<input type="number" min="0" value={newPricingPlan.max_sessions_per_month} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, max_sessions_per_month: e.target.value }))} /></label>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        <label>Niveau support<input value={newPricingPlan.support_level} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, support_level: e.target.value }))} placeholder="Email, Prioritaire..." /></label>
                        <label>Jours essai<input type="number" min="0" value={newPricingPlan.trial_days} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, trial_days: e.target.value }))} /></label>
                        <label>Ordre affichage<input type="number" min="0" value={newPricingPlan.display_order} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, display_order: e.target.value }))} /></label>
                      </div>
                      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <input type="checkbox" checked={newPricingPlan.is_active} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, is_active: e.target.checked }))} />
                          Offre active
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <input type="checkbox" checked={newPricingPlan.highlighted} onChange={(e) => setNewPricingPlan((prev) => ({ ...prev, highlighted: e.target.checked }))} />
                          Mise en avant
                        </label>
                      </div>
                      <button type="submit" className="btn-primary" disabled={busySaveKey === 'create:pricing-plan'}>
                        {busySaveKey === 'create:pricing-plan' ? 'Création...' : 'Creer la formule'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setShowNewPricingPlanForm(false);
                          setNewPricingMessage('');
                        }}
                      >
                        Annuler
                      </button>
                    </form>
                    {newPricingMessage ? <p className="session-meta" style={{ marginTop: '8px' }}>{newPricingMessage}</p> : null}
                  </div>
                ) : null}

                {editingPricingPlan ? (
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}
                    onClick={(e) => { if (e.target === e.currentTarget) setEditingPricingPlan(null); }}
                  >
                    <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-primary, #4f46e5)', borderRadius: '12px', width: '100%', maxWidth: '760px', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', padding: '22px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Modifier une formule</h2>
                        <button
                          type="button"
                          onClick={() => setEditingPricingPlan(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--color-muted, #6b7280)', padding: '2px 8px', lineHeight: 1 }}
                          aria-label="Fermer la fenêtre"
                        >
                          ✕
                        </button>
                      </div>
                    <form className="auth-form" onSubmit={submitEditPricingPlan}>
                        <label>Nom de l offre<input value={editingPricingPlan.name} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, name: e.target.value }))} required /></label>
                        <label>Description courte<textarea rows={3} value={editingPricingPlan.description} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, description: e.target.value }))} /></label>
                        <label>Fonctionnalites incluses (une ligne = un point)
                          <textarea rows={5} value={editingPricingPlan.features} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, features: e.target.value }))} />
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <label>Prix<input type="number" min="0" step="0.01" value={editingPricingPlan.price} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, price: e.target.value }))} required /></label>
                          <label>Devise<input value={editingPricingPlan.currency} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} maxLength={3} /></label>
                        </div>
                        <label>Cycle de facturation
                          <select value={editingPricingPlan.billing_cycle} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, billing_cycle: e.target.value }))}>
                            <option value="monthly">Mensuel</option>
                            <option value="yearly">Annuel</option>
                            <option value="one_time">Paiement unique</option>
                            <option value="custom">Personnalise</option>
                          </select>
                        </label>
                        <label>Label bouton CTA<input value={editingPricingPlan.cta_label} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, cta_label: e.target.value }))} /></label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <label>Max utilisateurs<input type="number" min="0" value={editingPricingPlan.max_users} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, max_users: e.target.value }))} /></label>
                          <label>Max sessions/mois<input type="number" min="0" value={editingPricingPlan.max_sessions_per_month} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, max_sessions_per_month: e.target.value }))} /></label>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                          <label>Niveau support<input value={editingPricingPlan.support_level} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, support_level: e.target.value }))} /></label>
                          <label>Jours essai<input type="number" min="0" value={editingPricingPlan.trial_days} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, trial_days: e.target.value }))} /></label>
                          <label>Ordre affichage<input type="number" min="0" value={editingPricingPlan.display_order} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, display_order: e.target.value }))} /></label>
                        </div>
                        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" checked={editingPricingPlan.is_active} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, is_active: e.target.checked }))} />
                            Offre active
                          </label>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" checked={editingPricingPlan.highlighted} onChange={(e) => setEditingPricingPlan((prev) => ({ ...prev, highlighted: e.target.checked }))} />
                            Mise en avant
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button type="submit" className="btn-primary" disabled={busySaveKey === `save:pricing-plan:${editingPricingPlan.id}`}>
                            {busySaveKey === `save:pricing-plan:${editingPricingPlan.id}` ? 'Enregistrement...' : 'Enregistrer'}
                          </button>
                          <button type="button" className="btn-secondary" onClick={() => setEditingPricingPlan(null)}>Annuler</button>
                        </div>
                    </form>
                    </div>
                  </div>
                ) : null}

                <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                      Liste {pricingPlans.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>({filteredPricingPlans.length}/{pricingPlans.length})</span> : null}
                    </h2>
                    <input
                      type="search"
                      className="inline-input"
                      placeholder="Rechercher une formule..."
                      value={pricingQuery}
                      onChange={(e) => setPricingQuery(e.target.value)}
                      style={{ width: 'min(360px, 100%)' }}
                    />
                  </div>

                  <ul className="session-list" style={{ margin: 0 }}>
                    {filteredPricingPlans.length === 0 ? <li className="list-empty">Aucune formule ne correspond.</li> : null}
                    {filteredPricingPlans.map((plan) => (
                      <li key={String(plan.id)} className="session-item" style={{ alignItems: 'center' }}>
                        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                          <p className="session-title">
                            {plan.name}
                            {plan.highlighted ? ' · Populaire' : ''}
                          </p>
                          <p className="session-meta">
                            {typeof plan.price === 'number' ? `${plan.price.toFixed(2)} ${plan.currency || 'EUR'}` : 'Prix non defini'}
                            {' · '}
                            {plan.billing_cycle || 'monthly'}
                            {' · '}
                            {plan.is_active ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                        <div className="session-item-actions icon-only-actions" style={{ flexShrink: 0 }}>
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => beginEditPricingPlan(plan)}
                            title="Modifier"
                            aria-label="Modifier formule"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn icon-action-danger"
                            onClick={() => handleDeletePricingPlan(plan)}
                            disabled={busyDeleteKey === `pricing-plan:${plan.id}`}
                            title="Supprimer"
                            aria-label="Supprimer formule"
                          >
                            {busyDeleteKey === `pricing-plan:${plan.id}` ? '…' : '🗑'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── LANDING CMS ── */}
          {activeTab === 'landing' ? (
            <div>
              <datalist id="landing-allowed-keys">
                {LANDING_ALLOWED_BLOCK_KEYS.map((key) => (
                  <option key={key} value={key} />
                ))}
              </datalist>

              <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Landing CMS</h1>
                  <p style={{ color: 'var(--color-muted, #6b7280)', margin: 0, fontSize: '14px' }}>
                    Mode structure reduite: hero, 3 preuves, parcours en 3 etapes et CTA final unique.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setEditingLandingBlock(null);
                    setNewLandingMessage('');
                    setShowNewLandingBlockForm((current) => !current);
                  }}
                >
                  {showNewLandingBlockForm ? 'Fermer le formulaire' : 'Creer un bloc'}
                </button>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                {showNewLandingBlockForm ? (
                  <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>Creer un bloc</h2>
                    <form className="auth-form" onSubmit={submitNewLandingBlock}>
                      <label>Cle bloc<input value={newLandingBlock.block_key} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, block_key: e.target.value }))} placeholder="hero_main" list="landing-allowed-keys" required /></label>
                      <label>Label admin<input value={newLandingBlock.label} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, label: e.target.value }))} /></label>
                      <label>Titre<input value={newLandingBlock.title} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, title: e.target.value }))} /></label>
                      <label>Sous-titre<input value={newLandingBlock.subtitle} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, subtitle: e.target.value }))} /></label>
                      <label>Description<textarea rows={4} value={newLandingBlock.description} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, description: e.target.value }))} /></label>
                      <label>Image URL<input value={newLandingBlock.image_url} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, image_url: e.target.value }))} placeholder="https://..." /></label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label>CTA label<input value={newLandingBlock.cta_label} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, cta_label: e.target.value }))} /></label>
                        <label>CTA lien<input value={newLandingBlock.cta_href} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, cta_href: e.target.value }))} /></label>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label>Badge<input value={newLandingBlock.badge_text} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, badge_text: e.target.value }))} /></label>
                        <label>Ordre<input type="number" min="0" value={newLandingBlock.display_order} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, display_order: e.target.value }))} /></label>
                      </div>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" checked={newLandingBlock.is_active} onChange={(e) => setNewLandingBlock((prev) => ({ ...prev, is_active: e.target.checked }))} />
                        Bloc actif
                      </label>
                      <button type="submit" className="btn-primary" disabled={busySaveKey === `create:landing:${String(newLandingBlock.block_key || '').trim().toLowerCase()}`}>
                        {busySaveKey === `create:landing:${String(newLandingBlock.block_key || '').trim().toLowerCase()}` ? 'Enregistrement...' : 'Creer le bloc'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setShowNewLandingBlockForm(false);
                          setNewLandingMessage('');
                        }}
                      >
                        Annuler
                      </button>
                    </form>
                    {newLandingMessage ? <p className="session-meta" style={{ marginTop: '8px' }}>{newLandingMessage}</p> : null}
                  </div>
                ) : null}

                {editingLandingBlock ? (
                  <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-primary, #4f46e5)', borderRadius: '10px', padding: '20px 24px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginTop: 0, marginBottom: '12px' }}>Modifier un bloc</h2>
                    <form className="auth-form" onSubmit={submitEditLandingBlock}>
                      <label>Cle bloc<input value={editingLandingBlock.block_key} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, block_key: e.target.value }))} list="landing-allowed-keys" required /></label>
                        <label>Label admin<input value={editingLandingBlock.label} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, label: e.target.value }))} /></label>
                        <label>Titre<input value={editingLandingBlock.title} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, title: e.target.value }))} /></label>
                        <label>Sous-titre<input value={editingLandingBlock.subtitle} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, subtitle: e.target.value }))} /></label>
                        <label>Description<textarea rows={4} value={editingLandingBlock.description} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, description: e.target.value }))} /></label>
                        <label>Image URL<input value={editingLandingBlock.image_url} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, image_url: e.target.value }))} /></label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <label>CTA label<input value={editingLandingBlock.cta_label} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, cta_label: e.target.value }))} /></label>
                          <label>CTA lien<input value={editingLandingBlock.cta_href} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, cta_href: e.target.value }))} /></label>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <label>Badge<input value={editingLandingBlock.badge_text} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, badge_text: e.target.value }))} /></label>
                          <label>Ordre<input type="number" min="0" value={editingLandingBlock.display_order} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, display_order: e.target.value }))} /></label>
                        </div>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <input type="checkbox" checked={editingLandingBlock.is_active} onChange={(e) => setEditingLandingBlock((prev) => ({ ...prev, is_active: e.target.checked }))} />
                          Bloc actif
                        </label>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button type="submit" className="btn-primary" disabled={busySaveKey === `save:landing:${String(editingLandingBlock.block_key || '').trim().toLowerCase()}`}>
                            {busySaveKey === `save:landing:${String(editingLandingBlock.block_key || '').trim().toLowerCase()}` ? 'Enregistrement...' : 'Enregistrer'}
                          </button>
                          <button type="button" className="btn-secondary" onClick={() => setEditingLandingBlock(null)}>Annuler</button>
                        </div>
                    </form>
                  </div>
                ) : null}

                <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e7eb)', borderRadius: '10px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                      Blocs {landingBlocks.length > 0 ? <span style={{ fontWeight: 400, color: 'var(--color-muted, #6b7280)', fontSize: '13px' }}>({filteredLandingBlocks.length}/{landingBlocks.length})</span> : null}
                    </h2>
                    <input
                      type="search"
                      className="inline-input"
                      placeholder="Rechercher un bloc..."
                      value={landingQuery}
                      onChange={(e) => setLandingQuery(e.target.value)}
                      style={{ width: 'min(360px, 100%)' }}
                    />
                  </div>

                  <ul className="session-list" style={{ margin: 0 }}>
                    {filteredLandingBlocks.length === 0 ? <li className="list-empty">Aucun bloc ne correspond.</li> : null}
                    {filteredLandingBlocks.map((block) => (
                      <li key={String(block.id)} className="session-item" style={{ alignItems: 'center' }}>
                        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                          <p className="session-title">{block.label || block.block_key}</p>
                          <p className="session-meta">{block.block_key} · {block.is_active ? 'Actif' : 'Inactif'}</p>
                        </div>
                        <div className="session-item-actions icon-only-actions" style={{ flexShrink: 0 }}>
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => beginEditLandingBlock(block)}
                            title="Modifier"
                            aria-label="Modifier bloc landing"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn icon-action-danger"
                            onClick={() => handleDeleteLandingBlock(block)}
                            disabled={busyDeleteKey === `landing:${block.block_key}`}
                            title="Supprimer"
                            aria-label="Supprimer bloc landing"
                          >
                            {busyDeleteKey === `landing:${block.block_key}` ? '…' : '🗑'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

        </main>
      </div>
      <Footer />
    </>
  );
}

