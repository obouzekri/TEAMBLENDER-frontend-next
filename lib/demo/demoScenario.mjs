// Scripted content and simulation helpers for the public /demo page.
// Everything here is fictional: no participant, vote or score comes from the server.
// The challenges themselves run through lib/demo/challenges.

export const DEMO_OBJECTIVES = ['cohesion', 'communication', 'collaboration'];
export const DEMO_DURATIONS = [30, 45, 60];
export const DEMO_FLOW_MODES = ['manual', 'auto'];
export const DEMO_STEPS = ['dashboard', 'prepare', 'invite', 'facilitate', 'play', 'results'];
// Same countdown as the live session in automatic flow mode.
export const DEMO_AUTO_ADVANCE_SECONDS = 5;
// The visitor's own player in the participant preview.
export const DEMO_VISITOR_ID = 'demo-you';

export const DEMO_PARTICIPANTS = [
  { name: 'Camille', email: 'camille@example.com', role: { fr: 'Produit', en: 'Product' } },
  { name: 'Malik', email: 'malik@example.com', role: { fr: 'Ventes', en: 'Sales' } },
  { name: 'Inès', email: 'ines@example.com', role: { fr: 'RH', en: 'HR' } },
  { name: 'Thomas', email: 'thomas@example.com', role: { fr: 'Finance', en: 'Finance' } },
];
export const DEMO_TEAM_SIZE = DEMO_PARTICIPANTS.length;

export const DEMO_PAST_SESSIONS = [
  { id: 'past-1', name: { fr: 'Onboarding de septembre', en: 'September onboarding' }, challengeCount: 2, participationRate: 100 },
  { id: 'past-2', name: { fr: 'Kick-off du trimestre', en: 'Quarter kick-off' }, challengeCount: 3, participationRate: 75 },
];

export const DEMO_DEBRIEF_PROMPTS = {
  cohesion: {
    fr: [
      "Qu'avez-vous découvert sur un collègue aujourd'hui ?",
      "À quel moment l'équipe s'est-elle sentie la plus soudée ?",
      'Quel rituel pourrions-nous garder au quotidien ?',
    ],
    en: [
      'What did you learn about a colleague today?',
      'When did the team feel most united?',
      'Which ritual could we keep in our daily work?',
    ],
  },
  communication: {
    fr: [
      "Quelle information vous a manqué pendant l'activité ?",
      "Qui a fait circuler l'information, et comment ?",
      "Que changerions-nous dans nos réunions d'équipe ?",
    ],
    en: [
      'What information were you missing during the activity?',
      'Who kept information flowing, and how?',
      'What would we change in our team meetings?',
    ],
  },
  collaboration: {
    fr: [
      'Comment les rôles se sont-ils répartis spontanément ?',
      "Qu'est-ce qui a accéléré le travail commun ?",
      'Quelle pratique appliquer dès notre prochain projet ?',
    ],
    en: [
      'How did roles get shared out naturally?',
      'What sped up working together?',
      'Which practice should we apply on our next project?',
    ],
  },
};

function pickLocale(locale) {
  return locale === 'en' ? 'en' : 'fr';
}

// Deterministic PRNG (mulberry32) so a given seed always replays the same demo.
export function createRandom(seed = 1) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function getDemoParticipants(locale) {
  const lang = pickLocale(locale);
  return DEMO_PARTICIPANTS.map((participant, index) => ({
    id: `demo-${index + 1}`,
    name: participant.name,
    email: participant.email,
    role: participant.role[lang],
  }));
}

export function buildJoinSchedule(count, random = Math.random) {
  let delay = 0;
  return Array.from({ length: Math.max(0, Number(count) || 0) }, (_, index) => {
    delay += 500 + Math.round(random() * 500);
    return { index, delayMs: delay };
  });
}

export function getDebriefPrompts(objective, locale) {
  const prompts = DEMO_DEBRIEF_PROMPTS[objective] || DEMO_DEBRIEF_PROMPTS.cohesion;
  return prompts[pickLocale(locale)];
}

// The visitor's score and rank in the Pari sur moi participant preview.
export function getVisitorResult(vom, visitorId) {
  const ranking = Array.isArray(vom?.ranking) ? vom.ranking : [];
  const entry = ranking.find((item) => String(item.participant_id) === String(visitorId));
  if (!entry) return null;
  return { score: Number(entry.score || 0), rank: Number(entry.rank || 0), total: ranking.length };
}

export function computeDemoResults({ invited = DEMO_TEAM_SIZE, joined = invited, program = [], completions = {}, visitor = null }) {
  const completionValues = program.map((challenge) => completions[challenge.id]).filter(Number.isFinite);
  return {
    invited,
    joined,
    participationRate: invited ? Math.round((joined / invited) * 100) : 0,
    challengesCompleted: completionValues.length,
    totalMinutes: program.reduce((sum, challenge) => sum + (Number(challenge.duration) || 0), 0),
    averageCompletion: completionValues.length
      ? Math.round(completionValues.reduce((sum, value) => sum + value, 0) / completionValues.length)
      : 0,
    visitor,
  };
}
