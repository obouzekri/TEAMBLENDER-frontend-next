# Rebrand TeamBlender - Journal Pas a Pas

Date: 2026-05-15
Scope: frontend-next uniquement
Objectif: remplacement textuel de marque sans modification de mecanique

## Step 0 - Baseline
- Branche: main
- Dossier: frontend-next
- Fichiers modifies detectes: 17
- Verification: `git status --short` capturee avant intervention

## Step 1 - Controle de securite du diff
Action:
- Audit des diffs de navigation (`components/TopNav.js`, `components/AppNav.js`, `components/Footer.js`).
- Controle automatique global du diff pour verifier qu'aucune ligne hors branding n'est modifiee.

Verification:
- Resultat controle global: `OK_ONLY_BRAND_TEXT_CHANGES`
- Conclusion: aucun changement de logique/mecanique detecte

## Step 2 - Verification de non-regression build
Action:
- Execution de `npm run build`

Verification:
- Build Next.js reussi
- Pages generees sans erreur
- Conclusion: pas de regression de compilation detectee

## Step 3 - Changelog par fichier (branding uniquement)
- app/admin/AdminClient.js: TEAMSPARK -> TeamBlender
- app/admin/page.js: TEAMSPARK -> TeamBlender
- app/challenges/layout.js: TEAMSPARK -> TeamBlender
- app/contact/page.js: TEAMSPARK -> TeamBlender (labels/sujet email)
- app/home/page.js: TEAMSPARK -> TeamBlender
- app/layout.js: TEAMSPARK -> TeamBlender (metadata)
- app/login/LoginForm.js: TEAMSPARK -> TeamBlender
- app/login/page.js: TEAMSPARK -> TeamBlender
- app/mentions-legales/page.js: TEAMSPARK -> TeamBlender
- app/page.js: TEAMSPARK -> TeamBlender
- app/politique-confidentialite/page.js: TEAMSPARK -> TeamBlender
- app/pricing/page.js: TEAMSPARK -> TeamBlender
- app/signup/SignupForm.js: TEAMSPARK -> TeamBlender
- app/signup/page.js: TEAMSPARK -> TeamBlender
- components/AppNav.js: TEAMSPARK -> TeamBlender
- components/Footer.js: TEAMSPARK -> TeamBlender
- components/TopNav.js: TEAMSPARK -> TeamBlender

## Garde-fous appliques
- Aucun renommage de routes
- Aucun renommage de variables techniques (`teamspark_*`)
- Aucun changement de logique JS/React
- Aucune modification backend

## Etapes suivantes recommandees (sans action auto)
1. Validation visuelle manuelle des pages critiques (`/`, `/login`, `/signup`, `/mentions-legales`, `/politique-confidentialite`).
2. Decision explicite sur le domaine/email (`contact@teamspark.app`) avant modification.
3. Commit avec message dedie rebrand texte + build OK.
