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

## Step 4 - Publication du lot branding
Action:
- Push du commit garde `0e68a79` vers `origin/main`.

Verification:
- Remote update: `eb469a2..0e68a79  main -> main`
- Conclusion: lot branding TeamBlender publie.

## Step 5 - Micro-lot email/domain (1 fichier a la fois)
Objectif:
- Aligner les adresses email visibles sur la marque TeamBlender sans toucher a la logique applicative.

### Step 5.1 - app/contact/page.js
Action:
- `mailto:contact@teamspark.app` -> `mailto:contact@teamblender.io`
- Texte visible `contact@teamspark.app` -> `contact@teamblender.io`

Verification:
- `get_errors` sur le fichier: OK
- Diff local controle: text-only

### Step 5.2 - app/mentions-legales/page.js
Action:
- Deux liens email mis a jour vers `contact@teamblender.io`

Verification:
- `get_errors` sur le fichier: OK
- Diff local controle: text-only

### Step 5.3 - app/politique-confidentialite/page.js
Action:
- Deux liens email mis a jour vers `contact@teamblender.io`

Verification:
- `get_errors` sur le fichier: OK
- Diff local controle: text-only

## Step 6 - Verification de non-regression post micro-lot
Action:
- Scan occurrences restantes de `teamspark.app|@teamspark` dans `app` et `components`.
- Build complet `npm run build`.

Verification:
- Scan `app/components`: aucune occurrence restante
- Build Next.js: succes
- Conclusion: micro-lot email/domain valide sans regression detectee

## Step 7 - Validation visuelle routes critiques
Action:
- Demarrage serveur local `next dev -p 3100`.
- Controle automatise des pages: `/`, `/contact`, `/mentions-legales`, `/politique-confidentialite`.

Verification:
- `/`: titre `TeamBlender`, aucun residu Teamspark detecte
- `/contact`: TeamBlender visible, email `contact@teamblender.io`, aucun email legacy
- `/mentions-legales`: TeamBlender visible, email `contact@teamblender.io`, aucun email legacy
- `/politique-confidentialite`: TeamBlender visible, email `contact@teamblender.io`, aucun email legacy
- Conclusion: validation visuelle OK sur les routes critiques
