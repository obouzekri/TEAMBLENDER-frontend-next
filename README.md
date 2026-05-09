# TEAMSPARK Frontend Next.js

Migration progressive en parallele du frontend vanilla. Le socle utilisateur est migre, avec landing publique et console admin Next V1.

## Portee migree

- Landing: /
- Login: /login
- Signup: /signup
- Contact: /contact
- Home manager (guard): /home
- Session Builder: /session-builder
- Session Live: /session-live/[sessionId]
- Session Results: /session-results/[sessionId]
- Participant: /participant
- Admin: /admin (V1)
- Legal: /mentions-legales, /politique-confidentialite

Le reste du produit continue de fonctionner sur le frontend legacy (port 3000).

## Configuration

Copier .env.example vers .env.local et ajuster si besoin:

- NEXT_PUBLIC_API_BASE=http://localhost:3000/api
- NEXT_PUBLIC_LEGACY_BASE=http://localhost:3000
- LEGACY_BASE_CANDIDATES=http://localhost:3001 (optionnel, liste separee par virgules)
- SMOKE_FRONTEND_URL=http://localhost:3100
- SMOKE_BACKEND_URL=http://localhost:3000

## Scripts

- npm run dev (port 3100)
- npm run build
- npm run start
- npm run test:smoke:manager
- npm run test:smoke:participant
- npm run test:smoke

## Notes

- Aucun fichier du frontend legacy n est modifie dans ce lot.
- Les redirections apres login pointent vers les routes Next.js selon le role.
- Le home manager Next utilise un guard (manager/admin) et couvre le pilotage des sessions.
- Le panel admin Next.js est disponible en V1 pour les operations principales.

## Runbook go-live (checklist actionnable)

### Roles

- Tech lead: decision Go / No-Go et rollback
- Dev frontend: deploiement Vercel + verification UI
- Dev backend: verification API/sockets + logs serveur
- Produit/QA: validation parcours metier manager/participant/admin

### Execution (ordre strict)

1. Verifier les variables de prod (frontend + backend).
2. Lancer localement: `npm run test:smoke` puis `npm run build`.
3. Tagger la version pre-deploiement (commit SHA conservee pour rollback).
4. Deployer frontend-next sur Vercel (branche `main`).
5. Configurer `NEXT_PUBLIC_API_BASE` vers l'API de production.
6. Verifier en production les parcours critiques:
   - manager: login -> home -> session-builder -> session-live -> results
   - participant: join -> challenge actif
   - admin: /admin (create/edit/delete)
7. Ouvrir les logs backend 30 min apres release (erreurs 5xx, latency, sockets).
8. Si stable: geler le legacy frontend pour nouvelles features (patch critique uniquement).

### Rollback (si No-Go)

1. Re-pointer Vercel sur le commit precedent stable.
2. Re-valider login manager + participant sur la version rollback.
3. Communiquer "rollback effectue" avec cause et action corrective.
4. Ouvrir correctif sur branche de hotfix avant nouvelle tentative.

## Go / No-Go (release)

Go si tous les points sont vrais:

- `npm run test:smoke` = PASS
- `npm run build` = PASS
- login manager + participant + admin = PASS
- create/edit/delete session depuis home/admin = PASS
- aucune erreur critique console/API sur parcours principal

No-Go immediat si un seul point est faux:

- erreur 5xx sur un endpoint critique (`/auth`, `/sessions`, `/challenges`, `/users`)
- regression sur session live ou challenge actif participant
- page blanche ou redirection inattendue apres login
- echec du rollback dry-run (incapacite a revenir au commit precedent)
