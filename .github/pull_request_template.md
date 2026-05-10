## Summary
- [ ] Scope is clear and limited
- [ ] Behavior changes are documented

## Local Tests Checklist (Mandatory)
- [ ] Backend local checks executed (tests + critical env checks if impacted)
- [ ] Frontend local checks executed (`npm run build` and relevant smoke/tests)
- [ ] Test commands and results pasted in PR

## Preview Vercel (Mandatory Before Merge)
- [ ] Preview URL is provided in this PR
- [ ] Preview status is green and accessible
- [ ] Manager flow verified on preview: login -> home -> session-builder
- [ ] Participant flow verified on preview: join -> active challenge
- [ ] No blocking UI/API errors observed in preview run
- [ ] Preview smoke pass executed (`frontend-next`: `npm run test:smoke:preview` + `backend`: `npm run smoke:preview:api`)

## Railway Logs (Mandatory For Backend-Critical Changes)
- [ ] Railway build logs reviewed (dependency install, build step, migrations)
- [ ] Railway runtime logs reviewed after deploy (startup, health, auth, sessions)
- [ ] No blocking errors found in logs (crash loop, repeated 5xx, DB/auth failures)
- [ ] Time window reviewed is documented in PR (at least first 15 minutes after deploy)

## Typography Checklist
- [ ] No hardcoded `Inter` or `Roboto` in app files
- [ ] App UI uses `--font-family-ui`
- [ ] Display font usage is limited to marketing/hero contexts
- [ ] No non-tokenized `font-family` in app components
- [ ] Desktop and mobile typography reviewed visually

## Validation
- [ ] `npm run check:typography` executed in frontend
- [ ] Manual smoke test on impacted pages

## Evidence
- [ ] Preview URL pasted in PR description
- [ ] Screenshots attached (desktop + mobile if UI impacted)
- [ ] Risks documented
- [ ] Rollback plan documented
- [ ] Railway log excerpts or summary pasted for backend-critical changes

## Merge Gate (Mandatory)
- [ ] At least 1 reviewer approval obtained
- [ ] PR checklist is fully completed
