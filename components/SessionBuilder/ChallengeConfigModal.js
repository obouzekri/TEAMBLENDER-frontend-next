'use client';

import styles from './ChallengeConfigModal.module.css';
import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/config';

const COPUZZLE_DEFAULT_IMAGES = Object.freeze([
  { value: '/copuzzle/default-blue.svg', label: 'Par defaut - Horizon bleu' },
  { value: '/copuzzle/default-grid.svg', label: 'Par defaut - Grille collaboration' },
  { value: '/copuzzle/default-sunrise.svg', label: 'Par defaut - Sunrise team' },
]);

const PHRASE_DEFAULT_LIBRARY = Object.freeze([
  {
    id: 'tpl_cohesion',
    label: 'Seul on va plus vite ensemble on va plus loin (facile, 4 joueurs)',
    phrase: 'Seul on va plus vite ensemble on va plus loin',
    players: 4,
    fauxMots: 2,
    indices: 2,
    timerTotal: 420,
    difficulte: 'facile',
  },
  {
    id: 'tpl_communication',
    label: 'La parole est d argent mais le silence est d or (moyen, 5 joueurs)',
    phrase: 'La parole est d argent mais le silence est d or',
    players: 5,
    fauxMots: 3,
    indices: 2,
    timerTotal: 480,
    difficulte: 'moyen',
  },
  {
    id: 'tpl_innovation',
    label: 'Impossible n est pas francais (difficile, 6 joueurs)',
    phrase: 'Impossible n est pas francais',
    players: 6,
    fauxMots: 4,
    indices: 1,
    timerTotal: 540,
    difficulte: 'difficile',
  },
  {
    id: 'tpl_union_force',
    label: 'L union fait la force (facile, 4 joueurs)',
    phrase: 'L union fait la force',
    players: 4,
    fauxMots: 2,
    indices: 2,
    timerTotal: 360,
    difficulte: 'facile',
  },
  {
    id: 'tpl_perseverance',
    label: 'Qui ne tente rien n a rien (moyen, 5 joueurs)',
    phrase: 'Qui ne tente rien n a rien',
    players: 5,
    fauxMots: 3,
    indices: 2,
    timerTotal: 420,
    difficulte: 'moyen',
  },
  {
    id: 'tpl_ambition',
    label: 'A coeur vaillant rien d impossible (difficile, 6 joueurs)',
    phrase: 'A coeur vaillant rien d impossible',
    players: 6,
    fauxMots: 4,
    indices: 1,
    timerTotal: 480,
    difficulte: 'difficile',
  },
]);

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function withCopuzzleDefaults(config = {}) {
  const rows = clampInt(config?.grid?.rows, 4, 2, 16);
  const cols = clampInt(config?.grid?.cols, 4, 2, 16);
  const duration = clampInt(config?.timer?.duration_seconds, 1200, 30, 7200);
  const warning = clampInt(config?.timer?.warning_threshold_seconds, 60, 10, 600);
  const participants = clampInt(config?.participants?.expected_count, 4, 1, 20);
  const imageUrl = String(config?.image_url || config?.image?.src || '').trim() || '/copuzzle/default-blue.svg';

  return {
    ...(config || {}),
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
      ...(config?.participants && typeof config.participants === 'object' ? config.participants : {}),
      expected_count: participants,
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
  const mode = String(config?.mode || 'template').toLowerCase() === 'custom' ? 'custom' : 'template';
  const template = getPhraseTemplate(config?.templateId);

  const phrase = mode === 'custom'
    ? sanitizePhraseText(config?.textePhrase, template.phrase)
    : sanitizePhraseText(template.phrase, PHRASE_DEFAULT_LIBRARY[0].phrase);

  const nombreJoueurs = clampInt(config?.nombreJoueurs, template.players, 2, 16);
  const nombreFauxMots = clampInt(config?.nombreFauxMots, template.fauxMots, 0, 12);
  const nombreIndices = clampInt(config?.nombreIndices, template.indices, 0, 12);
  const timerTotal = clampInt(config?.timerTotal, template.timerTotal, 60, 3600);
  const modeCommunication = String(config?.modeCommunication || 'libre').toLowerCase() === 'restreint' ? 'restreint' : 'libre';

  return {
    ...(config || {}),
    type: 'phrase_collaborative',
    mode,
    templateId: mode === 'template' ? template.id : (config?.templateId || null),
    textePhrase: phrase,
    nombreJoueurs,
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

export default function ChallengeConfigModal({ challengeId, challenge, onSave, onClose }) {
  const [config, setConfig] = useState(challenge?.config || {});
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');

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
    if ((current?.engine_key || '').toLowerCase() === 'labyrinthe_live_v1') {
      return 'labyrinthe_live';
    }
    if ((current?.engine_key || '').toLowerCase() === 'escape_room_v1' || fingerprint.includes('salle') || fingerprint.includes('escape')) {
      return 'escape_room';
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
      onSave(withCopuzzleDefaults(config));
      return;
    }
    if (kind === 'phrase') {
      onSave(withPhraseDefaults(config));
      return;
    }
    onSave(config);
  };

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
    const reader = new FileReader();
    reader.onload = (e) => {
      updateValue('image_url', e.target.result);
      updateValue('image.src', e.target.result);
      setIsUploadingImage(false);
    };
    reader.onerror = () => {
      setUploadError('Impossible de lire le fichier image.');
      setIsUploadingImage(false);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
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
                <label htmlFor="copuzzleDefaultImage" className={styles.label}>Image par defaut</label>
                <select
                  id="copuzzleDefaultImage"
                  className={styles.input}
                  value={COPUZZLE_DEFAULT_IMAGES.some((opt) => opt.value === stringValue('image_url', '')) ? stringValue('image_url', '') : ''}
                  onChange={(e) => {
                    const value = String(e.target.value || '').trim();
                    if (!value) return;
                    updateValue('image_url', value);
                    updateValue('image.src', value);
                  }}
                >
                  <option value="">Selectionner une image par defaut</option>
                  {COPUZZLE_DEFAULT_IMAGES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>

                <label htmlFor="imageUrl" className={styles.label}>Image du puzzle (URL)</label>
                <input
                  id="imageUrl"
                  type="url"
                  placeholder="URL personnalisee (optionnel)"
                  value={stringValue('image_url', '')}
                  onChange={(e) => {
                    updateValue('image_url', e.target.value);
                    updateValue('image.src', e.target.value);
                  }}
                  className={styles.input}
                />

                <label htmlFor="copuzzleUpload" className={styles.label} style={{ marginTop: '10px' }}>
                  Ou uploader une image (JPG/PNG)
                </label>
                <span className={styles.helpText}>
                  (i) Recommande: grille 4x4 ou 5x5, format JPEG/PNG, idealement image carree.
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

                {stringValue('image_url', '') && (
                  <img
                    src={stringValue('image_url', '')}
                    alt="Apercu puzzle"
                    style={{ marginTop: '8px', maxWidth: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    onLoad={(e) => { e.currentTarget.style.display = 'block'; }}
                  />
                )}
              </div>

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
                <label htmlFor="expectedCount" className={styles.label}>Nombre de participants</label>
                <input
                  id="expectedCount"
                  type="number"
                  min="1"
                  max="20"
                  value={numberValue('participants.expected_count', 4)}
                  onChange={(e) => {
                    updateValue('participants.expected_count', Number(e.target.value || 4));
                    updateValue('participants.expected_count_auto', false);
                  }}
                  className={styles.input}
                />
                <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px', display: 'block' }}>
                  Détermine combien de pièces chaque participant reçoit (total ÷ participants)
                </span>
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
                      updateValue('nombreJoueurs', template.players);
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

              {/* Nombre de joueurs */}
              <div className={styles.configField}>
                <label htmlFor="phrasePlayers" className={styles.label}>Nombre de joueurs (2-16)</label>
                <input
                  id="phrasePlayers"
                  type="number"
                  min="2"
                  max="16"
                  value={numberValue('nombreJoueurs', 4)}
                  onChange={(e) => updateValue('nombreJoueurs', Number(e.target.value || 4))}
                  className={styles.input}
                />
              </div>

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
