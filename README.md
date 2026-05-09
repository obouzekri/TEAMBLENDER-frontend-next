# TEAMSPARK Frontend Next.js (Lot 1 + Lot 2 + Lot 3)

Migration progressive en parallele du frontend vanilla. Phase 3 en cours: Session Builder.

## Portee migree

- Landing: /
- Login: /login
- Signup: /signup
- Contact: /contact
- Home manager (guard): /home
- Session Builder: /session-builder (Lot 3 - EN COURS)

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

## Notes

- Aucun fichier du frontend legacy n est modifie dans ce lot.
- Les redirections apres login pointent vers les ecrans legacy pour eviter toute regression.
- Le home manager Next utilise un guard (manager uniquement) et conserve les actions live vers le legacy.
- Le lancement de session tente automatiquement plusieurs routes/bases legacy avant fallback.
