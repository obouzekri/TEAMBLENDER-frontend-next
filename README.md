# TeamBlender Frontend Next.js

Frontend cible du produit TeamBlender (migration depuis le legacy).

## Etat actuel

- `frontend-next/` porte les parcours utilisateur actifs: manager, admin, participant et les pages publiques principales.
- Le frontend legacy vanilla a ete retire du repository pour reduire la dette technique.
- Les changements en cours doivent rester alignes avec la navigation produit actuelle et les checks de go-live du projet.

### Session Builder

- Le catalogue utilise des cartes de hauteur uniforme et des badges sans doublons.
- Une activite deja ajoutee affiche un statut non destructif; sa suppression reste disponible dans la selection.
- La poignee de la selection permet de reordonner a la souris, au tactile ou avec les fleches haut/bas du clavier. Les actions secondaires apparaissent au survol et au focus, et restent visibles sur ecran tactile.
- Les trois actions de copie partagent un style neutre et confirment la copie; un echec du presse-papiers affiche une notification.
- Validation: `npm run test:unit:builder` et `npm run test:ux:builder` (frontend lance sur le port 3100, Chrome disponible). Le test UX utilise des reponses API locales simulees, sans modifier de session reelle.

### Labyrinthe des signaux

Les bombes occupent moins de place dans la grille. Le passage de niveau affiche une felicitation et une action Continuer, sans annoncer prematurement une victoire collective. Le tableau de bord facilitateur met les vies restantes en evidence et harmonise la casse des noms. Les messages contextuels (impasse, piege, retour interdit, sortie) restent affiches, sans message Bien joue a chaque deplacement.

Validation: `npm run test:ux:labyrinthe` avec le frontend sur le port 3100 et Chrome disponible. Les reponses API et Socket.IO sont simulees localement.

### Pari sur moi

Le bareme est presente en lignes courtes avec icones; les points du poseur restent explicites. Le resultat met la reponse du joueur et la bonne reponse avant le score total, avec un etat hors delai distinct. Les cartes de resultat ont des badges contrasts en modes clair et sombre et les noms sont harmonises. L'interface suit la langue choisie (FR/EN).

Validation: `npm run test:ux:vom` (frontend sur le port 3100, Chrome disponible), avec API et Socket.IO simules. Le test couvre les votes corrects, incorrects, hors delai, les choix multiples, les vues facilitateur et participant, ainsi que les modes clair/sombre et le contraste des badges (minimum 4.5:1).

### Mission Critique

Le tableau de bord facilitateur affiche les participants, les taches distinctes placees dans l'equipe, les soumissions et leurs erreurs. La progression individuelle mesure le placement des taches du catalogue, pas leur validation ni leur execution. Les erreurs restent non evaluees avant soumission. Chaque carte propose une timeline repliable. La fenetre d'affectation place la fermeture en haut a droite et signale la phase deja affectee par une coche, un contour et un etat accessible.

Validation: `npm run test:ux:mission` (frontend sur le port 3100, Chrome disponible), avec API et Socket.IO simules, pour les vues facilitateur/participant, les mises a jour temps reel, les affectations de phase et les formats desktop/mobile en clair/sombre.

## Quick links

- Setup local: section `Setup local`
- Scripts smoke: section `Scripts`
- Workflow livraison: `../docs/process/FEATURE_TO_PROD_FLOW.md`
- Checklist release: `../docs/checklists/RELEASE_CHECKLIST_PRE_MAIN.md`
- README global: `../README.md`

## 1) Portee couverte

Routes principales migrees:
- `/`
- `/login`
- `/signup`
- `/contact`
- `/home`
- `/session-builder`
- `/session-live/[sessionId]`
- `/session-results/[sessionId]`
- `/participant`
- `/admin`
- `/mentions-legales`
- `/politique-confidentialite`

## 2) Setup local

```bash
cd frontend-next
npm install
cp .env.local.example .env.local
npm run dev
```

- URL locale: `http://localhost:3100`

Variables importantes:
- `NEXT_PUBLIC_API_BASE`
- `NEXT_PUBLIC_API_URL` (alias accepte, normalise vers la meme logique que `NEXT_PUBLIC_API_BASE`)
- `BACKEND_ORIGIN` (obligatoire hors dev, cible rewrite Next.js vers backend actif)
- `PREVIEW_BACKEND_ORIGIN` (optionnel, fallback Vercel preview vers Railway dev)
- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` (optionnel, active PostHog frontend)
- `NEXT_PUBLIC_POSTHOG_HOST` (optionnel, defaut `https://eu.i.posthog.com`, doit correspondre a la region du projet PostHog)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (optionnel, active Google Analytics 4 pageview)
- `NEXT_PUBLIC_GTM_ID` (optionnel, injecte Google Tag Manager sur toutes les pages)
- `NEXT_PUBLIC_ENABLE_CHALLENGES_MOCK_DATA` (optionnel, `true` pour activer le fallback mock du catalogue challenges en dev)
- `NEXT_PUBLIC_LANDING_CMS_STRICT` (optionnel, `true` pour activer l'audit runtime de couverture CMS sur la home)
- `SMOKE_FRONTEND_URL`
- `SMOKE_BACKEND_URL`

## 3) Scripts

```bash
npm run dev
npm run build
npm run start
npm run test:smoke
npm run test:smoke:manager
npm run test:smoke:participant
npm run test:smoke:session-builder
npm run test:smoke:login
npm run test:smoke:preview
```

## 4) Runbook go-live (resume)

1. Verifier variables de production (frontend + backend).
2. Lancer localement `npm run test:smoke` puis `npm run build`.
3. Deployer sur Vercel (`main`).
4. Pointer `NEXT_PUBLIC_API_BASE` vers l'API de production.
5. Verifier parcours manager, participant, admin.
6. Surveiller les logs backend apres release.

## 5) No-Go immediate (exemples)

- erreur 5xx sur endpoints critiques,
- regression session live / challenge actif,
- redirection inattendue apres login,
- rollback impossible vers le commit precedent stable.

## 6) Liens utiles

- README global: `../README.md`
- Index docs: `../docs/README.md`
- Backend API: `../backend/README.md`
- Workflow livraison: `../docs/process/FEATURE_TO_PROD_FLOW.md`
- Checklist release: `../docs/checklists/RELEASE_CHECKLIST_PRE_MAIN.md`
