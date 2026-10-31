// Built-in challenges the session builder always offers, even before they exist in the database.
import { localizeBuilderChallenge } from '@/lib/challenges/catalogLocalization';

const PIXEL_ARCHITECT_CATALOG_ENTRY = {
  id: 'pixel_architect_001',
  name: 'Pixel Architect',
  category: 'creativite-innovation',
  objective: 'collaboration',
  duration: 15,
  type: 'Collaborative 3D creation',
  tags: ['Voxel', 'Collaboration', 'Timeboxed'],
  description: 'Build a 3D cube structure under time, resource, and communication constraints.',
  engine_key: 'pixel_architect_v1',
  engine_config: {
    participants: {
      min_count: 3,
      recommended_count: 6,
      max_count: 12,
    },
  },
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
      theme: 'Build a structure that symbolizes collaboration.',
    },
  },
};

const THE_QUIZ_CATALOG_ENTRY = {
  id: 'the_quiz_001',
  name: 'The Quiz',
  category: 'culture-decouverte',
  objective: 'collaboration',
  objectives: 'collaboration, communication, intelligence-collective',
  duration: 20,
  type: 'Quiz multijoueur realtime',
  tags: ['Quiz', 'General knowledge', 'Realtime', 'Leaderboard'],
  description:
    'Competitive general-knowledge quiz synchronized in real time for the whole session.',
  engine_key: 'the_quiz_v1',
  engine_config: {
    participants: {
      min_count: 4,
      recommended_count: 8,
      max_count: 30,
    },
  },
  config: {
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

const LAB_INNOVATION_CATALOG_ENTRY = {
  id: 'lab_innovation_001',
  name: "Lab d'Innovation",
  category: 'creativite-innovation',
  objective: 'intelligence-collective',
  objectives: 'intelligence-collective, communication, collaboration',
  duration: 30,
  type: 'equipe',
  tags: ['Ideation', 'Votes', 'Leadership', 'Innovation'],
  description: 'Challenge collaboratif en 4 phases pour faire émerger une solution innovante.',
  engine_key: 'lab_d_innovation_v1',
  engine_config: {
    participants: {
      min_count: 3,
      recommended_count: 6,
      max_count: 12,
    },
  },
  config: {
    timer: {
      enabled: true,
      duration_seconds: 2100,
      warning_threshold_seconds: 120,
    },
    participants: {
      expected_count: 6,
    },
  },
};

function ensurePixelArchitectChallenge(challenges) {
  const list = Array.isArray(challenges) ? [...challenges] : [];
  const existingIndex = list.findIndex(
    (challenge) => String(challenge?.engine_key || '').trim() === 'pixel_architect_v1'
  );

  if (existingIndex >= 0) {
    const current = list[existingIndex] || {};
    list[existingIndex] = {
      ...PIXEL_ARCHITECT_CATALOG_ENTRY,
      ...current,
      config: {
        ...PIXEL_ARCHITECT_CATALOG_ENTRY.config,
        ...(current.config && typeof current.config === 'object' ? current.config : {}),
      },
    };
    return list;
  }

  return [...list, PIXEL_ARCHITECT_CATALOG_ENTRY];
}

function ensureTheQuizChallenge(challenges) {
  const list = Array.isArray(challenges) ? [...challenges] : [];
  const existingIndex = list.findIndex(
    (challenge) => String(challenge?.engine_key || '').trim() === 'the_quiz_v1'
  );

  if (existingIndex >= 0) {
    const current = list[existingIndex] || {};
    list[existingIndex] = {
      ...THE_QUIZ_CATALOG_ENTRY,
      ...current,
      config: {
        ...THE_QUIZ_CATALOG_ENTRY.config,
        ...(current.config && typeof current.config === 'object' ? current.config : {}),
      },
    };
    return list;
  }

  return [...list, THE_QUIZ_CATALOG_ENTRY];
}

function ensureLabInnovationChallenge(challenges) {
  const list = Array.isArray(challenges) ? [...challenges] : [];
  const existingIndex = list.findIndex(
    (challenge) => String(challenge?.engine_key || '').trim() === 'lab_d_innovation_v1'
  );

  if (existingIndex >= 0) {
    const current = list[existingIndex] || {};
    list[existingIndex] = {
      ...LAB_INNOVATION_CATALOG_ENTRY,
      ...current,
      name: LAB_INNOVATION_CATALOG_ENTRY.name,
      config: {
        ...LAB_INNOVATION_CATALOG_ENTRY.config,
        ...(current.config && typeof current.config === 'object' ? current.config : {}),
      },
    };
    return list;
  }

  return [...list, LAB_INNOVATION_CATALOG_ENTRY];
}

export function ensureBuilderCatalogChallenges(challenges, locale = 'fr') {
  return ensureLabInnovationChallenge(
    ensureTheQuizChallenge(ensurePixelArchitectChallenge(challenges))
  ).map((challenge) => localizeBuilderChallenge(challenge, locale));
}
