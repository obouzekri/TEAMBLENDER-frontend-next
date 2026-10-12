export function getCrosswordParticipantLimitError(participantCount, locale = 'fr') {
  const count = Number(participantCount);
  if (Number.isInteger(count) && count >= 2 && count <= 5) return '';
  return locale === 'en'
    ? 'Crossword requires 2 to 5 assigned participants. Update the session participants before starting the challenge.'
    : 'Mots croisés nécessite 2 à 5 participants assignés. Modifiez les participants avant de démarrer le challenge.';
}
