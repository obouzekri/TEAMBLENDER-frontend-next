# TeamBlender Frontend Next.js

Frontend cible du produit TeamBlender (migration depuis le legacy).

## Etat actuel

- `frontend-next/` porte les parcours utilisateur actifs: manager, admin, participant et les pages publiques principales.
- Le frontend legacy vanilla a ete retire du repository pour reduire la dette technique.
- Les changements en cours doivent rester alignes avec la navigation produit actuelle et les checks de go-live du projet.

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
- `BACKEND_ORIGIN` (obligatoire hors dev, cible rewrite Next.js vers backend actif)
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
