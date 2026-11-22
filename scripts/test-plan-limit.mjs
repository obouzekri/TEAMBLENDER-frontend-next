import assert from 'node:assert/strict';
import { isPlanLimitError, normalizePlanLimit, notifyPlanLimit, PLAN_LIMIT_EVENT, resolveUpgradePath } from '../lib/plan-limit.js';
import fr from '../lib/i18n/dictionaries/fr.js';
import en from '../lib/i18n/dictionaries/en.js';
import ar from '../lib/i18n/dictionaries/ar.js';

// Réponses réelles de l'API (pricing-gating.service.js côté backend).
const participantPayload = {
  code: 'PLAN_LIMIT_REACHED',
  error: 'L’offre Essai autorise 20 participant(s) maximum.',
  details: {
    metric: 'max_users',
    limit: 20,
    current: 20,
    plan: { name: 'Essai', plan_code: 'trial', localized_content: { en: { name: 'Trial' } } },
  },
};
const sessionPayload = {
  code: 'PLAN_LIMIT_REACHED',
  details: { metric: 'max_sessions', scope: 'total', limit: 5, current: 5, plan: { name: 'Essai', plan_code: 'trial' } },
};

assert.equal(isPlanLimitError(participantPayload), true);
assert.equal(isPlanLimitError({ code: 'ACCESS_EXPIRED' }), false);
assert.equal(isPlanLimitError(null), false);
assert.equal(normalizePlanLimit({ code: 'BAD_REQUEST' }), null);

assert.deepEqual(normalizePlanLimit(participantPayload), {
  metric: 'participants',
  scope: 'month',
  limit: 20,
  current: 20,
  planCode: 'trial',
  upgradePath: '/contact?plan=team',
  planName: 'Essai',
  planLocalizedContent: { en: { name: 'Trial' } },
});
const session = normalizePlanLimit(sessionPayload);
assert.equal(session.metric, 'sessions');
assert.equal(session.scope, 'total');

assert.equal(resolveUpgradePath('trial'), '/contact?plan=team');
assert.equal(resolveUpgradePath('team'), '/contact?plan=enterprise');
assert.equal(resolveUpgradePath(null), '/contact?plan=enterprise');

// Erreur JS portant code/details (apiRequest du Session Builder).
const err = Object.assign(new Error('x'), { code: 'PLAN_LIMIT_REACHED', details: { metric: 'max_sessions', limit: 3, current: 3 } });
assert.equal(normalizePlanLimit(err).metric, 'sessions');
// Sans details : la modale reste affichable en version générique.
assert.equal(normalizePlanLimit({ code: 'PLAN_LIMIT_REACHED' }).metric, 'generic');

// notifyPlanLimit émet l'événement écouté par <PlanLimitDialog />.
const received = [];
globalThis.window = new EventTarget();
globalThis.window.addEventListener(PLAN_LIMIT_EVENT, (event) => received.push(event.detail));
assert.equal(notifyPlanLimit({ code: 'OTHER' }), false);
assert.equal(notifyPlanLimit(participantPayload), true);
assert.equal(received.length, 1);
assert.equal(received[0].metric, 'participants');
delete globalThis.window;

// Toutes les clés de la modale existent dans chaque langue.
const keys = [
  'planLimitEyebrow', 'planLimitYourPlan', 'planLimitUsageValue', 'planLimitLater', 'planLimitComparePlans', 'planLimitUpgrade',
  ...['participants', 'sessionsMonth', 'sessionsTotal', 'generic'].flatMap((m) => [`planLimitTitle_${m}`, `planLimitBody_${m}`]),
  ...['participants', 'sessions'].flatMap((m) => [`planLimitUsage_${m}`, `planLimitUpgradeHint_${m}`]),
];
for (const [lang, dict] of Object.entries({ fr, en, ar })) {
  for (const key of keys) {
    assert.ok(String(dict.shell?.[key] || '').trim(), `${lang}: shell.${key} manquant`);
  }
}

console.log('plan-limit: OK');
