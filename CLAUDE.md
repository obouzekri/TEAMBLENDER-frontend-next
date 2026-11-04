# TeamBlender — frontend Next.js

Frontend de la plateforme TeamBlender (landing, manager, Session Builder, live,
participant, admin). L'API est dans `obouzekri/TEAMBLENDER-backend`. Vision
produit, process et roadmap : `obouzekri/TEAMBLENDER-root` (dossier parent quand
le workspace est en place).

## Stack et commandes

- Next.js (App Router, `app/`), React, JavaScript avec `jsconfig.json`. Node 24 en CI (`.nvmrc` indique encore 20).
- Temps réel : `socket.io-client` (`lib/socket.js`). Appels API : `lib/api.js`.
- Challenges : `components/Challenges/`, runtime dans `lib/challenges/`.
- Textes : `lib/i18n/` — toute chaîne visible passe par `t()` (ou `translate(locale, key)` hors composant) et existe dans chaque dictionnaire (`lib/i18n/dictionaries/<langue>/<zone>.js`). Les langues sont déclarées une seule fois dans `LOCALE_META` (`lib/i18n/routing.js`) ; dates, nombres et devises via `lib/i18n/format.js` ; contenu rangé par langue lu avec `pickLocalized(map, locale)`. Interdit hors de `lib/i18n/` : `locale === 'en'`, `isEn`, `'fr-FR'` (`npm run lint:i18n` échoue). Les objets `{ fr, en }` restants sont plafonnés par `scripts/i18n-hardcoded-baseline.json` (resserrer avec `-- --update-baseline`).

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
