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
- app/admin/AdminClient.js: TeamBlender -> TeamBlender
- app/admin/page.js: TeamBlender -> TeamBlender
- app/challenges/layout.js: TeamBlender -> TeamBlender
- app/contact/page.js: TeamBlender -> TeamBlender (labels/sujet email)
- app/home/page.js: TeamBlender -> TeamBlender
- app/layout.js: TeamBlender -> TeamBlender (metadata)
- app/login/LoginForm.js: TeamBlender -> TeamBlender
- app/login/page.js: TeamBlender -> TeamBlender
- app/mentions-legales/page.js: TeamBlender -> TeamBlender
- app/page.js: TeamBlender -> TeamBlender
- app/politique-confidentialite/page.js: TeamBlender -> TeamBlender
- app/pricing/page.js: TeamBlender -> TeamBlender
- app/signup/SignupForm.js: TeamBlender -> TeamBlender
- app/signup/page.js: TeamBlender -> TeamBlender
- components/AppNav.js: TeamBlender -> TeamBlender
- components/Footer.js: TeamBlender -> TeamBlender
- components/TopNav.js: TeamBlender -> TeamBlender

## Garde-fous appliques
- Aucun renommage de routes
- Aucun renommage de variables techniques (`TeamBlender_*`)
- Aucun changement de logique JS/React
- Aucune modification backend

## Etapes suivantes recommandees (sans action auto)
1. Validation visuelle manuelle des pages critiques (`/`, `/login`, `/signup`, `/mentions-legales`, `/politique-confidentialite`).
2. Decision explicite sur le domaine/email (`contact@TeamBlender.app`) avant modification.
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
- `mailto:contact@TeamBlender.app` -> `mailto:contact@teamblender.io`
- Texte visible `contact@TeamBlender.app` -> `contact@teamblender.io`

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
- Scan occurrences restantes de `TeamBlender.app|@TeamBlender` dans `app` et `components`.
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
- `/`: titre `TeamBlender`, aucun residu TeamBlender detecte
- `/contact`: TeamBlender visible, email `contact@teamblender.io`, aucun email legacy
- `/mentions-legales`: TeamBlender visible, email `contact@teamblender.io`, aucun email legacy
- `/politique-confidentialite`: TeamBlender visible, email `contact@teamblender.io`, aucun email legacy
- Conclusion: validation visuelle OK sur les routes critiques

## Step 8 - Harmonisation docs et smoke local (faible risque)
Action:
- README frontend: titre et phrase d'introduction `TeamBlender` -> `TeamBlender`.
- Script `scripts/smoke-participant.mjs`: domaine email local de test `@TeamBlender.local` -> `@teamblender.local`.

Verification:
- Syntaxe script: `node --check scripts/smoke-participant.mjs` OK
- Build frontend: `npm run build` OK
- Conclusion: micro-lot docs/smoke local valide sans regression detectee

## Step 9 - Micro-lot identifiants techniques (avec compatibilite explicite)
Plan de compatibilite:
- Changer uniquement les metadonnees techniques non fonctionnelles.
- Ne pas toucher aux noms de scripts npm (`dev`, `build`, `start`, `test:*`).
- Ne pas toucher aux variables d'environnement, routes, API, ou structure de dossier.
- Verification obligatoire apres chaque fichier modifie: controle de valeur + build complet.
- Rollback simple: revert du commit unique de ce micro-lot.

### Step 9.1 - package.json
Action:
- `name`: `TeamBlender-frontend-next` -> `teamblender-frontend-next`.

Verification:
- Check valeur: `node -e` sur `package.json` OK
- Build: `npm run build` OK

### Step 9.2 - package-lock.json
Action:
- Alignement des 2 occurrences `name` avec `teamblender-frontend-next`.

Verification:
- Check valeurs: `node -e` sur `package-lock.json` OK
- Build: `npm run build` OK

### Step 9.3 - .vercel/repo.json
Action:
- Metadonnee projet locale Vercel: `name` -> `teamblender-frontend-next`.

Verification:
- Check valeur: `node -e` sur `.vercel/repo.json` OK
- Build: `npm run build` OK
- Scan final `TeamBlender-frontend-next` hors build/deps: aucune occurrence

Conclusion Step 9:
- Migration technique des identifiants realisee sans impact mecanique detecte.
