// Stateless helpers for the admin console (formatting, validation, engine config, API).
import { getApiUrl, normalizeBackendAssetUrl } from '@/lib/config';
import { normalizePricingPlanName } from '@/lib/pricing-labels';
import {
  CHALLENGE_STATUS_OPTION_LABELS,
  CHALLENGE_TYPE_OPTION_LABELS,
  COPUZZLE_ADMIN_REFERENCE_IMAGES,
  LANDING_ALLOWED_BLOCK_KEY_SET,
  MAX_CHALLENGE_OBJECTIVES,
  PLATFORM_ADMIN_EMAIL,
  PRICING_BILLING_CYCLE_LABELS,
  SESSION_MODALITY_OPTION_LABELS,
  SESSION_STATUS_OPTION_LABELS,
} from './constants';

function toPositiveIntOrNull(value) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function applyPlayerRangeToEngineConfig(engineConfig, rangeDraft) {
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

export function getParticipantFirstName(participant) {
  return String(participant?.first_name || participant?.firstname || '').trim();
}

export function getParticipantLastName(participant) {
  return String(participant?.last_name || participant?.lastname || '').trim();
}

export function getParticipantDisplayName(participant) {
  const first = getParticipantFirstName(participant);
  const last = getParticipantLastName(participant);
  const full = `${first} ${last}`.trim();
  return full || participant?.email || `Participant #${participant?.id || '?'}`;
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function isStrongPassword(value) {
  const raw = String(value || '');
  if (raw.length < 8 || raw.length > 128) return false;
  const hasLower = /[a-z]/.test(raw);
  const hasUpper = /[A-Z]/.test(raw);
  const hasDigit = /\d/.test(raw);
  const hasSpecial = /[^A-Za-z0-9]/.test(raw);
  return hasLower && hasUpper && hasDigit && hasSpecial;
}

export function isPlatformAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === PLATFORM_ADMIN_EMAIL;
}

export function normalizeObjectivesInput(value) {
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

export function toggleObjectiveSelection(currentValue, objectiveValue) {
  const list = normalizeObjectivesInput(currentValue);
  if (list.includes(objectiveValue)) {
    return list.filter((entry) => entry !== objectiveValue);
  }
  if (list.length >= MAX_CHALLENGE_OBJECTIVES) {
    return list;
  }
  return [...list, objectiveValue];
}

export function parseList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.sessions)) return payload.sessions;
  if (Array.isArray(payload?.challenges)) return payload.challenges;
  if (Array.isArray(payload?.members)) return payload.members;
  return [];
}

export function pickUserLabel(user) {
  if (!user) return 'Admin';
  const first = String(user.first_name || user.firstName || '').trim();
  const last = String(user.last_name || user.lastName || '').trim();
  const full = `${first} ${last}`.trim();
  return full || user.email || 'Admin';
}

export function cloneJson(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

export function renderUploadInputLabel({ isEn, busy }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40px',
        padding: '0 14px',
        borderRadius: '999px',
        border: '1px solid var(--color-border, #cbd5e1)',
        background: busy ? 'var(--color-surface, #f8fafc)' : 'var(--color-surface, #fff)',
        color: 'var(--text-strong, #0f172a)',
        fontWeight: 600,
        fontSize: '13px',
        cursor: busy ? 'not-allowed' : 'pointer',
      }}
    >
      {busy
        ? (isEn ? 'Uploading...' : 'Upload en cours...')
        : (isEn ? 'Choose image (JPG/PNG)' : 'Choisir une image (JPG/PNG)')}
    </span>
  );
}

export function ensureEscapeRoomE5Image(engineConfig, imageUrl) {
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

export function getEscapeRoomE5ImageSrc(engineConfig) {
  const enigmes = Array.isArray(engineConfig?.enigmes) ? engineConfig.enigmes : [];
  const e5 = enigmes.find((e) => String(e?.id || '').toLowerCase() === 'e5');
  return normalizeBackendAssetUrl(String(e5?.image?.src || '').trim());
}

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function ensureCopuzzleConfig(engineConfig) {
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

export function getCopuzzleDefaultImages(engineConfig) {
  const config = ensureCopuzzleConfig(engineConfig);
  return Array.isArray(config.default_images) ? config.default_images : COPUZZLE_ADMIN_REFERENCE_IMAGES;
}

export function getCopuzzleImageSrc(engineConfig) {
  const config = ensureCopuzzleConfig(engineConfig);
  const defaultImages = getCopuzzleDefaultImages(config);
  const selectedDefault = defaultImages.find((item) => item.id === String(config.default_image_id || '').trim()) || defaultImages[0] || null;
  return normalizeBackendAssetUrl(
    String(config?.image?.src || config?.image_url || selectedDefault?.src || '').trim()
  ) || '/copuzzle/default-blue.svg';
}

export function stripRulesFromEngineConfig(engineConfig) {
  const nextEngineConfig = cloneJson(engineConfig, {}) || {};
  if (nextEngineConfig.rules && typeof nextEngineConfig.rules === 'object') {
    delete nextEngineConfig.rules;
  }
  return nextEngineConfig;
}

export function resolveLocalizedRuleValue(value, locale) {
  if (value == null) return value;
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value[locale] ?? value.fr ?? value.en ?? '';
  }
  return value;
}

export function planToDraft(plan) {
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

export function landingBlockToDraft(block) {
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

export function isAllowedLandingBlockKey(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return LANDING_ALLOWED_BLOCK_KEY_SET.has(normalized);
}

export async function fetchAdminJson(path, token) {
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

export function isTokenAuthError(error) {
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

export function formatDurationSeconds(value) {
  const totalSeconds = Math.max(0, Math.round(Number(value) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

export function formatCurrency(value, currency = 'EUR') {
  const amount = Number(value || 0);
  return `${amount} DH`;
}

export function getAdminPricingBadgeLabel(plan, isEn) {
  return normalizePricingPlanName(plan).toLowerCase() === 'pro' ? (isEn ? 'Most popular' : 'Plus populaire') : '';
}

export function formatPricingPlanAmount(plan, isEn) {
  const madCents = Number(plan?.price_mad_cents);
  if (Number.isFinite(madCents)) {
    return `${Math.round(madCents / 100)} DH`;
  }

  return typeof plan?.price === 'number' ? `${plan.price.toFixed(2)} DH` : (isEn ? 'Price not set' : 'Prix non défini');
}

export function csvEscape(value) {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
}

export function downloadTextFile(content, filename, mimeType = 'text/plain;charset=utf-8;') {
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

export function getLocalizedLabel(label, isEn) {
  if (!label || typeof label !== 'object') return String(label || '');
  return isEn ? String(label.en || label.fr || '') : String(label.fr || label.en || '');
}

export function getSessionStatusLabel(status, isEn) {
  return getLocalizedLabel(SESSION_STATUS_OPTION_LABELS[String(status || 'preparee')], isEn)
    || getLocalizedLabel(SESSION_STATUS_OPTION_LABELS.preparee, isEn);
}

export function getSessionModalityLabel(modality, isEn) {
  return getLocalizedLabel(SESSION_MODALITY_OPTION_LABELS[String(modality || '')], isEn);
}

export function getChallengeTypeLabel(type, isEn) {
  return getLocalizedLabel(CHALLENGE_TYPE_OPTION_LABELS[String(type || 'individuel')], isEn)
    || String(type || 'individuel');
}

export function getChallengeStatusLabel(status, isEn) {
  return getLocalizedLabel(CHALLENGE_STATUS_OPTION_LABELS[String(status || 'actif')], isEn)
    || String(status || 'actif');
}

export function getPricingBillingCycleLabel(value, isEn) {
  return getLocalizedLabel(PRICING_BILLING_CYCLE_LABELS[String(value || 'monthly')], isEn)
    || String(value || 'monthly');
}

export function normalizePricingPlanId(value) {
  if (value === null || value === undefined) return '';
  const normalized = String(value).trim();
  return normalized;
}

export function resolveUserPricingPlanId(user) {
  const direct = normalizePricingPlanId(user?.pricing_plan_id);
  if (direct) return direct;

  const fromUserPlan = normalizePricingPlanId(user?.pricing_plan?.id);
  if (fromUserPlan) return fromUserPlan;

  const firstSubscription = Array.isArray(user?.subscriptions) ? user.subscriptions[0] : null;
  const fromSubscription = normalizePricingPlanId(firstSubscription?.pricing_plan_id);
  if (fromSubscription) return fromSubscription;

  return normalizePricingPlanId(firstSubscription?.pricing_plan?.id);
}
