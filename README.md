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

Copier .env.local.example vers .env.local et ajuster si besoin:

- NEXT_PUBLIC_API_BASE=http://localhost:3000/api
- NEXT_PUBLIC_LEGACY_BASE=http://localhost:3000
- LEGACY_BASE_CANDIDATES=http://localhost:3001 (optionnel, liste separee par virgules)

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
