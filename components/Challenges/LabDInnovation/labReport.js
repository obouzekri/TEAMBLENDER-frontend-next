import { formatDate, formatNumber } from '@/lib/i18n/format';
import { getLocaleMeta } from '@/lib/i18n/routing';

// Printable report of a finished Lab, for the host to save as PDF from the browser print dialog.
// Every participant text goes through escapeHtml: the page is built as a string.

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const REPORT_CSS = `
  * { box-sizing: border-box; }
  body { font: 13px/1.5 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #14212b; margin: 32px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #0e9384; }
  h3 { font-size: 14px; margin: 14px 0 6px; }
  .meta { color: #5b6b78; margin: 0; }
  .muted { color: #5b6b78; }
  .decision { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .box { border: 1px solid #d5dde3; border-radius: 10px; padding: 12px; break-inside: avoid; }
  .label { font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #0e9384; margin: 0 0 4px; }
  .badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #e0f2f1; color: #0b6b60; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { text-align: start; vertical-align: top; padding: 7px 8px; border-bottom: 1px solid #e3e8ec; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .03em; color: #5b6b78; }
  tr { break-inside: avoid; }
  td.num { white-space: nowrap; text-align: end; font-variant-numeric: tabular-nums; }
  ul { margin: 4px 0; padding-inline-start: 18px; }
  li { margin: 2px 0; }
  .quote { margin: 0 0 4px; font-style: italic; }
  .author { font-style: normal; }
  .author { color: #5b6b78; font-size: 12px; }
  @page { margin: 16mm; }
  @media print { body { margin: 0; } }
`;

export function buildLabReportHtml({ result, t, locale, title, fullName, stats }) {
  const e = escapeHtml;
  const problemTitle = (id) => t(`challengeLab.catalog.${id}.title`);
  const insight = result.problem_id ? `challengeLab.insights.${result.problem_id}` : null;
  const points = (value) => (Number.isFinite(value) ? e(t('challengeLab.points', { count: value })) : `<span class="muted">${e(t('challengeLab.debrief.notVoted'))}</span>`);
  const argumentList = (items) => (items.length === 0
    ? `<span class="muted">${e(t('challengeLab.reading.noArguments'))}</span>`
    : items.map((item) => `<p class="quote">${e(item.text)} <span class="author">— ${e(fullName(item.author_id))}</span></p>`).join(''));

  const problems = result.problem_choices || [];
  const solutions = result.solutions_proposed || [];
  const indicators = Object.entries(result.indicators || {});
  const reportTitle = t('challengeLab.debrief.reportTitle', { title });

  const sections = [
    `<h1>${e(reportTitle)}</h1>`,
    `<p class="meta">${e(t('challengeLab.debrief.reportDate', { date: formatDate(new Date(), locale, { dateStyle: 'long' }) }))}${stats ? ` · ${e(t('challengeLab.fiche.participation', { rate: stats.participation_rate }))}` : ''}</p>`,

    `<h2>${e(t('challengeLab.debrief.resultTitle'))}</h2>`,
    '<div class="decision">',
    `<div class="box"><p class="label">${e(t('challengeLab.retainedProblem'))}</p>`,
    result.problem_id
      ? `<strong>${e(problemTitle(result.problem_id))}</strong><br><span class="muted">${e(t(`challengeLab.catalog.${result.problem_id}.description`))}</span>${result.problem_decided_by ? `<p class="muted">${e(t(`challengeLab.decidedBy.${result.problem_decided_by}`))}</p>` : ''}`
      : '-',
    '</div>',
    `<div class="box"><p class="label">${e(t('challengeLab.retainedSolution'))}</p>`,
    result.solutions.length
      ? result.solutions.map((item) => `<strong>${e(item.text)}</strong>${item.rationale ? `<p class="quote">${e(item.rationale)}</p>` : ''}<p class="author">${e(t('challengeLab.proposedBy', { name: fullName(item.author_id) }))}</p>`).join('')
      : e(t('challengeLab.fiche.noSolution')),
    result.solution_decided_by ? `<p class="muted">${e(t(`challengeLab.decidedBy.${result.solution_decided_by}`))}</p>` : '',
    '</div>',
    '</div>',

    `<h2>${e(t('challengeLab.debrief.problemsTitle'))}</h2>`,
    `<table><thead><tr><th>${e(t('challengeLab.fiche.problem'))}</th><th>${e(t('challengeLab.debrief.argumentsTitle'))}</th><th>${e(t('challengeLab.debrief.picksColumn'))}</th><th>${e(t('challengeLab.debrief.votePointsHint'))}</th></tr></thead><tbody>`,
    ...problems.map((item) => `<tr><td><strong>${e(problemTitle(item.problem_id))}</strong>${item.retained ? ` <span class="badge">${e(t('challengeLab.debrief.retainedProblemBadge'))}</span>` : ''}</td><td>${argumentList(item.arguments)}</td><td class="num">${e(item.picks)}</td><td class="num">${points(item.points)}</td></tr>`),
    '</tbody></table>',

    `<h2>${e(t('challengeLab.debrief.solutionsTitle'))}</h2>`,
    solutions.length === 0 ? `<p class="muted">${e(t('challengeLab.noSolutionsYet'))}</p>` : [
      `<table><thead><tr><th>${e(t('challengeLab.fiche.solution'))}</th><th>${e(t('challengeLab.rationaleLabel'))}</th><th>${e(t('challengeLab.debrief.votePointsHint'))}</th></tr></thead><tbody>`,
      ...solutions.map((item) => `<tr><td><strong>${e(item.text)}</strong>${item.retained ? ` <span class="badge">${e(t('challengeLab.debrief.retainedSolutionBadge'))}</span>` : ''}<br><span class="author">${e(t('challengeLab.proposedBy', { name: fullName(item.author_id) }))}</span></td><td>${item.rationale ? e(item.rationale) : `<span class="muted">${e(t('challengeLab.debrief.noRationale'))}</span>`}</td><td class="num">${points(item.points)}</td></tr>`),
      '</tbody></table>'
    ].join(''),

    `<h2>${e(t('challengeLab.fiche.plan'))}</h2>`,
    result.steps.length === 0 ? `<p class="muted">${e(t('challengeLab.fiche.noSteps'))}</p>` : [
      `<table><thead><tr><th>#</th><th>${e(t('challengeLab.step.text'))}</th><th>${e(t('challengeLab.step.delay'))}</th><th>${e(t('challengeLab.step.riskLevel'))}</th><th>${e(t('challengeLab.step.budget'))}</th><th>${e(t('challengeLab.step.stakeholder'))}</th></tr></thead><tbody>`,
      ...result.steps.map((step, index) => `<tr><td class="num">${index + 1}</td><td><strong>${e(step.text)}</strong>${step.risk ? `<br><span class="muted">${e(t('challengeLab.step.risk'))} : ${e(step.risk)}</span>` : ''}</td><td>${e(t(`challengeLab.delays.${step.delay}`))}</td><td>${e(t(`challengeLab.levels.${step.risk_level}`))}</td><td>${e(t(`challengeLab.levels.${step.budget_level}`))}${Number.isFinite(step.budget_amount) ? ` (${e(formatNumber(step.budget_amount, locale))})` : ''}</td><td>${e(step.stakeholder || '-')}</td></tr>`),
      '</tbody></table>',
      `<p class="muted">${e(t('challengeLab.fiche.budget'))} : ${e(t('challengeLab.fiche.budgetByLevel', result.budget.by_level))}${result.budget.amount_count > 0 ? ` · ${e(t('challengeLab.fiche.amountTotal', { amount: formatNumber(result.budget.amount_total, locale), count: result.budget.amount_count }))}` : ''}</p>`
    ].join(''),

    `<h2>${e(t('challengeLab.debrief.recommendationsTitle'))}</h2>`,
    insight ? [
      `<h3>${e(t('challengeLab.debrief.approachTitle'))}</h3>`,
      `<p>${e(t(`${insight}.approach`))}</p>`,
      `<ul>${[1, 2, 3].map((index) => `<li>${e(t(`${insight}.practice${index}`))}</li>`).join('')}</ul>`,
      `<p class="muted">${e(t('challengeLab.debrief.inspiredBy', { reference: t(`${insight}.reference`) }))}. ${e(t('challengeLab.debrief.approachDisclaimer'))}</p>`
    ].join('') : '',
    result.steps.length > 0 ? [
      `<h3>${e(t('challengeLab.debrief.planChecksTitle'))}</h3>`,
      (result.plan_checks || []).length === 0
        ? `<p>${e(t('challengeLab.debrief.planChecksNone'))}</p>`
        : `<ul>${result.plan_checks.map((check) => `<li>${e(t(`challengeLab.planChecks.${check.key}`, { count: check.count }))}</li>`).join('')}</ul>`
    ].join('') : '',

    indicators.length ? [
      `<h2>${e(t('challengeLab.debrief.indicatorsTitle'))}</h2>`,
      `<table><tbody>${indicators.map(([key, value]) => `<tr><td><strong>${e(t(`challengeLab.indicators.${key}.title`))}</strong><br><span class="muted">${e(t(`challengeLab.indicators.${key}.what`))}</span></td><td class="num">${Number.isFinite(value.score) ? e(t('challengeLab.debrief.scoreOutOf', { score: value.score })) : e(t('challengeLab.debrief.notMeasured'))}</td></tr>`).join('')}</tbody></table>`,
      `<p class="muted">${e(t('challengeLab.debrief.indicatorsNote'))}</p>`
    ].join('') : ''
  ];

  const dir = getLocaleMeta(locale)?.dir || 'ltr';
  return `<!doctype html><html lang="${e(locale)}" dir="${dir}"><head><meta charset="utf-8"><title>${e(reportTitle)}</title><style>${REPORT_CSS}</style></head><body>${sections.join('')}</body></html>`;
}

// Opens the report in a new window and starts printing. Returns false when the browser blocked it.
export function openLabReport(html) {
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
  return true;
}
