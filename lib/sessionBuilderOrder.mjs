export function reorderChallenges(challenges, sourceId, targetId) {
  const sourceIndex = challenges.findIndex((challenge) => challenge.id === sourceId);
  const targetIndex = challenges.findIndex((challenge) => challenge.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return challenges;

  const reordered = [...challenges];
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moved);
  return reordered;
}
