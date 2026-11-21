// Turns a challenge:error packet into the text to show, or '' when there is nothing to report.
const TRANSIENT_CODES = new Set(['CHALLENGE_NOT_JOINED']);
// Sent by servers that predate the CHALLENGE_NOT_JOINED code.
const TRANSIENT_MESSAGES = new Set(['No active challenge room for this socket']);

const MESSAGE_KEYS_BY_CODE = {
  QUIZ_NOT_ENOUGH_CONNECTED_PARTICIPANTS: 'challengeCommon.notEnoughParticipants',
  NOT_ENOUGH_PARTICIPANTS: 'challengeCommon.notEnoughParticipants',
};

export function resolveChallengeErrorMessage(packet, t, fallback = '') {
  const code = String(packet?.code || '').trim();
  const message = String(packet?.message || '').trim();
  if (TRANSIENT_CODES.has(code) || TRANSIENT_MESSAGES.has(message)) return '';
  if (MESSAGE_KEYS_BY_CODE[code]) return t(MESSAGE_KEYS_BY_CODE[code]);
  return message || fallback;
}
