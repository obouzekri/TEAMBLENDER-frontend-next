import { getPixelArchitectRulesPreset } from '@/lib/challenges/pixelArchitectRules';
import { getTheQuizRulesPreset } from '@/lib/challenges/theQuizRules';
import { getPhraseMystereRulesPreset } from '@/lib/challenges/phraseMystereRules';
import { getCopuzzleRulesPreset } from '@/lib/challenges/copuzzleRules';
import { getLabyrintheRulesPreset } from '@/lib/challenges/labyrintheRules';
import { getVraiOuMensongeRulesPreset } from '@/lib/challenges/vraiOuMensongeRules';
import { getMissionCritiqueRulesPreset } from '@/lib/challenges/missionCritiqueRules';
import { getEscapeRoomRulesPreset } from '@/lib/challenges/escapeRoomRules';
import { getLabInnovationRulesPreset } from '@/lib/challenges/labInnovationRules';
import { getCrosswordRulesPreset } from '@/lib/challenges/crosswordRules';

export function resolveLocalizedText(value, locale) {
  if (value == null) return '';
  if (typeof value === 'object' && !Array.isArray(value)) {
    const localized = value[locale] ?? value.en ?? value.fr ?? '';
    return String(localized || '').trim();
  }
  return String(value || '').trim();
}

export function getBuilderRulesPreset(engineKey, locale) {
  if (engineKey === 'crossword_live_v1') return getCrosswordRulesPreset(locale);
  switch (String(engineKey || '').trim()) {
    case 'pixel_architect_v1':
      return getPixelArchitectRulesPreset(locale);
    case 'the_quiz_v1':
      return getTheQuizRulesPreset(locale);
    case 'phrase_collaborative_v1':
      return getPhraseMystereRulesPreset(locale);
    case 'copuzzle_live_v1':
      return getCopuzzleRulesPreset(locale);
    case 'labyrinthe_live_v1':
      return getLabyrintheRulesPreset(locale);
    case 'vrai_ou_mensonge_v1':
      return getVraiOuMensongeRulesPreset(locale);
    case 'mission_critique_v1':
      return getMissionCritiqueRulesPreset(locale);
    case 'escape_room_v1':
      return getEscapeRoomRulesPreset(locale);
    case 'lab_d_innovation_v1':
      return getLabInnovationRulesPreset(locale);
    default:
      return null;
  }
}

export function localizeBuilderChallenge(challenge, locale) {
  const current = challenge && typeof challenge === 'object' ? challenge : {};
  const preset = getBuilderRulesPreset(current.engine_key, locale);

  if (preset) {
    return {
      ...current,
      name: String(preset.challengeName || current.name || '').trim(),
      description: String(preset.objective || current.description || '').trim(),
    };
  }

  const localizedName = resolveLocalizedText(current.name, locale);
  const localizedDescription =
    resolveLocalizedText(current.description, locale) ||
    resolveLocalizedText(current.rules_objective, locale);

  return {
    ...current,
    name: localizedName || String(current.name || '').trim(),
    description: localizedDescription || String(current.description || '').trim(),
  };
}
