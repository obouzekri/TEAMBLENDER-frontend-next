# TeamBlender — frontend Next.js

Frontend de la plateforme TeamBlender (landing, manager, Session Builder, live,
participant, admin). L'API est dans `obouzekri/TEAMBLENDER-backend`. Vision
produit, process et roadmap : `obouzekri/TEAMBLENDER-root` (dossier parent quand
le workspace est en place).

## Stack et commandes

- Next.js (App Router, `app/`), React, JavaScript avec `jsconfig.json`. Node 24 en CI (`.nvmrc` indique encore 20).
- Temps réel : `socket.io-client` (`lib/socket.js`). Appels API : `lib/api.js`.
- Challenges : `components/Challenges/`, runtime dans `lib/challenges/`.
- Textes FR/EN : `lib/i18n/` — toute chaîne visible existe dans les deux langues.

```bash
npm run dev          # http://localhost:3100
npm run lint -- --max-warnings=0
npm run lint:i18n
npm run test:unit
npm run build:clean
```

Ce sont les étapes de la CI (`.github/workflows/ci.yml`) : les lancer avant de
pousser. Les scripts `test:ux:*` et `test:smoke:*` ciblent une zone précise
(Chrome requis) : lancer celui de la zone modifiée.

## Règles

- Branche `feature/…`, `fix/…` ou `chore/…`, puis PR vers `main`. Jamais de push direct sur `main`.
- Garder les parcours manager et participant fonctionnels en FR et EN, clair et sombre, mobile et desktop.
- Le `README.md` documente le comportement attendu de chaque zone : le mettre à
  jour quand un comportement change.
