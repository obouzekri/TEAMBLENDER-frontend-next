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
  { id: 'question_result', label: 'Résultat question' },
  { id: 'final_score', label: 'Score final' },
]);

export const THE_QUIZ_HOST_TABS = Object.freeze([
  { id: 'host_admin', label: 'Console animateur' },
  { id: 'host_live_answers', label: 'Réponses live' },
]);

export const THE_QUIZ_PLACEHOLDER_QUESTION = Object.freeze({
  id: 'quiz_placeholder_001',
  category: 'Culture générale',
  difficulty: 'moyen',
  text: 'Quel monument parisien a été inauguré pour l Exposition universelle de 1889 ?',
  choices: [
    { id: 'a', label: 'La tour Eiffel' },
    { id: 'b', label: 'L Arc de triomphe' },
    { id: 'c', label: 'Le Sacré-Cœur' },
    { id: 'd', label: 'Le Louvre' },
  ],
  explanation: 'La tour Eiffel a été construite pour l Exposition universelle de 1889.',
});

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

export function buildPlaceholderLeaderboard(participants = []) {
  if (Array.isArray(participants) && participants.length > 0) {
    return participants.slice(0, 5).map((participant, index) => ({
      participant_id: String(participant?.participant_id || `p-${index + 1}`),
      display_name: String(participant?.display_name || `Participant ${index + 1}`),
      score: Math.max(0, 4 - index),
      rank: index + 1,
    }));
  }

  return [
    { participant_id: 'p-1', display_name: 'Camille', score: 4, rank: 1 },
    { participant_id: 'p-2', display_name: 'Nora', score: 3, rank: 2 },
    { participant_id: 'p-3', display_name: 'Lina', score: 2, rank: 3 },
    { participant_id: 'p-4', display_name: 'Yanis', score: 1, rank: 4 },
  ];
}