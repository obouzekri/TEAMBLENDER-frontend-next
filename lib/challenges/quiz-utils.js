export function normalizeQuizAnswerIndex(value, optionCount = 4) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) return null;
  const index = Number(value);
  return Number.isInteger(index) && index >= 0 && index < optionCount ? index : null;
}

export function getQuizOptions(question) {
  if (Array.isArray(question?.options)) return question.options.slice(0, 4);
  if (Array.isArray(question?.choices)) return question.choices.slice(0, 4).map((choice) => String(choice?.label || ''));
  return [];
}

export function getQuizRankingStatus(rows, phase, { waiting = false, unavailable = false } = {}) {
  if (unavailable) return 'unavailable';
  if (!Array.isArray(rows)) return waiting ? 'pending' : 'unavailable';
  if (rows.length) return 'ready';
  return phase === 'final_score' ? 'empty' : 'pending';
}

export function shouldIgnoreQuizShortcut(event) {
  return event.defaultPrevented || event.isComposing || event.repeat
    || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey
    || Boolean(event.target?.isContentEditable)
    || Boolean(event.target?.closest?.('input, textarea, select, button, a, [role="textbox"], [role="dialog"]'));
}
