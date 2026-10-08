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

### Securite du compte

La 2FA et la gestion des appareils connectes ne sont pas encore disponibles cote serveur. La page compte explique ces limites en FR/EN et desactive les actions correspondantes, sans confirmation de succes ni liste d'appareils fictive. Le changement de mot de passe reste disponible pour les managers, admins et participants.

Validation: `npm run test:ux:account` avec le frontend sur le port 3100 et Chrome disponible. Le test utilise des reponses API locales simulees, couvre les roles manager/admin/participant en FR/EN sur desktop/mobile et verifie ces limites apres rechargement.

### Quiz, preferences et resultats

- Le quiz ne selectionne aucune reponse par defaut. Les raccourcis 1-4 et Entree ne s'appliquent pas dans le chat, les champs de saisie, les boutons ni les dialogues. Une reponse doit etre explicitement choisie avant envoi.
- Les questions, corrections et classements proviennent uniquement du serveur. Un classement vide en cours de partie est en attente; un classement final vide indique qu'aucun score n'est enregistre; une donnee absente ou une erreur est signalee comme indisponible. Aucun score ni gagnant de demonstration n'est injecte.
- Navigation compacte et contraste renforce sont enregistres dans `localStorage` (`tb_display_preferences`), puis appliques sur toutes les pages dans ce navigateur. Ces reglages ne sont pas synchronises avec le compte ni avec d'autres appareils. Le contraste renforce augmente la lisibilite des textes secondaires utilisant les tokens de couleur partages; il ne remplace pas un audit d'accessibilite de chaque challenge. Theme et langue restent immediats. Les rappels et resumes configurables sont clairement desactives faute de support serveur.
- La page de resultats ne presente les donnees qu'apres chargement valide des quatre API (session, resultats, participation, indicateurs). Une erreur HTTP, reseau ou de format affiche une explication et une action Reessayer, et non une session vide.

Validation: `npm run test:unit:truthfulness`, `npm run test:ux:quiz` et `npm run test:ux:preferences-results`. Les suites UX necessitent le frontend sur le port 3100 et Chrome; elles simulent localement les API et Socket.IO, sans modifier de compte ou de session reelle. Elles couvrent FR/EN et desktop/mobile, le chat, les classements vides/absents/reels, la persistance, les echecs de stockage, la reduction effective de la hauteur de navigation, le contraste (minimum 4.5:1 sur le texte teste), les erreurs 503 et les tentatives de rechargement.

### Debriefs des challenges

- Les neuf challenges chronometres retirent le panneau Chrono et l'horloge de l'en-tete en debrief, sans modifier le minuteur ni ses commandes pendant le jeu.
- L'analyse occupe toute la largeur; les contenus secondaires utiles passent sous le bilan et les panneaux vides sont masques. Le temps total reste une donnee de resultat.
- Les titres du bilan et des enseignements sont renforces, les indicateurs agrandis et les emoticones decoratives du debrief retirees. Les scores et conclusions restent issus des donnees existantes.
- Validation: `npm run test:ux:debrief` avec le frontend sur le port 3100 et Chrome disponible. Les 72 transitions jeu/debrief simulees couvrent les neuf challenges, les roles facilitateur/participant, FR/EN et desktop/mobile en clair/sombre; elles verifient la disparition effective des horloges, la largeur du contenu, les titres, le contraste des indicateurs (minimum 4.5:1) et l'absence de debordement horizontal.

### Accessibilite et fiabilite partagees

- Les fenetres de regles, le chat, les dialogues de jeu et les modales partagees deplacent le focus a l'ouverture, le confinent et le restituent a la fermeture. Echap ferme seulement la fenetre au premier plan. Les regles restent accessibles sur mobile; les principales fermetures, commandes de chat et commandes de minuteur mesurent au moins 44 x 44 px.
- Les chiffres des minuteurs restent consultables sans annonce a chaque seconde. Une zone distincte annonce les changements de statut. Les libelles partages suivent la langue FR/EN.
- Une coupure Socket ne demonte plus le challenge ni ses brouillons. Les commandes temps reel concernees sont desactivees hors connexion. L'emetteur commun distingue un envoi effectue d'une commande non envoyee; cela ne constitue pas un accuse de reception serveur.
- Le chat confirme chaque message grace au `client_msg_id` renvoye par le serveur. La saisie reste presente et verrouillee pendant l'envoi, puis s'efface uniquement apres confirmation correspondante. Coupure, rejet ou absence de confirmation apres 10 secondes conservent le brouillon et affichent un echec explicite. Reessayer est manuel, apres reconnexion; aucune retransmission automatique ne risque de dupliquer les messages.
- Phrase mystere et CoPuzzle conservent aussi la selection pendant l'envoi et ne la retirent qu'apres confirmation dans l'etat serveur. Sans confirmation apres 10 secondes, une reprise manuelle est proposee uniquement si la phase et l'affectation permettent encore l'action. Verifiez le plateau avant de renvoyer une action dont l'issue reste incertaine.
- Le quiz distingue une reponse en attente de confirmation d'une reponse acceptee. Seul l'evenement serveur correspondant au participant, a la question et au choix confirme l'envoi. Un rejet, une coupure ou un delai sans confirmation conservent le choix et permettent une reprise tant que la meme question est ouverte; une nouvelle question annule l'attente precedente.
- Le constructeur et les challenges, y compris le live integre, affichent un guide repliable: participants prets, configuration valide, session prete, lancement, debrief et challenge suivant. Il expose les informations et blocages connus sans ajouter de nouvelles obligations serveur. Une affectation n'est pas une confirmation de disponibilite; une configuration chargee reste a verifier lors de l'enregistrement/lancement. Salle secrete utilise son etat REST pour ce guide.
- Les surfaces et textes partages utilisent les tokens du theme sans imposer une couleur a tous les titres des jeux. Le contraste du titre principal des resultats de Pari sur moi est verifie a 4.5:1 minimum en clair et sombre.

Validation: `npm run test:ux:shared`, `npm run test:ux:challenges`, `npm run test:ux:builder`, `npm run test:ux:mission`, `npm run test:ux:vom`, `npm run test:ux:labyrinthe` et `npm run test:ux:quiz`. Le frontend doit etre lance sur le port 3100 avec Chrome disponible. Les suites utilisent des API et Socket.IO simules localement; elles ne certifient pas une session multiutilisateur en production. La suite partagee couvre FR/EN, desktop/mobile, clair/sombre, focus, cibles tactiles, annonces de minuteur, correlation des messages, delai sans confirmation, coupure et reconnexion avec conservation des saisies.

### Labyrinthe des signaux

Les bombes occupent moins de place dans la grille. Le passage de niveau affiche une felicitation et une action Continuer, sans annoncer prematurement une victoire collective. Le tableau de bord facilitateur met les vies restantes en evidence et harmonise la casse des noms. Les messages contextuels (impasse, piege, retour interdit, sortie) restent affiches, sans message Bien joue a chaque deplacement.

Les cellules annoncent depart, sortie, position, visites et obstacles deja decouverts, sans reveler les pieges caches. Une legende repliable guide le choix du depart puis les deplacements. Aucune mecanique du backlog n'est ajoutee.

Validation: `npm run test:ux:labyrinthe` avec le frontend sur le port 3100 et Chrome disponible. Les reponses API et Socket.IO sont simulees localement.

### Pari sur moi

Le bareme est presente en lignes courtes avec icones; les points du poseur restent explicites. Le resultat met la reponse du joueur et la bonne reponse avant le score total, avec un etat hors delai distinct. Les cartes de resultat ont des badges contrasts en modes clair et sombre et les noms sont harmonises. L'interface suit la langue choisie (FR/EN).

Le nom de reference est Pari sur moi (Bet on me! en anglais). Un statut immediat indique son tour, le vote, l'attente ou la revelation collective; la reponse personnelle reste distincte du resultat collectif.

Validation: `npm run test:ux:vom` (frontend sur le port 3100, Chrome disponible), avec API et Socket.IO simules. Le test couvre les votes corrects, incorrects, hors delai, les choix multiples, les vues facilitateur et participant, ainsi que les modes clair/sombre et le contraste des badges (minimum 4.5:1).

### Mission Critique

Le tableau de bord facilitateur affiche les participants, les taches distinctes placees dans l'equipe, les soumissions et leurs erreurs. La progression individuelle mesure le placement des taches du catalogue, pas leur validation ni leur execution. Les erreurs restent non evaluees avant soumission. Chaque carte propose une timeline repliable. La fenetre d'affectation place la fermeture en haut a droite et signale la phase deja affectee par une coche, un contour et un etat accessible.

Les controles de deplacement/suppression et de fermeture mesurent 44 px; les libelles de taches reviennent a la ligne et suivent le theme. Les onglets acceptent fleches gauche/droite, Home et End. La fenetre d'affectation conserve le focus et le restitue a la fermeture; une seule selection de phase suffit.

Validation: `npm run test:ux:mission` (frontend sur le port 3100, Chrome disponible), avec API et Socket.IO simules, pour les vues facilitateur/participant, les mises a jour temps reel, les affectations de phase et les formats desktop/mobile en clair/sombre.

### Autres corrections du diagnostic des challenges

- Salle secrete: les echecs de synchronisation signalent explicitement que l'etat affiche peut etre obsolete, avec derniere mise a jour et Reessayer. Les reponses invalides sont des erreurs. Pause et reinitialisation restent indisponibles cote serveur et sont expliquees au facilitateur.
- Phrase mystere: libelles et instructions FR/EN; le budget d'indices vient de la configuration ou de l'etat serveur, y compris zero.
- CoPuzzle: a 390 px, la vue facilitateur empile plateau et panneau lateral sans chevauchement. Le retrait d'une piece utilise le bouton de cellule, sans bouton imbrique.
- Lab d'Innovation: soumissions incompletes desactivees et exigences visibles; choix de problematiques limite aux propositions retenues par le serveur. Les brouillons ne sont effaces qu'apres confirmation dans l'etat serveur; sans confirmation apres 15 secondes, ils restent disponibles avec un avertissement. La phase actuelle, les nombres de propositions/votes et la phase suivante sont explicites.
- Pixel Architect: sur mobile (640 px maximum), seule la couche active est visible, avec precedent/suivant et selection directe. La suppression d'une couche ou de toute la construction partagee demande confirmation. Sans WebGL, les apercus 3D ne provoquent pas d'erreur non geree et les grilles 2D restent utilisables.

Validation: `npm run test:ux:challenges` et `npm run test:ux:challenges:no-webgl`, plus `npm run test:ux:mission`, `npm run test:ux:labyrinthe`, `npm run test:ux:vom` et `npm run test:ux:quiz`. Frontend sur le port 3100 et Chrome requis; URL configurable avec `SMOKE_FRONTEND_URL`. Les deux nouvelles suites utilisent les constructeurs d'etat purs du dossier voisin `../backend` (sans demarrer le serveur backend) et couvrent FR/EN, desktop/mobile, des mesures de dimensions, les actions Socket.IO et les erreurs REST. Le test sans WebGL force son indisponibilite pour les participants et facilitateurs, et verifie le placement 2D. Toutes les API sont simulees localement: ces tests ne certifient pas une partie multiutilisateur avec le backend reel. Le contrat des noms par defaut et la conservation des titres personnalises sont verifies dans le backend avec `npm test -- --runInBand tests/challenge_engine_contract.test.js`. Aucun catalogue existant en base n'est reecrit par ces changements.

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
