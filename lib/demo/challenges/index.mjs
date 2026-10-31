// Challenges the demo runs with their real interface, keyed by engine.
import { COPUZZLE_ENGINE_KEY, createCopuzzleScenario } from './copuzzle.mjs';
import { LABY_ENGINE_KEY, createLabyrintheScenario } from './labyrinthe.mjs';
import { PIXEL_ENGINE_KEY, createPixelScenario } from './pixelArchitect.mjs';
import { VOM_ENGINE_KEY, createVomScenario } from './vraiOuMensonge.mjs';

export { VOM_ENGINE_KEY };

const SCENARIO_FACTORIES = {
  [COPUZZLE_ENGINE_KEY]: createCopuzzleScenario,
  [LABY_ENGINE_KEY]: createLabyrintheScenario,
  [VOM_ENGINE_KEY]: createVomScenario,
  [PIXEL_ENGINE_KEY]: createPixelScenario,
};

export const DEMO_ENGINE_KEYS = Object.keys(SCENARIO_FACTORIES);

// options: { seed, locale, players: [{ id, name, bot }], autoStartMs }
export function createDemoScenario(engineKey, options) {
  const factory = SCENARIO_FACTORIES[engineKey];
  return factory ? factory(options) : null;
}
