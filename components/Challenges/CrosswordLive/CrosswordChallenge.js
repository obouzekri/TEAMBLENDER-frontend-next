'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import useI18n from '@/lib/i18n/useI18n';
import useRealtimeChallenge from '@/lib/challenges/useRealtimeChallenge';
import useConfirmedAction from '@/lib/challenges/useConfirmedAction';
import { getCrosswordRulesPreset } from '@/lib/challenges/crosswordRules';
import ChallengeHeader from '../ChallengeHeader';
import ChallengeRulesPanel from '../ChallengeRulesPanel';
import ChallengeTimerCard from '../ChallengeTimerCard';
import ChallengeActionFeedback from '../ChallengeActionFeedback';
import ChallengePresentation from '../ChallengePresentation';
import ChallengeDebriefHeading from '../ChallengeDebriefHeading';
import styles from './CrosswordChallenge.module.css';
import { pickLocalized } from '@/lib/i18n';

const COPY = {
  fr: {
    title: 'Mots croisés Live', loading: 'Chargement de la grille…', across: 'Horizontal', down: 'Vertical',
    board: 'Grille de mots croisés', help: 'Cliquez sur une case ou une définition pour répondre.', keyboardHelp: 'Clavier : flèches pour se déplacer, Espace pour changer de sens, Entrée pour répondre.',
    openAnswer: 'Répondre', close: 'Fermer', switchDirection: 'Sens du mot',
    row: 'Ligne', col: 'colonne', empty: 'vide', found: 'Trouvé', letters: 'lettres', answer: 'Votre réponse', submit: 'Proposer le mot',
    wordsFound: 'mots trouvés', leaderboard: 'Classement', liveUpdate: 'Mis à jour en direct', activity: 'Dernières découvertes', none: 'Aucune découverte pour le moment.',
    points: 'points', unresolved: 'Mots non résolus', perfect: 'Bravo ! Toute la grille est résolue.',
    solution: 'Réponse', answerUnavailable: 'Réponse indisponible',
    start: 'Démarrer la partie', waiting: 'En attente du démarrage par l’animateur.',
    offline: 'Connexion interrompue. Votre brouillon est conservé.', sending: 'Vérification en cours…',
    timeout: 'Pas de confirmation reçue. Votre brouillon est conservé ; vous pouvez réessayer.',
    conflict: 'Cette réponse ne correspond pas aux lettres déjà révélées.', length: 'Saisissez le nombre de lettres indiqué.',
    correct: 'Bravo, mot trouvé !', incorrect: 'Ce n’est pas le bon mot. Essayez encore.',
    already_found: 'Ce mot a déjà été trouvé', rate_limited: 'Trop de tentatives. Patientez avant de réessayer.',
    invalid: 'Réponse invalide. Vérifiez votre saisie.', closed: 'La partie est terminée.', forbidden: 'Vous ne pouvez pas proposer de réponse.',
    failed: 'Action refusée. Votre brouillon est conservé.', by: 'par', cooldown: 'Nouvelle tentative dans', seconds: 's',
    foundBy: 'Trouvé par', previous: 'Mot précédent', next: 'Mot suivant', objective: 'Résolvez ensemble les définitions pour compléter la grille.',
  },
  en: {
    title: 'Crossword Live', loading: 'Loading the grid…', across: 'Across', down: 'Down',
    board: 'Crossword board', help: 'Click a cell or a clue to answer.', keyboardHelp: 'Keyboard: arrows to move, Space to switch direction, Enter to answer.',
    openAnswer: 'Answer', close: 'Close', switchDirection: 'Word direction',
    row: 'Row', col: 'column', empty: 'empty', found: 'Found', letters: 'letters', answer: 'Your answer', submit: 'Submit word',
    wordsFound: 'words found', leaderboard: 'Leaderboard', liveUpdate: 'Live updates', activity: 'Latest discoveries', none: 'No discoveries yet.',
    points: 'points', unresolved: 'Unresolved words', perfect: 'Well done! The whole grid is solved.',
    solution: 'Answer', answerUnavailable: 'Answer unavailable',
    start: 'Start game', waiting: 'Waiting for the facilitator to start.',
    offline: 'Connection interrupted. Your draft is saved.', sending: 'Checking your answer…',
    timeout: 'No confirmation received. Your draft is saved; you can try again.',
    conflict: 'This answer conflicts with the letters already revealed.', length: 'Enter the indicated number of letters.',
    correct: 'Well done, word found!', incorrect: 'Not the right word. Try again.',
    already_found: 'This word has already been found', rate_limited: 'Too many attempts. Wait before trying again.',
    invalid: 'Invalid answer. Check your entry.', closed: 'The game is over.', forbidden: 'You cannot submit an answer.',
    failed: 'Action rejected. Your draft is saved.', by: 'by', cooldown: 'Try again in', seconds: 's',
    foundBy: 'Found by', previous: 'Previous word', next: 'Next word', objective: 'Solve the clues together to complete the grid.',
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

// Letters typed in the answer field fill the empty boxes; revealed letters are pre-filled.
// Typing the whole word (revealed letters included) is accepted too.
export function buildCrosswordAnswer(word, value, cells) {
  const typed = normalizeCrosswordAnswer(value);
  const revealed = Array.from({ length: word.length }, (_, index) => cells.get(`${word.row + (word.direction === 'down' ? index : 0)}:${word.col + (word.direction === 'across' ? index : 0)}`)?.letter || '');
  const freeCount = revealed.filter((letter) => !letter).length;
  const typesRevealed = revealed.some((letter, index) => letter && index < typed.length)
    && revealed.every((letter, index) => !letter || index >= typed.length || typed[index] === letter);
  const wholeWord = typesRevealed || typed.length > freeCount;
  let next = 0;
  const letters = revealed.map((letter, index) => {
    if (wholeWord) return { letter: typed[index] || letter, revealed: Boolean(letter), conflict: Boolean(letter && typed[index] && typed[index] !== letter) };
    if (letter) return { letter, revealed: true, conflict: false };
    next += 1;
    return { letter: typed[next - 1] || '', revealed: false, conflict: false };
  });
  const conflict = letters.some((item) => item.conflict);
  const tooLong = typed.length > word.length;
  return {
    letters,
    answer: letters.map((item) => item.letter).join(''),
    conflict,
    complete: !conflict && !tooLong && letters.every((item) => item.letter),
    caret: letters.findIndex((item) => !item.letter),
  };
}

export default function CrosswordChallenge({ runtimePayload, socket, context, onChallengeCompleted }) {
  const { locale } = useI18n();
  const copy = pickLocalized(COPY, locale);
  const { state, error, connected, isFacilitator, emitEvent, participantId } = useRealtimeChallenge({ runtimePayload, socket, context, onChallengeCompleted });
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
  const [answerOpen, setAnswerOpen] = useState(false);
  const [handoffWordId, setHandoffWordId] = useState(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const requestRef = useRef(null);
  const timeoutRef = useRef(null);
  const boardRef = useRef(null);
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const returnFocusRef = useRef(null);
  const previousSolvedRef = useRef({ gridId: '', wordIds: new Set() });
  const id = useId();
  const timer = state?.timer || {};
  const status = timer.status || 'idle';
  const finished = ['completed', 'stopped', 'timeout'].includes(status);
  const started = status === 'running' || status === 'paused' || finished;
  const active = words.find((word) => word.id === selection?.wordId) || words[0];
  const selectedKey = selection?.key || (active ? `${active.row}:${active.col}` : '');
  const selectedCell = cells.get(selectedKey);
  const draft = drafts[active?.id] || '';
  const typedAnswer = useMemo(() => (active ? buildCrosswordAnswer(active, draft, cells) : null), [active, draft, cells]);
  const conflict = Boolean(typedAnswer?.conflict);
  const cooldown = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const controls = useConfirmedAction({ socket, emitEvent, state, resetKey: `${grid?.id}:${status}`, requiresRunningTimer: false });
  const dialogOpen = answerOpen && Boolean(active) && started && !finished;
  // Clue-list order: Previous/Next walk across clues, then down clues.
  const clueOrder = useMemo(() => ['across', 'down'].flatMap((direction) => words.filter((word) => word.direction === direction)), [words]);

  function findUnsolved(fromWord, step) {
    const index = clueOrder.findIndex((word) => word.id === fromWord?.id);
    for (let offset = 1; offset < clueOrder.length; offset += 1) {
      const word = clueOrder[(index + step * offset + clueOrder.length * offset) % clueOrder.length];
      if (word.solvedBy == null) return word;
    }
    return null;
  }

  useEffect(() => {
    // Typing starts right away, also after Previous/Next or an automatic move.
    if (dialogOpen) inputRef.current?.focus({ preventScroll: true });
  }, [dialogOpen, active?.id]);

  useEffect(() => {
    if (!dialogOpen) return undefined;
    // The panel is not modal: the grid stays usable, Escape closes the panel from anywhere.
    const onKeyDown = (event) => {
      if (event.key !== 'Escape' || document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      setAnswerOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dialogOpen]);

  useEffect(() => {
    if (dialogOpen) return;
    setHandoffWordId(null);
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    const focusLeftPanel = !document.activeElement || document.activeElement === document.body;
    if (focusLeftPanel && target instanceof HTMLElement && target.isConnected) target.focus({ preventScroll: true });
  }, [dialogOpen]);

  useEffect(() => {
    const panel = dialogRef.current;
    if (!dialogOpen || !panel || typeof ResizeObserver === 'undefined') {
      setPanelHeight(0);
      return undefined;
    }
    // On small screens the panel is docked at the bottom: reserve its height below the page.
    const observer = new ResizeObserver(() => setPanelHeight(getComputedStyle(panel).position === 'fixed' ? panel.offsetHeight : 0));
    observer.observe(panel);
    return () => observer.disconnect();
  }, [dialogOpen]);

  useEffect(() => {
    if (!dialogOpen || !panelHeight || !active) return;
    const cell = boardRef.current?.querySelector(`[data-cell="${active.row}:${active.col}"]`);
    cell?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [dialogOpen, panelHeight, active]);

  useEffect(() => {
    setSelection(null);
    setAnswerOpen(false);
    setDrafts({});
    setFeedback(null);
    setRetryAt(0);
    setHandoffWordId(null);
  }, [grid?.id]);

  useEffect(() => {
    if (!grid) return;
    const solvedWordIds = new Set(words.filter((word) => word.solvedBy != null).map((word) => word.id));
    const previous = previousSolvedRef.current;
    if (previous.gridId !== grid.id) {
      previousSolvedRef.current = { gridId: grid.id, wordIds: solvedWordIds };
      return;
    }

    const currentWordWasJustSolved = active
      && solvedWordIds.has(active.id)
      && !previous.wordIds.has(active.id);
    previousSolvedRef.current = { gridId: grid.id, wordIds: solvedWordIds };
    if (!currentWordWasJustSolved) return;

    if (answerOpen) {
      // Show who solved the word in the open panel, then move on (see the handoff effect).
      setHandoffWordId(active.id);
      return;
    }
    const nextWord = findUnsolved(active, 1);
    if (!nextWord) return;
    // Keep the success message visible on the clue bar.
    setFeedback((current) => (current?.status === 'confirmed' ? current : null));
    setSelection({ key: `${nextWord.row}:${nextWord.col}`, wordId: nextWord.id });
  }, [active, grid, words, answerOpen]);

  useEffect(() => {
    if (!handoffWordId || handoffWordId !== active?.id) return undefined;
    const timeout = window.setTimeout(() => {
      setHandoffWordId(null);
      const nextWord = findUnsolved(active, 1);
      if (!nextWord) {
        setAnswerOpen(false);
        return;
      }
      setFeedback(null);
      setSelection({ key: `${nextWord.row}:${nextWord.col}`, wordId: nextWord.id });
      revealCell(`${nextWord.row}:${nextWord.col}`);
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [handoffWordId, active]);

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
    if (word.id !== active?.id) {
      setFeedback(null);
      setHandoffWordId(null);
    }
    setSelection({ key: `${cell.row}:${cell.col}`, wordId: word.id });
  }

  function focusCell(key, direction) {
    const cell = cells.get(key);
    if (!cell) return;
    choose(cell, false, direction);
    boardRef.current?.querySelector(`[data-cell="${key}"]`)?.focus();
  }

  function openAnswer() {
    if (finished) return;
    if (!answerOpen) {
      const trigger = document.activeElement;
      returnFocusRef.current = trigger instanceof HTMLElement && trigger !== document.body ? trigger : null;
    }
    setAnswerOpen(true);
  }

  function switchWord(word) {
    if (word.id === active?.id) return;
    setFeedback(null);
    setHandoffWordId(null);
    setSelection({ key: selectedKey, wordId: word.id });
  }

  function stepWord(step) {
    const word = findUnsolved(active, step);
    if (!word) return;
    const key = `${word.row}:${word.col}`;
    setFeedback(null);
    setHandoffWordId(null);
    setSelection({ wordId: word.id, key });
    revealCell(key);
  }

  function selectClue(word) {
    const key = `${word.row}:${word.col}`;
    if (word.id !== active?.id) {
      setFeedback(null);
      setHandoffWordId(null);
    }
    setSelection({ wordId: word.id, key });
    openAnswer();
    revealCell(key);
  }

  function revealCell(key) {
    const cell = boardRef.current?.querySelector(`[data-cell="${key}"]`);
    const viewport = boardRef.current?.parentElement;
    if (!cell || !viewport) return;
    const bounds = viewport.getBoundingClientRect();
    const target = cell.getBoundingClientRect();
    const horizontal = target.left < bounds.left ? target.left - bounds.left - 6
      : target.right > bounds.right ? target.right - bounds.right + 6 : 0;
    const vertical = target.top < bounds.top ? target.top - bounds.top - 6
      : target.bottom > bounds.bottom ? target.bottom - bounds.bottom + 6 : 0;
    // Scroll only the board so the word stays visible behind the answer dialog.
    viewport.scrollTo({ left: viewport.scrollLeft + horizontal, top: viewport.scrollTop + vertical, behavior: 'instant' });
  }

  function navigate(event, cell) {
    if (event.key === ' ') {
      event.preventDefault();
      choose(cell, true);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      choose(cell);
      openAnswer();
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
    if (!typedAnswer.complete) {
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
    if (emitEvent('crossword.answer.submit', { wordId: active.id, answer: typedAnswer.answer, requestId }) !== true) {
      requestRef.current = null;
      window.clearTimeout(timeoutRef.current);
      setPending(false);
      setFeedback({ status: 'failed', message: copy.offline });
    }
  }

  function start() {
    if (!isFacilitator || !connected) return;
    controls.run({
      type: 'timer.start', payload: {},
      isAvailable: (current) => !current?.timer?.status || current.timer.status === 'idle',
      isConfirmed: (current) => current?.timer?.status === 'running',
    });
  }

  const rules = config.rules || {};
  const rulesPreset = getCrosswordRulesPreset(locale);
  const ruleArray = (value) => Array.isArray(value) ? value : value ? [value] : [];
  const rulesProps = {
    isStarted: started,
    isFacilitator,
    challengeName: copy.title,
    objective: rules.objective || rulesPreset.objective,
    facilitatorRules: ruleArray(rules.facilitator ?? rulesPreset.facilitator),
    participantRules: ruleArray(rules.participant ?? rulesPreset.participant),
    footnote: rules.footnote ?? rulesPreset.footnote,
    participantsMeta: { min: 2, max: 5, recommended: 5 },
  };
  const unresolved = words.filter((word) => word.solvedBy == null);
  const scores = [...(crossword?.scores || [])].sort((a, b) => b.score - a.score);
  // Latest first, whatever order the server sends.
  const recentActivity = [...(crossword?.activity || [])].sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0)).slice(0, 8);
  const solverName = (word) => (crossword?.activity || []).find((item) => item.wordId === word?.id)?.displayName
    || scores.find((item) => item.participantId === word?.solvedBy)?.displayName || '';
  const solvedByMe = active?.solvedBy != null
    && ((participantId && String(active.solvedBy) === String(participantId)) || feedback?.status === 'confirmed');
  const otherUnsolved = active ? findUnsolved(active, 1) : null;
  const remaining = timer.remaining_seconds ?? timer.remainingSeconds ?? config.timer?.duration_seconds ?? 900;

  const timerCard = (
    <ChallengeTimerCard
      isStarted={started}
      remainingSeconds={remaining} durationSeconds={timer.duration_seconds || config.timer?.duration_seconds || 900}
      status={status} isFacilitator={isFacilitator}
      waitingText={copy.waiting}
    />
  );
  const rankingCard = (
    <section className={styles.rankingCard}>
      <div className={styles.rankingCardHeader}>
        <h2 className="challenge-section-title">{copy.leaderboard}</h2>
        <span className={styles.rankingMeta}>{copy.liveUpdate}</span>
      </div>
      <div className={styles.leaderboardList}>
        {scores.length ? scores.map((entry) => (
          <article className={styles.leaderboardRow} key={entry.participantId}>
            <div className={styles.leaderboardIdentity}>
              {/* Equal scores share a rank; nobody is ranked before finding a word. */}
              <span className={styles.rankPill}>{entry.score > 0 ? `#${1 + scores.filter((other) => other.score > entry.score).length}` : '–'}</span>
              <strong className={styles.leaderboardName}>{entry.displayName}</strong>
            </div>
            <strong className={styles.leaderboardScore}>{entry.score} {copy.points}</strong>
          </article>
        )) : <p>{copy.none}</p>}
      </div>
    </section>
  );

  return (
    <ChallengePresentation as="main" className={styles.root} isDebrief={finished}>
      <ChallengeHeader
        title={copy.title}
        timer={started ? { remainingSeconds: remaining } : null}
        headerAction={started ? <ChallengeRulesPanel {...rulesProps} inHeader showPrestartCard={false} /> : null}
      />
      <div className="challenge-mobile-timer">{timerCard}</div>
      <div className={styles.mobileRankingSlot}>{started && !finished ? rankingCard : null}</div>
      <ChallengeActionFeedback feedback={error && error === controls.feedback?.message ? null : { ...controls.feedback, retry: null }} />
      {!connected && <p className={styles.notice} role="status">{copy.offline}</p>}
      {error && <p className={styles.notice} role="alert">{error}</p>}
      <div className={`${styles.challengeLayout} ${!started || finished ? styles.singleColumnLayout : ''}`} data-challenge-layout>
        <div className={styles.arenaColumn}>
          {!started ? <>
            <ChallengeRulesPanel
              {...rulesProps}
              startLabel={copy.start} onStart={isFacilitator ? start : null}
              startDisabled={!connected || controls.busy || !grid}
              startStatusText={controls.busy ? copy.sending : ''}
              extraContent={!isFacilitator ? <p className={styles.notice} role="status">{copy.waiting}</p> : null}
            />
            {!grid && <p role="status">{copy.loading}</p>}
          </> : !grid ? <p role="status">{copy.loading}</p> : <>
            {finished && <section className={`${styles.card} ${styles.finalCard}`} data-debrief-content>
              <div className={styles.finalHeading}>
                <div>
                  <ChallengeDebriefHeading />
                  <p className={styles.finalOutcome}>{unresolved.length ? copy.unresolved : copy.perfect}</p>
                </div>
                <span className={styles.finalScore}>{crossword.solvedCount || 0}<span>/{crossword.totalWords || words.length} {copy.wordsFound}</span></span>
              </div>
              {unresolved.length > 0 && <ol className={styles.unresolvedList}>
                {unresolved.map((word) => <li className={styles.unresolvedItem} key={word.id}>
                  <span className={styles.unresolvedNumber}>{word.number}</span>
                  <div className={styles.unresolvedDetails}>
                    <span className={styles.unresolvedClue}>{word.clue} <small>({word.length} {copy.letters})</small></span>
                    <span className={styles.unresolvedMeta}>{copy[word.direction]}</span>
                    <strong className={styles.solution}>{copy.solution}: {word.answer || copy.answerUnavailable}</strong>
                  </div>
                </li>)}
              </ol>}
            </section>}
            <div className={styles.playLayout}>
              <section className={`${styles.card} ${styles.boardPanel}`} aria-label={copy.board}>
                <div className={styles.sectionHeading}>
                  <h2>{grid.title || copy.board}</h2>
                  <span className={styles.wordCount} role="status">{crossword.solvedCount || 0}/{crossword.totalWords || words.length} {copy.wordsFound}</span>
                </div>
                <div className={styles.boardScroll} tabIndex={0} role="region" aria-label={copy.board} style={{ '--answer-panel-height': `${panelHeight}px` }}>
                  <div ref={boardRef} className={styles.board} data-board-direction="ltr" role="grid" aria-label={copy.board} aria-describedby={`${id}-help`} style={{ '--columns': grid.width, '--rows': grid.height }}>
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
                            aria-describedby={`${id}-clue`} onClick={() => { choose(cell, key === selectedKey); openAnswer(); }} onKeyDown={(event) => navigate(event, cell)}>
                            {cell.number != null && <small className={styles.cellNumber} aria-hidden="true">{cell.number}</small>}
                            <span aria-hidden="true">{cell.letter}</span>
                          </button>
                        </div>;
                      })}
                    </div>)}
                  </div>
                </div>
                {active && !finished && <div id={`${id}-clue`} className={`${styles.activeClue} ${active.solvedBy != null ? styles.activeClueSolved : ''}`}>
                  <span className={styles.clueNumber} aria-hidden="true">{active.number}</span>
                  <div className={styles.activeClueText}>
                    <span className={styles.clueMeta}>{copy[active.direction]} · {active.length} {copy.letters}</span>
                    <h3>{active.clue}</h3>
                    {active.solvedBy != null && <p>{copy.found}: <strong>{active.answer}</strong></p>}
                  </div>
                  <button type="button" className={styles.answerTrigger} onClick={openAnswer} aria-haspopup="dialog">{copy.openAnswer}</button>
                </div>}
                {!dialogOpen && !finished && <ChallengeActionFeedback feedback={feedback} />}
                <p id={`${id}-help`} className={styles.help}>{copy.help} <span className={styles.keyboardHelp}>{copy.keyboardHelp}</span></p>
              </section>
              {!finished && <aside className={styles.clueLists}>
                {dialogOpen && <section ref={dialogRef} tabIndex={-1} className={styles.dialog} role="dialog" aria-modal="false"
                  aria-labelledby={`${id}-dialog-title`} aria-describedby={`${id}-dialog-meta`}>
                  <header className={styles.dialogHeader}>
                    <span className={styles.clueNumber} aria-hidden="true">{active.number}</span>
                    <div className={styles.dialogHeading}>
                      <span id={`${id}-dialog-meta`} className={styles.clueMeta}>{copy[active.direction]} · {active.length} {copy.letters}</span>
                      <h2 id={`${id}-dialog-title`}>{active.clue}</h2>
                    </div>
                    <button type="button" className={styles.dialogClose} onClick={() => setAnswerOpen(false)} aria-label={copy.close}>×</button>
                  </header>
                  {selectedCell?.words.length > 1 && <div className={styles.directionSwitch} role="group" aria-label={copy.switchDirection}>
                    {selectedCell.words.map((word) => <button type="button" key={word.id} aria-pressed={word.id === active.id}
                      className={word.id === active.id ? styles.directionActive : ''} onClick={() => switchWord(word)}>
                      {word.number} · {copy[word.direction]}
                    </button>)}
                  </div>}
                  {active.solvedBy != null && !solvedByMe && <p className={styles.dialogSolved} role="status">✓ {copy.foundBy} {solverName(active) || '…'} : <strong>{active.answer}</strong></p>}
                  <form className={styles.answerForm} onSubmit={submit}>
                    <label htmlFor={`${id}-answer`}>{copy.answer}</label>
                    {/* The real field sits over the boxes: typing fills the empty boxes, revealed letters stay in place. */}
                    <div className={styles.patternField} onClick={() => inputRef.current?.focus()}>
                      <input ref={inputRef} id={`${id}-answer`} className={styles.patternInput} value={draft}
                        autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false}
                        aria-invalid={Boolean(draft && conflict)} aria-describedby={`${id}-dialog-meta ${id}-validation`}
                        onChange={(event) => setDrafts((previous) => ({ ...previous, [active.id]: event.target.value }))}
                        disabled={pending || active.solvedBy != null} />
                      <div className={styles.pattern} aria-hidden="true" style={{ '--letters': active.length }}>
                        {typedAnswer.letters.map((item, index) => <span key={index}
                          className={`${styles.patternLetter} ${item.revealed ? styles.patternRevealed : ''} ${item.conflict ? styles.patternConflict : ''} ${index === typedAnswer.caret ? styles.patternCaret : ''}`}>{item.letter}</span>)}
                      </div>
                    </div>
                    <p id={`${id}-validation`} className={styles.validation}>{conflict ? copy.conflict : cooldown > 0 ? `${copy.cooldown} ${cooldown} ${copy.seconds}` : ''}</p>
                    <ChallengeActionFeedback feedback={feedback} />
                    <div className={styles.answerActions}>
                      <button type="button" className={styles.stepButton} onClick={() => stepWord(-1)} disabled={!otherUnsolved} aria-label={copy.previous} title={copy.previous}>‹</button>
                      <button className={styles.primary} disabled={!connected || pending || cooldown > 0 || status !== 'running' || active.solvedBy != null || !typedAnswer.complete}>{pending ? copy.sending : copy.submit}</button>
                      <button type="button" className={styles.stepButton} onClick={() => stepWord(1)} disabled={!otherUnsolved} aria-label={copy.next} title={copy.next}>›</button>
                    </div>
                  </form>
                </section>}
                {['across', 'down'].map((direction) => <section className={styles.card} key={direction}>
                  <h2>{copy[direction]}</h2>
                  <ol className={styles.clues}>{words.filter((word) => word.direction === direction).map((word) => <li key={word.id}>
                    <button type="button" aria-pressed={active?.id === word.id} className={`${styles.clueButton} ${active?.id === word.id ? styles.selectedClue : ''} ${word.solvedBy != null ? styles.solvedClue : ''}`}
                      onClick={() => selectClue(word)}>
                      <strong className={styles.clueNumber}>{word.number}</strong><span>{word.clue} <small>({word.length})</small>{word.solvedBy != null && <span className={styles.foundLabel}>✓ {copy.found} — {word.answer}</span>}</span>
                    </button>
                  </li>)}</ol>
                </section>)}
              </aside>}
            </div>
            <div className={styles.activityLayout}>
              {finished ? rankingCard : null}
              <section className={styles.card}><h2>{copy.activity}</h2>
                {crossword.activity?.length ? <ul className={styles.activity}>{recentActivity.map((entry, index) => <li key={`${entry.wordId}-${entry.ts}-${index}`}><strong>{entry.answer}</strong><span>{copy.by} {entry.displayName}</span></li>)}</ul> : <p>{copy.none}</p>}
              </section>
            </div>
          </>}
        </div>
        {!finished && started && <aside className={styles.timerColumn}>
          <div className="challenge-desktop-timer">{timerCard}</div>
          {rankingCard}
        </aside>}
      </div>
      {/* Room for the answer panel docked at the bottom of small screens. */}
      {panelHeight > 0 && <div aria-hidden="true" style={{ height: panelHeight }} />}
    </ChallengePresentation>
  );
}
