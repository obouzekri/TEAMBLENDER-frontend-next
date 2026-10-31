// Pixel Architect demo scenario: four fictional builders replicate the "Tour Signal" model.
// Grid, evaluation and payload come from a copy of the backend runtime (pixelLogic.mjs).

import { createRandom } from '../demoScenario.mjs';
import { buildInitialPixelState, buildPixelPayloadForSocket, buildPixelTemplateCells, rebuildPixelCounters } from './pixelLogic.mjs';

export const PIXEL_ENGINE_KEY = 'pixel_architect_v1';

const DURATION_SECONDS = 900;
const SECONDS_PER_TICK = 15;

// Default templates of backend/src/challenges/engines/pixel_architect_v1/index.js.
const TEMPLATES = [
  { id: 'tour_signal', name: 'Tour Signal', difficulty: 'facile', max_dims: { x: 6, y: 6, z: 4 }, target_cube_count: 24, palette: ['#2F80ED', '#27AE60', '#F2994A'] },
  { id: 'pont_croise', name: 'Pont Croise', difficulty: 'moyen', max_dims: { x: 8, y: 6, z: 8 }, target_cube_count: 48, palette: ['#2D9CDB', '#EB5757', '#F2C94C'] },
  { id: 'agora_pixel', name: 'Agora Pixel', difficulty: 'difficile', max_dims: { x: 10, y: 10, z: 5 }, target_cube_count: 45, palette: ['#56CCF2', '#BB6BD9', '#6FCF97'] },
];

export function buildPixelConfig(locale) {
  return {
    title: 'Pixel Architect',
    mode: 'replication',
    collaborationMode: 'standard',
    difficulty: 'facile',
    settings: { timeLimitSeconds: DURATION_SECONDS, maxCubes: 50, maxColors: 3, hintsEnabled: true, chatEnabled: false, timerEnabled: true },
    palette: TEMPLATES[0].palette,
    replication: { modelSource: 'template', templateId: 'tour_signal' },
    creative: { theme: locale === 'en' ? 'Build a structure that symbolises collaboration.' : 'Construisez une structure qui symbolise la collaboration.' },
    templates: TEMPLATES,
    advancedRoles: { architectParticipantIds: [], builderParticipantIds: [] },
    timer: { enabled: true, duration_seconds: DURATION_SECONDS, warning_threshold_seconds: 60 },
    chat: { enabled: false },
  };
}

// Pixel branch of the backend summary (socket-runtime buildSummary).
export function buildPixelSummary(state, participantCount) {
  const pixel = state.pixel;
  const duration = state.timer.duration_seconds;
  const remaining = state.timer.remaining_seconds;
  const evaluation = pixel.evaluation;
  const completion = Number(evaluation.completion_percent || 0);
  const usedColors = new Set(Object.values(pixel.cubes).map((cube) => cube.color)).size;
  const maxColors = Math.max(1, Number(state.config.settings.maxColors || 3));
  const precision = Math.max(0, Math.min(100, Number(evaluation.accuracy_percent || 0)));
  const collaboration = Math.min(100, Math.round((state.metrics.message_count * 12) + (participantCount * 8)));
  const efficiency = Math.max(0, 100 - Math.max(0, usedColors - maxColors) * 15);
  const speedBonus = duration > 0 ? Math.round((Math.max(0, remaining) / duration) * 100) : 0;
  const score = Math.round((precision * 0.35) + (collaboration * 0.2) + (efficiency * 0.15)
    + (Math.min(100, completion) * 0.1) + (Math.min(100, completion) * 0.1) + (speedBonus * 0.1));
  return {
    total_time_seconds: duration - remaining,
    completion_percent: completion,
    action_count: state.metrics.action_count,
    message_count: state.metrics.message_count,
    collective_score: score,
    pixel_metrics: { ...evaluation, used_colors: usedColors, placed_count: pixel.placed_count },
  };
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function createPixelScenario({ seed = 1, locale = 'fr', players = [], now = () => Date.now() } = {}) {
  const random = createRandom(seed);
  const builderIds = players.map((player) => player.id);
  // The team panel prints placed_by as is (a participant id in production): first names read better here.
  const builderNames = players.map((player) => player.name);

  function createState() {
    const config = buildPixelConfig(locale);
    return {
      config,
      pixel: buildInitialPixelState(config),
      timer: { enabled: true, status: 'idle', duration_seconds: DURATION_SECONDS, remaining_seconds: DURATION_SECONDS, warning_threshold_seconds: 60 },
      metrics: { action_count: 0, message_count: 0, pixel: { placements: 0, removals: 0, color_changes: 0 } },
      summary: null,
    };
  }

  function view(state, ctx) {
    return {
      config: state.config,
      timer: state.timer,
      summary: state.summary,
      puzzle: { pieces: [] },
      pixel: buildPixelPayloadForSocket(state, ctx.participantId, ctx.role !== 'participant'),
    };
  }

  function onTimer(state, type) {
    if (type !== 'timer.start') return state;
    return { ...state, pixel: { ...state.pixel, phase: 'jeu' } };
  }

  function placeCube(pixel, key, color, at) {
    const [x, y, z] = key.split(':').map(Number);
    pixel.cubes[key] = { x, y, z, color, placed_by: builderNames[Math.floor(random() * builderNames.length)], ts: new Date(at).toISOString() };
  }

  // Builders work bottom-up on the target; now and then someone adds a stray cube and removes it.
  function build(next) {
    const pixel = next.pixel;
    const targets = buildPixelTemplateCells(pixel.selected_template)
      .sort((a, b) => Number(a.split(':')[1]) - Number(b.split(':')[1]));
    const stray = Object.keys(pixel.cubes).find((key) => !targets.includes(key));
    const at = now();
    if (stray) {
      delete pixel.cubes[stray];
      next.metrics.pixel.removals += 1;
    } else {
      const missing = targets.filter((key) => !pixel.cubes[key]);
      if (!missing.length) return false;
      const key = missing[0];
      const layer = Number(key.split(':')[1]);
      if (random() < 0.12) {
        const [x, , z] = key.split(':').map(Number);
        const strayKey = `${(x + 1) % pixel.grid.x}:${layer}:${z}`;
        if (!pixel.cubes[strayKey] && !targets.includes(strayKey)) {
          placeCube(pixel, strayKey, pixel.palette[layer % pixel.palette.length], at);
          next.metrics.pixel.placements += 1;
        } else {
          placeCube(pixel, key, pixel.palette[layer % pixel.palette.length], at);
        }
      } else {
        placeCube(pixel, key, pixel.palette[layer % pixel.palette.length], at);
        next.metrics.pixel.placements += 1;
      }
    }
    next.metrics.action_count += 1;
    rebuildPixelCounters(pixel);
    return true;
  }

  function finish(next) {
    const at = now();
    next.pixel.final_submissions = Object.fromEntries(builderIds.map((id) => [id, new Date(at).toISOString()]));
    next.pixel.phase = 'debrief';
    next.timer.status = 'completed';
    next.summary = buildPixelSummary(next, builderIds.length);
    return next;
  }

  function tick(state) {
    const next = cloneState(state);
    next.timer.remaining_seconds = Math.max(0, next.timer.remaining_seconds - SECONDS_PER_TICK);
    if (random() < 0.85) build(next);
    if (next.pixel.evaluation?.perfect_match || next.timer.remaining_seconds === 0) return finish(next);
    return next;
  }

  return { engineKey: PIXEL_ENGINE_KEY, createState, view, onTimer, tick };
}
