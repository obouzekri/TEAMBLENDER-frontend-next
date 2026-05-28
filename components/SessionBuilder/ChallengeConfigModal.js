'use client';

import styles from './ChallengeConfigModal.module.css';
import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/config';

const COPUZZLE_ADMIN_REFERENCE_IMAGES = Object.freeze([
  { id: 'default_1', title: 'Image administrateur 1', src: '/copuzzle/default-blue.svg' },
  { id: 'default_2', title: 'Image administrateur 2', src: '/copuzzle/default-grid.svg' },
  { id: 'default_3', title: 'Image administrateur 3', src: '/copuzzle/default-sunrise.svg' },
]);

const PHRASE_DEFAULT_LIBRARY = Object.freeze([
  {
    id: 'tpl_matchs_championnats',
    label: 'Le talent fait gagner des matchs... (moyen)',
    phrase: "Le talent fait gagner des matchs mais le travail d'équipe gagne des championnats",
    fauxMots: 3,
    indices: 2,
    timerTotal: 510,
    difficulte: 'moyen',
  },
  {
    id: 'tpl_reussite_ensemble',
    label: 'Se réunir est un début... (moyen)',
    phrase: "Se réunir est un début, rester ensemble est un progrès, travailler ensemble est la réussite",
    fauxMots: 3,
    indices: 2,
    timerTotal: 540,
    difficulte: 'moyen',
  },
  {
    id: 'tpl_grandes_choses',
    label: 'Les grandes choses en entreprise... (facile)',
    phrase: 'Les grandes choses en entreprise ne sont jamais faites par une seule personne',
    fauxMots: 2,
    indices: 2,
    timerTotal: 450,
    difficulte: 'facile',
  },
  {
    id: 'tpl_testez_apprenez',
    label: 'Testez vite, échouez vite... (difficile)',
    phrase: 'Testez vite, échouez vite, apprenez plus vite',
    fauxMots: 4,
    indices: 1,
    timerTotal: 420,
    difficulte: 'difficile',
  },
  {
    id: 'tpl_plus_loin',
    label: 'Seul on va plus vite... (facile)',
    phrase: 'Seul on va plus vite, ensemble on va plus loin',
    fauxMots: 2,
    indices: 2,
    timerTotal: 420,
    difficulte: 'facile',
  },
  {
    id: 'tpl_aiguiser_hache',
    label: 'Donnez-moi six heures pour couper... (difficile)',
    phrase: "Donnez-moi six heures pour couper un arbre, j'en passerai quatre à aiguiser la hache",
    fauxMots: 3,
    indices: 1,
    timerTotal: 570,
    difficulte: 'difficile',
  },
  {
    id: 'tpl_montagne_pierres',
    label: 'Celui qui déplace une montagne... (moyen)',
    phrase: 'Celui qui déplace une montagne commence par déplacer de petites pierres',
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
    name: 'Pont Croise',
    difficulty: 'moyen',
    max_dims: { x: 8, y: 8, z: 4 },
    target_cube_count: 32,
    palette: ['#2D9CDB', '#EB5757', '#F2C94C']
  },
  {
    id: 'agora_pixel',
    name: 'Agora Pixel',
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
      const src = String(item?.src || item?.url || item?.value || '').trim();
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

  const configuredImage = String(config?.image_url || config?.image?.src || '').trim();
  if (!configuredImage) return 'defaults';

  const usesDefaultImage = defaultImages.some((item) => item.src === configuredImage);
  return usesDefaultImage ? 'defaults' : 'custom';
}

function resolveCopuzzleDefaultImageId(config, defaultImages) {
  const explicitId = String(config?.default_image_id || '').trim();
  if (explicitId && defaultImages.some((item) => item.id === explicitId)) {
    return explicitId;
  }

  const configuredImage = String(config?.image_url || config?.image?.src || '').trim();
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
  const customImageUrl = String(config?.image_url || config?.image?.src || '').trim();
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
  const nombreIndices = clampInt(config?.nombreIndices, template.indices, 0, 12);
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
      ...(config?.timing && typeof config.timing === 'object' ? config.timing : {}),
      selecting_ms: clampInt(config?.timing?.selecting_ms, 30000, 10000, 120000),
      voting_ms: clampInt(config?.timing?.voting_ms, 30000, 10000, 120000),
      reveal_ms: clampInt(config?.timing?.reveal_ms, 5000, 0, 60000),
      round_result_ms: clampInt(config?.timing?.round_result_ms, 5000, 0, 60000),
      next_turn_ms: clampInt(config?.timing?.next_turn_ms, 0, 0, 10000),
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
  const durationSeconds = clampInt(
    config?.timer?.duration_seconds ?? config?.timer_seconds,
    0,
    0,
    1800
  );
  const timerEnabled = durationSeconds > 0 && config?.timer?.enabled !== false;

  return {
    ...(config || {}),
    rows: clampInt(config?.rows, 8, 6, 14),
    cols: clampInt(config?.cols, 8, 6, 14),
    complexity: Math.min(0.9, Math.max(0.3, Number(config?.complexity || 0.62))),
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
      maxCubes: clampInt(config?.settings?.maxCubes, 50, 8, 400),
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
      theme: String(config?.creative?.theme || 'Construisez une structure qui symbolise la collaboration.').trim(),
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

export default function ChallengeConfigModal({ challenge, onSave, onClose }) {
  const [config, setConfig] = useState(challenge?.config || {});
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const copuzzleDefaultImages = normalizeCopuzzleDefaultImages(challenge?.engine_config?.default_images);

  useEffect(() => {
    setConfig(challenge?.config || {});
  }, [challenge]);

  function getChallengeKind(current) {
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
    return 'generic';
  }

  const kind = getChallengeKind(challenge);

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
      setUploadError('Format non supporté. Utilisez JPG ou PNG.');
      event.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Image trop volumineuse (max 8 Mo).');
      event.target.value = '';
      return;
    }

    setIsUploadingImage(true);
    const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt') || '';
    if (!token) {
      setUploadError('Session expirée. Veuillez vous reconnecter.');
      setIsUploadingImage(false);
      event.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    fetch(getApiUrl('/challenges/upload-image'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || `Upload impossible (${response.status})`);
        }

        const uploadedUrl = String(payload.url || payload.path || '').trim();
        if (!uploadedUrl) {
          throw new Error('URL image manquante dans la reponse upload.');
        }

        updateValue('image_source_mode', 'custom');
        updateValue('image_url', uploadedUrl);
        updateValue('image.src', uploadedUrl);
      })
      .catch((error) => {
        setUploadError(error.message || 'Upload image impossible.');
      })
      .finally(() => {
        setIsUploadingImage(false);
        event.target.value = '';
      });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Configurer: {challenge?.name}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {challenge?.description ? (
            <p className={styles.challengeDescription}>{challenge.description}</p>
          ) : null}
          <p className={styles.infoText}>
            Les options de configuration dépendent du type d'activité.
          </p>

          {kind === 'copuzzle' && (
            <>
              <div className={styles.configField}>
                <label className={styles.label}>Source des images</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={resolveCopuzzleSourceMode(config, copuzzleDefaultImages) === 'defaults'}
                      onChange={() => updateValue('image_source_mode', 'defaults')}
                    />
                    <span>Utiliser les images par défaut admin</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={resolveCopuzzleSourceMode(config, copuzzleDefaultImages) === 'custom'}
                      onChange={() => updateValue('image_source_mode', 'custom')}
                    />
                    <span>Uploader image personnalisée</span>
                  </label>
                </div>
              </div>

              {resolveCopuzzleSourceMode(config, copuzzleDefaultImages) === 'defaults' ? (
                <div className={styles.configField}>
                  <label htmlFor="copuzzleDefaultImage" className={styles.label}>Image par défaut</label>
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
                  <div className={styles.defaultImageGrid}>
                    {copuzzleDefaultImages.map((option) => {
                      const selected = resolveCopuzzleDefaultImageId(config, copuzzleDefaultImages) === option.id;
                      return (
                        <div
                          key={`preview-${option.id}`}
                          className={`${styles.defaultImageCard}${selected ? ` ${styles.defaultImageCardSelected}` : ''}`}
                        >
                          <img src={option.src} alt={option.title} className={styles.defaultImageThumb} />
                          <span className={styles.defaultImageLabel}>{option.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.configField}>
                    <label htmlFor="copuzzleUpload" className={styles.label}>Uploader une image (JPG/PNG)</label>
                    <span className={styles.helpText}>
                      Recommandé: grille 4x4 ou 5x5, format JPEG/PNG, idéalement image carrée.
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
                      <p style={{ marginTop: '6px', color: '#6b7280', fontSize: '12px' }}>Upload en cours...</p>
                    ) : null}
                    {uploadError ? (
                      <p style={{ marginTop: '6px', color: '#dc2626', fontSize: '12px' }}>{uploadError}</p>
                    ) : null}
                  </div>
                </>
              )}

              {(() => {
                const sourceMode = resolveCopuzzleSourceMode(config, copuzzleDefaultImages);
                const selectedDefault = copuzzleDefaultImages.find((item) => item.id === resolveCopuzzleDefaultImageId(config, copuzzleDefaultImages)) || copuzzleDefaultImages[0] || null;
                const previewSrc = sourceMode === 'custom'
                  ? stringValue('image_url', '')
                  : String(selectedDefault?.src || '');
                if (!previewSrc) return null;
                return (
                  <img
                    src={previewSrc}
                    alt="Apercu puzzle"
                    style={{ marginTop: '8px', maxWidth: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    onLoad={(e) => { e.currentTarget.style.display = 'block'; }}
                  />
                );
              })()}

              <div className={styles.configField}>
                <label htmlFor="matrixSize" className={styles.label}>Taille de matrice</label>
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
                <span className={styles.helpText}>Appliqué à la fois aux lignes et aux colonnes.</span>
              </div>

              <div className={styles.configField}>
                <label htmlFor="durationSeconds" className={styles.label}>Timer (secondes)</label>
                <input
                  id="durationSeconds"
                  type="number"
                  min="30"
                  max="7200"
                  value={numberValue('timer.duration_seconds', 1200)}
                  onChange={(e) => updateValue('timer.duration_seconds', Number(e.target.value || 1200))}
                  className={styles.input}
                />
                <span className={styles.helpText}>Par defaut: 1200 secondes (20 min).</span>
              </div>

              <div className={styles.configField}>
                <label htmlFor="warningSeconds" className={styles.label}>Seuil d'alerte (secondes)</label>
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
                <span className={styles.label}>Activer le timer</span>
                <input
                  id="copuzzleTimerEnabled"
                  type="checkbox"
                  checked={boolValue('timer.enabled', true)}
                  onChange={(e) => updateValue('timer.enabled', e.target.checked)}
                />
              </label>

              <label className={`${styles.configField} ${styles.checkboxRow}`} htmlFor="copuzzleChatEnabled">
                <span className={styles.label}>Activer le chat</span>
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
                <label htmlFor="mazeRows" className={styles.label}>Lignes</label>
                <input
                  id="mazeRows"
                  type="number"
                  min="6"
                  max="14"
                  value={numberValue('rows', 8)}
                  onChange={(e) => updateValue('rows', Number(e.target.value || 8))}
                  className={styles.input}
                />
              </div>

              <div className={styles.configField}>
                <label htmlFor="mazeCols" className={styles.label}>Colonnes</label>
                <input
                  id="mazeCols"
                  type="number"
                  min="6"
                  max="14"
                  value={numberValue('cols', 8)}
                  onChange={(e) => updateValue('cols', Number(e.target.value || 8))}
                  className={styles.input}
                />
              </div>

              <div className={styles.configField}>
                <label htmlFor="mazeComplexity" className={styles.label}>Complexité (0.3 à 0.9)</label>
                <input
                  id="mazeComplexity"
                  type="number"
                  min="0.3"
                  max="0.9"
                  step="0.01"
                  value={numberValue('complexity', 0.62)}
                  onChange={(e) => updateValue('complexity', Number(e.target.value || 0.62))}
                  className={styles.input}
                />
              </div>

              <div className={styles.configField}>
                <label htmlFor="mazeDurationSeconds" className={styles.label}>Durée du challenge (secondes)</label>
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
                <span className={styles.helpText}>0 désactive le chrono. Sinon la durée pilote le timer live du labyrinthe.</span>
              </div>
            </>
          )}

          {kind === 'phrase' && (
            <>
              {/* Mode: Template ou Custom */}
              <div className={styles.configField}>
                <label className={styles.label}>Mode de phrase</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={stringValue('mode', 'template') === 'template'}
                      onChange={() => updateValue('mode', 'template')}
                    />
                    <span>Prédéfini</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={stringValue('mode', 'template') === 'custom'}
                      onChange={() => updateValue('mode', 'custom')}
                    />
                    <span>Personnalisé</span>
                  </label>
                </div>
              </div>

              {/* Templates disponibles */}
              {stringValue('mode', 'template') === 'template' && (
                <div className={styles.configField}>
                  <label htmlFor="phraseTemplate" className={styles.label}>Selectionner une phrase connue</label>
                  <select
                    id="phraseTemplate"
                    value={stringValue('templateId', PHRASE_DEFAULT_LIBRARY[0].id)}
                    onChange={(e) => {
                      const nextTemplateId = String(e.target.value || PHRASE_DEFAULT_LIBRARY[0].id);
                      const template = getPhraseTemplate(nextTemplateId);
                      updateValue('templateId', nextTemplateId);
                      updateValue('textePhrase', template.phrase);
                      updateValue('nombreFauxMots', template.fauxMots);
                      updateValue('nombreIndices', template.indices);
                      updateValue('timerTotal', template.timerTotal);
                      updateValue('difficulte', template.difficulte);
                    }}
                    className={styles.input}
                  >
                    {PHRASE_DEFAULT_LIBRARY.map((template) => (
                      <option key={template.id} value={template.id}>{template.label}</option>
                    ))}
                  </select>
                  <p className={styles.helpText}>
                    Survolez l'aperçu pour voir la phrase complete:
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

              {/* Phrase personnalisée */}
              {stringValue('mode', 'template') === 'custom' && (
                <div className={styles.configField}>
                  <label htmlFor="phraseCustom" className={styles.label}>Votre phrase</label>
                  <textarea
                    id="phraseCustom"
                    rows="3"
                    placeholder="Ex: La collaboration est la clé du succès"
                    value={stringValue('textePhrase', '')}
                    onChange={(e) => updateValue('textePhrase', e.target.value)}
                    className={styles.input}
                  />
                </div>
              )}

              {/* Options avancées */}
              <div className={styles.configField}>
                <label htmlFor="phraseFauxMots" className={styles.label}>Nombre de faux mots</label>
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
                <label htmlFor="phraseIndices" className={styles.label}>Nombre d'indices</label>
                <input
                  id="phraseIndices"
                  type="number"
                  min="0"
                  max="12"
                  value={numberValue('nombreIndices', 2)}
                  onChange={(e) => updateValue('nombreIndices', Number(e.target.value || 2))}
                  className={styles.input}
                />
              </div>

              <div className={styles.configField}>
                <label htmlFor="phraseTimer" className={styles.label}>Durée (secondes)</label>
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
                  <span>Chat activé</span>
                </label>
              </div>
            </>
          )}

          {kind === 'vrai_ou_mensonge' && (
            <>
              <div className={styles.configField}>
                <label htmlFor="vomRoundsPerParticipant" className={styles.label}>Cycles par participant</label>
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
                  Par défaut: 3 cycles si aucune configuration n'est définie.
                </span>
              </div>

              <div className={styles.configField}>
                <label htmlFor="vomChoosingSeconds" className={styles.label}>Temps choix affirmation (s)</label>
                <input
                  id="vomChoosingSeconds"
                  type="number"
                  min="10"
                  max="120"
                  value={secondsValue('timing.selecting_ms', 30000)}
                  onChange={(e) => updateValue('timing.selecting_ms', Math.max(0, Number(e.target.value || 0)) * 1000)}
                  className={styles.input}
                />
              </div>

              <div className={styles.configField}>
                <label htmlFor="vomVotingSeconds" className={styles.label}>Temps réponse participants (s)</label>
                <input
                  id="vomVotingSeconds"
                  type="number"
                  min="10"
                  max="120"
                  value={secondsValue('timing.voting_ms', 30000)}
                  onChange={(e) => updateValue('timing.voting_ms', Math.max(0, Number(e.target.value || 0)) * 1000)}
                  className={styles.input}
                />
              </div>

              <div className={styles.configField}>
                <label htmlFor="vomRoundResultSeconds" className={styles.label}>Écran de transition + classement (s)</label>
                <input
                  id="vomRoundResultSeconds"
                  type="number"
                  min="0"
                  max="60"
                  value={secondsValue('timing.round_result_ms', 5000)}
                  onChange={(e) => updateValue('timing.round_result_ms', Math.max(0, Number(e.target.value || 0)) * 1000)}
                  className={styles.input}
                />
                <span className={styles.helpText}>Recommandé: 5 à 10 secondes.</span>
              </div>
            </>
          )}

          {kind === 'escape_room' && (
            <>
              {/* Configuration de session (overrides) */}
              <div className={styles.configField}>
                <label htmlFor="erDuration" className={styles.label}>Durée (secondes)</label>
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
                <label htmlFor="erMaxAttempts" className={styles.label}>Tentatives max par énigme</label>
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

              {/* Affichage des énigmes configurées (depuis engine_config) */}
              {Array.isArray(challenge?.engine_config?.enigmes) && challenge.engine_config.enigmes.length > 0 ? (
                <div style={{ marginTop: '16px' }}>
                  <p className={styles.label} style={{ marginBottom: '8px', fontWeight: 600 }}>
                    Énigmes configurées ({challenge.engine_config.enigmes.length})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {challenge.engine_config.enigmes.map((enigme, idx) => (
                      <div
                        key={enigme.id || idx}
                        style={{
                          background: '#f8f9fa',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          fontSize: '13px',
                        }}
                      >
                        <strong style={{ color: '#374151' }}>{idx + 1}. {enigme.label}</strong>
                        {enigme.description && (
                          <p style={{ margin: '4px 0 0', color: '#6b7280', lineHeight: '1.4' }}>{enigme.description}</p>
                        )}
                        <div style={{ marginTop: '6px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#059669', fontFamily: 'monospace', fontSize: '12px' }}>
                            ✓ Réponse: <strong>{enigme.expected_answer}</strong>
                          </span>
                          {enigme.hint && (
                            <span style={{ color: '#6b7280', fontSize: '12px' }}>
                              💡 {enigme.hint}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
                    Les énigmes sont gérées depuis l'administration du challenge.
                  </p>
                </div>
              ) : (
                <p className={styles.noConfigText} style={{ marginTop: '12px' }}>
                  Aucune énigme trouvée dans la configuration du challenge.
                </p>
              )}
            </>
          )}

          {kind === 'pixel_architect' && (
            <>
              <div className={styles.configField}>
                <label className={styles.label}>Mode de challenge</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={stringValue('mode', 'replication') === 'replication'}
                      onChange={() => updateValue('mode', 'replication')}
                    />
                    <span>Replication</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={stringValue('mode', 'replication') === 'creatif'}
                      onChange={() => updateValue('mode', 'creatif')}
                    />
                    <span>Creatif</span>
                  </label>
                </div>
              </div>

              <div className={styles.configField}>
                <label className={styles.label}>Mode de collaboration</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={stringValue('collaborationMode', 'standard') === 'standard'}
                      onChange={() => updateValue('collaborationMode', 'standard')}
                    />
                    <span>Standard</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={stringValue('collaborationMode', 'standard') === 'avance'}
                      onChange={() => updateValue('collaborationMode', 'avance')}
                    />
                    <span>Avance (roles)</span>
                  </label>
                </div>
              </div>

              {stringValue('mode', 'replication') === 'replication' ? (
                <div className={styles.configField}>
                  <label htmlFor="pixelTemplate" className={styles.label}>Template</label>
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
                      <option key={template.id} value={template.id}>{template.name} ({template.difficulty})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className={styles.configField}>
                  <label htmlFor="pixelTheme" className={styles.label}>Theme creatif</label>
                  <input
                    id="pixelTheme"
                    className={styles.input}
                    type="text"
                    value={stringValue('creative.theme', 'Construisez une structure qui symbolise la collaboration.')}
                    onChange={(e) => updateValue('creative.theme', e.target.value)}
                  />
                </div>
              )}

              <div className={styles.configField}>
                <label htmlFor="pixelDuration" className={styles.label}>Temps (secondes)</label>
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
                <label htmlFor="pixelMaxCubes" className={styles.label}>Nombre max de cubes</label>
                <input
                  id="pixelMaxCubes"
                  className={styles.input}
                  type="number"
                  min="8"
                  max="400"
                  value={numberValue('settings.maxCubes', 50)}
                  onChange={(e) => updateValue('settings.maxCubes', Number(e.target.value || 50))}
                />
              </div>

              <div className={styles.configField}>
                <label htmlFor="pixelMaxColors" className={styles.label}>Nombre de couleurs</label>
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
                <label htmlFor="pixelDifficulty" className={styles.label}>Difficulte</label>
                <select
                  id="pixelDifficulty"
                  className={styles.input}
                  value={stringValue('difficulty', 'moyen')}
                  onChange={(e) => updateValue('difficulty', e.target.value)}
                >
                  <option value="facile">facile</option>
                  <option value="moyen">moyen</option>
                  <option value="difficile">difficile</option>
                </select>
              </div>

              <label className={`${styles.configField} ${styles.checkboxRow}`} htmlFor="pixelHintsEnabled">
                <span className={styles.label}>Activer les indices</span>
                <input
                  id="pixelHintsEnabled"
                  type="checkbox"
                  checked={boolValue('settings.hintsEnabled', true)}
                  onChange={(e) => updateValue('settings.hintsEnabled', e.target.checked)}
                />
              </label>

              <label className={`${styles.configField} ${styles.checkboxRow}`} htmlFor="pixelChatEnabled">
                <span className={styles.label}>Activer le chat</span>
                <input
                  id="pixelChatEnabled"
                  type="checkbox"
                  checked={boolValue('settings.chatEnabled', true)}
                  onChange={(e) => updateValue('settings.chatEnabled', e.target.checked)}
                />
              </label>

              <label className={`${styles.configField} ${styles.checkboxRow}`} htmlFor="pixelTimerEnabled">
                <span className={styles.label}>Activer le chrono</span>
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
                <p className={styles.noConfigText}>Aucune configuration requise pour cette activité.</p>
              )}

              {Object.entries(config || {}).map(([key, value]) => (
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
        </div>

        <div className={styles.footer}>
          <button className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
