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

// Names of each engine's main challenge, in the spellings found in the catalog. A challenge whose
// name starts with one of them and adds words ("Phrase Flash", "Salle secrete Sprint",
// "Salle Secrète II") is a variant: keep those words so variants do not share the engine's title.
const ENGINE_BASE_NAMES = {
  phrase_collaborative_v1: ['phrase collaborative', 'phrase mystere', 'mystery phrase', 'phrase'],
  escape_room_v1: ['salle secrete', 'secret room'],
};

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function variantSuffix(engineKey, rawName) {
  const words = String(rawName || '').trim().split(/\s+/).filter(Boolean);
  const normalized = normalizeName(rawName);
  const bases = [...(ENGINE_BASE_NAMES[String(engineKey || '').trim()] || [])]
    .sort((a, b) => b.length - a.length);
  for (const base of bases) {
    if (normalized === base) return '';
    if (normalized.startsWith(`${base} `)) return words.slice(base.split(' ').length).join(' ');
  }
  return '';
}

// Engine title in the reader's language, plus the variant words of the challenge if any.
export function localizeChallengeName(challenge, locale) {
  const current = challenge && typeof challenge === 'object' ? challenge : {};
  const preset = getBuilderRulesPreset(current.engine_key, locale);
  const baseName = String(preset?.challengeName || '').trim();
  if (!baseName) return resolveLocalizedText(current.name, locale);
  const suffix = variantSuffix(current.engine_key, resolveLocalizedText(current.name, locale));
  return suffix ? `${baseName} ${suffix}` : baseName;
}

export function localizeBuilderChallenge(challenge, locale) {
  const current = challenge && typeof challenge === 'object' ? challenge : {};
  const preset = getBuilderRulesPreset(current.engine_key, locale);

  if (preset) {
    return {
      ...current,
      name: localizeChallengeName(current, locale) || String(current.name || '').trim(),
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
