// Catalogue public des défis : une entrée par défi présenté sur /defis.
// `slug` : segment interne (dossier app/defis/[slug]) et URL française ; `paths` : segment traduit par langue.
// `rulesKey` : clé de `challengeRules` dans les dictionnaires (nom, objectif, joueurs, règles) et de `challengeCatalog.items`.
export const CHALLENGE_CATALOG_BASE_PATH = '/defis';
export const CHALLENGE_CATALOG_BASE_PATHS = { en: '/team-challenges' };

export const CHALLENGE_CATALOG = [
  { slug: 'puzzle-collaboratif-copuzzle', rulesKey: 'copuzzle', paths: { en: 'collaborative-puzzle-copuzzle' } },
  { slug: 'escape-game-salle-secrete', rulesKey: 'escapeRoom', paths: { en: 'online-escape-room-secret-room' } },
  { slug: 'quiz-equipe', rulesKey: 'theQuiz', paths: { en: 'team-quiz' } },
  { slug: 'mots-croises-en-equipe', rulesKey: 'crossword', paths: { en: 'team-crossword' } },
  { slug: 'labyrinthe-des-signaux', rulesKey: 'labyrintheSignals', paths: { en: 'signal-maze' } },
  { slug: 'vrai-ou-bluff-pari-sur-moi', rulesKey: 'pariSurMoi', paths: { en: 'truth-or-bluff-bet-on-me' } },
  { slug: 'mission-critique', rulesKey: 'missionCritique', paths: { en: 'critical-mission' } },
  { slug: 'pixel-architect', rulesKey: 'pixelArchitect', paths: { en: 'pixel-architect' } },
  { slug: 'phrase-mystere', rulesKey: 'phraseMystere', paths: { en: 'mystery-phrase' } },
  { slug: 'lab-innovation', rulesKey: 'labInnovation', paths: { en: 'innovation-lab' } },
];

// Entrées de LOCALIZED_PATHS (lib/i18n/routing.js) pour le hub et chaque défi.
export function getChallengeCatalogLocalizedPaths() {
  const entries = [[CHALLENGE_CATALOG_BASE_PATH, CHALLENGE_CATALOG_BASE_PATHS]];
  for (const { slug, paths } of CHALLENGE_CATALOG) {
    const localized = Object.fromEntries(Object.entries(CHALLENGE_CATALOG_BASE_PATHS)
      .map(([locale, base]) => [locale, `${base}/${paths[locale] || slug}`]));
    entries.push([`${CHALLENGE_CATALOG_BASE_PATH}/${slug}`, localized]);
  }
  return Object.fromEntries(entries);
}
