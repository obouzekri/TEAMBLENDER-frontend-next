import { ALL_LOCALES, normalizeLocale } from './routing.js';

// Langues dans lesquelles chaque moteur a son contenu de jeu (questions, affirmations, tâches,
// énigmes, phrases, grilles). Un moteur absent de cette liste n'a pas de contenu dépendant de la
// langue (puzzle, labyrinthe, construction 3D, idées des participants) : disponible partout.
// Garder aligné avec backend/src/i18n/challenge-locales.js, qui refuse les autres combinaisons.
export const ENGINE_CONTENT_LOCALES = {
  crossword_live_v1: ['fr', 'en'],
  escape_room_v1: ['fr', 'en'],
  icebreaker_v1: ['fr', 'en'],
  mission_critique_v1: ['fr', 'en'],
  phrase_collaborative_v1: ['fr', 'en'],
  the_quiz_v1: ['fr', 'en'],
  vrai_ou_mensonge_v1: ['fr', 'en', 'ar'],
};

export function getEngineLocales(engineKey) {
  return ENGINE_CONTENT_LOCALES[String(engineKey || '')] || ALL_LOCALES;
}

export function isEngineAvailableInLocale(engineKey, locale) {
  return getEngineLocales(engineKey).includes(normalizeLocale(locale));
}
