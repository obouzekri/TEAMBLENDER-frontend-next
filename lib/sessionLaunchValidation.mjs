export function getSessionParticipantLimitError(challenges, participantCount, locale) {
  if (!challenges.some((challenge) => challenge.engine_key === 'crossword_live_v1')) return '';
  const count = Number(participantCount);
  if (Number.isInteger(count) && count >= 2 && count <= 5) return '';
  return locale === 'en'
    ? 'Crossword requires 2 to 5 assigned participants. Update the session participants before saving or launching.'
    : 'Mots croisés nécessite 2 à 5 participants assignés. Modifiez les participants avant de sauvegarder ou lancer la session.';
}
