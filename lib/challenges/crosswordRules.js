export function getCrosswordRulesPreset(locale = 'fr') {
  const en = locale === 'en';
  return {
    challengeName: en ? 'Crossword Live' : 'Mots croisés Live',
    objective: en
      ? 'Complete a shared crossword. The first participant to solve a word earns one point.'
      : 'Complétez une grille commune. Le premier participant à trouver un mot gagne un point.',
    facilitator: en
      ? ['Start without a minimum or maximum participant count.', 'Choose a grid and a duration (15 minutes by default).', 'The timer continues after disconnection. No pause; you may end the game.']
      : ['Lancez sans nombre minimum ni maximum de participants.', 'Choisissez une grille et une durée (15 minutes par défaut).', 'Le chrono continue après une déconnexion. Pas de pause ; vous pouvez terminer la partie.'],
    participant: en
      ? ['Select a word, read its clue and submit your answer.', 'One point per word, awarded once. Wrong answers cost no points.', 'Use revealed intersections to help complete the shared grid.', 'Wait 2 seconds between attempts; at most 5 wrong answers per word in 30 seconds.']
      : ['Sélectionnez un mot, lisez sa définition et validez votre réponse.', 'Un point par mot, attribué une seule fois. Aucune pénalité pour une erreur.', 'Utilisez les lettres révélées aux intersections pour compléter la grille commune.', 'Attendez 2 secondes entre les essais ; au maximum 5 erreurs par mot en 30 secondes.'],
    footnote: en
      ? 'Case, accents, spaces, apostrophes and hyphens are ignored. Server reception time determines the deadline. Equal scores remain tied.'
      : 'Casse, accents, espaces, apostrophes et tirets sont ignorés. L’heure de réception serveur fait foi. Les scores égaux restent ex æquo.',
  };
}
