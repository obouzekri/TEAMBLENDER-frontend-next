// Stateless helpers for the session builder.
import { SESSION_OBJECTIVES, parseSessionObjectives } from '@/lib/sessionProgram.mjs';

export function pickDisplayName(user) {
  if (!user || typeof user !== 'object') return 'Manager';
  const first = String(user.first_name || user.firstName || '').trim();
  const last = String(user.last_name || user.lastName || '').trim();
  const full = `${first} ${last}`.trim();
  return full || String(user.name || user.email || 'Manager');
}

function mergeChallengeConfig(baseConfig, overrideConfig) {
  const base = baseConfig && typeof baseConfig === 'object' ? baseConfig : {};
  const override = overrideConfig && typeof overrideConfig === 'object' ? overrideConfig : {};

  return {
    ...base,
    ...override,
    image: { ...(base.image || {}), ...(override.image || {}) },
    timer: { ...(base.timer || {}), ...(override.timer || {}) },
    participants: { ...(base.participants || {}), ...(override.participants || {}) },
    grid: { ...(base.grid || {}), ...(override.grid || {}) },
    chat: { ...(base.chat || {}), ...(override.chat || {}) },
    settings: { ...(base.settings || {}), ...(override.settings || {}) },
    replication: { ...(base.replication || {}), ...(override.replication || {}) },
    creative: { ...(base.creative || {}), ...(override.creative || {}) },
    advancedRoles: { ...(base.advancedRoles || {}), ...(override.advancedRoles || {}) },
  };
}

export function extractChallengeConfig(challenge) {
  const baseConfig =
    challenge?.engine_config && typeof challenge.engine_config === 'object'
      ? challenge.engine_config
      : {};

  const directConfig =
    challenge?.config && typeof challenge.config === 'object' ? challenge.config : {};

  const junctionConfig =
    challenge?.SessionChallenge?.config && typeof challenge.SessionChallenge.config === 'object'
      ? challenge.SessionChallenge.config
      : {};

  return mergeChallengeConfig(baseConfig, mergeChallengeConfig(directConfig, junctionConfig));
}

export function normalizeSessionObjectiveValue(value) {
  if (value == null || value === '') return '';
  try {
    const parsed = parseSessionObjectives(value);
    return SESSION_OBJECTIVES.filter((objectiveKey) => parsed.includes(objectiveKey)).join(',');
  } catch {
    return '';
  }
}
