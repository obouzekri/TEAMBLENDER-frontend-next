# TeamBlender Frontend Next.js

Frontend cible du produit TeamBlender (migration depuis le legacy).

## Etat actuel

- `frontend-next/` porte les parcours utilisateur actifs: manager, admin, participant et les pages publiques principales.
- Le frontend legacy vanilla a ete retire du repository pour reduire la dette technique.
- Les changements en cours doivent rester alignes avec la navigation produit actuelle et les checks de go-live du projet.

### Filtres des sessions de l'accueil animateur

- L'accueil privilegie le message de bienvenue, puis les chiffres des KPI, les sessions et les participants. Le theme clair utilise un fond blanc pur, des cartes blanches a bordure fine et ombre discrete, et des sections sans cadre externe. Le theme sombre reste disponible.
- La vue rapide est secondaire et compacte. Les titres Sessions et Participants retrouvent l'accent colore du produit, sans grands fonds colores.
- Les filtres n'ont pas de cadre externe: recherche et statut restent visibles; la commande Periode affiche les deux dates a la demande et conserve leur valeur lorsqu'elle est repliee. Reinitialiser apparait seulement si un filtre est actif.
- La pagination est masquee pour zero ou une page; au-dela, elle reste compacte et alignee a droite. Les listes utilisent le defilement de la page plutot que des zones imbriquees.
- Les champs de recherche, statut et dates conservent une marge interieure horizontale de 16 px et un espacement de 16 px entre eux, sans deborder de leur cadre sur mobile.
- Validation: `node scripts/test-home-session-filters.mjs` (frontend sur 3100, Chrome disponible, API simulees): FR/EN, largeurs de 320 a 1755 px, ouverture au clavier de la periode, saisie, conservation et reinitialisation des filtres, pagination conditionnelle et navigation.

### Page Contact

- Une carte unique reunit les coordonnees, le delai de reponse et le formulaire, sans cartes imbriquees ni colonne vide. L'introduction est raccourcie.
- Nom et email sont presentes ensemble, puis entreprise et effectif facultatifs. Le besoin et le message gardent toute la largeur. Les champs passent sur une colonne sur mobile.
- Les libelles obligatoires, l'autocompletion, le lien email et la politique de confidentialite restent accessibles au clavier. L'envoi conserve la protection CSRF, le champ anti-spam, les etats d'attente, les erreurs avec conservation du brouillon et la confirmation.
- Validation : `node scripts/test-contact-ux.mjs` (frontend sur 3100, Chrome disponible, API simulees sans envoi d'email) : FR/EN, clair/sombre/automatique, 320 a 1440 px, hauteur compacte, clavier, validation, champs facultatifs, requete et CSRF, attente, erreurs 429/500/reseau, nouvelle tentative et succes.

### Creation rapide d'une session

- Une carte unique de 1040 px maximum regroupe les informations, les objectifs multiples, le mode de progression et les participants facultatifs. Seul le nom est obligatoire.
- L'ajout anticipe de participants est replie par defaut; le compteur et la selection restent synchronises apres fermeture. Le code d'invitation est disponible apres creation.
- Le titre garde une marge sous la navigation. Les mentions du mode de progression et du caractere facultatif des participants sont entre parentheses pres de leur titre, en FR/EN et dans tous les themes.
- Annuler revient a l'accueil et reste visible sous forme de bouton secondaire. Creer la session ouvre le choix des challenges; une mention sous le bouton l'annonce avant validation. Sur mobile, les deux actions prennent toute la largeur. Les erreurs conservent les valeurs saisies.
- Validation: `node scripts/test-session-creation-layout.mjs` (frontend sur 3100, Chrome disponible, API simulees): FR/EN, clair/sombre/automatique, 320 a 1440 px, dimensions et absence de cadres imbriques, creation avec et sans participants, objectifs multiples, modes manuel/automatique et erreur serveur.
- Non-regression: `npm run test:unit:builder`, `npm run test:ux:builder` et `npm run test:ux:planning`.

### Choix des challenges dans le Session Builder

- Un repère de progression visible précède le choix des challenges : « Composer », « Configurer », puis « Lancer ». L’étape courante suit la sélection, et le lancement passe à l’état prêt quand au moins un challenge est choisi.
- Le repère reste distinct des informations de session, se réorganise en colonne sur mobile et est disponible en FR/EN.
- Apres la creation, la section « Choix des challenges » regroupe deux cartes de meme importance : « Selection manuelle » ouvre le catalogue et « Programme guide » ouvre la proposition selon les objectifs, l'effectif et la duree souhaitee.
- Ce choix n'ajoute aucune etape a la creation de session. Le catalogue reste accessible, et une proposition appliquee peut toujours etre configuree, retiree ou reordonnee avant le lancement.
- Les cartes sont cote a cote sur grand ecran et empilees sur mobile, avec navigation clavier et libelles FR/EN.
- Validation : `npm run test:ux:planning` (progression FR/EN, états et responsive) et `npm run test:ux:builder` (frontend sur 3100, Chrome disponible, API simulees).

### Gestion des participants par le manager

- Après la création, le formulaire se ferme et une fenêtre de confirmation affiche l’identifiant et l’adresse e-mail du participant.
- Les fenêtres de création et de modification alignent le titre et le sous-titre, avec des marges intérieures de 20 à 32 px et au moins 16 px autour des libellés du formulaire, sans débordement dès 320 px de largeur.
- Dans « Modifier le participant », « Renvoyer le lien de réinitialisation » envoie un nouveau lien à l’adresse enregistrée. Enregistrer d’abord les modifications d’adresse ; le manager ne choisit ni ne voit le mot de passe.
- La réinitialisation distingue le titre, l’adresse de destination et le rappel d’enregistrement. Les boutons Annuler et Enregistrer restent sans bloc de fond ni bordure de séparation, alignés et de même hauteur (empilés sur mobile).
- Le renvoi affiche une confirmation après acceptation de l’envoi par le service e-mail ; les erreurs restent visibles dans le formulaire. Les boutons sont désactivés pendant l’envoi.
- Validation : `node scripts/test-manager-participant-form.mjs` (frontend sur 3100, Chrome disponible, API simulées ; FR/EN, mobile/desktop, erreur puis renvoi, modification et création).

### Salle Secrete en live

- Les commandes indice, passage et pause/reprise restent visibles sur mobile et desktop, avec icones, focus clavier et desactivation pendant une action. Un indice deja debloque ne peut pas etre demande une seconde fois.
- Les fins par reussite (`escaped`), timeout ou echec affichent un titre compact, une issue lisible, des dates localisees et un debrief en equipe. La progression distingue explicitement les enigmes franchies des seules enigmes resolues.
- Validation: `node scripts/test-challenge-diagnostics-ux.mjs --escape-only` (API simulees, FR/EN, mobile/desktop, pause/reprise, indice, passage et debrief).

### Sessions des participants

- Les sessions assignees reprennent les styles partages des cartes de l'accueil: fond, bordure, ombre, titre, badges de statut et pied de carte, en clair comme en sombre.
- Le titre « Sessions assignees » utilise le meme accent degrade que Sessions et Participants sur l'accueil. Les cartes ont un repere colore par statut et un espacement resserre; Rejoindre garde une hauteur compacte de 44 px et reste accessible au clavier et sur mobile.
- Le titre de la session live reprend le meme accent degrade que les titres Sessions et Participants de l'accueil, y compris avec le theme automatique. Validation: `node scripts/test-session-title-theme.mjs` (frontend sur 3100, Chrome disponible, API simulees; desktop/mobile et preferences clair/sombre/automatique).
- Seules les sessions en cours proposent Rejoindre; l'attente du lancement et le rafraichissement automatique restent inchanges.
- Toute nouvelle connexion participant (mot de passe, OAuth, code ou reprise d'acces) ouvre d'abord l'accueil, meme si la session est deja lancee. Le participant doit cliquer sur Rejoindre dans sa carte de session pour entrer dans le live.
- Les sessions assignees restent accessibles dans la salle d'attente. Apres le clic sur Rejoindre (carte ou code), le challenge actif s'ouvre directement, sans afficher une salle d'attente intermediaire. Sans challenge actif, la salle d'attente reste disponible et ouvre automatiquement le challenge au lancement par l'animateur. Les changements de session et l'historique du navigateur resynchronisent la salle d'attente. Une erreur de connexion reste visible et permet de reessayer sans quitter l'accueil.
- L'accueil participant ne charge plus la liste nominative de tous les inscrits sous un faux bloc « Equipe ». Les equipes et interactions propres aux challenges ne changent pas.
- Les erreurs de chargement des sessions sont affichees sans masquer les cartes deja chargees; le rafraichissement retente automatiquement. Un acces de reprise reste limite a sa session et ne propose pas l'ajout d'une autre session.
- Validation de non-regression: `node scripts/test-participant-navigation.mjs` (frontend sur 3100, Chrome disponible, API simulees): FR/EN, mobile/desktop, navigation, reprise, lancement, erreurs et ajout par code.
- Validation: `node scripts/test-participant-session-cards.mjs` et `node scripts/smoke-participant.mjs --assigned-sessions-refresh` (frontend sur le port 3100, Chrome disponible). Les API sont simulees localement, sans modifier de session reelle.

- Reprise participant:
  - Un nouvel invite revient via le formulaire habituel avec le meme code, prenom et nom, y compris apres deconnexion ou sur un autre navigateur. Il retrouve sa participation et ses resultats, passe d'abord par l'accueil, puis clique sur Rejoindre. Les homonymes doivent utiliser des noms distinctifs; ce mode accepte le risque d'usurpation par une personne connaissant le code et le nom.
  - La page de connexion n'affiche plus de bloc « Reprendre ma participation », et aucune fenetre de conservation d'acces ne s'ouvre automatiquement. Les liens personnels restent disponibles en action secondaire et la page de secours `/resume` est conservee.
  - Le participant peut generer un lien personnel de reprise depuis la navigation (`Conserver mon acces`) pour changer d appareil sans recreer de participation.
  - Une deconnexion volontaire invalide l acces memorise du navigateur courant.
  - Les secrets memorises sont valables 30 jours au maximum. Les liens personnels sont a usage unique; leur utilisation conserve l identifiant participant, l equipe et les resultats enregistres. Les anciens comptes ne sont ni convertis ni supprimes automatiquement.
  - Le bouton `Conserver mon acces` et son QR code fonctionnent sur desktop et mobile. Le QR code est genere dans le navigateur, sans service externe.
  - L animateur retrouve `Retablir l acces` dans `Infos de session` > `Gerer les participants`, verifie l identite, puis genere un lien personnel valable 10 minutes.
  - La page `/resume` retire le secret du fragment URL et n initialise pas les outils analytiques. Ouvrir le lien ne le consomme pas: une confirmation est requise.
  - Un acces de reprise est limite a la session; les actions de compte et l ajout d autres sessions necessitent une connexion au compte participant.
  - Validation: `node scripts/test-participant-recovery.mjs` et `node scripts/test-participant-recovery-ux.mjs` (frontend sur 3100 et Chrome disponible). La suite UX couvre FR/EN, desktop/mobile, retour par code apres deconnexion, absence de bloc et de popup de reprise, QR code a la demande, secours animateur, lien invalide, absence de collecte analytique sur la page de reprise et deconnexion sans stockage local. Les API sont simulees; aucun participant reel n est modifie.

### Disposition des sessions en direct

- Les vues animateur et challenge participant sont centrees et limitees a 1360 px. Le zoom du navigateur reste libre; une grande fenetre ou un dezoom laisse davantage d'espace autour du contenu.
- L'en-tete de session et la grille CoPuzzle restent ancres en haut, sans repartir la hauteur libre dans les panneaux. Sur mobile, les controles et le jeu se reorganisent avec defilement vertical.
- Validation: `npm run test:ux:session-layout` (frontend sur le port 3100, Chrome disponible). La suite applique les feuilles de style source a l'interface, meme si le serveur local utilise un build anterieur; les API et le temps reel sont simules localement. Elle couvre les deux roles, FR/EN, clair/sombre et des fenetres CSS de 320 a 2560 px de large et de 900 a 1800 px de haut pour reproduire l'espace disponible au dezoom.

### Session Builder

- Le catalogue utilise des cartes de hauteur uniforme et des badges sans doublons.
- Une activite deja ajoutee affiche un statut non destructif; sa suppression reste disponible dans la selection.
- Les objectifs de session acceptent une multiselection. Les suggestions de programme retiennent les challenges correspondant a au moins un objectif choisi, sans bloquer la selection manuelle.
- La poignee de la selection permet de reordonner a la souris, au tactile ou avec les fleches haut/bas du clavier. Les actions secondaires apparaissent au survol et au focus, et restent visibles sur ecran tactile.
- Les trois actions de copie partagent un style neutre et confirment la copie; un echec du presse-papiers affiche une notification.
- La carte de session conserve trois partages distincts : message d'invitation complet (lien et code), lien seul et code seul. Le lien revient a la ligne sur mobile et le code reste selectionnable.
- Les icones d'information et de sauvegarde ont des infobulles au survol et au clavier (Echap pour masquer). Une sauvegarde reussie confirme explicitement l'enregistrement via les notifications existantes.
- Le lancement reste conditionne a la presence d'au moins une activite, sans minimum d'inscrits ajoute. Une explication visible accompagne l'etat desactive; le bouton actif conserve sa forme et son degrade avec un contraste renforce.
- Validation: `npm run test:unit:builder` et `npm run test:ux:builder` (frontend lance sur le port 3100, Chrome disponible). Le test UX utilise des reponses API locales simulees, sans modifier de session reelle.

### Mots croises Live

- Un refus de lancement affiche un seul bandeau, sans alerte rouge en doublon. Il faut au moins 2 personnes connectees pour lancer; la limite de 5 participants assignes reste inchangee.
- Avant le lancement, les regles occupent toute la largeur disponible sur desktop et mobile, avec le bouton de demarrage du facilitateur a la place de l'arene. Les participants voient les regles et attendent le lancement confirme par le serveur.
- Apres le lancement, la grille occupe environ 70 % de l'espace de jeu et les definitions 30 % sur desktop. Le compteur « 0/15 mots trouves » remplace la barre de progression et les pourcentages. Les regles restent consultables depuis l'en-tete.
- Un seul chrono compact, sans anneau decoratif ni doublon dans l'en-tete, occupe une colonne fixe a droite sur desktop et passe en haut a droite sur mobile. Le bouton Terminer la partie reste sous le chrono pour le facilitateur; la reprise en pause est conservee. Le bilan final retire le chrono et utilise toute la largeur.
- La grille utilise des cases adaptatives de 44 a 64 px et davantage de hauteur; les grandes grilles restent defilables sans debordement de la page.
- Aucun nombre minimum ou maximum de participants ne bloque Crossword Live, y compris en solo, sans participant connecte ou au-dela de cinq participants. Les anciennes limites du catalogue ne filtrent plus les programmes proposes.
- Validation: `npm run test:ux:crossword` (Chrome disponible, sans serveur). La suite couvre le parcours regles/lancement/arene, les deux roles, FR/EN, les dispositions desktop/mobile et les interactions temps reel simulees.

### Securite du compte

- Les managers et admins disposent de quatre onglets distincts: Profil, Securite, Formules et Factures. Les participants conservent uniquement Securite.
- Tous les onglets partagent une zone de meme largeur et de meme hauteur (`clamp(34rem, 70dvh, 48rem)`). Le contenu long defile a l'interieur sans deplacer les onglets ou le pied de page; la gouttiere de defilement reste reservee.
- La barre reste sur une ligne et defile horizontalement sur les petits ecrans. Navigation au clavier: fleches gauche/droite, Home et End. L'URL `?tab=profile|security|pricing|invoices`, les liens directs et precedent/suivant du navigateur restent synchronises sans rechargement. Les brouillons et choix de formule sont conserves entre les onglets.
- Les factures utilisent l'historique et le telechargement existants, desormais dans leur propre onglet, avec un etat vide explicite. Aucun nouveau service de facturation n'est ajoute.
- Validation: `npm run test:ux:account` (frontend sur 3100, Chrome disponible, API simulees): geometrie stable a 1 px pres, absence de debordement de 320 a 1440 px, FR/EN, clair/sombre/automatique, liens directs et historique, clavier, conservation des valeurs, enregistrement du profil, selection d'une formule et telechargement.

La 2FA et la gestion des appareils connectes ne sont pas encore disponibles cote serveur. La page compte explique ces limites en FR/EN et desactive les actions correspondantes, sans confirmation de succes ni liste d'appareils fictive. Le changement de mot de passe reste disponible pour les managers, admins et participants.

Validation: `npm run test:ux:account` avec le frontend sur le port 3100 et Chrome disponible. Le test utilise des reponses API locales simulees, couvre les roles manager/admin/participant en FR/EN sur desktop/mobile et verifie ces limites apres rechargement.

### Quiz, preferences et resultats

- La vue facilitateur du quiz presente les propositions en lecture seule, sans selection ni confirmation d'envoi. Un bandeau informatif FR/EN explique que seuls les participants repondent, avec un contraste teste a 4.5:1 minimum dans les deux themes. Les controles et confirmations des participants restent inchanges.

- Le quiz ne selectionne aucune reponse par defaut. Les raccourcis 1-4 et Entree ne s'appliquent pas dans le chat, les champs de saisie, les boutons ni les dialogues. Une reponse doit etre explicitement choisie avant envoi.
- Les questions, corrections et classements proviennent uniquement du serveur. Un classement vide en cours de partie est en attente; un classement final vide indique qu'aucun score n'est enregistre; une donnee absente ou une erreur est signalee comme indisponible. Aucun score ni gagnant de demonstration n'est injecte.
- Navigation compacte et contraste renforce sont enregistres dans `localStorage` (`tb_display_preferences`), puis appliques sur toutes les pages dans ce navigateur. Ces reglages ne sont pas synchronises avec le compte ni avec d'autres appareils. Le contraste renforce augmente la lisibilite des textes secondaires utilisant les tokens de couleur partages; il ne remplace pas un audit d'accessibilite de chaque challenge. Theme et langue restent immediats. Les rappels et resumes configurables sont clairement desactives faute de support serveur.
- La page Preferences conserve 36 px entre la navigation et la premiere carte, sur mobile et desktop, y compris en navigation compacte. La largeur des cartes et les espacements entre sections restent inchanges; `npm run test:ux:preferences-results` verifie ces dimensions.
- Chaque section Preferences affiche un seul titre accessible. Le choix de langue tient sur une ligne, y compris sur mobile, et le bloc de personnalisation sans reglage a ete retire. Les rappels avant les sessions planifiees restent indisponibles: aucun abonnement utilisateur ni envoi planifie correspondant n'est implemente. Le rappel serveur des sessions creees mais jamais lancees (J+3) est un mecanisme distinct.
- La page de resultats ne presente les donnees qu'apres chargement valide des quatre API (session, resultats, participation, indicateurs). Une erreur HTTP, reseau ou de format affiche une explication et une action Reessayer, et non une session vide.

Validation: `npm run test:unit:truthfulness`, `npm run test:ux:quiz` et `npm run test:ux:preferences-results`. Les suites UX necessitent le frontend sur le port 3100 et Chrome; elles simulent localement les API et Socket.IO, sans modifier de compte ou de session reelle. Elles couvrent FR/EN et desktop/mobile, le chat, les classements vides/absents/reels, la persistance, les echecs de stockage, la reduction effective de la hauteur de navigation, le contraste (minimum 4.5:1 sur le texte teste), les erreurs 503 et les tentatives de rechargement.

### Debriefs des challenges

- Les neuf challenges chronometres retirent le panneau Chrono et l'horloge de l'en-tete en debrief, sans modifier le minuteur ni ses commandes pendant le jeu.
- L'analyse occupe toute la largeur; les contenus secondaires utiles passent sous le bilan et les panneaux vides sont masques. Le temps total reste une donnee de resultat.
- Les titres du bilan et des enseignements sont renforces, les indicateurs agrandis et les emoticones decoratives du debrief retirees. Les scores et conclusions restent issus des donnees existantes.
- Validation: `npm run test:ux:debrief` avec le frontend sur le port 3100 et Chrome disponible. Les 72 transitions jeu/debrief simulees couvrent les neuf challenges, les roles facilitateur/participant, FR/EN et desktop/mobile en clair/sombre; elles verifient la disparition effective des horloges, la largeur du contenu, les titres, le contraste des indicateurs (minimum 4.5:1) et l'absence de debordement horizontal.

### Accessibilite et fiabilite partagees

- Le guide de preparation reste dans le Session Builder, mais n'apparait plus dans la vue facilitateur des challenges.
- En mode sombre (explicite ou systeme), les panneaux de jeu des dix challenges et les cartes partagees de regles, chat et chrono reprennent le degrade bleu-vert de Timeline/Backlog de Mission critique. Le centre du chrono utilise aussi ce fond; les couleurs de progression et d'alerte restent inchangees. Le theme clair conserve ses fonds existants.
- Validation des fonds: `npm run test:ux:challenge-theme` (Chrome disponible, sans serveur). La suite charge les CSS reels des dix challenges et des panneaux partages sur desktop/mobile, compare les fonds calcules en sombre explicite/systeme et verifie le retour au clair.

- Les fenetres de regles, le chat, les dialogues de jeu et les modales partagees deplacent le focus a l'ouverture, le confinent et le restituent a la fermeture. Echap ferme seulement la fenetre au premier plan. Les regles restent accessibles sur mobile; les principales fermetures, commandes de chat et commandes de minuteur mesurent au moins 44 x 44 px.
- Les chiffres des minuteurs restent consultables sans annonce a chaque seconde. Une zone distincte annonce les changements de statut. Les libelles partages suivent la langue FR/EN.
- Une coupure Socket ne demonte plus le challenge ni ses brouillons. Les commandes temps reel concernees sont desactivees hors connexion. L'emetteur commun distingue un envoi effectue d'une commande non envoyee; cela ne constitue pas un accuse de reception serveur.
- Le chat confirme chaque message grace au `client_msg_id` renvoye par le serveur. La saisie reste presente et verrouillee pendant l'envoi, puis s'efface uniquement apres confirmation correspondante. Coupure, rejet ou absence de confirmation apres 10 secondes conservent le brouillon et affichent un echec explicite. Reessayer est manuel, apres reconnexion; aucune retransmission automatique ne risque de dupliquer les messages.
- Phrase mystere et CoPuzzle conservent aussi la selection pendant l'envoi et ne la retirent qu'apres confirmation dans l'etat serveur. Sans confirmation apres 10 secondes, une reprise manuelle est proposee uniquement si la phase et l'affectation permettent encore l'action. Verifiez le plateau avant de renvoyer une action dont l'issue reste incertaine.
- Le quiz distingue une reponse en attente de confirmation d'une reponse acceptee. Seul l'evenement serveur correspondant au participant, a la question et au choix confirme l'envoi. Un rejet, une coupure ou un delai sans confirmation conservent le choix et permettent une reprise tant que la meme question est ouverte; une nouvelle question annule l'attente precedente.
- Le constructeur et les challenges, y compris le live integre, proposent un apercu repliable en trois phases (preparer, animer, conclure). Il distingue les faits connus des informations non suivies (par exemple, une affectation ne confirme pas la disponibilite individuelle) et renvoie aux conditions propres a chaque challenge. Cet apercu n'ajoute aucune obligation de lancement.
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
- Pixel Architect: en replication, seules les couches du modele ou contenant deja des cubes sont affichees (Tour Signal: 1 a 4; Pont croise: 1 a 5). Le mode creatif conserve toutes les couches. Le selecteur de couche active et son badge de progression comptent les couches affichees, en clair comme en sombre. Sur mobile (640 px maximum), seule la couche active est visible, avec precedent/suivant et selection directe. La suppression d'une couche ou de toute la construction partagee demande confirmation. Sans WebGL, les apercus 3D ne provoquent pas d'erreur non geree et les grilles 2D restent utilisables. Validation: `node scripts/test-pixel-cross-bridge-ux.mjs` (frontend sur le port 3100, Chrome disponible).

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

## 7) SEO et moteurs IA

- Les metadonnees SEO publiques sont centralisees dans `lib/seo.js` (titres, descriptions, canonical et hreflang FR/EN).
- Les pages publiques indexables exposees dans le sitemap sont:
  - `/fr/`, `/en/`
  - `/fr/pricing`, `/en/pricing`
  - `/fr/contact`, `/en/contact`
  - `/fr/team-building`, `/en/team-building`
- Les espaces prives (manager, participant, admin, session live, resume, etc.) sont non indexables via metadonnees et robots.
- En environnement preview Vercel, l'indexation est desactivee (`robots.txt` global + sitemap vide).
- Un endpoint `llms.txt` est expose (`/llms.txt`) pour aider les outils IA a decouvrir les pages publiques et leur contexte.
- Des donnees structurees JSON-LD sont servies:
  - globales (`Organization`, `WebSite`) dans le layout;
  - specifiques FAQ/guide sur la page `/team-building`.
