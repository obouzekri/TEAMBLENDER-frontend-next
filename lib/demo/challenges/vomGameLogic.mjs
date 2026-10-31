// Copy of backend/src/challenges/engines/vrai_ou_mensonge_v1/game-logic.js (ES module syntax; parseStatementChoices is also exported),
// so the demo runs the real Pari sur moi rules in the browser. Keep it in sync with the backend.

const STATES = Object.freeze({
  WAITING_START: 'waiting_start',
  SELECTING_STATEMENT: 'selecting_statement',
  VOTING_OPEN: 'voting_open',
  ROUND_RESULT: 'round_result',
  NEXT_TURN: 'next_turn',
  FINISHED: 'finished',
  PAUSED_POSER_DISCONNECT: 'paused_poseur_disconnect'
});

const TRANSITIONS = Object.freeze({
  waiting_start: new Set(['selecting_statement']),
  selecting_statement: new Set(['voting_open', 'next_turn', 'paused_poseur_disconnect']),
  voting_open: new Set(['round_result', 'paused_poseur_disconnect']),
  round_result: new Set(['next_turn']),
  next_turn: new Set(['selecting_statement', 'finished']),
  finished: new Set([]),
  paused_poseur_disconnect: new Set(['selecting_statement', 'voting_open'])
});

function normalizeVote(rawVote) {
  if (rawVote === true || String(rawVote).trim().toLowerCase() === 'vrai' || String(rawVote).trim().toLowerCase() === 'true') {
    return 'vrai';
  }
  if (rawVote === false || String(rawVote).trim().toLowerCase() === 'mensonge' || String(rawVote).trim().toLowerCase() === 'false') {
    return 'mensonge';
  }
  return null;
}

function normalizeAnswerText(value) {
  return sanitizeChoiceText(value);
}

function sanitizeChoiceText(value) {
  return String(value || '')
    .trim()
    .replace(/[.?!]+$/g, '')
    .trim();
}

function parseStatementChoices(rawText) {
  const text = String(rawText || '').trim();
  if (!text.includes('/')) return null;

  const slashParts = text
    .split('/')
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  if (slashParts.length < 2) return null;

  const firstPart = slashParts[0];
  let prompt = '';
  let firstOption = '';
  let hasColon = false;

  if (firstPart.includes(':')) {
    const [left, ...rest] = firstPart.split(':');
    prompt = String(left || '').trim();
    firstOption = String(rest.join(':') || '').trim();
    hasColon = true;
  } else {
    const words = firstPart.split(/\s+/).filter(Boolean);
    if (words.length < 2) return null;
    prompt = words.slice(0, -1).join(' ').trim();
    firstOption = words[words.length - 1] || '';
  }

  const optionsRaw = [firstOption, ...slashParts.slice(1)];
  const options = [];
  const seen = new Set();

  optionsRaw.forEach((item) => {
    const normalized = sanitizeChoiceText(item);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    options.push(normalized);
  });

  const cleanPrompt = sanitizeChoiceText(prompt);
  if (!cleanPrompt || options.length < 2) return null;

  return {
    prompt: cleanPrompt,
    options,
    hasColon
  };
}

function composeStatementText(choiceModel, selectedOption, fallbackText) {
  if (!choiceModel || !selectedOption) return String(fallbackText || '');
  if (choiceModel.hasColon) {
    return `${choiceModel.prompt}: ${selectedOption}`;
  }
  return `${choiceModel.prompt} ${selectedOption}`;
}

function buildInitialState(config) {
  const catalog = Array.isArray(config?.catalog) ? config.catalog : [];
  const targetDurationMinutesRaw = Number(config?.target_duration_minutes);
  const targetDurationMinutes = [15, 20, 25, 30].includes(targetDurationMinutesRaw)
    ? targetDurationMinutesRaw
    : 15;
  const configuredRounds = Number(config?.rounds_per_participant);
  const roundsPerParticipant = Number.isFinite(configuredRounds) && configuredRounds > 0
    ? Math.floor(configuredRounds)
    : 3;
  return {
    phase: STATES.WAITING_START,
    phase_started_at_ms: null,
    phase_deadline_ms: null,
    rounds_per_participant: roundsPerParticipant,
    target_duration_minutes: targetDurationMinutes,
    computed_cycles: 0,
    participants_order: [],
    total_turns: 0,
    turn_index: 0,
    current_turn: null,
    round_history: [],
    scores: {},
    used_statement_ids_by_participant: {},
    paused: null,
    facilitator_pause: null,
    ranking: [],
    catalog,
    catalog_version: String(config?.catalog_version || 'v1.0.0'),
    categories: Array.isArray(config?.categories) ? config.categories : [],
    timing: {
      selecting_ms: Number(config?.timing?.selecting_ms || 40_000),
      voting_ms: Number(config?.timing?.voting_ms || 40_000),
      round_result_ms: Number(config?.timing?.round_result_ms || 2_000),
      next_turn_ms: Number(config?.timing?.next_turn_ms || 0)
    }
  };
}

function computeRoundsPerParticipant(state, participantCount) {
  const configuredRounds = Number(state?.rounds_per_participant || 0);
  return Number.isFinite(configuredRounds) && configuredRounds > 0 ? Math.floor(configuredRounds) : 3;
}

function sortParticipantIds(slotByParticipantId) {
  const entries = Object.entries(slotByParticipantId || {});
  return entries
    .map(([participantId, slot]) => ({ participantId: String(participantId), slot: Number(slot) }))
    .filter((item) => item.participantId && Number.isInteger(item.slot) && item.slot > 0)
    .sort((a, b) => (a.slot - b.slot) || a.participantId.localeCompare(b.participantId))
    .map((item) => item.participantId);
}

function syncParticipants(state, slotByParticipantId) {
  const nextOrder = sortParticipantIds(slotByParticipantId);
  state.participants_order = nextOrder;
  state.rounds_per_participant = computeRoundsPerParticipant(state, nextOrder.length);
  state.computed_cycles = state.rounds_per_participant;
  state.total_turns = nextOrder.length * state.rounds_per_participant;
  nextOrder.forEach((participantId) => {
    if (state.scores[participantId] == null) state.scores[participantId] = 0;
    if (!Array.isArray(state.used_statement_ids_by_participant[participantId])) {
      state.used_statement_ids_by_participant[participantId] = [];
    }
  });
}

function canTransition(from, to) {
  return Boolean(TRANSITIONS[from] && TRANSITIONS[from].has(to));
}

function setPhase(state, nextPhase, nowMs, durationMs) {
  if (!canTransition(state.phase, nextPhase)) {
    throw new Error(`Invalid transition ${state.phase} -> ${nextPhase}`);
  }
  state.phase = nextPhase;
  state.phase_started_at_ms = nowMs;
  state.phase_deadline_ms = durationMs > 0 ? nowMs + durationMs : null;
}

function getPoserId(state) {
  if (!state.participants_order.length) return null;
  return state.participants_order[state.turn_index % state.participants_order.length] || null;
}

function getPassageNumber(state) {
  if (!state.participants_order.length) return 0;
  return Math.floor(state.turn_index / state.participants_order.length) + 1;
}

function getEligibleVoters(state) {
  const poserId = getPoserId(state);
  return state.participants_order.filter((participantId) => participantId !== poserId);
}

function enterSelectingState(state, nowMs) {
  const poserId = getPoserId(state);
  const passageNumber = getPassageNumber(state);
  state.current_turn = {
    poser_id: poserId,
    passage_number: passageNumber,
    statement_id: null,
    statement_prompt: '',
    statement_options: [],
    selected_option: null,
    answer_mode: 'boolean',
    correct_answer: null,
    statement_text: '',
    statement_category: '',
    selected_at_ms: null,
    auto_selected: false,
    revealed_truth: null,
    reveal_reason: 'auto_vote_resolution',
    votes: {},
    locked: false,
    result: null
  };
  setPhase(state, STATES.SELECTING_STATEMENT, nowMs, state.timing.selecting_ms);
}

function startChallenge(state, nowMs) {
  if (state.phase !== STATES.WAITING_START) {
    throw new Error('Challenge already started');
  }
  if (state.participants_order.length < 2) {
    throw new Error('At least 2 participants are required');
  }
  enterSelectingState(state, nowMs);
}

function chooseStatement(state, poserId, statementId, nowMs, options = {}) {
  if (state.phase !== STATES.SELECTING_STATEMENT) {
    throw new Error('Cannot select statement in current phase');
  }
  const expectedPoserId = getPoserId(state);
  if (String(poserId) !== String(expectedPoserId)) {
    throw new Error('Only current poser can select statement');
  }

  const selected = state.catalog.find((item) => String(item.id) === String(statementId));
  if (!selected) {
    throw new Error('Unknown statement');
  }

  const usedByPoser = new Set(state.used_statement_ids_by_participant[expectedPoserId] || []);
  if (usedByPoser.has(selected.id)) {
    throw new Error('Statement already used by this poser in this session');
  }

  const choiceModel = parseStatementChoices(selected.text);
  const requestedOption = sanitizeChoiceText(options.selected_option || options.selectedOption || '');

  let selectedOption = null;
  let answerMode = 'boolean';
  let correctAnswer = selected.fallback_truth === true ? 'vrai' : 'mensonge';
  if (choiceModel) {
    if (requestedOption) {
      const matched = choiceModel.options.find((item) => item.toLowerCase() === requestedOption.toLowerCase());
      if (!matched) {
        throw new Error('Selected option is invalid for this statement');
      }
      selectedOption = matched;
    } else if (options.auto_selected === true) {
      selectedOption = choiceModel.options[0] || null;
    } else {
      throw new Error('You must select an option for this statement');
    }
    answerMode = 'choice';
    correctAnswer = normalizeAnswerText(selectedOption);
  } else if (requestedOption) {
    const normalizedRequestedBoolean = normalizeVote(requestedOption);
    if (!normalizedRequestedBoolean) {
      throw new Error('Selected option is invalid for this statement');
    }
    selectedOption = normalizedRequestedBoolean;
    correctAnswer = normalizedRequestedBoolean;
  }

  state.current_turn.statement_id = selected.id;
  state.current_turn.statement_prompt = choiceModel ? choiceModel.prompt : selected.text;
  state.current_turn.statement_options = choiceModel ? choiceModel.options : [];
  state.current_turn.selected_option = selectedOption;
  state.current_turn.answer_mode = answerMode;
  state.current_turn.correct_answer = correctAnswer;
  state.current_turn.statement_text = composeStatementText(choiceModel, selectedOption, selected.text);
  state.current_turn.statement_category = selected.category;
  state.current_turn.selected_at_ms = nowMs;
  state.current_turn.auto_selected = options.auto_selected === true;
  state.current_turn.fallback_truth = selected.fallback_truth === true;

  setPhase(state, STATES.VOTING_OPEN, nowMs, state.timing.voting_ms);
}

function castVote(state, voterId, voteRaw) {
  if (state.phase !== STATES.VOTING_OPEN) {
    throw new Error('Voting is not open');
  }
  const poserId = getPoserId(state);
  if (String(voterId) === String(poserId)) {
    throw new Error('Poser cannot vote');
  }
  if (!state.participants_order.includes(String(voterId))) {
    throw new Error('Unknown voter');
  }
  const answerMode = String(state?.current_turn?.answer_mode || 'boolean');
  if (answerMode === 'choice') {
    const selected = normalizeAnswerText(voteRaw);
    const allowedOptions = Array.isArray(state?.current_turn?.statement_options)
      ? state.current_turn.statement_options
      : [];
    const matched = allowedOptions.find((item) => normalizeAnswerText(item).toLowerCase() === selected.toLowerCase());
    if (!matched) {
      throw new Error('Invalid vote value');
    }
    state.current_turn.votes[String(voterId)] = normalizeAnswerText(matched);
    return;
  }

  const vote = normalizeVote(voteRaw);
  if (!vote) {
    throw new Error('Invalid vote value');
  }
  state.current_turn.votes[String(voterId)] = vote;
}

function maybeCloseVoting(state, nowMs) {
  if (state.phase !== STATES.VOTING_OPEN) return false;
  const eligible = getEligibleVoters(state);
  const answerMode = String(state?.current_turn?.answer_mode || 'boolean');
  const allVoted = eligible.length > 0
    && eligible.every((participantId) => {
      const vote = state.current_turn.votes[participantId];
      if (answerMode === 'choice') {
        const allowed = Array.isArray(state?.current_turn?.statement_options) ? state.current_turn.statement_options : [];
        return allowed.some((item) => normalizeAnswerText(item).toLowerCase() === normalizeAnswerText(vote).toLowerCase());
      }
      return vote === 'vrai' || vote === 'mensonge';
    });

  const timedOut = state.phase_deadline_ms != null && nowMs >= state.phase_deadline_ms;
  if (!allVoted && !timedOut) return false;

  const truth = String(state?.current_turn?.correct_answer || 'mensonge');
  state.current_turn.reveal_reason = timedOut ? 'vote_timeout' : 'all_votes_collected';
  computeRoundResult(state, truth);
  setPhase(state, STATES.ROUND_RESULT, nowMs, state.timing.round_result_ms);
  return true;
}

function computeRoundResult(state, truthValue) {
  const poserId = getPoserId(state);
  const answerMode = String(state?.current_turn?.answer_mode || 'boolean');
  let normalizedTruth = 'mensonge';
  if (answerMode === 'choice') {
    normalizedTruth = normalizeAnswerText(truthValue);
  } else {
    normalizedTruth = truthValue === true || String(truthValue).trim().toLowerCase() === 'vrai' ? 'vrai' : 'mensonge';
  }
  const eligible = getEligibleVoters(state);
  const perVoter = eligible.map((participantId) => {
    const vote = state.current_turn.votes[participantId] || null;
    const normalizedVote = answerMode === 'choice' ? normalizeAnswerText(vote) : vote;
    const isCorrect = normalizedVote != null && normalizedVote === normalizedTruth;
    const points = isCorrect ? 1 : 0;
    state.scores[participantId] = Number(state.scores[participantId] || 0) + points;
    return {
      participant_id: participantId,
      vote: normalizedVote,
      status: vote == null ? 'absent' : (isCorrect ? 'correct' : 'incorrect'),
      points
    };
  });

  const fooledPlayers = perVoter.filter((entry) => entry.status === 'incorrect').length;
  const poserPoints = fooledPlayers > 0 ? 1 : 0;

  if (state.scores[poserId] == null) {
    state.scores[poserId] = 0;
  }
  state.scores[poserId] = Number(state.scores[poserId] || 0) + poserPoints;

  const roundResult = {
    turn_index: state.turn_index,
    poser_id: poserId,
    passage_number: getPassageNumber(state),
    statement_id: state.current_turn.statement_id,
    statement_prompt: state.current_turn.statement_prompt,
    statement_options: state.current_turn.statement_options,
    selected_option: state.current_turn.selected_option,
    answer_mode: answerMode,
    statement_text: state.current_turn.statement_text,
    statement_category: state.current_turn.statement_category,
    truth: normalizedTruth,
    reveal_reason: state.current_turn.reveal_reason || 'auto_vote_resolution',
    poser_points: poserPoints,
    votes: perVoter,
    score_snapshot: { ...state.scores }
  };

  state.current_turn.revealed_truth = normalizedTruth;
  state.current_turn.result = roundResult;
  state.current_turn.locked = true;
  state.round_history.push(roundResult);
  state.used_statement_ids_by_participant[poserId].push(state.current_turn.statement_id);
}

function skipTurnForSelectionTimeout(state) {
  const poserId = getPoserId(state);
  if (!poserId || !state.current_turn) return;

  if (state.scores[poserId] == null) {
    state.scores[poserId] = 0;
  }

  const roundResult = {
    turn_index: state.turn_index,
    poser_id: poserId,
    passage_number: getPassageNumber(state),
    statement_id: null,
    statement_prompt: '',
    statement_options: [],
    selected_option: null,
    answer_mode: 'boolean',
    statement_text: '',
    statement_category: '',
    truth: null,
    reveal_reason: 'selection_timeout',
    poser_points: 0,
    votes: [],
    score_snapshot: { ...state.scores }
  };

  state.current_turn.revealed_truth = null;
  state.current_turn.reveal_reason = 'selection_timeout';
  state.current_turn.result = roundResult;
  state.current_turn.locked = true;
  state.round_history.push(roundResult);
}

function buildRanking(state) {
  const entries = state.participants_order.map((participantId) => ({
    participant_id: participantId,
    score: Number(state.scores[participantId] || 0)
  }));

  entries.sort((a, b) => (b.score - a.score) || a.participant_id.localeCompare(b.participant_id));

  let currentRank = 1;
  for (let index = 0; index < entries.length; index += 1) {
    if (index > 0 && entries[index].score < entries[index - 1].score) {
      currentRank = index + 1;
    }
    entries[index].rank = currentRank;
    entries[index].tie = index > 0 && entries[index].score === entries[index - 1].score;
  }
  state.ranking = entries;
}

function advanceAfterResult(state, nowMs) {
  if (state.phase !== STATES.ROUND_RESULT) {
    throw new Error('Round result phase required');
  }
  const transitionDelayMs = Math.max(0, Number(state?.timing?.next_turn_ms || 0));
  setPhase(state, STATES.NEXT_TURN, nowMs, transitionDelayMs);
  if (transitionDelayMs <= 0) {
    advanceFromNextTurn(state, nowMs);
  }
}

function advanceFromNextTurn(state, nowMs) {
  if (state.phase !== STATES.NEXT_TURN) {
    throw new Error('Next turn phase required');
  }
  state.turn_index += 1;
  if (state.turn_index >= state.total_turns) {
    setPhase(state, STATES.FINISHED, nowMs, 0);
    buildRanking(state);
    return;
  }
  enterSelectingState(state, nowMs);
}

function handlePoserDisconnect(state, participantId, nowMs) {
  if (state.facilitator_pause) return false;
  const poserId = getPoserId(state);
  if (String(participantId) !== String(poserId)) {
    return false;
  }
  if (![STATES.SELECTING_STATEMENT, STATES.VOTING_OPEN].includes(state.phase)) {
    return false;
  }

  const remaining = state.phase_deadline_ms == null
    ? 0
    : Math.max(0, state.phase_deadline_ms - nowMs);

  state.paused = {
    poser_id: poserId,
    paused_phase: state.phase,
    remaining_ms: remaining
  };
  setPhase(state, STATES.PAUSED_POSER_DISCONNECT, nowMs, 0);
  return true;
}

function pauseByFacilitator(state, nowMs) {
  if (state.facilitator_pause) return false;
  if ([STATES.WAITING_START, STATES.FINISHED, STATES.PAUSED_POSER_DISCONNECT].includes(state.phase)) return false;

  const remainingMs = state.phase_deadline_ms == null
    ? 0
    : Math.max(0, state.phase_deadline_ms - nowMs);
  const phaseDurationMs = state.phase_deadline_ms != null && state.phase_started_at_ms != null
    ? Math.max(0, state.phase_deadline_ms - state.phase_started_at_ms)
    : 0;

  state.facilitator_pause = {
    remaining_ms: remainingMs,
    phase_duration_ms: phaseDurationMs,
  };
  state.phase_deadline_ms = null;
  return true;
}

function resumeByFacilitator(state, nowMs) {
  const pause = state.facilitator_pause;
  if (!pause) return false;

  const remainingMs = Math.max(0, Number(pause.remaining_ms || 0));
  const phaseDurationMs = Math.max(remainingMs, Number(pause.phase_duration_ms || 0));
  state.phase_started_at_ms = nowMs - Math.max(0, phaseDurationMs - remainingMs);
  state.phase_deadline_ms = phaseDurationMs > 0 ? nowMs + remainingMs : null;
  state.facilitator_pause = null;
  return true;
}

function resumeAfterPoserReconnect(state, participantId, nowMs) {
  const paused = state.paused;
  if (!paused) return false;
  if (String(paused.poser_id) !== String(participantId)) return false;
  if (state.phase !== STATES.PAUSED_POSER_DISCONNECT) return false;
  if (!canTransition(state.phase, paused.paused_phase)) return false;

  state.phase = paused.paused_phase;
  state.phase_started_at_ms = nowMs;
  state.phase_deadline_ms = nowMs + Math.max(0, Number(paused.remaining_ms || 0));
  state.paused = null;
  return true;
}

function tick(state, nowMs) {
  const events = [];
  let changed = false;

  if (state.facilitator_pause) {
    return { changed, events };
  }

  if (state.phase === STATES.SELECTING_STATEMENT && state.phase_deadline_ms != null && nowMs >= state.phase_deadline_ms) {
    skipTurnForSelectionTimeout(state);
    setPhase(state, STATES.NEXT_TURN, nowMs, 0);
    advanceFromNextTurn(state, nowMs);
    changed = true;
    events.push({ type: 'vom.selection_timeout', payload: { turn_index: state.turn_index - 1 } });
    if (state.phase === STATES.FINISHED) {
      events.push({ type: 'vom.completed', payload: { ranking: state.ranking } });
    }
  }

  if (state.phase === STATES.VOTING_OPEN) {
    const closed = maybeCloseVoting(state, nowMs);
    if (closed) {
      changed = true;
      events.push({ type: 'vom.voting_closed', payload: { turn_index: state.turn_index } });
    }
  }

  if (state.phase === STATES.ROUND_RESULT && state.phase_deadline_ms != null && nowMs >= state.phase_deadline_ms) {
    advanceAfterResult(state, nowMs);
    changed = true;
  }

  if (state.phase === STATES.NEXT_TURN && state.phase_deadline_ms != null && nowMs >= state.phase_deadline_ms) {
    advanceFromNextTurn(state, nowMs);
    changed = true;
    if (state.phase === STATES.FINISHED) {
      events.push({ type: 'vom.completed', payload: { ranking: state.ranking } });
    }
  }

  return { changed, events };
}

export {
  STATES,
  buildInitialState,
  syncParticipants,
  startChallenge,
  chooseStatement,
  castVote,
  maybeCloseVoting,
  handlePoserDisconnect,
  resumeAfterPoserReconnect,
  pauseByFacilitator,
  resumeByFacilitator,
  tick,
  normalizeVote,
  parseStatementChoices
};