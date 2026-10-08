'use client';

export const THE_QUIZ_PRESETS = Object.freeze([
  { id: 'short', label: 'Short', questionCount: 6, estimatedDurationMinutes: 15 },
  { id: 'medium', label: 'Medium', questionCount: 9, estimatedDurationMinutes: 20 },
  { id: 'long', label: 'Long', questionCount: 12, estimatedDurationMinutes: 25 },
]);

export const THE_QUIZ_STAGE_OPTIONS = Object.freeze([
  { id: 'lobby', label: 'Lobby' },
  { id: 'question_live', label: 'Question live' },
  { id: 'leaderboard_live', label: 'Leaderboard live' },
  { id: 'question_result', label: 'Question result' },
  { id: 'final_score', label: 'Final score' },
]);

export const THE_QUIZ_HOST_TABS = Object.freeze([
  { id: 'host_admin', label: 'Host console' },
  { id: 'host_live_answers', label: 'Live answers' },
]);

/**
 * @typedef {Object} TheQuizLeaderboardEntry
 * @property {string} participant_id
 * @property {string} display_name
 * @property {number} score
 * @property {number} rank
 */

/**
 * @typedef {Object} TheQuizViewModel
 * @property {string} phase
 * @property {boolean} placeholder_mode
 * @property {number} question_count
 * @property {number} question_duration_seconds
 * @property {boolean} chat_enabled
 * @property {boolean} leaderboard_enabled
 * @property {Array<TheQuizLeaderboardEntry>} leaderboard
 */

export function getPresetById(presetId) {
  return THE_QUIZ_PRESETS.find((preset) => preset.id === String(presetId || '').trim()) || THE_QUIZ_PRESETS[1];
}
