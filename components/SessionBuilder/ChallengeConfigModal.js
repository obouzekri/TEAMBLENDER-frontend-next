'use client';

import styles from './ChallengeConfigModal.module.css';
import { useState, useEffect } from 'react';

export default function ChallengeConfigModal({ challengeId, challenge, onSave, onClose }) {
  const [config, setConfig] = useState(challenge?.config || {});

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
    if ((current?.engine_key || '').toLowerCase() === 'local_page_v1' && fingerprint.includes('labyrinthe')) {
      return 'labyrinthe';
    }
    if (fingerprint.includes('labyrinthe')) {
      return 'labyrinthe';
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

  const handleSave = () => {
    onSave(config);
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
          <p className={styles.infoText}>
            Les options de configuration dépendent du type d'activité.
          </p>

          {kind === 'copuzzle' && (
            <>
              <div className={styles.configField}>
                <label htmlFor="rows" className={styles.label}>Lignes de grille</label>
                <input
                  id="rows"
                  type="number"
                  min="2"
                  max="16"
                  value={numberValue('grid.rows', 4)}
                  onChange={(e) => updateValue('grid.rows', Number(e.target.value || 4))}
                  className={styles.input}
                />
              </div>

              <div className={styles.configField}>
                <label htmlFor="cols" className={styles.label}>Colonnes de grille</label>
                <input
                  id="cols"
                  type="number"
                  min="2"
                  max="16"
                  value={numberValue('grid.cols', 4)}
                  onChange={(e) => updateValue('grid.cols', Number(e.target.value || 4))}
                  className={styles.input}
                />
              </div>

              <div className={styles.configField}>
                <label htmlFor="durationSeconds" className={styles.label}>Timer (secondes)</label>
                <input
                  id="durationSeconds"
                  type="number"
                  min="30"
                  max="7200"
                  value={numberValue('timer.duration_seconds', (challenge?.duration || 10) * 60)}
                  onChange={(e) => updateValue('timer.duration_seconds', Number(e.target.value || 600))}
                  className={styles.input}
                />
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

              <label className={styles.configField}>
                <span className={styles.label}>Activer le timer</span>
                <input
                  type="checkbox"
                  checked={boolValue('timer.enabled', true)}
                  onChange={(e) => updateValue('timer.enabled', e.target.checked)}
                />
              </label>

              <label className={styles.configField}>
                <span className={styles.label}>Activer le chat</span>
                <input
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

          {kind === 'labyrinthe' && (
            <>
              <div className={styles.configField}>
                <label htmlFor="labTitle" className={styles.label}>Titre</label>
                <input
                  id="labTitle"
                  type="text"
                  value={stringValue('title', challenge?.name || '')}
                  onChange={(e) => updateValue('title', e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.configField}>
                <label htmlFor="labRoute" className={styles.label}>Route locale</label>
                <input
                  id="labRoute"
                  type="text"
                  value={stringValue('route', challenge?.route || 'labyrinthe_challenge.html')}
                  onChange={(e) => updateValue('route', e.target.value)}
                  className={styles.input}
                />
              </div>
            </>
          )}

          {kind === 'phrase' && (
            <>
              <div className={styles.configField}>
                <label htmlFor="phraseText" className={styles.label}>Phrase</label>
                <textarea
                  id="phraseText"
                  rows="3"
                  value={stringValue('textePhrase', '')}
                  onChange={(e) => updateValue('textePhrase', e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.configField}>
                <label htmlFor="phrasePlayers" className={styles.label}>Nombre de joueurs</label>
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
