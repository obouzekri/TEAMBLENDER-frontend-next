// Scripted content and simulation helpers for the public /demo page.
// Everything here is fictional: no participant, vote or score comes from the server.

export const DEMO_OBJECTIVES = ['cohesion', 'communication', 'collaboration'];
export const DEMO_TEAM_SIZES = [6, 10, 16];
export const DEMO_DURATIONS = [30, 45, 60];
export const DEMO_STEPS = ['prepare', 'invite', 'facilitate', 'play', 'results'];

// One simulated challenge minute lasts this many real milliseconds.
export const DEMO_MS_PER_MINUTE = 400;

export const DEMO_PARTICIPANTS = [
  { name: 'Camille', role: { fr: 'Produit', en: 'Product' } },
  { name: 'Malik', role: { fr: 'Ventes', en: 'Sales' } },
  { name: 'Inès', role: { fr: 'RH', en: 'HR' } },
  { name: 'Thomas', role: { fr: 'Finance', en: 'Finance' } },
  { name: 'Sofia', role: { fr: 'Marketing', en: 'Marketing' } },
  { name: 'Hugo', role: { fr: 'Tech', en: 'Engineering' } },
  { name: 'Aïcha', role: { fr: 'Support client', en: 'Customer support' } },
  { name: 'Julien', role: { fr: 'Opérations', en: 'Operations' } },
  { name: 'Léa', role: { fr: 'Design', en: 'Design' } },
  { name: 'Yanis', role: { fr: 'Data', en: 'Data' } },
  { name: 'Chloé', role: { fr: 'Juridique', en: 'Legal' } },
  { name: 'Mehdi', role: { fr: 'Achats', en: 'Procurement' } },
  { name: 'Emma', role: { fr: 'Communication', en: 'Communications' } },
  { name: 'Lucas', role: { fr: 'Logistique', en: 'Logistics' } },
  { name: 'Nora', role: { fr: 'Qualité', en: 'Quality' } },
  { name: 'Paul', role: { fr: 'Direction', en: 'Leadership team' } },
];

export const DEMO_PARI_ROUNDS = [
  {
    presenter: 'Camille',
    lieIndex: 2,
    botAccuracy: 0.45,
    statements: {
      fr: [
        "J'ai appris à coder sur une calculatrice au lycée.",
        "J'ai couru un semi-marathon déguisée en ananas.",
        "J'ai vécu deux ans en Islande.",
      ],
      en: [
        'I learned to code on a calculator in high school.',
        'I ran a half marathon dressed as a pineapple.',
        'I lived in Iceland for two years.',
      ],
    },
  },
  {
    presenter: 'Malik',
    lieIndex: 0,
    botAccuracy: 0.3,
    statements: {
      fr: [
        'Je parle quatre langues couramment.',
        "J'ai été figurant dans une série télé.",
        "Je n'ai jamais pris l'avion.",
      ],
      en: [
        'I speak four languages fluently.',
        'I was an extra in a TV series.',
        'I have never taken a plane.',
      ],
    },
  },
  {
    presenter: 'Inès',
    lieIndex: 1,
    botAccuracy: 0.6,
    statements: {
      fr: [
        "J'ai organisé un mariage en 48 heures.",
        'Je collectionne les cartes postales de phares.',
        "J'ai gagné un concours de pâtisserie régional.",
      ],
      en: [
        'I organised a wedding in 48 hours.',
        'I collect postcards of lighthouses.',
        'I won a regional baking contest.',
      ],
    },
  },
];

const ACTIVITY_TEMPLATES = {
  crossword_live_v1: {
    fr: ['{name} a trouvé un mot horizontal', '{name} propose une définition au groupe', '{name} complète une intersection'],
    en: ['{name} solved an across word', '{name} shares a clue with the group', '{name} filled a crossing letter'],
  },
  pixel_architect_v1: {
    fr: ['{name} pose un bloc sur la structure', '{name} décrit le modèle à son binôme', '{name} corrige un étage'],
    en: ['{name} placed a block on the structure', '{name} describes the model to a teammate', '{name} fixed a floor'],
  },
  copuzzle_live_v1: {
    fr: ['{name} a placé une pièce', '{name} a terminé un bord du puzzle', '{name} échange une pièce avec un coéquipier'],
    en: ['{name} placed a piece', '{name} finished one edge of the puzzle', '{name} swapped a piece with a teammate'],
  },
  the_quiz_v1: {
    fr: ['{name} a répondu en 4 secondes', '{name} prend la tête du classement', '{name} a trouvé la bonne réponse'],
    en: ['{name} answered in 4 seconds', '{name} takes the lead', '{name} found the right answer'],
  },
  phrase_collaborative_v1: {
    fr: ['{name} a révélé un mot de la phrase', '{name} propose un ordre pour les mots', '{name} a résolu son énigme'],
    en: ['{name} revealed a word of the sentence', '{name} suggests a word order', '{name} solved their riddle'],
  },
  labyrinthe_live_v1: {
    fr: ['{name} guide son équipe vers la sortie', '{name} signale une impasse', '{name} a ouvert un passage'],
    en: ['{name} guides the team to the exit', '{name} flags a dead end', '{name} opened a passage'],
  },
  vrai_ou_mensonge_v1: {
    fr: ['{name} présente ses trois affirmations', '{name} a voté', '{name} a démasqué un mensonge'],
    en: ['{name} shares three statements', '{name} voted', '{name} spotted a lie'],
  },
  mission_critique_v1: {
    fr: ['{name} place une tâche sur la timeline', '{name} signale une dépendance', '{name} valide un jalon'],
    en: ['{name} placed a task on the timeline', '{name} flags a dependency', '{name} validated a milestone'],
  },
  default: {
    fr: ['{name} participe au challenge', '{name} échange avec son équipe', '{name} a validé une étape'],
    en: ['{name} is taking part', '{name} talks with the team', '{name} completed a step'],
  },
};

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

export function getDemoParticipants(teamSize, locale) {
  const size = Math.max(1, Math.min(Number(teamSize) || 0, DEMO_PARTICIPANTS.length));
  const lang = pickLocale(locale);
  return DEMO_PARTICIPANTS.slice(0, size).map((participant, index) => ({
    id: `demo-${index + 1}`,
    name: participant.name,
    role: participant.role[lang],
  }));
}

// Realistic attendance: one invitee in ten does not show up.
export function getAbsentCount(teamSize) {
  return Math.floor(Number(teamSize) / 10);
}

export function buildJoinSchedule(teamSize, random = Math.random) {
  const joinCount = Math.max(0, Number(teamSize) - getAbsentCount(teamSize));
  let delay = 0;
  return Array.from({ length: joinCount }, (_, index) => {
    delay += 150 + Math.round(random() * 300);
    return { index, delayMs: delay };
  });
}

export function buildActivityFeed(engineKey, participants, count, locale, random = Math.random) {
  const templates = (ACTIVITY_TEMPLATES[engineKey] || ACTIVITY_TEMPLATES.default)[pickLocale(locale)];
  if (!participants.length) return [];
  return Array.from({ length: count }, (_, index) => {
    const participant = participants[Math.floor(random() * participants.length)];
    const template = templates[Math.floor(random() * templates.length)];
    return { id: `${engineKey}-${index}`, text: template.replace('{name}', participant.name) };
  });
}

// Each voter finds the lie with probability `accuracy`, otherwise picks one of the true statements.
export function simulateVotes({ voterCount, lieIndex, accuracy, statementCount = 3, random = Math.random }) {
  const counts = Array.from({ length: statementCount }, () => 0);
  const others = counts.map((_, index) => index).filter((index) => index !== lieIndex);
  for (let voter = 0; voter < voterCount; voter += 1) {
    const choice = random() < accuracy ? lieIndex : others[Math.floor(random() * others.length)];
    counts[choice] += 1;
  }
  return counts;
}

export function getRoundStatements(round, locale) {
  return round.statements[pickLocale(locale)];
}

export function getDebriefPrompts(objective, locale) {
  const prompts = DEMO_DEBRIEF_PROMPTS[objective] || DEMO_DEBRIEF_PROMPTS.cohesion;
  return prompts[pickLocale(locale)];
}

export function getChallengeCompletion(random = Math.random) {
  return 72 + Math.round(random() * 24);
}

export function computeDemoResults({ teamSize, program = [], completions = {}, answers = [], votes = [] }) {
  const invited = Number(teamSize) || 0;
  const joined = Math.max(0, invited - getAbsentCount(invited));
  const correctAnswers = answers.filter((answer, index) => answer === DEMO_PARI_ROUNDS[index]?.lieIndex).length;
  const totals = votes.reduce((acc, counts, index) => {
    const lieIndex = DEMO_PARI_ROUNDS[index]?.lieIndex;
    acc.total += counts.reduce((sum, value) => sum + value, 0);
    acc.correct += counts[lieIndex] || 0;
    return acc;
  }, { total: 0, correct: 0 });
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
    userScore: correctAnswers,
    roundCount: answers.length,
    teamAccuracy: totals.total ? Math.round((totals.correct / totals.total) * 100) : 0,
  };
}
