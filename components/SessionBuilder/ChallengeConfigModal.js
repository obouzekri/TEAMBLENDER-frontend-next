'use client';

import styles from './ChallengeConfigModal.module.css';
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { buildBackendAssetCandidates, getApiUrl, normalizeBackendAssetUrl, normalizeUploadResultUrl } from '@/lib/config';
import { fetchWithCsrfRetry, withCsrfHeaders } from '@/lib/csrf';
import { resolveChallengePlayerRange } from '@/lib/challenges/playerRange';
import useI18n from '@/lib/i18n/useI18n';
import useBodyScrollLock from '@/lib/useBodyScrollLock';
import { pickLocalized } from '@/lib/i18n';
import { LAB_PROBLEM_CATALOG, LAB_DEFAULT_PROBLEM_IDS, LAB_MIN_PROBLEM_COUNT, normalizeLabProblemIds } from '@/lib/challenges/labInnovationRules';

function ResilientPreviewImage({ src, alt }) {
  const candidates = useMemo(() => buildBackendAssetCandidates(src), [src]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidates]);

  const activeSrc = candidates[index] || '';
  if (!activeSrc) return null;

  return (
    <Image
      key={activeSrc}
      src={activeSrc}
      alt={alt}
      unoptimized
      width={640}
      height={360}
      loading="lazy"
      style={{ maxWidth: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '6px', border: '1px solid var(--surface-border)' }}
      onError={() => {
        setIndex((prev) => (prev + 1 < candidates.length ? prev + 1 : prev));
      }}
    />
  );
}

const COPUZZLE_ADMIN_REFERENCE_IMAGES = Object.freeze([
  { id: 'default_1', title: 'Image administrateur 1', src: '/copuzzle/default-blue.svg' },
  { id: 'default_2', title: 'Image administrateur 2', src: '/copuzzle/default-grid.svg' },
  { id: 'default_3', title: 'Image administrateur 3', src: '/copuzzle/default-sunrise.svg' },
]);

const PHRASE_DEFAULT_LIBRARY = Object.freeze([
  {
    id: 'tpl_matchs_championnats',
    label: 'Talent wins games... (medium)',
    phrase: 'Talent wins games, but teamwork wins championships.',
    fauxMots: 3,
    indices: 2,
    timerTotal: 510,
    difficulte: 'moyen',
  },
  {
    id: 'tpl_reussite_ensemble',
    label: 'Coming together is a beginning... (medium)',
    phrase: 'Coming together is a beginning, staying together is progress, and working together is success.',
    fauxMots: 3,
    indices: 2,
    timerTotal: 540,
    difficulte: 'moyen',
  },
  {
    id: 'tpl_grandes_choses',
    label: 'Great things in business... (easy)',
    phrase: 'Great things in business are never done by one person alone.',
    fauxMots: 2,
    indices: 2,
    timerTotal: 450,
    difficulte: 'facile',
  },
  {
    id: 'tpl_testez_apprenez',
    label: 'Test fast, fail fast... (hard)',
    phrase: 'Test fast, fail fast, learn faster.',
    fauxMots: 4,
    indices: 1,
    timerTotal: 420,
    difficulte: 'difficile',
  },
  {
    id: 'tpl_plus_loin',
    label: 'Alone we go faster... (easy)',
    phrase: 'Alone we go faster, together we go farther.',
    fauxMots: 2,
    indices: 2,
    timerTotal: 420,
    difficulte: 'facile',
  },
  {
    id: 'tpl_aiguiser_hache',
    label: 'Give me six hours to chop... (hard)',
    phrase: 'Give me six hours to chop down a tree, and I will spend the first four sharpening the axe.',
    fauxMots: 3,
    indices: 1,
    timerTotal: 570,
    difficulte: 'difficile',
  },
  {
    id: 'tpl_montagne_pierres',
    label: 'The one who moves a mountain... (medium)',
    phrase: 'The one who moves a mountain begins by carrying away small stones.',
    fauxMots: 2,
    indices: 2,
    timerTotal: 480,
    difficulte: 'moyen',
  },
]);

const PIXEL_ARCHITECT_TEMPLATES = Object.freeze([
  {
    id: 'tour_signal',
    name: 'Tour Signal',
    difficulty: 'facile',
    max_dims: { x: 6, y: 6, z: 4 },
    target_cube_count: 24,
    palette: ['#2F80ED', '#27AE60', '#F2994A']
  },
  {
    id: 'pont_croise',
    name: 'Cross Bridge',
    difficulty: 'moyen',
    max_dims: { x: 8, y: 6, z: 8 },
    target_cube_count: 48,
    palette: ['#2D9CDB', '#EB5757', '#F2C94C']
  },
  {
    id: 'agora_pixel',
    name: 'Pixel Agora',
    difficulty: 'difficile',
    max_dims: { x: 10, y: 10, z: 5 },
    target_cube_count: 45,
    palette: ['#56CCF2', '#BB6BD9', '#6FCF97']
  },
]);

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeCopuzzleDefaultImages(defaultImagesInput) {
  const source = Array.isArray(defaultImagesInput) ? defaultImagesInput : [];
  const normalized = source
    .map((item, index) => {
      const src = normalizeBackendAssetUrl(String(item?.src || item?.url || item?.value || '').trim());
      if (!src) return null;
      const id = String(item?.id || `default_${index + 1}`);
      const title = String(item?.title || '').trim() || `Image ${index + 1}`;
      return { id, title, src };
    })
    .filter(Boolean)
    .slice(0, 3);

  return normalized.length > 0 ? normalized : COPUZZLE_ADMIN_REFERENCE_IMAGES;
}

function resolveCopuzzleSourceMode(config, defaultImages) {
  const explicitMode = String(config?.image_source_mode || '').trim().toLowerCase();
  if (explicitMode === 'custom') return 'custom';
  if (explicitMode === 'defaults') return 'defaults';

  const configuredImage = normalizeBackendAssetUrl(String(config?.image_url || config?.image?.src || '').trim());
  if (!configuredImage) return 'defaults';

  const usesDefaultImage = defaultImages.some((item) => item.src === configuredImage);
  return usesDefaultImage ? 'defaults' : 'custom';
}

function resolveCopuzzleDefaultImageId(config, defaultImages) {
  const explicitId = String(config?.default_image_id || '').trim();
  if (explicitId && defaultImages.some((item) => item.id === explicitId)) {
    return explicitId;
  }

  const configuredImage = normalizeBackendAssetUrl(String(config?.image_url || config?.image?.src || '').trim());
  const bySrc = defaultImages.find((item) => item.src === configuredImage);
  if (bySrc) return bySrc.id;

  return String(defaultImages[0]?.id || '');
}

function withCopuzzleDefaults(config = {}, defaultImages = COPUZZLE_ADMIN_REFERENCE_IMAGES) {
  const rows = clampInt(config?.grid?.rows, 4, 2, 16);
  const cols = clampInt(config?.grid?.cols, 4, 2, 16);
  const duration = clampInt(config?.timer?.duration_seconds, 1200, 30, 7200);
  const warning = clampInt(config?.timer?.warning_threshold_seconds, 60, 10, 600);
  const sourceMode = resolveCopuzzleSourceMode(config, defaultImages);
  const selectedDefaultImageId = resolveCopuzzleDefaultImageId(config, defaultImages);
  const selectedDefaultImage = defaultImages.find((item) => item.id === selectedDefaultImageId) || defaultImages[0] || null;
  const customImageUrl = normalizeBackendAssetUrl(String(config?.image_url || config?.image?.src || '').trim());
  const imageUrl = sourceMode === 'custom'
    ? (customImageUrl || String(selectedDefaultImage?.src || '').trim() || '/copuzzle/default-blue.svg')
    : (String(selectedDefaultImage?.src || '').trim() || '/copuzzle/default-blue.svg');
  const rawParticipants = config?.participants && typeof config.participants === 'object'
    ? config.participants
    : {};
  const {
    expected_count: _ignoredExpectedCount,
    expected_count_auto: _ignoredExpectedCountAuto,
    assigned_count: _ignoredAssignedCount,
    ...participantsConfig
  } = rawParticipants;

  return {
    ...(config || {}),
    default_images: defaultImages,
    image_source_mode: sourceMode,
    default_image_id: sourceMode === 'defaults' ? selectedDefaultImageId : null,
    image_url: imageUrl,
    image: {
      ...(config?.image && typeof config.image === 'object' ? config.image : {}),
      src: imageUrl,
      fit: String(config?.image?.fit || 'contain').toLowerCase() === 'cover' ? 'cover' : 'contain',
    },
    grid: {
      ...(config?.grid && typeof config.grid === 'object' ? config.grid : {}),
      rows,
      cols,
    },
    participants: {
      ...participantsConfig,
      show_reference_image: rawParticipants.show_reference_image === true,
    },
    timer: {
      ...(config?.timer && typeof config.timer === 'object' ? config.timer : {}),
      enabled: config?.timer?.enabled !== false,
      duration_seconds: duration,
      warning_threshold_seconds: warning,
    },
    chat: {
      ...(config?.chat && typeof config.chat === 'object' ? config.chat : {}),
      enabled: config?.chat?.enabled !== false,
    },
  };
}

function getPhraseTemplate(templateId) {
  if (!templateId) return PHRASE_DEFAULT_LIBRARY[0];
  return PHRASE_DEFAULT_LIBRARY.find((item) => item.id === templateId) || PHRASE_DEFAULT_LIBRARY[0];
}

function sanitizePhraseText(value, fallback) {
  const normalized = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized || fallback;
}

function withPhraseDefaults(config = {}) {
  const { nombreJoueurs: _ignoredNombreJoueurs, ...configWithoutPlayerCount } = config || {};
  const mode = String(config?.mode || 'template').toLowerCase() === 'custom' ? 'custom' : 'template';
  const template = getPhraseTemplate(config?.templateId);

  const phrase = mode === 'custom'
    ? sanitizePhraseText(config?.textePhrase, template.phrase)
    : sanitizePhraseText(template.phrase, PHRASE_DEFAULT_LIBRARY[0].phrase);

  const nombreFauxMots = clampInt(config?.nombreFauxMots, template.fauxMots, 0, 12);
  const nombreIndices = 2;
  const timerTotal = clampInt(config?.timerTotal, template.timerTotal, 60, 3600);
  const modeCommunication = String(config?.modeCommunication || 'libre').toLowerCase() === 'restreint' ? 'restreint' : 'libre';

  return {
    ...configWithoutPlayerCount,
    type: 'phrase_collaborative',
    mode,
    templateId: mode === 'template' ? template.id : (config?.templateId || null),
    textePhrase: phrase,
    modeDistribution: String(config?.modeDistribution || 'modulo').toLowerCase() === 'custom' ? 'custom' : 'modulo',
    distributionCustom: config?.distributionCustom && typeof config.distributionCustom === 'object' ? config.distributionCustom : {},
    nombreFauxMots,
    nombreIndices,
    timerTotal,
    activerFeedbackTempsReel: config?.activerFeedbackTempsReel !== false,
    modeCommunication,
    modeVisionLimitee: config?.modeVisionLimitee === true,
    rolesSpeciaux: config?.rolesSpeciaux === true,
    difficulte: ['facile', 'moyen', 'difficile'].includes(config?.difficulte) ? config.difficulte : template.difficulte,
    timer: {
      enabled: config?.timer?.enabled !== false,
      duration_seconds: timerTotal,
      warning_threshold_seconds: clampInt(config?.timer?.warning_threshold_seconds, 60, 10, 300),
    },
    chat: {
      enabled: modeCommunication !== 'restreint' && config?.chat?.enabled !== false,
    },
  };
}

function withVOMDefaults(config = {}) {
  const roundsPerParticipant = clampInt(config?.rounds_per_participant, 3, 1, 12);

  return {
    ...(config || {}),
    rounds_per_participant: roundsPerParticipant,
    timing: {
      selecting_ms: 40000,
      voting_ms: 40000,
      round_result_ms: 5000,
      next_turn_ms: 0,
    },
    timer: {
      ...(config?.timer && typeof config.timer === 'object' ? config.timer : {}),
      enabled: false,
      duration_seconds: 0,
      warning_threshold_seconds: 0,
    },
  };
}

function withLabyrintheDefaults(config = {}) {
  const normalizedRows = clampInt(config?.rows ?? config?.grid?.rows, 10, 6, 14);
  const normalizedCols = clampInt(config?.cols ?? config?.grid?.cols, 10, 6, 14);
  const parsedComplexity = Number(config?.complexity);
  const normalizedComplexity = Number.isFinite(parsedComplexity)
    ? Math.min(0.9, Math.max(0.3, parsedComplexity))
    : 0.8;
  const durationSeconds = clampInt(
    config?.timer?.duration_seconds ?? config?.timer_seconds,
    0,
    0,
    1800
  );
  const timerEnabled = durationSeconds > 0 && config?.timer?.enabled !== false;

  return {
    ...(config || {}),
    rows: normalizedRows,
    cols: normalizedCols,
    grid: {
      ...(config?.grid && typeof config.grid === 'object' ? config.grid : {}),
      rows: normalizedRows,
      cols: normalizedCols,
    },
    complexity: normalizedComplexity,
    timer_seconds: durationSeconds,
    timer: {
      ...(config?.timer && typeof config.timer === 'object' ? config.timer : {}),
      enabled: timerEnabled,
      duration_seconds: durationSeconds,
      warning_threshold_seconds: durationSeconds > 0 ? Math.min(60, durationSeconds) : 0,
    },
  };
}

function withPixelArchitectDefaults(config = {}) {
  const mode = String(config?.mode || 'replication').toLowerCase() === 'creatif' ? 'creatif' : 'replication';
  const collaborationMode = String(config?.collaborationMode || 'standard').toLowerCase() === 'avance' ? 'avance' : 'standard';
  const templateId = String(config?.replication?.templateId || PIXEL_ARCHITECT_TEMPLATES[0].id).trim();
  const selectedTemplate = PIXEL_ARCHITECT_TEMPLATES.find((item) => item.id === templateId) || PIXEL_ARCHITECT_TEMPLATES[0];
  const minimumCubes = mode === 'replication' && selectedTemplate.id === 'pont_croise' ? 48 : 8;

  const maxColors = clampInt(config?.settings?.maxColors, 3, 1, 6);
  const palette = Array.isArray(config?.palette)
    ? config.palette.map((item) => String(item || '').trim()).filter(Boolean).slice(0, maxColors)
    : selectedTemplate.palette.slice(0, maxColors);

  return {
    ...(config || {}),
    mode,
    collaborationMode,
    difficulty: ['facile', 'moyen', 'difficile'].includes(String(config?.difficulty || '').toLowerCase())
      ? String(config.difficulty).toLowerCase()
      : 'moyen',
    settings: {
      ...(config?.settings && typeof config.settings === 'object' ? config.settings : {}),
      timeLimitSeconds: clampInt(config?.settings?.timeLimitSeconds, 900, 120, 7200),
      maxCubes: clampInt(config?.settings?.maxCubes, 50, minimumCubes, 400),
      maxColors,
      hintsEnabled: config?.settings?.hintsEnabled !== false,
      chatEnabled: config?.settings?.chatEnabled !== false,
      timerEnabled: config?.settings?.timerEnabled !== false,
    },
    replication: {
      ...(config?.replication && typeof config.replication === 'object' ? config.replication : {}),
      modelSource: String(config?.replication?.modelSource || 'template').toLowerCase() === 'upload' ? 'upload' : 'template',
      templateId: selectedTemplate.id,
    },
    creative: {
      ...(config?.creative && typeof config.creative === 'object' ? config.creative : {}),
      theme: String(config?.creative?.theme || 'Build a structure that symbolizes collaboration.').trim(),
    },
    advancedRoles: {
      architectParticipantIds: Array.isArray(config?.advancedRoles?.architectParticipantIds)
        ? config.advancedRoles.architectParticipantIds
        : [],
      builderParticipantIds: Array.isArray(config?.advancedRoles?.builderParticipantIds)
        ? config.advancedRoles.builderParticipantIds
        : [],
    },
    templates: PIXEL_ARCHITECT_TEMPLATES,
    palette,
    timer: {
      ...(config?.timer && typeof config.timer === 'object' ? config.timer : {}),
      enabled: config?.settings?.timerEnabled !== false,
      duration_seconds: clampInt(config?.settings?.timeLimitSeconds, 900, 120, 7200),
      warning_threshold_seconds: 60,
    },
    chat: {
      ...(config?.chat && typeof config.chat === 'object' ? config.chat : {}),
      enabled: config?.settings?.chatEnabled !== false,
    },
  };
}

function withQuizDefaults(config = {}) {
  const presets = {
    short: { question_count: 6, estimated_duration_minutes: 15 },
    medium: { question_count: 9, estimated_duration_minutes: 20 },
    long: { question_count: 12, estimated_duration_minutes: 25 },
  };
  const presetKey = ['short', 'medium', 'long'].includes(String(config?.preset || '').toLowerCase())
    ? String(config.preset).toLowerCase()
    : 'medium';
  const preset = presets[presetKey];
  const questionCount = clampInt(config?.question_count, preset.question_count, 3, 24);
  const questionDurationSeconds = clampInt(config?.question_duration_seconds, 30, 10, 120);

  return {
    ...(config || {}),
    preset: presetKey,
    question_count: questionCount,
    question_duration_seconds: questionDurationSeconds,
    estimated_duration_minutes: preset.estimated_duration_minutes,
    timer: {
      ...(config?.timer && typeof config.timer === 'object' ? config.timer : {}),
      enabled: true,
      duration_seconds: questionDurationSeconds,
      warning_threshold_seconds: Math.min(10, questionDurationSeconds),
    },
    chat: {
      ...(config?.chat && typeof config.chat === 'object' ? config.chat : {}),
      enabled: config?.chat?.enabled !== false,
      quick_reactions_enabled: config?.chat?.quick_reactions_enabled !== false,
    },
    leaderboard: {
      ...(config?.leaderboard && typeof config.leaderboard === 'object' ? config.leaderboard : {}),
      enabled: config?.leaderboard?.enabled !== false,
    },
  };
}

function mergeChallengeConfig(baseConfig, overrideConfig) {
  const base = baseConfig && typeof baseConfig === 'object' ? baseConfig : {};
  const override = overrideConfig && typeof overrideConfig === 'object' ? overrideConfig : {};

  return {
    ...base,
    ...override,
    image: { ...(base.image || {}), ...(override.image || {}) },
    grid: { ...(base.grid || {}), ...(override.grid || {}) },
    timer: { ...(base.timer || {}), ...(override.timer || {}) },
    chat: { ...(base.chat || {}), ...(override.chat || {}) },
    participants: { ...(base.participants || {}), ...(override.participants || {}) },
    default_images: Array.isArray(override.default_images)
      ? override.default_images
      : Array.isArray(base.default_images)
        ? base.default_images
        : [],
  };
}

function getInitialChallengeConfig(challenge) {
  const merged = mergeChallengeConfig(challenge?.engine_config, challenge?.config);
  if (String(challenge?.engine_key || '').toLowerCase() !== 'labyrinthe_live_v1') return merged;

  return {
    ...merged,
    rows: 10,
    cols: 10,
    grid: {
      ...(merged.grid || {}),
      rows: 10,
      cols: 10,
    },
  };
}

export function getCrosswordTemplates(challenge, locale) {
  const catalog = challenge?.engine_config || {};
  const byLocale = catalog.templatesByLocale || challenge?.templatesByLocale;
  const source = byLocale?.[locale] || catalog.templates || [];
  return (Array.isArray(source) ? source : []).filter((template) => (
    template?.id && (template.locale || (byLocale?.[locale] ? locale : catalog.locale || 'fr')) === locale
  ));
}

export function normalizeCrosswordDifficulty(value) {
  return ({ facile: 'easy', moyen: 'medium', difficile: 'hard' })[value] || value || 'medium';
}

export default function ChallengeConfigModal({ challenge, onSave, onClose }) {
  const { locale, t } = useI18n();
  useBodyScrollLock(true);
  const [config, setConfig] = useState(() => getInitialChallengeConfig(challenge));
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [crosswordDifficulty, setCrosswordDifficulty] = useState('');
  const copuzzleDefaultImages = normalizeCopuzzleDefaultImages(
    challenge?.engine_config?.default_images
      || challenge?.config?.default_images
      || config?.default_images
  );

  useEffect(() => {
    setConfig(getInitialChallengeConfig(challenge));
    setCrosswordDifficulty('');
  }, [challenge]);

  useEffect(() => {
    setCrosswordDifficulty('');
  }, [locale]);

  function getChallengeKind(current) {
    if ((current?.engine_key || '').toLowerCase() === 'crossword_live_v1') return 'crossword';
    const fingerprint = [
      current?.name,
      current?.type,
      current?.engine_key,
      current?.route,
      current?.id,
    ]
      .join(' ')
      .toLowerCase();

    if ((current?.engine_key || '').toLowerCase() === 'copuzzle_live_v1' || fingerprint.includes('copuzzle')) {
      return 'copuzzle';
    }
    if ((current?.engine_key || '').toLowerCase() === 'phrase_collaborative_v1' || fingerprint.includes('phrase')) {
      return 'phrase';
    }
    if ((current?.engine_key || '').toLowerCase() === 'vrai_ou_mensonge_v1' || fingerprint.includes('vrai') || fingerprint.includes('mensonge')) {
      return 'vrai_ou_mensonge';
    }
    if ((current?.engine_key || '').toLowerCase() === 'labyrinthe_live_v1') {
      return 'labyrinthe_live';
    }
    if ((current?.engine_key || '').toLowerCase() === 'escape_room_v1' || fingerprint.includes('salle') || fingerprint.includes('escape')) {
      return 'escape_room';
    }
    if ((current?.engine_key || '').toLowerCase() === 'pixel_architect_v1' || fingerprint.includes('pixel architect') || fingerprint.includes('voxel')) {
      return 'pixel_architect';
    }
    if ((current?.engine_key || '').toLowerCase() === 'the_quiz_v1' || fingerprint.includes('the quiz') || fingerprint.includes('quiz')) {
      return 'the_quiz';
    }
    if ((current?.engine_key || '').toLowerCase() === 'mission_critique_v1' || fingerprint.includes('mission critique')) {
      return 'mission_critique';
    }
    if ((current?.engine_key || '').toLowerCase() === 'lab_d_innovation_v1') {
      return 'lab_innovation';
    }
    return 'generic';
  }

  const kind = getChallengeKind(challenge);
  const crosswordTemplates = getCrosswordTemplates(challenge, locale);
  const configuredCrossword = (config.locale || 'fr') === locale
    ? crosswordTemplates.find((template) => template.id === config.gridId)
    : null;
  const selectedCrosswordDifficulty = crosswordDifficulty
    || normalizeCrosswordDifficulty(configuredCrossword?.difficulty || crosswordTemplates[0]?.difficulty);
  const filteredCrosswordTemplates = crosswordTemplates.filter((template) => normalizeCrosswordDifficulty(template.difficulty) === selectedCrosswordDifficulty);
  const selectedCrossword = filteredCrosswordTemplates.find((template) => template.id === configuredCrossword?.id) || filteredCrosswordTemplates[0];
  const playerRange = resolveChallengePlayerRange(challenge);
  const localizedPhraseTemplateLabels = {
    tpl_matchs_championnats: { fr: 'Le talent gagne des matchs... (moyen)', en: 'Talent wins games... (medium)', ar: 'الموهبة تفوز بالمباريات... (متوسط)' },
    tpl_reussite_ensemble: { fr: 'Se réunir est un début... (moyen)', en: 'Coming together is a beginning... (medium)', ar: 'الاجتماع معًا بداية... (متوسط)' },
    tpl_grandes_choses: { fr: 'De grandes choses en entreprise... (facile)', en: 'Great things in business... (easy)', ar: 'الأشياء العظيمة في العمل... (سهل)' },
    tpl_testez_apprenez: { fr: 'Tester vite, échouer vite... (difficile)', en: 'Test fast, fail fast... (hard)', ar: 'اختبر سريعًا، وأخفق سريعًا... (صعب)' },
    tpl_plus_loin: { fr: 'Seul on va plus vite... (facile)', en: 'Alone we go faster... (easy)', ar: 'وحدنا نذهب أسرع... (سهل)' },
    tpl_aiguiser_hache: { fr: 'Donnez-moi six heures pour couper... (difficile)', en: 'Give me six hours to chop... (hard)', ar: 'أعطوني ست ساعات لقطع... (صعب)' },
    tpl_montagne_pierres: { fr: 'Celui qui déplace une montagne... (moyen)', en: 'The one who moves a mountain... (medium)', ar: 'من ينقل جبلًا... (متوسط)' },
  };
  const localizedPixelTemplateLabels = {
    tour_signal: { fr: 'Tour Signal', en: 'Signal Tower', ar: 'برج الإشارة' },
    pont_croise: { fr: 'Pont croisé', en: 'Cross Bridge', ar: 'الجسر المتقاطع' },
    agora_pixel: { fr: 'Agora Pixel', en: 'Pixel Agora', ar: 'ساحة البكسل' },
  };

  const labProblemIds = Array.isArray(config?.problem_ids) ? config.problem_ids : normalizeLabProblemIds(null);
  const labCategories = [...new Set(LAB_PROBLEM_CATALOG.map((item) => item.category))];

  function toggleLabProblem(problemId) {
    const next = labProblemIds.includes(problemId)
      ? labProblemIds.filter((id) => id !== problemId)
      : [...labProblemIds, problemId];
    updateValue('problem_ids', LAB_PROBLEM_CATALOG.map((item) => item.id).filter((id) => next.includes(id)));
  }

  function updateValue(path, value) {
    setConfig((prev) => {
      const next = { ...(prev || {}) };
      const keys = path.split('.');
      let cursor = next;
      for (let i = 0; i < keys.length - 1; i += 1) {
        const key = keys[i];
        cursor[key] = typeof cursor[key] === 'object' && cursor[key] !== null ? { ...cursor[key] } : {};
        cursor = cursor[key];
      }
      cursor[keys[keys.length - 1]] = value;
      return next;
    });
  }

  function numberValue(path, fallback) {
    const keys = path.split('.');
    let cursor = config;
    for (const key of keys) {
      if (!cursor || typeof cursor !== 'object') return fallback;
      cursor = cursor[key];
    }
    const n = Number(cursor);
    return Number.isFinite(n) ? n : fallback;
  }

  function secondsValue(path, fallbackMs) {
    const valueMs = numberValue(path, fallbackMs);
    return Math.max(0, Math.round(Number(valueMs || 0) / 1000));
  }

  function boolValue(path, fallback) {
    const keys = path.split('.');
    let cursor = config;
    for (const key of keys) {
      if (!cursor || typeof cursor !== 'object') return fallback;
      cursor = cursor[key];
    }
    if (typeof cursor === 'boolean') return cursor;
    return fallback;
  }

  function stringValue(path, fallback) {
    const keys = path.split('.');
    let cursor = config;
    for (const key of keys) {
      if (!cursor || typeof cursor !== 'object') return fallback;
      cursor = cursor[key];
    }
    if (cursor === undefined || cursor === null) return fallback;
    return String(cursor);
  }

  function matrixSizeValue() {
    const rows = numberValue('grid.rows', NaN);
    const cols = numberValue('grid.cols', NaN);
    if (Number.isFinite(rows)) return rows;
    if (Number.isFinite(cols)) return cols;
    return 4;
  }

  const handleSave = () => {
    if (kind === 'crossword') {
      if (!selectedCrossword) return;
      onSave({
        locale,
        gridId: selectedCrossword.id,
        timer: { enabled: true, duration_seconds: clampInt(config?.timer?.duration_seconds, 900, 300, 1800) },
        participants: { min_count: 0, max_count: null, recommended_count: 5 },
      });
      return;
    }
    if (kind === 'copuzzle') {
      onSave(withCopuzzleDefaults(config, copuzzleDefaultImages));
      return;
    }
    if (kind === 'phrase') {
      onSave(withPhraseDefaults(config));
      return;
    }
    if (kind === 'vrai_ou_mensonge') {
      onSave(withVOMDefaults(config));
      return;
    }
    if (kind === 'labyrinthe_live') {
      onSave(withLabyrintheDefaults(config));
      return;
    }
    if (kind === 'pixel_architect') {
      onSave(withPixelArchitectDefaults(config));
      return;
    }
    if (kind === 'the_quiz') {
      onSave(withQuizDefaults(config));
      return;
    }
    if (kind === 'lab_innovation') {
      onSave({ problem_ids: labProblemIds });
      return;
    }
    if (kind === 'mission_critique') {
      onSave({});
      return;
    }
    onSave(config);
  };

  const selectedPhraseTemplate = getPhraseTemplate(stringValue('templateId', PHRASE_DEFAULT_LIBRARY[0].id));
  const selectedPhrasePreview = sanitizePhraseText(
    stringValue('textePhrase', ''),
    selectedPhraseTemplate.phrase
  );

  const handleUploadCopuzzleImage = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setUploadError('');

    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setUploadError('Unsupported format. Use JPG or PNG.');
      event.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Image file is too large (max 8 MB).');
      event.target.value = '';
      return;
    }

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);

    fetchWithCsrfRetry(getApiUrl('/challenges/upload-image'), {
      method: 'POST',
      headers: withCsrfHeaders(),
      credentials: 'include',
      body: formData,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || `Upload failed (${response.status})`);
        }

        const uploadedUrl = normalizeUploadResultUrl(payload);
        if (!uploadedUrl) {
          throw new Error('Image URL missing in upload response.');
        }

        updateValue('image_source_mode', 'custom');
        updateValue('image_url', uploadedUrl);
        updateValue('image.src', uploadedUrl);
      })
      .catch((error) => {
        setUploadError(error.message || 'Image upload failed.');
      })
      .finally(() => {
        setIsUploadingImage(false);
        event.target.value = '';
      });
  };

  const modalTitleId = 'challenge-config-modal-title';

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id={modalTitleId}>{t('builder.configure')} {challenge?.name}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t('builder.closeConfiguration')}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {challenge?.description ? (
            <p className={styles.challengeDescription}>{challenge.description}</p>
          ) : null}
          <p className={styles.infoText}>{t('builder.configurationOptionsDependOnTheActivity')}</p>
          {playerRange.hasRange ? (
            <p className={styles.playersInfo}>
              {t('builder.min')}: {playerRange.min || '-'} · {t('builder.recommended')}: {playerRange.recommended || '-'} · {t('builder.max')}: {playerRange.max || '-'} {t('builder.players')}
            </p>
          ) : null}

          {kind === 'crossword' && (
            <>
              <p className={styles.helpText}>{t('builder.noParticipantLimitCuratedGridsWithout')}</p>
              <div className={styles.configField}>
                <label htmlFor="crosswordDifficulty" className={styles.label}>{t('builder.difficulty')}</label>
                <select id="crosswordDifficulty" className={styles.input} value={selectedCrosswordDifficulty}
                  disabled={!crosswordTemplates.length}
                  onChange={(event) => { setCrosswordDifficulty(event.target.value); updateValue('gridId', ''); }}>
                  {[...new Set(crosswordTemplates.map((template) => normalizeCrosswordDifficulty(template.difficulty)))].map((difficulty) => (
                    <option key={difficulty} value={difficulty}>{({ easy: t('builder.easy'), medium: t('builder.medium'), hard: t('builder.hard') })[difficulty] || difficulty}</option>
                  ))}
                </select>
              </div>
              <div className={styles.configField}>
                <label htmlFor="crosswordGrid" className={styles.label}>{t('builder.grid')}</label>
                <select id="crosswordGrid" className={styles.input} value={selectedCrossword?.id || ''} disabled={!filteredCrosswordTemplates.length}
                  onChange={(event) => setConfig((previous) => ({ ...previous, gridId: event.target.value, locale }))}>
                  {filteredCrosswordTemplates.map((template) => <option key={template.id} value={template.id}>{template.title || template.name || template.id}{template.theme ? ` · ${template.theme}` : ''}</option>)}
                </select>
                {!selectedCrossword && <p role="status">{t('builder.noGridsAvailableInThisLanguage')}</p>}
                {Array.isArray(selectedCrossword?.preview) && selectedCrossword.width > 0 && selectedCrossword.height > 0 && (() => {
                  const width = clampInt(selectedCrossword.width, 15, 1, 30);
                  const height = clampInt(selectedCrossword.height, 15, 1, 30);
                  const occupied = new Set(selectedCrossword.preview.map((cell) => `${cell.row}:${cell.col}`));
                  return (
                    <div className={styles.crosswordPreview} role="img" aria-label={t('builder.gridPreviewWithoutAnswers')}
                      style={{ '--preview-columns': width, aspectRatio: `${width} / ${height}` }}>
                      {Array.from({ length: width * height }, (_, index) => (
                        <span key={index} aria-hidden="true" className={occupied.has(`${Math.floor(index / width)}:${index % width}`) ? styles.crosswordPreviewCell : styles.crosswordPreviewBlock} />
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className={styles.configField}>
                <label htmlFor="crosswordDuration" className={styles.label}>{t('builder.durationMinutes')}</label>
                <input id="crosswordDuration" type="number" min="5" max="30" step="1" className={styles.input}
                  value={Math.round(numberValue('timer.duration_seconds', 900) / 60)}
                  onChange={(event) => updateValue('timer.duration_seconds', clampInt(event.target.value, 15, 5, 30) * 60)} />
                <span className={styles.helpText}>{t('builder.n15MinutesByDefaultFrom5')}</span>
              </div>
            </>
          )}

          {kind === 'copuzzle' && (
            <>
              <div className={styles.configField}>
                <label className={styles.label}>{t('builder.imageSource')}</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={resolveCopuzzleSourceMode(config, copuzzleDefaultImages) === 'defaults'}
                      onChange={() => updateValue('image_source_mode', 'defaults')}
                    />
                    <span>{t('builder.useAdminDefaultImages')}</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={resolveCopuzzleSourceMode(config, copuzzleDefaultImages) === 'custom'}
                      onChange={() => updateValue('image_source_mode', 'custom')}
                    />
                    <span>{t('builder.uploadCustomImage')}</span>
                  </label>
                </div>
              </div>

              {resolveCopuzzleSourceMode(config, copuzzleDefaultImages) === 'defaults' ? (
                <div className={styles.configField}>
                  <label htmlFor="copuzzleDefaultImage" className={styles.label}>{t('builder.defaultImage')}</label>
                  <select
                    id="copuzzleDefaultImage"
                    className={styles.input}
                    value={resolveCopuzzleDefaultImageId(config, copuzzleDefaultImages)}
                    onChange={(e) => {
                      const selectedId = String(e.target.value || '').trim();
                      const selected = copuzzleDefaultImages.find((item) => item.id === selectedId) || null;
                      if (!selected) return;
                      updateValue('default_image_id', selected.id);
                      updateValue('image_source_mode', 'defaults');
                      updateValue('image_url', selected.src);
                      updateValue('image.src', selected.src);
                    }}
                  >
                    {copuzzleDefaultImages.map((option) => (
                      <option key={option.id} value={option.id}>{option.title}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className={styles.configField}>
                    <label htmlFor="copuzzleUpload" className={styles.label}>{t('builder.uploadAnImageJpgPng')}</label>
                    <span className={styles.helpText}>
                      {t('builder.recommended4x4Or5x5GridJpeg')}
                    </span>
                    <input
                      id="copuzzleUpload"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleUploadCopuzzleImage}
                      className={styles.input}
                      disabled={isUploadingImage}
                    />
                    {isUploadingImage ? (
                      <p style={{ marginTop: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>{t('builder.uploading')}</p>
                    ) : null}
                    {uploadError ? (
                      <p style={{ marginTop: '6px', color: 'var(--error-line)', fontSize: '12px' }}>{uploadError}</p>
                    ) : null}
                  </div>
                </>
              )}

              {(() => {
                const sourceMode = resolveCopuzzleSourceMode(config, copuzzleDefaultImages);
                const selectedDefault = copuzzleDefaultImages.find((item) => item.id === resolveCopuzzleDefaultImageId(config, copuzzleDefaultImages)) || copuzzleDefaultImages[0] || null;
                const previewSrc = sourceMode === 'custom'
                  ? normalizeBackendAssetUrl(stringValue('image_url', ''))
                  : normalizeBackendAssetUrl(String(selectedDefault?.src || ''));
                if (!previewSrc) return null;
                return (
                  <div className={styles.activePuzzlePreview}>
                    <ResilientPreviewImage src={previewSrc} alt="Puzzle preview" />
                  </div>
                );
              })()}

              <label className={`${styles.configField} ${styles.checkboxRow}`} htmlFor="copuzzleReferenceVisibility">
                <span className={styles.label}>{t('builder.showReferenceImageToParticipants')}</span>
                <input
                  id="copuzzleReferenceVisibility"
                  type="checkbox"
                  checked={boolValue('participants.show_reference_image', false)}
                  onChange={(e) => updateValue('participants.show_reference_image', e.target.checked)}
                />
              </label>

              <div className={styles.configField}>
                <label htmlFor="matrixSize" className={styles.label}>{t('builder.matrixSize')}</label>
                <input
                  id="matrixSize"
                  type="number"
                  min="2"
                  max="16"
                  value={matrixSizeValue()}
                  onChange={(e) => {
                    const size = Number(e.target.value || 4);
                    updateValue('grid.rows', size);
                    updateValue('grid.cols', size);
                  }}
                  className={styles.input}
                />
                <span className={styles.helpText}>{t('builder.appliedToBothRowsAndColumns')}</span>
              </div>

              <div className={styles.configField}>
                <label htmlFor="durationSeconds" className={styles.label}>{t('builder.timerSeconds')}</label>
                <input
                  id="durationSeconds"
                  type="number"
                  min="30"
                  max="7200"
                  value={numberValue('timer.duration_seconds', 1200)}
                  onChange={(e) => updateValue('timer.duration_seconds', Number(e.target.value || 1200))}
                  className={styles.input}
                />
                <span className={styles.helpText}>{t('builder.default1200Seconds20Min')}</span>
              </div>

              <div className={styles.configField}>
                <label htmlFor="warningSeconds" className={styles.label}>{t('builder.warningThresholdSeconds')}</label>
                <input
                  id="warningSeconds"
                  type="number"
                  min="10"
                  max="300"
                  value={numberValue('timer.warning_threshold_seconds', 60)}
                  onChange={(e) => updateValue('timer.warning_threshold_seconds', Number(e.target.value || 60))}
                  className={styles.input}
                />
              </div>

              <label className={`${styles.configField} ${styles.checkboxRow}`} htmlFor="copuzzleTimerEnabled">
                <span className={styles.label}>{t('builder.enableTimer')}</span>
                <input
                  id="copuzzleTimerEnabled"
                  type="checkbox"
                  checked={boolValue('timer.enabled', true)}
                  onChange={(e) => updateValue('timer.enabled', e.target.checked)}
                />
              </label>

              <label className={`${styles.configField} ${styles.checkboxRow}`} htmlFor="copuzzleChatEnabled">
                <span className={styles.label}>{t('builder.enableChat')}</span>
                <input
                  id="copuzzleChatEnabled"
                  type="checkbox"
                  checked={boolValue('chat.enabled', true)}
                  onChange={(e) => updateValue('chat.enabled', e.target.checked)}
                />
              </label>
            </>
          )}

          {kind === 'labyrinthe_live' && (
            <>
              <div className={styles.configField}>
                <label htmlFor="mazeRows" className={styles.label}>{t('builder.rows')}</label>
                <input
                  id="mazeRows"
                  type="number"
                  min="6"
                  max="14"
                  value={numberValue('rows', numberValue('grid.rows', 10))}
                  onChange={(e) => {
                    const rows = Number(e.target.value || 10);
                    updateValue('rows', rows);
                    updateValue('grid.rows', rows);
                  }}
                  className={styles.input}
                />
              </div>

              <div className={styles.configField}>
                <label htmlFor="mazeCols" className={styles.label}>{t('builder.columns')}</label>
                <input
                  id="mazeCols"
                  type="number"
                  min="6"
                  max="14"
                  value={numberValue('cols', numberValue('grid.cols', 10))}
                  onChange={(e) => {
                    const cols = Number(e.target.value || 10);
                    updateValue('cols', cols);
                    updateValue('grid.cols', cols);
                  }}
                  className={styles.input}
                />
              </div>

              <div className={styles.configField}>
                <label htmlFor="mazeComplexity" className={styles.label}>Complexity (0.3 to 0.9)</label>
                <input
                  id="mazeComplexity"
                  type="number"
                  min="0.3"
                  max="0.9"
                  step="0.01"
                  value={numberValue('complexity', 0.8)}
                  onChange={(e) => updateValue('complexity', Number(e.target.value || 0.8))}
                  className={styles.input}
                />
              </div>

              <div className={styles.configField}>
                <label htmlFor="mazeDurationSeconds" className={styles.label}>Challenge duration (seconds)</label>
                <input
                  id="mazeDurationSeconds"
                  type="number"
                  min="0"
                  max="1800"
                  value={numberValue('timer.duration_seconds', numberValue('timer_seconds', 0))}
                  onChange={(e) => {
                    const duration = Number(e.target.value || 0);
                    updateValue('timer.duration_seconds', duration);
                    updateValue('timer.enabled', duration > 0);
                    updateValue('timer.warning_threshold_seconds', duration > 0 ? Math.min(60, duration) : 0);
                    updateValue('timer_seconds', duration);
                  }}
                  className={styles.input}
                />
                <span className={styles.helpText}>0 disables the timer. Otherwise duration drives the live maze timer.</span>
              </div>
            </>
          )}

          {kind === 'the_quiz' && (
            <>
              <div className={styles.configField}>
                <label htmlFor="quizPreset" className={styles.label}>{t('builder.preset')}</label>
                <select
                  id="quizPreset"
                  className={styles.input}
                  value={stringValue('preset', 'medium')}
                  onChange={(e) => {
                    const preset = String(e.target.value || 'medium');
                    const nextQuestionCount = preset === 'short' ? 6 : preset === 'long' ? 12 : 9;
                    updateValue('preset', preset);
                    updateValue('question_count', nextQuestionCount);
                  }}
                >
                  <option value="short">{t('builder.short6Questions15Min')}</option>
                  <option value="medium">{t('builder.medium9Questions20Min')}</option>
                  <option value="long">{t('builder.long12Questions25Min')}</option>
                </select>
              </div>

              <div className={styles.configField}>
                <label htmlFor="quizQuestionCount" className={styles.label}>{t('builder.numberOfQuestions')}</label>
                <input
                  id="quizQuestionCount"
                  type="number"
                  min="3"
                  max="24"
                  value={numberValue('question_count', 9)}
                  onChange={(e) => updateValue('question_count', Number(e.target.value || 9))}
                  className={styles.input}
                />
              </div>

              <div className={styles.configField}>
                <label htmlFor="quizQuestionDuration" className={styles.label}>{t('builder.timePerQuestionSeconds')}</label>
                <input
                  id="quizQuestionDuration"
                  type="number"
                  min="10"
                  max="120"
                  value={numberValue('question_duration_seconds', 30)}
                  onChange={(e) => updateValue('question_duration_seconds', Number(e.target.value || 30))}
                  className={styles.input}
                />
                <span className={styles.helpText}>{t('builder.maximum2MinutesDefaultValue30')}</span>
              </div>

              <label className={`${styles.configField} ${styles.checkboxRow}`} htmlFor="quizChatEnabled">
                <span className={styles.label}>{t('builder.enableChat')}</span>
                <input
                  id="quizChatEnabled"
                  type="checkbox"
                  checked={boolValue('chat.enabled', true)}
                  onChange={(e) => updateValue('chat.enabled', e.target.checked)}
                />
              </label>

              <label className={`${styles.configField} ${styles.checkboxRow}`} htmlFor="quizLeaderboardEnabled">
                <span className={styles.label}>{t('builder.enableLiveLeaderboard')}</span>
                <input
                  id="quizLeaderboardEnabled"
                  type="checkbox"
                  checked={boolValue('leaderboard.enabled', true)}
                  onChange={(e) => updateValue('leaderboard.enabled', e.target.checked)}
                />
              </label>
            </>
          )}

          {kind === 'phrase' && (
            <>
              {/* Mode: template or custom */}
              <div className={styles.configField}>
                <label className={styles.label}>{t('builder.phraseMode')}</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={stringValue('mode', 'template') === 'template'}
                      onChange={() => updateValue('mode', 'template')}
                    />
                    <span>{t('builder.preset')}</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={stringValue('mode', 'template') === 'custom'}
                      onChange={() => updateValue('mode', 'custom')}
                    />
                    <span>{t('builder.custom')}</span>
                  </label>
                </div>
              </div>

              {/* Available templates */}
              {stringValue('mode', 'template') === 'template' && (
                <div className={styles.configField}>
                  <label htmlFor="phraseTemplate" className={styles.label}>{t('builder.selectAKnownPhrase')}</label>
                  <select
                    id="phraseTemplate"
                    value={stringValue('templateId', PHRASE_DEFAULT_LIBRARY[0].id)}
                    onChange={(e) => {
                      const nextTemplateId = String(e.target.value || PHRASE_DEFAULT_LIBRARY[0].id);
                      const template = getPhraseTemplate(nextTemplateId);
                      updateValue('templateId', nextTemplateId);
                      updateValue('textePhrase', template.phrase);
                      updateValue('nombreFauxMots', template.fauxMots);
                      updateValue('timerTotal', template.timerTotal);
                      updateValue('difficulte', template.difficulte);
                    }}
                    className={styles.input}
                  >
                    {PHRASE_DEFAULT_LIBRARY.map((template) => (
                      <option key={template.id} value={template.id}>{pickLocalized(localizedPhraseTemplateLabels[template.id], locale) || template.label}</option>
                    ))}
                  </select>
                  <p className={styles.helpText}>
                    {t('builder.hoverThePreviewToSeeThe')}
                  </p>
                  <span
                    className={styles.phrasePreviewTrigger}
                    data-full-phrase={selectedPhrasePreview}
                    title={selectedPhrasePreview}
                  >
                    {selectedPhrasePreview}
                  </span>
                </div>
              )}

              {/* Custom phrase */}
              {stringValue('mode', 'template') === 'custom' && (
                <div className={styles.configField}>
                  <label htmlFor="phraseCustom" className={styles.label}>{t('builder.yourPhrase')}</label>
                  <textarea
                    id="phraseCustom"
                    rows="3"
                    placeholder={t('builder.exCollaborationIsTheKeyTo')}
                    value={stringValue('textePhrase', '')}
                    onChange={(e) => updateValue('textePhrase', e.target.value)}
                    className={styles.input}
                  />
                </div>
              )}

              {/* Advanced options */}
              <div className={styles.configField}>
                <label htmlFor="phraseFauxMots" className={styles.label}>{t('builder.numberOfDecoyWords')}</label>
                <input
                  id="phraseFauxMots"
                  type="number"
                  min="0"
                  max="12"
                  value={numberValue('nombreFauxMots', 2)}
                  onChange={(e) => updateValue('nombreFauxMots', Number(e.target.value || 2))}
                  className={styles.input}
                />
              </div>

              <div className={styles.configField}>
                <label className={styles.label}>{t('builder.revealOneWordTeam')}</label>
                <span className={styles.helpText}>{t('builder.fixedAt2ActionsPerRound')}</span>
              </div>

              <div className={styles.configField}>
                <label htmlFor="phraseTimer" className={styles.label}>{t('builder.durationSeconds')}</label>
                <input
                  id="phraseTimer"
                  type="number"
                  min="60"
                  max="3600"
                  step="30"
                  value={numberValue('timerTotal', 420)}
                  onChange={(e) => updateValue('timerTotal', Number(e.target.value || 420))}
                  className={styles.input}
                />
              </div>

              <div className={styles.configField}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={boolValue('modeCommunication', 'libre') === 'restreint' ? false : true}
                    onChange={(e) => updateValue('modeCommunication', e.target.checked ? 'libre' : 'restreint')}
                  />
                  <span>{t('builder.chatEnabled')}</span>
                </label>
              </div>
            </>
          )}

          {kind === 'vrai_ou_mensonge' && (
            <>
              <div className={styles.configField}>
                <label htmlFor="vomRoundsPerParticipant" className={styles.label}>{t('builder.roundsPerParticipant')}</label>
                <input
                  id="vomRoundsPerParticipant"
                  type="number"
                  min="1"
                  max="12"
                  value={numberValue('rounds_per_participant', 3)}
                  onChange={(e) => updateValue('rounds_per_participant', Number(e.target.value || 3))}
                  className={styles.input}
                />
                <span className={styles.helpText}>
                  {t('builder.default3RoundsWhenNoConfiguration')}
                </span>
              </div>
            </>
          )}

          {kind === 'escape_room' && (
            <>
              {/* Configuration de session (overrides) */}
              <div className={styles.configField}>
                <label htmlFor="erDuration" className={styles.label}>{t('builder.durationSeconds')}</label>
                <input
                  id="erDuration"
                  type="number"
                  min="300"
                  max="3600"
                  step="60"
                  value={numberValue('timer.duration_seconds', challenge?.engine_config?.timer?.duration_seconds || 1200)}
                  onChange={(e) => updateValue('timer.duration_seconds', Number(e.target.value || 1200))}
                  className={styles.input}
                />
              </div>

              <div className={styles.configField}>
                <label htmlFor="erMaxAttempts" className={styles.label}>{t('builder.maxAttemptsPerPuzzle')}</label>
                <input
                  id="erMaxAttempts"
                  type="number"
                  min="1"
                  max="10"
                  value={numberValue('max_attempts_per_enigme', challenge?.engine_config?.max_attempts_per_enigme || 3)}
                  onChange={(e) => updateValue('max_attempts_per_enigme', Number(e.target.value || 3))}
                  className={styles.input}
                />
              </div>

              {/* Display configured puzzles (from engine_config) */}
              {Array.isArray(challenge?.engine_config?.enigmes) && challenge.engine_config.enigmes.length > 0 ? (
                <div style={{ marginTop: '16px' }}>
                  <p className={styles.label} style={{ marginBottom: '8px', fontWeight: 600 }}>
                    {t('builder.configuredPuzzles')} ({challenge.engine_config.enigmes.length})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {challenge.engine_config.enigmes.map((enigme, idx) => (
                      <div
                        key={enigme.id || idx}
                        style={{
                          background: 'var(--surface-panel-soft)',
                          border: '1px solid var(--surface-border)',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          fontSize: '13px',
                        }}
                      >
                        <strong style={{ color: 'var(--text-strong)' }}>{idx + 1}. {enigme.label}</strong>
                        {enigme.description && (
                          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', lineHeight: '1.4' }}>{enigme.description}</p>
                        )}
                        <div style={{ marginTop: '6px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--color-success)', fontFamily: 'monospace', fontSize: '12px' }}>
                            ✓ Answer: <strong>{enigme.expected_answer}</strong>
                          </span>
                          {enigme.hint && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                              💡 {enigme.hint}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-subtle)' }}>
                    {t('builder.puzzlesAreManagedFromChallengeAdministration')}
                  </p>
                </div>
              ) : (
                <p className={styles.noConfigText} style={{ marginTop: '12px' }}>
                  {t('builder.noPuzzleFoundInChallengeConfiguration')}
                </p>
              )}
            </>
          )}

          {kind === 'pixel_architect' && (
            <>
              <div className={styles.configField}>
                <label className={styles.label}>{t('builder.challengeMode')}</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={stringValue('mode', 'replication') === 'replication'}
                      onChange={() => updateValue('mode', 'replication')}
                    />
                    <span>{t('builder.replication')}</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={stringValue('mode', 'replication') === 'creatif'}
                      onChange={() => updateValue('mode', 'creatif')}
                    />
                    <span>{t('builder.creative')}</span>
                  </label>
                </div>
              </div>

              <div className={styles.configField}>
                <label className={styles.label}>{t('builder.collaborationMode')}</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={stringValue('collaborationMode', 'standard') === 'standard'}
                      onChange={() => updateValue('collaborationMode', 'standard')}
                    />
                    <span>{t('builder.standard')}</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={stringValue('collaborationMode', 'standard') === 'avance'}
                      onChange={() => updateValue('collaborationMode', 'avance')}
                    />
                    <span>{t('builder.advancedRoles')}</span>
                  </label>
                </div>
              </div>

              {stringValue('mode', 'replication') === 'replication' ? (
                <div className={styles.configField}>
                  <label htmlFor="pixelTemplate" className={styles.label}>{t('builder.template')}</label>
                  <select
                    id="pixelTemplate"
                    className={styles.input}
                    value={stringValue('replication.templateId', PIXEL_ARCHITECT_TEMPLATES[0].id)}
                    onChange={(e) => {
                      const nextTemplateId = String(e.target.value || PIXEL_ARCHITECT_TEMPLATES[0].id);
                      const template = PIXEL_ARCHITECT_TEMPLATES.find((item) => item.id === nextTemplateId) || PIXEL_ARCHITECT_TEMPLATES[0];
                      updateValue('replication.templateId', template.id);
                      updateValue('difficulty', template.difficulty);
                    }}
                  >
                    {PIXEL_ARCHITECT_TEMPLATES.map((template) => (
                      <option key={template.id} value={template.id}>{pickLocalized(localizedPixelTemplateLabels[template.id], locale) || template.name} ({template.difficulty})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className={styles.configField}>
                  <label htmlFor="pixelTheme" className={styles.label}>{t('builder.creativeTheme')}</label>
                  <input
                    id="pixelTheme"
                    className={styles.input}
                    type="text"
                    value={stringValue('creative.theme', 'Build a structure that symbolizes collaboration.')}
                    onChange={(e) => updateValue('creative.theme', e.target.value)}
                  />
                </div>
              )}

              <div className={styles.configField}>
                <label htmlFor="pixelDuration" className={styles.label}>{t('builder.timeSeconds')}</label>
                <input
                  id="pixelDuration"
                  className={styles.input}
                  type="number"
                  min="120"
                  max="7200"
                  value={numberValue('settings.timeLimitSeconds', 900)}
                  onChange={(e) => updateValue('settings.timeLimitSeconds', Number(e.target.value || 900))}
                />
              </div>

              <div className={styles.configField}>
                <label htmlFor="pixelMaxCubes" className={styles.label}>{t('builder.maxCubeCount')}</label>
                <input
                  id="pixelMaxCubes"
                  className={styles.input}
                  type="number"
                  min={stringValue('mode', 'replication') === 'replication' && stringValue('replication.templateId', '') === 'pont_croise' ? 48 : 8}
                  max="400"
                  value={numberValue('settings.maxCubes', 50)}
                  onChange={(e) => updateValue('settings.maxCubes', Number(e.target.value || 50))}
                />
                {stringValue('mode', 'replication') === 'replication' && stringValue('replication.templateId', '') === 'pont_croise' ? (
                  <p>{t('builder.thisModelRequiresAtLeast48')}</p>
                ) : null}
              </div>

              <div className={styles.configField}>
                <label htmlFor="pixelMaxColors" className={styles.label}>{t('builder.numberOfColors')}</label>
                <input
                  id="pixelMaxColors"
                  className={styles.input}
                  type="number"
                  min="1"
                  max="6"
                  value={numberValue('settings.maxColors', 3)}
                  onChange={(e) => updateValue('settings.maxColors', Number(e.target.value || 3))}
                />
              </div>

              <div className={styles.configField}>
                <label htmlFor="pixelDifficulty" className={styles.label}>{t('builder.difficulty')}</label>
                <select
                  id="pixelDifficulty"
                  className={styles.input}
                  value={stringValue('difficulty', 'moyen')}
                  onChange={(e) => updateValue('difficulty', e.target.value)}
                >
                  <option value="facile">{t('builder.easy2')}</option>
                  <option value="moyen">{t('builder.medium2')}</option>
                  <option value="difficile">{t('builder.hard2')}</option>
                </select>
              </div>

              <label className={`${styles.configField} ${styles.checkboxRow}`} htmlFor="pixelHintsEnabled">
                <span className={styles.label}>{t('builder.enableHints')}</span>
                <input
                  id="pixelHintsEnabled"
                  type="checkbox"
                  checked={boolValue('settings.hintsEnabled', true)}
                  onChange={(e) => updateValue('settings.hintsEnabled', e.target.checked)}
                />
              </label>

              <label className={`${styles.configField} ${styles.checkboxRow}`} htmlFor="pixelChatEnabled">
                <span className={styles.label}>{t('builder.enableChat')}</span>
                <input
                  id="pixelChatEnabled"
                  type="checkbox"
                  checked={boolValue('settings.chatEnabled', true)}
                  onChange={(e) => updateValue('settings.chatEnabled', e.target.checked)}
                />
              </label>

              <label className={`${styles.configField} ${styles.checkboxRow}`} htmlFor="pixelTimerEnabled">
                <span className={styles.label}>{t('builder.enableTimer')}</span>
                <input
                  id="pixelTimerEnabled"
                  type="checkbox"
                  checked={boolValue('settings.timerEnabled', true)}
                  onChange={(e) => updateValue('settings.timerEnabled', e.target.checked)}
                />
              </label>
            </>
          )}

          {kind === 'generic' && (
            <>
              {Object.keys(config || {}).length === 0 && (
                <p className={styles.noConfigText}>{t('builder.noConfigurationRequiredForThisActivity')}</p>
              )}

              {Object.entries(config || {}).filter(([key]) => key !== 'rules').map(([key, value]) => (
                <div key={key} className={styles.configField}>
                  <label htmlFor={key} className={styles.label}>{key}</label>
                  <input
                    id={key}
                    type="text"
                    value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    onChange={(e) => updateValue(key, e.target.value)}
                    className={styles.input}
                  />
                </div>
              ))}
            </>
          )}

          {kind === 'lab_innovation' && (
            <fieldset className={`${styles.configField} ${styles.labFieldset}`}>
              <legend className={styles.label}>{t('builder.labProblemsTitle')}</legend>
              <span className={styles.helpText}>{t('builder.labProblemsHelp', { min: LAB_MIN_PROBLEM_COUNT })}</span>
              <div className={styles.labActions}>
                <strong aria-live="polite">{t('builder.labProblemsCount', { count: labProblemIds.length, total: LAB_PROBLEM_CATALOG.length })}</strong>
                <button type="button" className="btn-secondary" onClick={() => updateValue('problem_ids', [...LAB_DEFAULT_PROBLEM_IDS])}>{t('builder.labProblemsDefault', { count: LAB_DEFAULT_PROBLEM_IDS.length })}</button>
                <button type="button" className="btn-secondary" onClick={() => updateValue('problem_ids', LAB_PROBLEM_CATALOG.map((item) => item.id))}>{t('builder.labProblemsAll', { count: LAB_PROBLEM_CATALOG.length })}</button>
              </div>
              {labCategories.map((category) => (
                <div key={category} className={styles.labCategory}>
                  <span className={styles.label}>{t(`challengeLab.categories.${category}`)}</span>
                  {LAB_PROBLEM_CATALOG.filter((item) => item.category === category).map((item) => {
                    const checked = labProblemIds.includes(item.id);
                    return (
                      <label key={item.id} className={styles.labProblemOption}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={checked && labProblemIds.length <= LAB_MIN_PROBLEM_COUNT}
                          onChange={() => toggleLabProblem(item.id)}
                        />
                        <span>
                          <strong>{t(`challengeLab.catalog.${item.id}.title`)}</strong>
                          <span className={styles.helpText}>{t(`challengeLab.catalog.${item.id}.description`)}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </fieldset>
          )}

          {kind === 'mission_critique' && (
            <p className={styles.noConfigText}>{t('builder.noConfigurationRequiredForMissionCritique')}</p>
          )}
        </div>

        <div className={styles.footer}>
          <button className="btn-secondary" onClick={onClose}>
            {t('builder.cancel')}
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={kind === 'crossword' && !selectedCrossword}>
            {t('builder.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
