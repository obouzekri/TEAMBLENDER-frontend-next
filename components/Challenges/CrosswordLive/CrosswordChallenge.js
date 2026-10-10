'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import useI18n from '@/lib/i18n/useI18n';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useConfirmedAction from '@/lib/challenges/useConfirmedAction';
import ChallengeHeader from '../ChallengeHeader';
import ChallengeRulesPanel from '../ChallengeRulesPanel';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeActionFeedback from '../ChallengeActionFeedback';
import styles from './CrosswordChallenge.module.css';

const COPY = {
  fr: {
    title: 'Mots croisés en équipe', loading: 'Chargement de la grille…', across: 'Horizontal', down: 'Vertical',
    board: 'Grille de mots croisés', help: 'Choisissez une case ou une définition. Flèches : déplacer la sélection. Espace : changer de direction à une intersection. Début / Fin : première / dernière case du mot.',
    row: 'Ligne', col: 'colonne', empty: 'vide', found: 'Trouvé', letters: 'lettres', answer: 'Votre réponse', submit: 'Proposer le mot',
    progress: 'Progression collective', leaderboard: 'Classement', activity: 'Dernières découvertes', none: 'Aucune découverte pour le moment.',
    points: 'points', finished: 'Partie terminée', unresolved: 'Mots non résolus', perfect: 'Bravo ! Toute la grille est résolue.',
    stop: 'Terminer la partie', start: 'Démarrer la partie', waiting: 'En attente du démarrage par l’animateur.',
    offline: 'Connexion interrompue. Votre brouillon est conservé.', sending: 'Vérification en cours…',
    timeout: 'Pas de confirmation reçue. Votre brouillon est conservé ; vous pouvez réessayer.',
    conflict: 'Cette réponse ne correspond pas aux lettres déjà révélées.', length: 'Saisissez le nombre de lettres indiqué.',
    correct: 'Bravo, mot trouvé !', incorrect: 'Ce n’est pas le bon mot. Essayez encore.',
    already_found: 'Ce mot a déjà été trouvé', rate_limited: 'Trop de tentatives. Patientez avant de réessayer.',
    invalid: 'Réponse invalide. Vérifiez votre saisie.', closed: 'La partie est terminée.', forbidden: 'Vous ne pouvez pas proposer de réponse.',
    failed: 'Action refusée. Votre brouillon est conservé.', by: 'par', cooldown: 'Nouvelle tentative dans', seconds: 's',
    solvedDraft: 'Mot déjà trouvé. Votre brouillon est conservé.', objective: 'Résolvez ensemble les définitions pour compléter la grille.',
  },
  en: {
    title: 'Team crossword', loading: 'Loading the grid…', across: 'Across', down: 'Down',
    board: 'Crossword board', help: 'Choose a cell or a clue. Arrow keys: move selection. Space: switch direction at an intersection. Home / End: first / last cell of the word.',
    row: 'Row', col: 'column', empty: 'empty', found: 'Found', letters: 'letters', answer: 'Your answer', submit: 'Submit word',
    progress: 'Team progress', leaderboard: 'Leaderboard', activity: 'Latest discoveries', none: 'No discoveries yet.',
    points: 'points', finished: 'Game over', unresolved: 'Unresolved words', perfect: 'Well done! The whole grid is solved.',
    stop: 'End game', start: 'Start game', waiting: 'Waiting for the facilitator to start.',
    offline: 'Connection interrupted. Your draft is saved.', sending: 'Checking your answer…',
    timeout: 'No confirmation received. Your draft is saved; you can try again.',
    conflict: 'This answer conflicts with the letters already revealed.', length: 'Enter the indicated number of letters.',
    correct: 'Well done, word found!', incorrect: 'Not the right word. Try again.',
    already_found: 'This word has already been found', rate_limited: 'Too many attempts. Wait before trying again.',
    invalid: 'Invalid answer. Check your entry.', closed: 'The game is over.', forbidden: 'You cannot submit an answer.',
    failed: 'Action rejected. Your draft is saved.', by: 'by', cooldown: 'Try again in', seconds: 's',
    solvedDraft: 'Word already found. Your draft is saved.', objective: 'Solve the clues together to complete the grid.',
  },
};

export function normalizeCrosswordAnswer(value) {
  return String(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().replace(/[\s\-’']/gu, '');
}

export function buildCrosswordCells(grid) {
  const cells = new Map();
  for (const word of grid?.words || []) {
    const revealed = word.solvedBy != null ? normalizeCrosswordAnswer(word.answer) : '';
    for (let index = 0; index < word.length; index += 1) {
      const row = word.row + (word.direction === 'down' ? index : 0);
      const col = word.col + (word.direction === 'across' ? index : 0);
      const key = `${row}:${col}`;
      const cell = cells.get(key) || { row, col, words: [], letter: '', number: null };
      cell.words.push(word);
      if (index === 0) cell.number = cell.number == null ? word.number : Math.min(cell.number, word.number);
      if (revealed[index]) cell.letter = revealed[index];
      cells.set(key, cell);
    }
  }
  return cells;
}

export function hasCrosswordConflict(word, answer, cells) {
  return Array.from(answer).some((letter, index) => {
    const row = word.row + (word.direction === 'down' ? index : 0);
    const col = word.col + (word.direction === 'across' ? index : 0);
    const revealed = cells.get(`${row}:${col}`)?.letter;
    return revealed && revealed !== letter;
  });
}

export default function CrosswordChallenge({ runtimePayload, socket, context, onChallengeCompleted }) {
  const { locale } = useI18n();
  const copy = COPY[locale === 'en' ? 'en' : 'fr'];
  const { state, error, connected, isFacilitator, emitEvent } = useRealtimeChallenge({ runtimePayload, socket, context, onChallengeCompleted });
  const config = state?.config || runtimePayload?.config || {};
  const crossword = state?.crossword;
  const grid = crossword?.grid;
  const words = useMemo(() => grid?.words || [], [grid]);
  const cells = useMemo(() => buildCrosswordCells(grid), [grid]);
  const [selection, setSelection] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(0);
  const requestRef = useRef(null);
  const timeoutRef = useRef(null);
  const boardRef = useRef(null);
  const id = useId();
  const timer = state?.timer || {};
  const status = timer.status || 'idle';
  const finished = ['completed', 'stopped', 'timeout'].includes(status);
  const started = status === 'running' || finished;
  const active = words.find((word) => word.id === selection?.wordId) || words[0];
  const selectedKey = selection?.key || (active ? `${active.row}:${active.col}` : '');
  const draft = drafts[active?.id] || '';
  const normalized = normalizeCrosswordAnswer(draft);
  const conflict = active ? hasCrosswordConflict(active, normalized, cells) : false;
  const cooldown = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const controls = useConfirmedAction({ socket, emitEvent, state, resetKey: `${grid?.id}:${status}`, requiresRunningTimer: false });

  useEffect(() => {
    setSelection(null);
    setDrafts({});
    setFeedback(null);
    setRetryAt(0);
  }, [grid?.id]);

  useEffect(() => {
    if (!retryAt) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [retryAt]);

  useEffect(() => {
    const settle = (nextFeedback) => {
      requestRef.current = null;
      window.clearTimeout(timeoutRef.current);
      setPending(false);
      setFeedback(nextFeedback);
    };
    const onResult = (packet) => {
      const result = packet?.payload;
      if (packet?.type !== 'crossword.answer.result' || !requestRef.current || result?.requestId !== requestRef.current.requestId) return;
      const code = result.code;
      if (code === 'rate_limited') {
        const current = Date.now();
        setNow(current);
        setRetryAt(current + Math.max(1000, Number(result.retryAfterMs) || 1000));
      }
      settle({
        status: code === 'correct' || code === 'already_found' ? 'confirmed' : 'failed',
        message: `${copy[code] || copy.failed}${code === 'already_found' && result.displayName ? ` ${copy.by} ${result.displayName}.` : ''}`,
      });
    };
    const onError = (packet) => {
      if (!requestRef.current || (packet?.requestId && packet.requestId !== requestRef.current.requestId)) return;
      const code = packet?.code;
      if (code === 'rate_limited') {
        const current = Date.now();
        setNow(current);
        setRetryAt(current + Math.max(1000, Number(packet.retryAfterMs) || 1000));
      }
      settle({ status: 'failed', message: String(packet?.message || copy[code] || copy.failed) });
    };
    const onDisconnect = () => { if (requestRef.current) settle({ status: 'failed', message: copy.offline }); };
    socket?.on('challenge:event', onResult);
    socket?.on('challenge:error', onError);
    socket?.on('disconnect', onDisconnect);
    return () => {
      socket?.off('challenge:event', onResult);
      socket?.off('challenge:error', onError);
      socket?.off('disconnect', onDisconnect);
    };
  }, [socket, copy]);

  useEffect(() => {
    requestRef.current = null;
    window.clearTimeout(timeoutRef.current);
    setPending(false);
    return () => window.clearTimeout(timeoutRef.current);
  }, [grid?.id, status, connected]);

  useEffect(() => {
    if (!connected) return;
    // A fresh public snapshot is requested after joining/reconnecting.
    emitEvent('crossword.request_state', {});
  }, [connected, grid?.id, emitEvent]);

  function choose(cell, toggle = false, direction = null) {
    const current = cell.words.find((word) => word.id === active?.id);
    const word = direction
      ? cell.words.find((item) => item.direction === direction) || current || cell.words[0]
      : toggle && current && cell.words.length > 1
        ? cell.words.find((item) => item.id !== current.id)
        : current || cell.words[0];
    setSelection({ key: `${cell.row}:${cell.col}`, wordId: word.id });
  }

  function focusCell(key, direction) {
    const cell = cells.get(key);
    if (!cell) return;
    choose(cell, false, direction);
    boardRef.current?.querySelector(`[data-cell="${key}"]`)?.focus();
  }

  function selectClue(word) {
    const key = `${word.row}:${word.col}`;
    setSelection({ wordId: word.id, key });
    const cell = boardRef.current?.querySelector(`[data-cell="${key}"]`);
    const viewport = boardRef.current?.parentElement;
    if (!cell || !viewport) return;
    const bounds = viewport.getBoundingClientRect();
    const target = cell.getBoundingClientRect();
    const horizontal = target.left < bounds.left ? target.left - bounds.left - 6
      : target.right > bounds.right ? target.right - bounds.right + 6 : 0;
    const vertical = target.top < bounds.top ? target.top - bounds.top - 6
      : target.bottom > bounds.bottom ? target.bottom - bounds.bottom + 6 : 0;
    // Scroll only the board; keep focus on the clue rather than interrupting typing.
    viewport.scrollTo({ left: viewport.scrollLeft + horizontal, top: viewport.scrollTop + vertical, behavior: 'instant' });
  }

  function navigate(event, cell) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      choose(cell, true);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const index = event.key === 'Home' ? 0 : active.length - 1;
      focusCell(`${active.row + (active.direction === 'down' ? index : 0)}:${active.col + (active.direction === 'across' ? index : 0)}`);
      return;
    }
    const offsets = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    let row = cell.row + offset[0];
    let col = cell.col + offset[1];
    while (row >= 0 && col >= 0 && row < grid.height && col < grid.width) {
      const key = `${row}:${col}`;
      if (cells.has(key)) {
        focusCell(key, offset[0] ? 'down' : 'across');
        break;
      }
      row += offset[0];
      col += offset[1];
    }
  }

  function submit(event) {
    event.preventDefault();
    if (!active || requestRef.current || pending || cooldown || !connected || status !== 'running' || active.solvedBy != null) return;
    if (normalized.length !== active.length || conflict) {
      setFeedback({ status: 'failed', message: conflict ? copy.conflict : copy.length });
      return;
    }
    const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    requestRef.current = { requestId, wordId: active.id };
    setPending(true);
    setFeedback(null);
    timeoutRef.current = window.setTimeout(() => {
      requestRef.current = null;
      setPending(false);
      setFeedback({ status: 'failed', message: copy.timeout });
    }, 10000);
    if (emitEvent('crossword.answer.submit', { wordId: active.id, answer: normalized, requestId }) !== true) {
      requestRef.current = null;
      window.clearTimeout(timeoutRef.current);
      setPending(false);
      setFeedback({ status: 'failed', message: copy.offline });
    }
  }

  function control(type) {
    if (!isFacilitator || !connected) return;
    controls.run({
      type, payload: {},
      isAvailable: (current) => type === 'timer.start' ? (!current?.timer?.status || current.timer.status === 'idle') : current?.timer?.status === 'running',
      isConfirmed: (current) => type === 'timer.start' ? current?.timer?.status === 'running' : ['stopped', 'completed', 'timeout'].includes(current?.timer?.status),
    });
  }

  const percent = Math.max(0, Math.min(100, Number(crossword?.completionPercent) || 0));
  const rules = config.rules || {};
  const ruleArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
  const unresolved = words.filter((word) => word.solvedBy == null);
  const scores = [...(crossword?.scores || [])].sort((a, b) => b.score - a.score);
  const remaining = timer.remaining_seconds ?? timer.remainingSeconds ?? config.timer?.duration_seconds ?? 900;

  return (
    <div className={styles.root}>
      <ChallengeHeader title={grid?.title || config.title || copy.title} timer={{ remainingSeconds: remaining }} />
      <ChallengeRulesPanel
        isStarted={started} isFacilitator={isFacilitator} challengeName={copy.title}
        objective={rules.objective || copy.objective} facilitatorRules={ruleArray(rules.facilitator)}
        participantRules={ruleArray(rules.participant)} footnote={rules.footnote || ''}
        participantsMeta={{ min: 2, max: 5, recommended: 5 }}
        startLabel={copy.start} onStart={() => control('timer.start')}
        startDisabled={!connected || controls.busy || !grid} startStatusText={controls.busy ? copy.sending : ''}
      />
      <ChallengeActionFeedback feedback={{ ...controls.feedback, retry: null }} />
      {!connected && <p className={styles.notice} role="status">{copy.offline}</p>}
      {error && <p className={styles.notice} role="alert">{error}</p>}
      <ChallengeTimerCard
        remainingSeconds={remaining} durationSeconds={timer.duration_seconds || config.timer?.duration_seconds || 900}
        status={status} isFacilitator={isFacilitator} defaultCollapsed
        waitingText={copy.waiting}
        actions={isFacilitator && status === 'running' ? <button className={styles.secondary} type="button" disabled={!connected || controls.busy} onClick={() => control('timer.stop')}>{copy.stop}</button> : null}
      />
      {!grid ? <p role="status">{copy.loading}</p> : <>
        <section className={styles.progressCard} aria-labelledby={`${id}-progress`}>
          <div className={styles.sectionHeading}><h2 id={`${id}-progress`}>{copy.progress}</h2><strong>{crossword.solvedCount || 0} / {crossword.totalWords || words.length} · {Math.round(percent)}%</strong></div>
          <progress max="100" value={percent} aria-label={copy.progress} />
          <p>{grid.theme} {grid.theme && '·'} {({ easy: locale === 'en' ? 'Easy' : 'Facile', medium: locale === 'en' ? 'Medium' : 'Moyen', hard: locale === 'en' ? 'Hard' : 'Difficile', facile: locale === 'en' ? 'Easy' : 'Facile', moyen: locale === 'en' ? 'Medium' : 'Moyen', difficile: locale === 'en' ? 'Hard' : 'Difficile' })[grid.difficulty] || grid.difficulty}</p>
        </section>
        {finished && <section className={styles.card} aria-labelledby={`${id}-final`}>
          <h2 id={`${id}-final`}>{copy.finished}</h2>
          {unresolved.length ? <><h3>{copy.unresolved} ({unresolved.length})</h3><ul>{unresolved.map((word) => <li key={word.id}>{word.number} · {copy[word.direction]} — {word.clue} ({word.length} {copy.letters})</li>)}</ul></> : <p>{copy.perfect}</p>}
        </section>}
        <div className={styles.playLayout}>
          <section className={styles.card} aria-label={copy.board}>
            <p id={`${id}-help`} className={styles.help}>{copy.help}</p>
            <div className={styles.boardScroll} tabIndex={0} role="region" aria-label={copy.board}>
              <div ref={boardRef} className={styles.board} role="grid" aria-label={copy.board} aria-describedby={`${id}-help`} style={{ '--columns': grid.width }}>
                {Array.from({ length: grid.height }, (_, row) => <div className={styles.row} role="row" key={row}>
                  {Array.from({ length: grid.width }, (_, col) => {
                    const key = `${row}:${col}`;
                    const cell = cells.get(key);
                    if (!cell) return <span key={key} role="gridcell" aria-label={`${copy.row} ${row + 1}, ${copy.col} ${col + 1}`} className={styles.block} />;
                    const inWord = cell.words.some((word) => word.id === active?.id);
                    return <div role="gridcell" key={key} aria-selected={inWord} className={styles.cellSlot}>
                      <button type="button" data-cell={key} tabIndex={key === selectedKey ? 0 : -1}
                        className={`${styles.cell} ${inWord ? styles.wordCell : ''} ${key === selectedKey ? styles.activeCell : ''} ${cell.letter ? styles.revealed : ''}`}
                        aria-label={`${copy.row} ${row + 1}, ${copy.col} ${col + 1}, ${cell.letter || copy.empty}, ${cell.words.map((word) => `${word.number} ${copy[word.direction]}`).join(', ')}`}
                        aria-describedby={`${id}-clue`} onClick={() => choose(cell, key === selectedKey)} onKeyDown={(event) => navigate(event, cell)}>
                        {cell.number != null && <small aria-hidden="true">{cell.number}</small>}
                        <span aria-hidden="true">{cell.letter}</span>
                      </button>
                    </div>;
                  })}
                </div>)}
              </div>
            </div>
            {active && <form className={styles.answerForm} onSubmit={submit}>
              <div id={`${id}-clue`} className={styles.activeClue}>
                <span>{active.number} · {copy[active.direction]} · {active.length} {copy.letters}</span>
                <h3>{active.clue}</h3>
                {active.solvedBy != null && <p>{copy.found}: <strong>{active.answer}</strong> · {copy.solvedDraft}</p>}
              </div>
              <label htmlFor={`${id}-answer`}>{copy.answer}</label>
              <div className={styles.inputLine}>
                <input id={`${id}-answer`} value={draft} autoComplete="off" autoCorrect="off" spellCheck={false}
                  aria-invalid={Boolean(draft && conflict)} aria-describedby={`${id}-validation`}
                  onChange={(event) => setDrafts((previous) => ({ ...previous, [active.id]: event.target.value }))}
                  disabled={pending} placeholder={`${active.length} ${copy.letters}`} />
                <button className={styles.primary} disabled={!connected || pending || cooldown > 0 || status !== 'running' || active.solvedBy != null || normalized.length !== active.length || conflict}>{pending ? copy.sending : copy.submit}</button>
              </div>
              <p id={`${id}-validation`} className={styles.validation}>{conflict ? copy.conflict : cooldown > 0 ? `${copy.cooldown} ${cooldown} ${copy.seconds}` : !started ? copy.waiting : ''}</p>
              <ChallengeActionFeedback feedback={feedback} />
            </form>}
          </section>
          <aside className={styles.clueLists}>
            {['across', 'down'].map((direction) => <section className={styles.card} key={direction}>
              <h2>{copy[direction]}</h2>
              <ol className={styles.clues}>{words.filter((word) => word.direction === direction).map((word) => <li key={word.id}>
                <button type="button" aria-pressed={active?.id === word.id} className={`${styles.clueButton} ${active?.id === word.id ? styles.selectedClue : ''}`}
                  onClick={() => selectClue(word)}>
                  <strong>{word.number}</strong><span>{word.clue} <small>({word.length})</small>{word.solvedBy != null && <span className={styles.foundLabel}>✓ {copy.found} — {word.answer}</span>}</span>
                </button>
              </li>)}</ol>
            </section>)}
          </aside>
        </div>
        <div className={styles.socialLayout}>
          <section className={styles.card}><h2>{copy.leaderboard}</h2>
            {scores.length ? <ol className={styles.scores}>{scores.map((entry) => <li key={entry.participantId}><div><strong>{entry.displayName}</strong><small>{(entry.words || []).map((word) => word.answer).join(' · ')}</small></div><strong>{entry.score} <small>{copy.points}</small></strong></li>)}</ol> : <p>{copy.none}</p>}
          </section>
          <section className={styles.card}><h2>{copy.activity}</h2>
            {crossword.activity?.length ? <ul className={styles.activity}>{[...crossword.activity].slice(-8).reverse().map((entry, index) => <li key={`${entry.wordId}-${entry.ts}-${index}`}><strong>{entry.answer}</strong><span>{copy.by} {entry.displayName}</span></li>)}</ul> : <p>{copy.none}</p>}
          </section>
        </div>
      </>}
    </div>
  );
}
