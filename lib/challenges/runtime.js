'use client';

/**
 * Challenge Runtime Dispatcher
 * 
 * Dynamically loads and mounts challenge engines based on engine_key
 * Handles:
 * - Engine module loading
 * - Context passing (facilitator vs participant)
 * - Error handling with fallback
 * 
 * Usage:
 *   const element = await mountRuntimeChallenge(
 *     'escape_room_v1',
 *     runtimePayload,
 *     socket,
 *     { role: 'facilitator', userId: 123 }
 *   );
 *   targetElement.appendChild(element);
 */

// Registry of available challenge engines
// Auto-populated during build/runtime
const engineRegistry = {
  'escape_room_v1': {
    name: 'Escape Room',
    component: () => import('@/components/Challenges/EscapeRoom/EscapeRoomChallenge'),
    description: 'Solvez des énigmes collectivement'
  },
  'phrase_collaborative_v1': {
    name: 'Phrase Collaborative',
    component: () => import('@/components/Challenges/PhraseCoop/PhraseChallenge'),
    description: 'Reconstruisez une phrase collectivement'
  },
  'copuzzle_live_v1': {
    name: 'Copuzzle Live',
    component: () => import('@/components/Challenges/CopuzzleLive/CopuzzleChallenge'),
    description: 'Résolvez un puzzle en compétition'
  },
  'labyrinthe_live_v1': {
    name: 'Labyrinthe Live',
    component: () => import('@/components/Challenges/LabyrintheLive/LabyrintheLive'),
    description: 'Naviguez dans un labyrinthe'
  },
  'icebreaker_v1': {
    name: 'Icebreaker',
    component: () => import('@/components/Challenges/Icebreaker/IcebreakerChallenge'),
    description: 'Questions rapides d\'équipe'
  },
  'local_page_v1': {
    name: 'Page Locale',
    component: () => import('@/components/Challenges/LocalPage/LocalPageChallenge'),
    description: 'Contenu statique (redirect)'
  }
};

/**
 * Mount a challenge engine for runtime execution
 * 
 * @param {string} engineKey - e.g., 'escape_room_v1'
 * @param {object} runtimePayload - Runtime config from backend
 * @param {object} socket - Socket.io instance for real-time events
 * @param {object} context - { role, userId, sessionId, ... }
 * @returns {Promise<React.ReactElement>} Challenge component
 */
export async function mountRuntimeChallenge(
  engineKey,
  runtimePayload,
  socket,
  context
) {
  if (!engineKey || !runtimePayload) {
    throw new Error('engineKey et runtimePayload requis');
  }

  const engineDef = engineRegistry[engineKey];
  if (!engineDef) {
    throw new Error(`Engine non reconnu: ${engineKey}`);
  }

  try {
    // Dynamically import the engine component
    const { default: EngineComponent } = await engineDef.component();

    // Return React component with props
    // Component should handle its own Socket.io listeners and state management
    return {
      engineKey,
      component: EngineComponent,
      name: engineDef.name,
      description: engineDef.description,
      props: {
        engineKey,
        runtimePayload,
        socket,
        context,
      },
    };
  } catch (err) {
    console.error(`Failed to load engine ${engineKey}:`, err);
    throw new Error(`Impossible de charger le challenge: ${err.message}`);
  }
}

/**
 * Get available engines
 */
export function getAvailableEngines() {
  return Object.entries(engineRegistry).map(([key, def]) => ({
    key,
    name: def.name,
    description: def.description,
  }));
}

/**
 * Register a custom engine at runtime (for extensions)
 */
export function registerEngine(engineKey, engineDef) {
  if (engineRegistry[engineKey]) {
    console.warn(`Engine ${engineKey} already registered, overwriting...`);
  }
  engineRegistry[engineKey] = engineDef;
}

export default mountRuntimeChallenge;
