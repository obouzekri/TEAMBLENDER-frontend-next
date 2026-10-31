// Pari sur moi demo scenario. The rules run on a copy of the backend state machine
// (vomGameLogic.mjs); this module only scripts the fictional players and shapes payloads
// like backend/src/challenges/engines/vrai_ou_mensonge_v1/server-runtime.js.

import { createRandom } from '../demoScenario.mjs';
import {
  STATES,
  buildInitialState,
  castVote,
  chooseStatement,
  maybeCloseVoting,
  parseStatementChoices,
  pauseByFacilitator,
  resumeByFacilitator,
  startChallenge,
  syncParticipants,
  tick as tickGame,
} from './vomGameLogic.mjs';

export const VOM_ENGINE_KEY = 'vrai_ou_mensonge_v1';

// Default catalog of backend/src/challenges/engines/vrai_ou_mensonge_v1/index.js.
const CATALOG = [
  { category: { fr: 'Préférences (rapides)', en: 'Quick preferences' }, statements: [
    { id: 'pr_01', fr: 'Je préfère: café / thé / jus.', en: 'I prefer: coffee / tea / juice.', truth: true },
    { id: 'pr_02', fr: 'Je préfère: montagne / plage / forêt.', en: 'I prefer: mountains / beach / forest.', truth: true },
    { id: 'pr_03', fr: 'Je préfère: ville / campagne.', en: 'I prefer: city / countryside.', truth: false },
    { id: 'pr_04', fr: 'Je préfère: films / sorties.', en: 'I prefer: films / going out.', truth: false },
  ] },
  { category: { fr: 'Compétences et talents', en: 'Skills and talents' }, statements: [
    { id: 'ct_01', fr: 'Je maîtrise plus de trois langues.', en: 'I speak more than three languages.', truth: true },
    { id: 'ct_02', fr: 'J’ai un talent caché.', en: 'I have a hidden talent.', truth: false },
  ] },
  { category: { fr: 'Habitudes', en: 'Habits' }, statements: [
    { id: 'ht_01', fr: 'Je me couche tard / tôt.', en: 'I go to bed late / early.', truth: true },
    { id: 'ht_02', fr: 'Je fais du sport régulièrement.', en: 'I exercise regularly.', truth: false },
    { id: 'ht_03', fr: 'Je commence ma journée avec mon téléphone.', en: 'I start my day with my phone.', truth: false },
    { id: 'ht_04', fr: 'Je grignote entre les repas.', en: 'I snack between meals.', truth: true },
  ] },
  { category: { fr: 'Personnalité', en: 'Personality' }, statements: [
    { id: 'pe_01', fr: 'Je suis plutôt: compétitif / calme / spontané.', en: 'I am more: competitive / calm / spontaneous.', truth: true },
  ] },
  { category: { fr: 'Petites anecdotes', en: 'Little anecdotes' }, statements: [
    { id: 'pa_01', fr: 'J’ai déjà oublié de me présenter en réunion importante.', en: 'I have forgotten to introduce myself in an important meeting.', truth: false },
    { id: 'pa_02', fr: 'J’ai déjà répondu “oui” sans avoir compris.', en: 'I have answered yes without understanding.', truth: true },
    { id: 'pa_03', fr: 'J’ai déjà perdu: téléphone / portefeuille / les deux.', en: 'I have lost: phone / wallet / both.', truth: false },
  ] },
];

const ACTIVE_PHASES = new Set([STATES.SELECTING_STATEMENT, STATES.VOTING_OPEN, STATES.ROUND_RESULT, STATES.NEXT_TURN]);
const REVEALED_PHASES = new Set([STATES.ROUND_RESULT, STATES.NEXT_TURN, STATES.FINISHED]);

export function buildVomConfig(locale) {
  const lang = locale === 'en' ? 'en' : 'fr';
  const catalog = CATALOG.flatMap((group) => group.statements.map((statement) => ({
    id: statement.id,
    text: statement[lang],
    category: group.category[lang],
    fallback_truth: statement.truth,
  })));
  return {
    locale: lang,
    title: lang === 'en' ? 'Bet on me!' : 'Pari sur moi',
    mode: 'individual',
    rounds_per_participant: 1,
    target_duration_minutes: 15,
    catalog_version: 'v1.0.0',
    catalog,
    categories: CATALOG.map((group) => group.category[lang]),
    timing: { selecting_ms: 40_000, voting_ms: 40_000, round_result_ms: 3_000, next_turn_ms: 0 },
    chat: { enabled: false },
  };
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

// players: [{ id, name, bot }]; the visitor is the only player with bot === false.
export function createVomScenario({ seed = 1, locale = 'fr', players = [], autoStartMs = null, now = () => Date.now() } = {}) {
  const random = createRandom(seed);
  const botIds = new Set(players.filter((player) => player.bot !== false).map((player) => player.id));

  function createState() {
    const config = buildVomConfig(locale);
    const vom = buildInitialState(config);
    syncParticipants(vom, Object.fromEntries(players.map((player, index) => [player.id, index + 1])));
    return {
      config,
      vom,
      timer: { enabled: false, status: 'disabled', duration_seconds: 0, remaining_seconds: 0 },
      summary: null,
      autoStartAt: autoStartMs == null ? null : now() + autoStartMs,
      plan: null,
      actions: 0,
    };
  }

  function view(state, ctx) {
    const participantsMeta = players.map((player, index) => ({
      participant_id: player.id,
      display_name: player.name,
      first_name: player.name,
      last_name: '',
      slot: index + 1,
      connected: true,
    }));
    let vom = { ...state.vom, participants_meta: participantsMeta };
    const turn = vom.current_turn;
    const canSeeChoice = ctx.role !== 'participant' || turn?.poser_id === ctx.participantId || REVEALED_PHASES.has(vom.phase);
    if (turn && !canSeeChoice && Array.isArray(turn.statement_options) && turn.statement_options.length > 1) {
      vom = { ...vom, current_turn: { ...turn, selected_option: null, statement_text: turn.statement_prompt || turn.statement_text, correct_answer: null } };
    }
    return { config: state.config, timer: state.timer, summary: state.summary, puzzle: { pieces: [] }, vom };
  }

  function isRunning(state) {
    return state.vom.phase !== STATES.FINISHED
      && (ACTIVE_PHASES.has(state.vom.phase) || state.autoStartAt != null);
  }

  // Bots act a couple of seconds into each phase, like people reading and deciding.
  function planFor(vom, at) {
    const key = `${vom.turn_index}:${vom.phase}`;
    const voters = vom.participants_order.filter((id) => id !== vom.current_turn?.poser_id && botIds.has(id));
    return {
      key,
      poseAt: at + 1500 + Math.round(random() * 1000),
      voteAt: Object.fromEntries(voters.map((id) => [id, at + 1000 + Math.round(random() * 2500)])),
    };
  }

  function playBots(next, at) {
    const vom = next.vom;
    const key = `${vom.turn_index}:${vom.phase}`;
    if (next.plan?.key !== key) next.plan = planFor(vom, at);
    const poserId = vom.current_turn?.poser_id;
    if (vom.phase === STATES.SELECTING_STATEMENT && botIds.has(poserId) && at >= next.plan.poseAt) {
      const used = new Set(vom.used_statement_ids_by_participant[poserId] || []);
      const options = vom.catalog.filter((statement) => !used.has(statement.id));
      const statement = options[Math.floor(random() * options.length)];
      const choices = parseStatementChoices(statement.text)?.options;
      const selectedOption = choices ? choices[Math.floor(random() * choices.length)] : (random() < 0.5 ? 'vrai' : 'mensonge');
      chooseStatement(vom, poserId, statement.id, at, { selected_option: selectedOption });
      next.actions += 1;
    }
    if (vom.phase === STATES.VOTING_OPEN) {
      for (const [voterId, voteAt] of Object.entries(next.plan.voteAt)) {
        if (vom.current_turn.votes[voterId] || at < voteAt) continue;
        const turn = vom.current_turn;
        const truth = turn.correct_answer;
        let vote;
        if (turn.answer_mode === 'choice') {
          const wrong = turn.statement_options.filter((option) => option.toLowerCase() !== String(truth).toLowerCase());
          vote = random() < 0.55 || !wrong.length ? truth : wrong[Math.floor(random() * wrong.length)];
        } else {
          vote = random() < 0.55 ? truth : (truth === 'vrai' ? 'mensonge' : 'vrai');
        }
        castVote(vom, voterId, vote);
        next.actions += 1;
      }
      maybeCloseVoting(vom, at);
    }
  }

  function finishIfDone(next) {
    if (next.vom.phase === STATES.FINISHED && !next.summary) {
      const votes = next.vom.round_history.flatMap((round) => round.votes);
      const correct = votes.filter((vote) => vote.status === 'correct').length;
      next.summary = {
        total_time_seconds: 0,
        completion_percent: 100,
        action_count: next.actions,
        message_count: 0,
        collective_score: votes.length > 0 ? Math.round((correct / votes.length) * 100) : 0,
        collective_score_max: 100,
        correct_votes: correct,
        total_votes: votes.length,
        pixel_metrics: null,
      };
    }
    return next;
  }

  function tick(state) {
    const at = now();
    const next = cloneState(state);
    if (next.autoStartAt != null && next.vom.phase === STATES.WAITING_START && at >= next.autoStartAt) {
      startChallenge(next.vom, at);
      next.autoStartAt = null;
    }
    if (!next.vom.facilitator_pause) {
      playBots(next, at);
      tickGame(next.vom, at);
    }
    finishIfDone(next);
    return JSON.stringify(next) === JSON.stringify(state) ? null : next;
  }

  function handleEvent(state, type, payload, ctx) {
    const at = now();
    const next = cloneState(state);
    try {
      if (type === 'vom.start' && ctx.role !== 'participant') {
        startChallenge(next.vom, at);
      } else if (type === 'vom.pause' && ctx.role !== 'participant') {
        if (!pauseByFacilitator(next.vom, at)) return null;
      } else if (type === 'vom.resume' && ctx.role !== 'participant') {
        if (!resumeByFacilitator(next.vom, at)) return null;
      } else if (type === 'vom.select_statement' && ctx.role === 'participant') {
        chooseStatement(next.vom, ctx.participantId, String(payload.statement_id || payload.statementId || ''), at, {
          selected_option: String(payload.selected_option || payload.selectedOption || '').trim(),
        });
        next.actions += 1;
      } else if (type === 'vom.vote' && ctx.role === 'participant') {
        castVote(next.vom, ctx.participantId, typeof payload.vote === 'string' ? payload.vote.trim() : payload.vote);
        maybeCloseVoting(next.vom, at);
        next.actions += 1;
      } else {
        return null;
      }
    } catch {
      return null;
    }
    return finishIfDone(next);
  }

  return { engineKey: VOM_ENGINE_KEY, createState, view, isRunning, tick, handleEvent };
}
