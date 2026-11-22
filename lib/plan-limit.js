// Limites de l'offre (participants, sessions) renvoyées par l'API avec le code
// PLAN_LIMIT_REACHED. Toute erreur de ce type passe par notifyPlanLimit(), qui ouvre
// la modale globale <PlanLimitDialog /> (montée dans app/layout.js).

export const PLAN_LIMIT_CODE = 'PLAN_LIMIT_REACHED';
export const PLAN_LIMIT_EVENT = 'tb:plan-limit-reached';

export function isPlanLimitError(errorOrPayload) {
  return String(errorOrPayload?.code || '') === PLAN_LIMIT_CODE;
}

function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

// Réduit la réponse de l'API (ou l'erreur qui la porte) à ce que la modale affiche.
export function normalizePlanLimit(errorOrPayload) {
  if (!isPlanLimitError(errorOrPayload)) return null;
  const details = errorOrPayload?.details && typeof errorOrPayload.details === 'object'
    ? errorOrPayload.details
    : {};
  const rawMetric = String(details.metric || '').trim();
  const metric = rawMetric === 'max_sessions'
    ? 'sessions'
    : rawMetric === 'max_users'
      ? 'participants'
      : 'generic';
  const plan = details.plan && typeof details.plan === 'object' ? details.plan : null;

  const planCode = String(plan?.plan_code || '').trim().toLowerCase() || null;
  return {
    metric,
    scope: details.scope === 'total' ? 'total' : 'month',
    limit: toCount(details.limit),
    current: toCount(details.current),
    planCode,
    upgradePath: resolveUpgradePath(planCode),
    planName: String(plan?.name || '').trim() || null,
    planLocalizedContent: plan?.localized_content && typeof plan.localized_content === 'object'
      ? plan.localized_content
      : null,
  };
}

// Offre suivante à demander : les offres payantes s'activent via /contact?plan=<code>
// (pas de paiement par carte). Essai → Essentiel, Essentiel → Organisation.
const NEXT_PLAN_CODE = { trial: 'team', team: 'enterprise' };

export function resolveUpgradePath(planCode) {
  const next = NEXT_PLAN_CODE[String(planCode || '').trim().toLowerCase()];
  return next ? `/contact?plan=${next}` : '/contact?plan=enterprise';
}

// Ouvre la modale si l'erreur est une limite d'offre. Renvoie true si elle l'a prise en charge,
// pour que l'appelant n'affiche pas en plus un toast d'erreur.
export function notifyPlanLimit(errorOrPayload) {
  const info = normalizePlanLimit(errorOrPayload);
  if (!info) return false;
  if (typeof window === 'undefined') return true;
  window.dispatchEvent(new CustomEvent(PLAN_LIMIT_EVENT, { detail: info }));
  return true;
}
