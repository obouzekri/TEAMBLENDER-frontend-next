// Built-in challenges the admin catalog always lists, even before they exist in the database.
import { getPixelArchitectRulesPreset } from '@/lib/challenges/pixelArchitectRules';
import { getTheQuizRulesPreset } from '@/lib/challenges/theQuizRules';
import { getPhraseMystereRulesPreset } from '@/lib/challenges/phraseMystereRules';
import { getCopuzzleRulesPreset } from '@/lib/challenges/copuzzleRules';
import { getLabInnovationRulesPreset } from '@/lib/challenges/labInnovationRules';
import { getLabyrintheRulesPreset } from '@/lib/challenges/labyrintheRules';
import { getVraiOuMensongeRulesPreset } from '@/lib/challenges/vraiOuMensongeRules';
import { getMissionCritiqueRulesPreset } from '@/lib/challenges/missionCritiqueRules';
import { getEscapeRoomRulesPreset } from '@/lib/challenges/escapeRoomRules';
import { stripRulesFromEngineConfig } from './utils';

const PIXEL_ARCHITECT_CATALOG_ENTRY = {
  id: 'pixel_architect_001',
  name: 'Pixel Architect',
  type: 'equipe',
  status: 'actif',
  source: 'local',
  category: 'creativite-innovation',
  objectives: ['collaboration', 'communication', 'gestion-temps'],
  duration: '15-25 min',
  engine_key: 'pixel_architect_v1',
  description: 'Construction 3D collaborative sous contraintes de temps, ressources et communication.',
  rules_objective: {
    fr: getPixelArchitectRulesPreset('fr').objective,
    en: getPixelArchitectRulesPreset('en').objective,
  },
  rules_facilitator: {
    fr: [...getPixelArchitectRulesPreset('fr').facilitator],
    en: [...getPixelArchitectRulesPreset('en').facilitator],
  },
  rules_participant: {
    fr: [...getPixelArchitectRulesPreset('fr').participant],
    en: [...getPixelArchitectRulesPreset('en').participant],
  },
  rules_footnote: {
    fr: '',
    en: '',
  },
  engine_config: {
    participants: {
      min_count: 3,
      recommended_count: 6,
      max_count: 12,
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
  },
};

const THE_QUIZ_CATALOG_ENTRY = {
  id: 'the_quiz_001',
  name: 'The Quiz',
  type: 'individuel',
  status: 'actif',
  source: 'local',
  category: 'culture-decouverte',
  objectives: ['culture-decouverte', 'communication', 'intelligence-collective'],
  duration: '15-25 min',
  engine_key: 'the_quiz_v1',
  description: 'Quiz multijoueur en temps reel avec timer, reponses verrouillees et leaderboard dynamique.',
  rules_objective: {
    fr: getTheQuizRulesPreset('fr').objective,
    en: getTheQuizRulesPreset('en').objective,
  },
  rules_facilitator: {
    fr: [...getTheQuizRulesPreset('fr').facilitator],
    en: [...getTheQuizRulesPreset('en').facilitator],
  },
  rules_participant: {
    fr: [...getTheQuizRulesPreset('fr').participant],
    en: [...getTheQuizRulesPreset('en').participant],
  },
  rules_footnote: {
    fr: '',
    en: '',
  },
  engine_config: {
    participants: {
      min_count: 4,
      recommended_count: 8,
      max_count: 30,
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
  },
};

const PHRASE_MYSTERE_CATALOG_ENTRY = {
  id: 'phrase_collaborative_001',
  name: 'Phrase Mystère',
  type: 'equipe',
  status: 'actif',
  source: 'local',
  category: 'logique-reflexion',
  objectives: ['collaboration', 'communication', 'intelligence-collective'],
  duration: '15-25 min',
  engine_key: 'phrase_collaborative_v1',
  description: getPhraseMystereRulesPreset('fr').objective,
  rules_objective: {
    fr: getPhraseMystereRulesPreset('fr').objective,
    en: getPhraseMystereRulesPreset('en').objective,
  },
  rules_facilitator: {
    fr: [...getPhraseMystereRulesPreset('fr').facilitator],
    en: [...getPhraseMystereRulesPreset('en').facilitator],
  },
  rules_participant: {
    fr: [...getPhraseMystereRulesPreset('fr').participant, ...getPhraseMystereRulesPreset('fr').hints],
    en: [...getPhraseMystereRulesPreset('en').participant, ...getPhraseMystereRulesPreset('en').hints],
  },
  rules_footnote: {
    fr: '',
    en: '',
  },
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
  },
};

const COPUZZLE_CATALOG_ENTRY = {
  id: 'copuzzle_001',
  name: 'CoPuzzle',
  type: 'equipe',
  status: 'actif',
  source: 'local',
  category: 'escape-game',
  objectives: ['collaboration', 'communication', 'intelligence-collective'],
  duration: '15-25 min',
  engine_key: 'copuzzle_live_v1',
  description: getCopuzzleRulesPreset('fr').objective,
  rules_objective: {
    fr: getCopuzzleRulesPreset('fr').objective,
    en: getCopuzzleRulesPreset('en').objective,
  },
  rules_facilitator: {
    fr: [...getCopuzzleRulesPreset('fr').facilitator],
    en: [...getCopuzzleRulesPreset('en').facilitator],
  },
  rules_participant: {
    fr: [...getCopuzzleRulesPreset('fr').participant],
    en: [...getCopuzzleRulesPreset('en').participant],
  },
  rules_footnote: {
    fr: '',
    en: '',
  },
  engine_config: {
    participants: {
      min_count: 2,
      recommended_count: 4,
      max_count: 8,
    },
    image_source_mode: 'defaults',
    grid: {
      rows: 10,
      cols: 10,
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
  },
};

const LAB_INNOVATION_CATALOG_ENTRY = {
  id: 'lab_innovation_001',
  name: 'Lab d\'Innovation',
  type: 'equipe',
  status: 'actif',
  source: 'local',
  category: 'creativite-innovation',
  objectives: ['intelligence-collective', 'communication', 'collaboration'],
  duration: '25-35 min',
  engine_key: 'lab_d_innovation_v1',
  description: getLabInnovationRulesPreset('fr').objective,
  rules_objective: {
    fr: getLabInnovationRulesPreset('fr').objective,
    en: getLabInnovationRulesPreset('en').objective,
  },
  rules_facilitator: {
    fr: [...getLabInnovationRulesPreset('fr').facilitator],
    en: [...getLabInnovationRulesPreset('en').facilitator],
  },
  rules_participant: {
    fr: [...getLabInnovationRulesPreset('fr').participant],
    en: [...getLabInnovationRulesPreset('en').participant],
  },
  rules_footnote: {
    fr: '',
    en: '',
  },
  engine_config: {
    participants: {
      min_count: 3,
      recommended_count: 6,
      max_count: 12,
    },
  },
};

function ensurePixelArchitectChallenge(challenges) {
  const list = Array.isArray(challenges) ? [...challenges] : [];
  const existingIndex = list.findIndex((challenge) => String(challenge?.engine_key || '').trim() === 'pixel_architect_v1');

  if (existingIndex >= 0) {
    const current = list[existingIndex] || {};
    list[existingIndex] = {
      ...PIXEL_ARCHITECT_CATALOG_ENTRY,
      ...current,
      engine_config: {
        ...PIXEL_ARCHITECT_CATALOG_ENTRY.engine_config,
        ...(current.engine_config && typeof current.engine_config === 'object' ? current.engine_config : {}),
      },
    };

    const rulesPresetFr = getPixelArchitectRulesPreset('fr');
    const rulesPresetEn = getPixelArchitectRulesPreset('en');
    list[existingIndex].rules_objective = {
      fr: rulesPresetFr.objective,
      en: rulesPresetEn.objective,
    };
    list[existingIndex].rules_facilitator = {
      fr: [...rulesPresetFr.facilitator],
      en: [...rulesPresetEn.facilitator],
    };
    list[existingIndex].rules_participant = {
      fr: [...rulesPresetFr.participant],
      en: [...rulesPresetEn.participant],
    };
    list[existingIndex].rules_footnote = {
      fr: '',
      en: '',
    };
    return list;
  }

  return [...list, PIXEL_ARCHITECT_CATALOG_ENTRY];
}

function ensureTheQuizChallenge(challenges) {
  const list = Array.isArray(challenges) ? [...challenges] : [];
  const existingIndex = list.findIndex((challenge) => String(challenge?.engine_key || '').trim() === 'the_quiz_v1');

  if (existingIndex >= 0) {
    const current = list[existingIndex] || {};
    list[existingIndex] = {
      ...THE_QUIZ_CATALOG_ENTRY,
      ...current,
      engine_config: {
        ...THE_QUIZ_CATALOG_ENTRY.engine_config,
        ...(current.engine_config && typeof current.engine_config === 'object' ? current.engine_config : {}),
      },
    };

    const rulesPresetFr = getTheQuizRulesPreset('fr');
    const rulesPresetEn = getTheQuizRulesPreset('en');
    list[existingIndex].rules_objective = {
      fr: rulesPresetFr.objective,
      en: rulesPresetEn.objective,
    };
    list[existingIndex].rules_facilitator = {
      fr: [...rulesPresetFr.facilitator],
      en: [...rulesPresetEn.facilitator],
    };
    list[existingIndex].rules_participant = {
      fr: [...rulesPresetFr.participant],
      en: [...rulesPresetEn.participant],
    };
    list[existingIndex].rules_footnote = {
      fr: '',
      en: '',
    };
    return list;
  }

  return [...list, THE_QUIZ_CATALOG_ENTRY];
}

function ensurePhraseMystereChallenge(challenges) {
  const list = Array.isArray(challenges) ? [...challenges] : [];
  const existingIndex = list.findIndex((challenge) => String(challenge?.engine_key || '').trim() === 'phrase_collaborative_v1');

  if (existingIndex >= 0) {
    const current = list[existingIndex] || {};
    list[existingIndex] = {
      ...PHRASE_MYSTERE_CATALOG_ENTRY,
      ...current,
      engine_config: {
        ...PHRASE_MYSTERE_CATALOG_ENTRY.engine_config,
        ...(current.engine_config && typeof current.engine_config === 'object' ? current.engine_config : {}),
      },
    };

    const rulesPresetFr = getPhraseMystereRulesPreset('fr');
    const rulesPresetEn = getPhraseMystereRulesPreset('en');
    list[existingIndex].rules_objective = {
      fr: rulesPresetFr.objective,
      en: rulesPresetEn.objective,
    };
    list[existingIndex].rules_facilitator = {
      fr: [...rulesPresetFr.facilitator],
      en: [...rulesPresetEn.facilitator],
    };
    list[existingIndex].rules_participant = {
      fr: [...rulesPresetFr.participant, ...rulesPresetFr.hints],
      en: [...rulesPresetEn.participant, ...rulesPresetEn.hints],
    };
    list[existingIndex].rules_footnote = {
      fr: '',
      en: '',
    };
    return list;
  }

  return [...list, PHRASE_MYSTERE_CATALOG_ENTRY];
}

function ensureCopuzzleChallenge(challenges) {
  const list = Array.isArray(challenges) ? [...challenges] : [];
  const existingIndex = list.findIndex((challenge) => String(challenge?.engine_key || '').trim() === 'copuzzle_live_v1');

  if (existingIndex >= 0) {
    const current = list[existingIndex] || {};
    list[existingIndex] = {
      ...COPUZZLE_CATALOG_ENTRY,
      ...current,
      engine_config: {
        ...COPUZZLE_CATALOG_ENTRY.engine_config,
        ...(current.engine_config && typeof current.engine_config === 'object' ? current.engine_config : {}),
      },
    };

    const rulesPresetFr = getCopuzzleRulesPreset('fr');
    const rulesPresetEn = getCopuzzleRulesPreset('en');
    list[existingIndex].rules_objective = {
      fr: rulesPresetFr.objective,
      en: rulesPresetEn.objective,
    };
    list[existingIndex].rules_facilitator = {
      fr: [...rulesPresetFr.facilitator],
      en: [...rulesPresetEn.facilitator],
    };
    list[existingIndex].rules_participant = {
      fr: [...rulesPresetFr.participant],
      en: [...rulesPresetEn.participant],
    };
    list[existingIndex].rules_footnote = {
      fr: '',
      en: '',
    };
    return list;
  }

  return [...list, COPUZZLE_CATALOG_ENTRY];
}

function ensureLabInnovationChallenge(challenges) {
  const list = Array.isArray(challenges) ? [...challenges] : [];
  const existingIndex = list.findIndex((challenge) => String(challenge?.engine_key || '').trim() === 'lab_d_innovation_v1');

  if (existingIndex >= 0) {
    const current = list[existingIndex] || {};
    list[existingIndex] = {
      ...LAB_INNOVATION_CATALOG_ENTRY,
      ...current,
      name: LAB_INNOVATION_CATALOG_ENTRY.name,
      engine_config: {
        ...LAB_INNOVATION_CATALOG_ENTRY.engine_config,
        ...(current.engine_config && typeof current.engine_config === 'object' ? current.engine_config : {}),
      },
    };

    const rulesPresetFr = getLabInnovationRulesPreset('fr');
    const rulesPresetEn = getLabInnovationRulesPreset('en');
    list[existingIndex].rules_objective = {
      fr: rulesPresetFr.objective,
      en: rulesPresetEn.objective,
    };
    list[existingIndex].rules_facilitator = {
      fr: [...rulesPresetFr.facilitator],
      en: [...rulesPresetEn.facilitator],
    };
    list[existingIndex].rules_participant = {
      fr: [...rulesPresetFr.participant],
      en: [...rulesPresetEn.participant],
    };
    list[existingIndex].rules_footnote = {
      fr: '',
      en: '',
    };
    return list;
  }

  return [...list, LAB_INNOVATION_CATALOG_ENTRY];
}

function ensureLabyrintheSignalsChallenge(challenges) {
  const list = Array.isArray(challenges) ? [...challenges] : [];
  const existingIndex = list.findIndex((challenge) => String(challenge?.engine_key || '').trim() === 'labyrinthe_live_v1');

  if (existingIndex < 0) {
    return list;
  }

  const current = list[existingIndex] || {};
  const presetFr = getLabyrintheRulesPreset('fr');
  const existingConfig = stripRulesFromEngineConfig(current.engine_config && typeof current.engine_config === 'object' ? current.engine_config : {});
  const existingParticipants = existingConfig.participants && typeof existingConfig.participants === 'object'
    ? existingConfig.participants
    : {};
  const existingGrid = existingConfig.grid && typeof existingConfig.grid === 'object'
    ? existingConfig.grid
    : {};

  list[existingIndex] = {
    ...current,
    name: String(current?.name || '').trim() || presetFr.challengeName,
    engine_config: {
      ...existingConfig,
      rows: Number.isFinite(Number(existingConfig.rows)) ? Number(existingConfig.rows) : 10,
      cols: Number.isFinite(Number(existingConfig.cols)) ? Number(existingConfig.cols) : 10,
      complexity: Number.isFinite(Number(existingConfig.complexity)) ? Number(existingConfig.complexity) : 0.8,
      grid: {
        ...existingGrid,
        rows: Number.isFinite(Number(existingGrid.rows)) ? Number(existingGrid.rows) : 10,
        cols: Number.isFinite(Number(existingGrid.cols)) ? Number(existingGrid.cols) : 10,
      },
      participants: {
        ...existingParticipants,
        min_count: existingParticipants.min_count || 2,
        recommended_count: existingParticipants.recommended_count || 4,
        max_count: existingParticipants.max_count || 6,
      },
    },
  };

  return list;
}

function ensureVraiOuMensongeChallenge(challenges) {
  const list = Array.isArray(challenges) ? [...challenges] : [];
  const existingIndex = list.findIndex((challenge) => String(challenge?.engine_key || '').trim() === 'vrai_ou_mensonge_v1');

  if (existingIndex < 0) {
    return list;
  }

  const current = list[existingIndex] || {};
  const presetFr = getVraiOuMensongeRulesPreset('fr');
  const existingConfig = stripRulesFromEngineConfig(current.engine_config && typeof current.engine_config === 'object' ? current.engine_config : {});
  const existingParticipants = existingConfig.participants && typeof existingConfig.participants === 'object'
    ? existingConfig.participants
    : {};

  list[existingIndex] = {
    ...current,
    name: String(current?.name || '').trim() || presetFr.challengeName,
    engine_config: {
      ...existingConfig,
      participants: {
        ...existingParticipants,
        min_count: existingParticipants.min_count || 2,
        recommended_count: existingParticipants.recommended_count || 4,
        max_count: existingParticipants.max_count || 6,
      },
    },
  };

  return list;
}

function ensureMissionCritiqueChallenge(challenges) {
  const list = Array.isArray(challenges) ? [...challenges] : [];
  const existingIndex = list.findIndex((challenge) => String(challenge?.engine_key || '').trim() === 'mission_critique_v1');

  if (existingIndex < 0) {
    return list;
  }

  const current = list[existingIndex] || {};
  const presetFr = getMissionCritiqueRulesPreset('fr');
  const existingConfig = stripRulesFromEngineConfig(current.engine_config && typeof current.engine_config === 'object' ? current.engine_config : {});
  const existingParticipants = existingConfig.participants && typeof existingConfig.participants === 'object'
    ? existingConfig.participants
    : {};

  list[existingIndex] = {
    ...current,
    name: String(current?.name || '').trim() || presetFr.challengeName,
    engine_config: {
      ...existingConfig,
      participants: {
        ...existingParticipants,
        min_count: existingParticipants.min_count || 2,
        recommended_count: existingParticipants.recommended_count || 4,
        max_count: existingParticipants.max_count || 6,
      },
    },
  };

  return list;
}

function ensureEscapeRoomChallenge(challenges) {
  const list = Array.isArray(challenges) ? [...challenges] : [];
  const existingIndex = list.findIndex((challenge) => String(challenge?.engine_key || '').trim() === 'escape_room_v1');

  if (existingIndex < 0) {
    return list;
  }

  const current = list[existingIndex] || {};
  const presetFr = getEscapeRoomRulesPreset('fr');
  const existingConfig = stripRulesFromEngineConfig(current.engine_config && typeof current.engine_config === 'object' ? current.engine_config : {});
  const existingParticipants = existingConfig.participants && typeof existingConfig.participants === 'object'
    ? existingConfig.participants
    : {};

  list[existingIndex] = {
    ...current,
    name: String(current?.name || '').trim() || presetFr.challengeName,
    engine_config: {
      ...existingConfig,
      participants: {
        ...existingParticipants,
        min_count: existingParticipants.min_count || 2,
        recommended_count: existingParticipants.recommended_count || 4,
        max_count: existingParticipants.max_count || 6,
      },
    },
  };

  return list;
}

export function ensureAdminCatalogChallenges(challenges) {
  return ensureEscapeRoomChallenge(
    ensureMissionCritiqueChallenge(
      ensureVraiOuMensongeChallenge(
        ensureLabyrintheSignalsChallenge(
          ensureTheQuizChallenge(
            ensurePhraseMystereChallenge(
              ensureCopuzzleChallenge(
                ensureLabInnovationChallenge(
                  ensurePixelArchitectChallenge(challenges)
                )
              )
            )
          )
        )
      )
    )
  );
}
