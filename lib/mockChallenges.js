// Données mock de challenges pour développement
// Ces données seront remplacées par les appels API à /api/challenges en production
import { LABYRINTHE_RULES_PRESET_KEY, getLabyrintheRulesPreset } from '@/lib/challenges/labyrintheRules';
import { VRAI_OU_MENSONGE_RULES_PRESET_KEY, getVraiOuMensongeRulesPreset } from '@/lib/challenges/vraiOuMensongeRules';
import { MISSION_CRITIQUE_RULES_PRESET_KEY, getMissionCritiqueRulesPreset } from '@/lib/challenges/missionCritiqueRules';
import { ESCAPE_ROOM_RULES_PRESET_KEY, getEscapeRoomRulesPreset } from '@/lib/challenges/escapeRoomRules';
import { PIXEL_ARCHITECT_RULES_PRESET_KEY, getPixelArchitectRulesPreset } from '@/lib/challenges/pixelArchitectRules';
import { THE_QUIZ_RULES_PRESET_KEY, getTheQuizRulesPreset } from '@/lib/challenges/theQuizRules';
import { PHRASE_MYSTERE_RULES_PRESET_KEY, getPhraseMystereRulesPreset } from '@/lib/challenges/phraseMystereRules';
import { COPUZZLE_RULES_PRESET_KEY, getCopuzzleRulesPreset } from '@/lib/challenges/copuzzleRules';

const LABYRINTHE_RULES_FR = getLabyrintheRulesPreset('fr');
const LABYRINTHE_RULES_EN = getLabyrintheRulesPreset('en');
const VOM_RULES_FR = getVraiOuMensongeRulesPreset('fr');
const VOM_RULES_EN = getVraiOuMensongeRulesPreset('en');
const MISSION_RULES_FR = getMissionCritiqueRulesPreset('fr');
const MISSION_RULES_EN = getMissionCritiqueRulesPreset('en');
const ESCAPE_RULES_FR = getEscapeRoomRulesPreset('fr');
const ESCAPE_RULES_EN = getEscapeRoomRulesPreset('en');
const PIXEL_RULES_FR = getPixelArchitectRulesPreset('fr');
const PIXEL_RULES_EN = getPixelArchitectRulesPreset('en');
const QUIZ_RULES_FR = getTheQuizRulesPreset('fr');
const QUIZ_RULES_EN = getTheQuizRulesPreset('en');
const PHRASE_RULES_FR = getPhraseMystereRulesPreset('fr');
const PHRASE_RULES_EN = getPhraseMystereRulesPreset('en');
const COPUZZLE_RULES_FR = getCopuzzleRulesPreset('fr');
const COPUZZLE_RULES_EN = getCopuzzleRulesPreset('en');

const BASE_MOCK_CHALLENGES = [
  {
    id: 'pixel_architect_001',
    name: PIXEL_RULES_FR.challengeName,
    category: 'creativite-innovation',
    objective: 'collaboration',
    duration: 15,
    type: 'Création 3D collaborative',
    tags: ['Voxel', 'Collaboration', 'Temps limité'],
    description: PIXEL_RULES_FR.objective,
    engine_key: 'pixel_architect_v1',
    engine_config: {
      participants: {
        min_count: 2,
        recommended_count: 4,
        max_count: 6,
      },
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
      rules: {
        preset_key: PIXEL_ARCHITECT_RULES_PRESET_KEY,
        objective: {
          fr: PIXEL_RULES_FR.objective,
          en: PIXEL_RULES_EN.objective,
        },
        facilitator: {
          fr: PIXEL_RULES_FR.facilitator,
          en: PIXEL_RULES_EN.facilitator,
        },
        participant: {
          fr: [...PIXEL_RULES_FR.participant, ...PIXEL_RULES_FR.scoring],
          en: [...PIXEL_RULES_EN.participant, ...PIXEL_RULES_EN.scoring],
        },
        footnote: {
          fr: PIXEL_RULES_FR.footnote,
          en: PIXEL_RULES_EN.footnote,
        },
      },
    },
  },
  {
    id: 'copuzzle_001',
    name: COPUZZLE_RULES_FR.challengeName,
    category: 'escape-game',
    objective: 'cohesion',
    duration: 15,
    type: 'Puzzle collaboratif',
    tags: ['Collaboration', 'Temps limité', 'Réflexion'],
    description: COPUZZLE_RULES_FR.objective,
    engine_key: 'copuzzle_live_v1',
    engine_config: {
      participants: {
        min_count: 2,
        recommended_count: 4,
        max_count: 8,
      },
      image_source_mode: 'defaults',
      grid: {
        rows: 4,
        cols: 4,
      },
      timer: {
        enabled: true,
        duration_seconds: 1200,
        warning_threshold_seconds: 60,
      },
      chat: {
        enabled: true,
      },
      participants: {
        show_reference_image: true,
      },
      rules: {
        preset_key: COPUZZLE_RULES_PRESET_KEY,
        objective: {
          fr: COPUZZLE_RULES_FR.objective,
          en: COPUZZLE_RULES_EN.objective,
        },
        facilitator: {
          fr: COPUZZLE_RULES_FR.facilitator,
          en: COPUZZLE_RULES_EN.facilitator,
        },
        participant: {
          fr: [...COPUZZLE_RULES_FR.participant, ...COPUZZLE_RULES_FR.scoring],
          en: [...COPUZZLE_RULES_EN.participant, ...COPUZZLE_RULES_EN.scoring],
        },
        footnote: {
          fr: COPUZZLE_RULES_FR.footnote,
          en: COPUZZLE_RULES_EN.footnote,
        },
      },
    },
    {
      id: 'the_quiz_001',
      name: QUIZ_RULES_FR.challengeName,
      category: 'culture-decouverte',
      objective: 'communication',
      duration: 15,
      type: 'Quiz multijoueur',
      tags: ['Culture', 'Rapidité', 'Classement'],
      description: QUIZ_RULES_FR.objective,
      engine_key: 'the_quiz_v1',
      engine_config: {
        participants: {
          min_count: 2,
          recommended_count: 4,
          max_count: 6,
        },
        preset: 'medium',
        question_count: 9,
        question_duration_seconds: 30,
        chat: {
          enabled: true,
          quick_reactions_enabled: true,
        },
        leaderboard: {
          enabled: true,
        },
        timer: {
          enabled: true,
          duration_seconds: 30,
          warning_threshold_seconds: 10,
        },
        rules: {
          preset_key: THE_QUIZ_RULES_PRESET_KEY,
          objective: {
            fr: QUIZ_RULES_FR.objective,
            en: QUIZ_RULES_EN.objective,
          },
          facilitator: {
            fr: QUIZ_RULES_FR.facilitator,
            en: QUIZ_RULES_EN.facilitator,
          },
          participant: {
            fr: [...QUIZ_RULES_FR.participant, ...QUIZ_RULES_FR.scoring],
            en: [...QUIZ_RULES_EN.participant, ...QUIZ_RULES_EN.scoring],
          },
          footnote: {
            fr: QUIZ_RULES_FR.footnote,
            en: QUIZ_RULES_EN.footnote,
          },
        },
      },
    },
    {
      id: 'phrase_collaborative_001',
      name: PHRASE_RULES_FR.challengeName,
      category: 'logique-reflexion',
      objective: 'collaboration',
      duration: 15,
      type: 'Phrase collaborative',
      tags: ['Communication', 'Collaboration', 'Mots'],
      description: PHRASE_RULES_FR.objective,
      engine_key: 'phrase_collaborative_v1',
      engine_config: {
        participants: {
          min_count: 3,
          recommended_count: 6,
          max_count: 12,
        },
        modeVisionLimitee: true,
        modeCommunication: 'libre',
        chat: {
          enabled: true,
        },
        timer: {
          enabled: true,
          duration_seconds: 900,
        },
        rules: {
          preset_key: PHRASE_MYSTERE_RULES_PRESET_KEY,
          objective: {
            fr: PHRASE_RULES_FR.objective,
            en: PHRASE_RULES_EN.objective,
          },
          facilitator: {
            fr: PHRASE_RULES_FR.facilitator,
            en: PHRASE_RULES_EN.facilitator,
          },
          participant: {
            fr: [...PHRASE_RULES_FR.participant, ...PHRASE_RULES_FR.hints, ...PHRASE_RULES_FR.scoring],
            en: [...PHRASE_RULES_EN.participant, ...PHRASE_RULES_EN.hints, ...PHRASE_RULES_EN.scoring],
          },
          footnote: {
            fr: PHRASE_RULES_FR.footnote,
            en: PHRASE_RULES_EN.footnote,
          },
        },
      },
    },
  {
    id: 'labyrinthe_001',
    name: 'Labyrinthe des Signaux',
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
    engine_key: 'labyrinthe_live_v1',
    engine_config: {
      participants: {
        min_count: 2,
        recommended_count: 4,
        max_count: 6,
      },
      rules: {
        preset_key: LABYRINTHE_RULES_PRESET_KEY,
        objective: {
          fr: LABYRINTHE_RULES_FR.objective,
          en: LABYRINTHE_RULES_EN.objective,
        },
        facilitator: {
          fr: LABYRINTHE_RULES_FR.facilitator,
          en: LABYRINTHE_RULES_EN.facilitator,
        },
        participant: {
          fr: LABYRINTHE_RULES_FR.participant,
          en: LABYRINTHE_RULES_EN.participant,
        },
        footnote: {
          fr: LABYRINTHE_RULES_FR.footnote,
          en: LABYRINTHE_RULES_EN.footnote,
        },
      },
    },
  },
  {
    id: 'vrai_ou_mensonge_001',
    name: 'Pari sur moi !',
    category: 'icebreaker',
    objective: 'communication',
    duration: 12,
    type: 'Debat express',
    tags: ['Icebreaker', 'Communication', 'Vote'],
    description: 'Saurez-vous distinguer le vrai du faux ?',
    engine_key: 'vrai_ou_mensonge_v1',
    engine_config: {
      participants: {
        min_count: 2,
        recommended_count: 4,
        max_count: 6,
      },
      rules: {
        preset_key: VRAI_OU_MENSONGE_RULES_PRESET_KEY,
        objective: {
          fr: VOM_RULES_FR.objective,
          en: VOM_RULES_EN.objective,
        },
        facilitator: {
          fr: VOM_RULES_FR.facilitator,
          en: VOM_RULES_EN.facilitator,
        },
        participant: {
          fr: [...VOM_RULES_FR.participant, ...VOM_RULES_FR.scoring],
          en: [...VOM_RULES_EN.participant, ...VOM_RULES_EN.scoring],
        },
        footnote: {
          fr: VOM_RULES_FR.footnote,
          en: VOM_RULES_EN.footnote,
        },
      },
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
    id: 'mission_critique_001',
    name: 'Mission Critique',
    category: 'Gestion de projet',
    objective: 'coordination',
    duration: 20,
    type: 'Timeline collaborative',
    tags: ['Planning', 'Dépendances', 'Collectif'],
    description: 'Reconstituer une timeline cohérente en équipe avant le temps imparti.',
    engine_key: 'mission_critique_v1',
    engine_config: {
      participants: {
        min_count: 2,
        recommended_count: 4,
        max_count: 6,
      },
      rules: {
        preset_key: ESCAPE_ROOM_RULES_PRESET_KEY,
        objective: {
          fr: ESCAPE_RULES_FR.objective,
          en: ESCAPE_RULES_EN.objective,
        },
        facilitator: {
          fr: ESCAPE_RULES_FR.facilitator,
          en: ESCAPE_RULES_EN.facilitator,
        },
        participant: {
          fr: [...ESCAPE_RULES_FR.participant, ...ESCAPE_RULES_FR.scoring],
          en: [...ESCAPE_RULES_EN.participant, ...ESCAPE_RULES_EN.scoring],
        },
        footnote: {
          fr: ESCAPE_RULES_FR.footnote,
          en: ESCAPE_RULES_EN.footnote,
        },
      },
    },
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
  phrase_collaborative_v1: { min_count: 3, recommended_count: 6, max_count: 12 },
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
