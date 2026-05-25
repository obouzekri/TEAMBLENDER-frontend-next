export function buildFinalRanking(scores, participantsOrder) {
  const entries = (Array.isArray(participantsOrder) ? participantsOrder : []).map((participantId) => ({
    participant_id: String(participantId),
    score: Number(scores?.[participantId] || 0),
  }));

  entries.sort((a, b) => (b.score - a.score) || a.participant_id.localeCompare(b.participant_id));

  let currentRank = 1;
  for (let i = 0; i < entries.length; i += 1) {
    if (i > 0 && entries[i].score < entries[i - 1].score) {
      currentRank = i + 1;
    }
    entries[i].rank = currentRank;
    entries[i].tie = i > 0 && entries[i].score === entries[i - 1].score;
  }

  return entries;
}

export function expectedTotalTurns(participantCount, targetDurationMinutes = 15) {
  const safeCount = Number.isInteger(participantCount) && participantCount > 0 ? participantCount : 0;
  const safeDuration = [15, 20, 25, 30].includes(Number(targetDurationMinutes))
    ? Number(targetDurationMinutes)
    : 15;
  if (safeCount === 0) return 0;
  const cycles = Math.max(1, Math.floor(safeDuration / safeCount));
  return safeCount * cycles;
}
