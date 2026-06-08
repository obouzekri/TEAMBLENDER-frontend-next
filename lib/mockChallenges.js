// Données mock de challenges pour développement
// Ces données seront remplacées par les appels API à /api/challenges en production
const BASE_MOCK_CHALLENGES = [
  {
    id: 'pixel_architect_001',
    name: 'Pixel Architect',
    category: 'creativite-innovation',
    objective: 'collaboration',
    duration: 15,
    type: 'Création 3D collaborative',
    tags: ['Voxel', 'Collaboration', 'Temps limité'],
    description: 'Construire une structure 3D en cubes sous contraintes de temps, ressources et communication.',
    engine_key: 'pixel_architect_v1',
    config: {
      mode: 'replication',
      collaborationMode: 'standard',
      settings: {
        timeLimitSeconds: 900,
        maxCubes: 50,
        maxColors: 3,
        hintsEnabled: true,
        chatEnabled: true,
        timerEnabled: true,
      },
      replication: {
        modelSource: 'template',
        templateId: 'tour_signal',
      },
      creative: {
        theme: 'Construisez une structure qui symbolise la collaboration.',
      },
    },
  },
  {
    id: 'copuzzle_001',
    name: 'CoPuzzle Live',
    category: 'escape-game',
    objective: 'cohesion',
    duration: 15,
    type: 'Puzzle collaboratif',
    tags: ['Collaboration', 'Temps limité', 'Réflexion'],
    description: 'Un puzzle collectif où tous les participants contribuent à assembler l\'image',
    config: {
      image: '',
      expectedCount: 4,
      duration: 600,
      warning: 60,
    },
  },
  {
    id: 'labyrinthe_001',
    name: 'Labyrinthe virtuel',
    category: 'escape-game',
    objective: 'cohesion',
    duration: 12,
    type: 'Navigation collective',
    tags: ['Navigation', 'Coopération', 'Défi'],
    description: 'Naviguer ensemble dans un labyrinthe virtuel en temps limité',
    config: {
      rows: 10,
      cols: 10,
      complexity: 'medium',
    },
  },
  {
    id: 'enigme_001',
    name: 'Énigme du trésor',
    category: 'logique-reflexion',
    objective: 'resolution-problemes',
    duration: 20,
    type: 'Énigme collaborative',
    tags: ['Déduction', 'Équipe', 'Créativité'],
    description: 'Une énigme complexe à résoudre en équipe avec indices progressifs',
    config: {},
  },
  {
    id: 'quiz_team_001',
    name: 'Quiz team',
    category: 'logique-reflexion',
    objective: 'resolution-problemes',
    duration: 10,
    type: 'Quiz compétitif',
    tags: ['Quiz', 'Compétition', 'Connaissance'],
    description: 'Un quiz interactif par équipe avec question bonus pour les vainqueurs',
    config: {},
  },
  {
    id: 'creation_001',
    name: 'Défi création',
    category: 'escape-game',
    objective: 'collaboration',
    duration: 25,
    type: 'Création collective',
    tags: ['Créativité', 'Collaboration', 'Défi'],
    description: 'Créer ensemble une œuvre artistique ou un projet dans le temps imparti',
    config: {},
  },
  {
    id: 'conflit_001',
    name: 'Résolution de conflit',
    category: 'logique-reflexion',
    objective: 'resolution-problemes',
    duration: 20,
    type: 'Atelier pratique',
    tags: ['Conflit', 'Communication', 'Résolution'],
    description: 'Simuler et discuter de scénarios de conflit pour développer des compétences',
    config: {},
  },
  {
    id: 'debrief_001',
    name: 'Débriefing structuré',
    category: 'logique-reflexion',
    objective: 'leadership',
    duration: 15,
    type: 'Réflexion collective',
    tags: ['Apprentissage', 'Feedback', 'Synthèse'],
    description: 'Structurer le débriefing avec des questions guidées et du temps de réflexion',
    config: {},
  },
];

const PLAYER_RANGES_BY_ENGINE = Object.freeze({
  pixel_architect_v1: { min_count: 3, recommended_count: 6, max_count: 12 },
  copuzzle_live_v1: { min_count: 2, recommended_count: 4, max_count: 8 },
  labyrinthe_live_v1: { min_count: 2, recommended_count: 5, max_count: 10 },
  phrase_collaborative_v1: { min_count: 3, recommended_count: 6, max_count: 12 },
  mission_critique_v1: { min_count: 3, recommended_count: 6, max_count: 12 },
  vrai_ou_mensonge_v1: { min_count: 4, recommended_count: 8, max_count: 30 },
  the_quiz_v1: { min_count: 4, recommended_count: 8, max_count: 30 },
});

export const mockChallenges = BASE_MOCK_CHALLENGES.map((challenge) => {
  const key = String(challenge?.engine_key || '').trim();
  const range = PLAYER_RANGES_BY_ENGINE[key] || null;
  if (!range) return challenge;

  return {
    ...challenge,
    engine_config: {
      ...(challenge?.engine_config && typeof challenge.engine_config === 'object' ? challenge.engine_config : {}),
      participants: {
        ...(challenge?.engine_config?.participants && typeof challenge.engine_config.participants === 'object'
          ? challenge.engine_config.participants
          : {}),
        min_count: range.min_count,
        recommended_count: range.recommended_count,
        max_count: range.max_count,
      },
    },
  };
});
