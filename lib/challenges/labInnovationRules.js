import { normalizeLocale } from '@/lib/i18n/routing';
import { getDictionary } from '@/lib/i18n';

export const LAB_INNOVATION_RULES_PRESET_KEY = 'labInnovation';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function getLabInnovationRulesPreset(localeInput = 'fr') {
  const locale = normalizeLocale(localeInput);
  const dictionary = getDictionary(locale);
  const node = dictionary?.challengeRules?.[LAB_INNOVATION_RULES_PRESET_KEY] || {};

  return {
    key: LAB_INNOVATION_RULES_PRESET_KEY,
    challengeName: String(node?.challengeName || '').trim(),
    subtitle: String(node?.subtitle || '').trim(),
    objective: String(node?.objective || '').trim(),
    participants: {
      min: String(node?.participants?.min || '').trim(),
      recommended: String(node?.participants?.recommended || '').trim(),
      max: String(node?.participants?.max || '').trim(),
    },
    facilitator: asArray(node?.facilitator),
    participant: asArray(node?.participant),
  };
}

export default getLabInnovationRulesPreset;
// Mirrors the backend engine catalog (lab_d_innovation_v1/game-logic.js); texts live in challengeLab.catalog.
export const LAB_PROBLEM_CATALOG = Object.freeze([
  { id: 'unclear_governance', category: 'governance' },
  { id: 'slow_decisions', category: 'governance' },
  { id: 'misaligned_priorities', category: 'governance' },
  { id: 'poor_internal_communication', category: 'communication' },
  { id: 'silos', category: 'communication' },
  { id: 'inefficient_meetings', category: 'communication' },
  { id: 'recurring_delays', category: 'project' },
  { id: 'budget_overruns', category: 'project' },
  { id: 'scope_creep', category: 'project' },
  { id: 'unanticipated_risks', category: 'risk' },
  { id: 'key_person_dependency', category: 'risk' },
  { id: 'heavy_processes', category: 'process' },
  { id: 'recurring_errors', category: 'process' },
  { id: 'unsuitable_tools', category: 'process' },
  { id: 'workload', category: 'people' },
  { id: 'low_motivation', category: 'people' },
  { id: 'skills_gap', category: 'people' },
  { id: 'customer_satisfaction', category: 'change' },
  { id: 'resistance_to_change', category: 'change' },
  { id: 'lack_of_innovation', category: 'change' },
]);

export const LAB_DEFAULT_PROBLEM_IDS = Object.freeze([
  'unclear_governance', 'misaligned_priorities',
  'poor_internal_communication', 'silos',
  'recurring_delays', 'scope_creep',
  'unanticipated_risks',
  'heavy_processes', 'unsuitable_tools',
  'workload', 'low_motivation',
  'resistance_to_change',
]);

export const LAB_MIN_PROBLEM_COUNT = 4;

// Same rule as the server: known ids in catalog order, otherwise the default selection.
export function normalizeLabProblemIds(value) {
  const wanted = new Set((Array.isArray(value) ? value : []).map(String));
  const ids = LAB_PROBLEM_CATALOG.map((item) => item.id).filter((id) => wanted.has(id));
  return ids.length >= LAB_MIN_PROBLEM_COUNT ? ids : [...LAB_DEFAULT_PROBLEM_IDS];
}
