# Session Builder - Lot 3

## Aperçu

Le Session Builder permet aux managers de:
1. **Sélectionner** des challenges dans un catalogue
2. **Filtrer** par catégorie, objectif, durée
3. **Configurer** chaque challenge avec des paramètres spécifiques
4. **Réorganiser** l'ordre de présentation (move-up/move-down)
5. **Lancer** la session avec les challenges sélectionnés

## Architecture

### Composants

```
SessionBuilder (main container)
├── SessionBuilderHeader (titre + status + launch button)
├── SelectedChallengesList (sidebar gauche)
│   ├── Challenge items (with actions)
│   └── Clear all button
├── ChallengesCatalog (section droite)
│   ├── FilterBar (catégories, objectif, durée)
│   └── ChallengeGrid (cartes de challenges)
└── ChallengeConfigModal (overlay)
    └── Dynamic config form fields
```

### State Management

**useSessionBuilder hook** gère:
- `allChallenges` - catalogue complet chargé depuis API
- `selectedChallenges` - challenges sélectionnés avec leur config
- `filteredChallenges` - challenges filtrés selon critères
- `filters` - état des filtres actuels
- `configuring` - ID du challenge en cours de configuration

**Persistance**: selectedChallenges est sauvegardé dans localStorage avec clé `selectedChallenges`

### Data Model

```javascript
Challenge {
  id: string
  name: string
  category: 'escape-game' | 'logique-reflexion' | 'icebreaker'
  objective: 'cohesion' | 'communication' | 'collaboration' | 'leadership' | 'resolution-problemes'
  duration: number (minutes)
  type: string
  tags: string[]
  description: string
  config: object (challenge-specific settings)
}

SelectedChallenge extends Challenge {
  config: object (user-modified configuration)
}
```

## API Integration

### Fetch Challenges

```
GET /api/challenges
Authorization: Bearer <token>
```

**Réponse**:
```json
[
  {
    "id": "copuzzle_001",
    "name": "CoPuzzle Live",
    "category": "escape-game",
    "objective": "cohesion",
    "duration": 15,
    "description": "...",
    "config": {}
  }
]
```

### Launch Session (Lot 4 - futur)

POST /api/sessions
```json
{
  "selectedChallenges": [
    {
      "id": "copuzzle_001",
      "name": "CoPuzzle Live",
      "config": { "expectedCount": 4 }
    }
  ]
}
```

## Fallback Mock Data

En développement, si l'API échoue, les données mock dans `lib/mockChallenges.js` sont utilisées:
- 9 challenges d'exemple
- Couverture complète des catégories et objectifs
- Donne immédiatement quelque chose à tester

## Features Actuellement Implémentées

✅ Auth Guard (manager uniquement)
✅ Fetch du catalogue (avec retry + fallback mock)
✅ Filtrage par catégorie, objectif, durée
✅ Grille de challenges avec cartes
✅ Sélection / désélection de challenges
✅ Affichage des challenges sélectionnés (sidebar)
✅ Reordering (move-up / move-down)
✅ Configuration modale (stub)
✅ Toast notifications pour erreurs
✅ Loading skeletons pendant fetch
✅ Persistance localStorage

## Features À Compléter

- [ ] Configuration dynamique par type de challenge
- [ ] Formulaires complexes pour config (sliders, multi-select, etc.)
- [ ] Validation des configs avant lancement
- [ ] Workflow complet: select → configure → launch
- [ ] Redirection vers facilitator_launch après lancement
- [ ] Drag/drop reordering (alternative aux boutons)
- [ ] Export/sauvegarde de sessions configurées
- [ ] Historique des sessions précédentes

## Développement Local

### Démarrer

```bash
npm run dev
```

Puis aller à http://localhost:3100/session-builder

### Avec API backend

```bash
# Backend (autre terminal)
cd backend
npm start

# Frontend Next
npm run dev
```

### Sans API (avec mock data)

L'app fonctionne entièrement avec les données mock si l'API n'est pas disponible.

## Styling

- CSS Modules utilisés pour les composants
- Design system via `globals.css`
- Responsive: mobile, tablet, desktop
- Sticky sidebar sur desktop

## Tests Manuels

1. ✅ Charger la page → voir catalogue
2. ✅ Filtrer par catégorie
3. ✅ Sélectionner challenges → apparait dans sidebar
4. ✅ Réorganiser avec move-up/move-down
5. ✅ Ouvrir config modal
6. ✅ Rafraîchir → données persistent
7. ✅ Clear all → vide la sélection

## Notes d'Architecture

- SessionBuilder est un client component (use client) pour les hooks et localStorage
- Guard auth redirige non-managers vers legacy
- Retry logic depuis Lot 2 utilisé pour API
- Toast notifications pour feedback utilisateur
- Mock data permet dev sans backend
