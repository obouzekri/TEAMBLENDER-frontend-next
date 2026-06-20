const fr = {
  nav: {
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    mainAria: 'Navigation principale',
    accountAria: 'Acces compte',
    product: 'Produit',
    pricing: 'Tarifs',
    contact: 'Contact',
    login: 'Connexion',
    signup: 'Creer un compte',
    myAccount: 'Mon compte',
    avatarAlt: 'Avatar de {name}'
  },
  footer: {
    brandCopy: 'Activez des sessions d equipe claires et mesurables.',
    columnsAria: 'Liens footer',
    product: 'Produit',
    resources: 'Ressources',
    legal: 'Legal',
    contact: 'Contact',
    home: 'Accueil',
    signup: 'Creer un compte',
    pricing: 'Tarification',
    offers: 'Offres',
    askDemo: 'Demander une demo',
    clientArea: 'Espace client',
    legalNotice: 'Mentions legales',
    privacy: 'Politique de confidentialite',
    talkToExpert: 'Parler a un expert'
  },
  language: {
    switcherAria: 'Choix de langue',
    fr: 'FR',
    en: 'EN'
  },
  appNav: {
    participant: 'Participant',
    manager: 'Manager',
    admin: 'Admin',
    participantSpace: 'Espace participant',
    managerSpace: 'Espace manager',
    adminSpace: 'Espace admin',
    liveSession: 'Session live',
    backToSessions: 'Retour a mes sessions',
    backToDashboard: 'Retour au tableau de bord',
    mySessions: 'Mes sessions',
    sessions: 'Sessions',
    participants: 'Participants',
    account: 'Compte',
    backToAdmin: 'Retour admin',
    userMenu: 'Menu utilisateur',
    userMenuOf: 'Menu de {name}',
    avatarOf: 'Avatar de {name}',
    settings: 'Parametres',
    closeSettings: 'Fermer les parametres',
    logout: 'Deconnexion'
  },
  vom: {
    title: 'Pari sur moi !',
    subtitle: 'Devinez le vrai du faux et decouvrez votre equipe autrement',
    selectingTitle: 'Selection d affirmation',
    currentPoser: 'Poseur actuel: {name}',
    selectingInstruction: 'Cliquez sur une question pour ouvrir la reponse rapide.',
    poserLabel: '(poseur)',
    selectedOption: 'Option choisie: {option}',
    selected: 'Selectionnee',
    alreadyUsed: 'Deja utilisee par vous',
    poserHelper: 'Le poseur choisit une affirmation dans le catalogue.',
    votingTitle: 'Votes ouverts',
    poserAsks: '{name} pose :',
    voteTrue: '✔️ Vrai',
    voteFalse: '❌ Mensonge',
    currentVote: 'Votre vote actuel: {vote}',
    absent: 'absent',
    facilitatorObserve: 'Le facilitateur observe le tour sans voter.',
    poserNoVote: 'Vous etes poseur, vous ne votez pas.',
    roundResultTitle: 'Resultat du tour',
    instantFeedback: 'Feedback instantane',
    correctFeedback: '✅ Bonne reponse ! Le poseur a repondu : {truth} +1 point',
    incorrectFeedback: '❌ Vous vous etes trompe. Le poseur a repondu : {truth} 0 point gagne',
    poserFeedback: 'Vous etiez poseur: +{points} point(s) (joueurs trompes)',
    myScore: 'Mon score',
    points: 'points',
    transitionText: 'Classement en transition ({clock}) avant le prochain tour.',
    timeoutFeedback: 'Temps ecoule',
    ranking: 'Classement',
    transitionTitle: 'Transition',
    transitionBody: 'Preparation du tour suivant...',
    pausedTitle: 'Pause temporaire',
    pausedBody: 'Le poseur est deconnecte. La partie reprend automatiquement a sa reconnexion.',
    finalDebrief: 'Debrief final',
    rankedParticipants: 'participants classes',
    playedCycles: 'cycles joues',
    bestScore: 'meilleur score',
    finalScore: 'Votre score final',
    finalRanking: 'Classement final',
    noParticipants: 'Aucun participant detecte.',
    yourQuestion: 'Votre question',
    chooseTruth: 'Choisissez explicitement la verite de votre affirmation.',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    badges: {
      good: '🟢 Bonne reponse',
      bad: '🔴 Mauvaise reponse',
      top: '🏆 Top joueur',
      streak: '🔥 Serie de bonnes reponses x{count}'
    }
  },
  chatCard: {
    title: 'Chat',
    empty: 'Aucun message pour le moment.',
    placeholder: 'Ecrire un message',
    expandAria: 'Afficher le chat',
    collapseAria: 'Reduire le chat',
    expandTitle: 'Afficher',
    collapseTitle: 'Reduire',
    sendAria: 'Envoyer',
    systemAuthor: 'system',
    counter: '{count}/{max} caracteres'
  },
  checkout: {
    loadPlansError: 'Impossible de charger les formules disponibles.',
    selectPlanError: 'Selectionnez une formule.',
    paypalConfigError: 'PayPal n\'est pas configure sur le serveur. Activez la configuration backend pour rediriger vers PayPal.',
    paypalNoUrlError: 'Aucune URL PayPal valide recue. Reessayez ou contactez le support.',
    paypalGenericError: 'Paiement PayPal impossible pour le moment.',
    bankRequestSuccess: 'Demande envoyee{ref}. Notre equipe vous contactera a {email}.',
    bankRef: ' (ref. {value})',
    bankRequestError: 'Envoi de la demande impossible pour le moment.',
    loading: 'Chargement...',
    redirectTitle: 'Redirection vers PayPal',
    redirectDescription: 'Vous allez etre redirige vers PayPal pour finaliser votre paiement en toute securite.',
    redirectInProgress: 'Redirection en cours...',
    continuePaypal: 'Continuer vers PayPal',
    paypalTrust: 'Paiement securise via PayPal - carte et compte acceptes',
    heroEyebrow: 'PAIEMENT',
    heroTitle: 'Choisissez votre mode de paiement',
    heroBody: 'Activez votre formule en quelques secondes via PayPal, ou faites une demande de virement bancaire.',
    selectedPlanEyebrow: 'FORMULE SELECTIONNEE',
    requestSentEyebrow: 'DEMANDE ENVOYEE',
    requestSentTitle: 'Merci pour votre demande !',
    requestSentBody: 'Notre equipe va traiter votre demande et vous contacter prochainement pour confirmer l\'activation de votre formule.',
    backToAccount: 'Retour au compte',
    goToApp: 'Acceder a l\'application',
    paypalMethodTitle: 'Payer avec PayPal',
    paypalMethodBody: 'Paiement immediat et securise. Votre formule est activee instantanement.',
    paypalRedirectCta: 'Redirection vers PayPal...',
    paypalContinueCta: 'Continuer avec PayPal ->',
    paypalSecureNote: 'Redirection securisee vers PayPal. Aucune donnee bancaire n\'est stockee sur nos serveurs.',
    wireMethodTitle: 'Virement bancaire',
    wireMethodBody: 'Envoyez une demande d\'activation. Notre equipe vous communique les coordonnees bancaires.',
    optionalMessage: 'Message (facultatif)',
    wirePlaceholder: 'Precisez votre nom d\'entreprise, reference commande, ou toute information utile...',
    sending: 'Envoi en cours...',
    sendRequest: 'Envoyer la demande'
  },
  account: {
    paypalReturnMissingOrder: 'Retour PayPal sans identifiant de commande. Veuillez contacter le support.',
    paypalConfirmedWithPlan: 'Paiement confirme ! Votre plan {plan} est maintenant actif.',
    paypalConfirmedGeneric: 'Paiement PayPal confirme ! Votre compte est active.',
    paypalConfirmError: 'Confirmation du paiement PayPal echouee. Veuillez contacter le support.',
    loadAccountError: 'Impossible de charger les informations du compte.',
    loadPlansError: 'Impossible de charger les plans tarifaires.',
    noPlan: 'Aucun plan',
    roleAdmin: 'Admin',
    roleManager: 'Manager',
    profileUpdated: 'Profil mis a jour.',
    profileUpdateError: 'Mise a jour du profil impossible.',
    passwordAllRequired: 'Tous les champs mot de passe sont requis.',
    passwordMin: 'Le nouveau mot de passe doit contenir au moins 8 caracteres.',
    passwordConfirmMismatch: 'La confirmation du mot de passe ne correspond pas.',
    passwordUpdated: 'Mot de passe modifie avec succes.',
    passwordUpdateError: 'Modification du mot de passe impossible.',
    passwordResetConfirm: 'Generer un mot de passe temporaire maintenant ?',
    passwordResetDone: 'Mot de passe reinitialise.',
    passwordResetTemp: 'Mot de passe temporaire genere: {temp}',
    passwordResetError: 'Reinitialisation impossible.',
    currentPlanAlreadyActive: 'Ce plan est deja actif sur votre compte.',
    planUpdated: 'Plan tarifaire mis a jour.',
    pricingUnavailable: 'La tarification est temporairement indisponible. La migration pricing_plan_id doit etre appliquee cote backend.',
    planChangeError: 'Changement de plan impossible.',
    noPlanAvailable: 'Aucun plan disponible. Rechargez la page.',
    loadingTitle: 'Chargement du compte...',
    loadingBody: 'Merci de patienter.',
    paywallAria: 'Limite de plan atteinte',
    paywallEyebrow: 'LIMITE ATTEINTE',
    paywallTitle: 'Votre formule a atteint sa limite de sessions.',
    paywallBody: 'Passez a Pro pour continuer sans interruption.',
    checkoutPaypal: 'Payer avec PayPal',
    checkoutWire: 'Demander par virement',
    heroEyebrow: 'ESPACE MANAGER',
    heroTitle: 'Mon compte',
    heroBody: 'Gerez votre profil, votre securite et votre formule depuis un seul espace.',
    heroProfile: 'Profil',
    heroSecurity: 'Securite',
    heroPricing: 'Tarification',
    summaryAria: 'Synthese compte',
    avatarAlt: 'Avatar de {name}',
    yourAccount: 'Votre compte',
    activePlan: 'Plan actif :',
    role: 'Role:',
    profileEyebrow: 'PROFIL',
    profileTitle: 'Informations professionnelles',
    profileSubtitle: 'Gardez vos informations a jour pour faciliter le support et le suivi des sessions.',
    firstName: 'Prenom',
    lastName: 'Nom',
    jobTitle: 'Fonction',
    jobTitlePlaceholder: 'Ex : HR Manager',
    department: 'Departement',
    departmentPlaceholder: 'Ex : Ressources Humaines',
    immutableNameHint: 'Prenom et nom sont definis a la creation du compte et ne peuvent pas etre modifies ici.',
    savingProfile: 'Enregistrement...',
    saveProfile: 'Enregistrer le profil',
    securityEyebrow: 'SECURITE',
    securityTitle: 'Mot de passe',
    securitySubtitle: 'Renforcez la protection de votre compte avec un mot de passe fort et regulierement actualise.',
    currentPassword: 'Mot de passe actuel',
    currentPasswordPlaceholder: 'Votre mot de passe actuel',
    newPassword: 'Nouveau mot de passe',
    newPasswordPlaceholder: 'Minimum 8 caracteres',
    confirmPassword: 'Confirmation',
    confirmPasswordPlaceholder: 'Retapez le nouveau mot de passe',
    generating: 'Generation...',
    forgotPassword: 'Mot de passe oublie ?',
    updating: 'Mise a jour...',
    changePassword: 'Modifier le mot de passe',
    pricingEyebrow: 'TARIFICATION',
    pricingTitle: 'Votre formule',
    pricingSubtitle: 'Choisissez la formule adaptee a vos besoins d\'equipe.',
    activeBadgeEyebrow: 'Formule active',
    recommended: 'Recommande',
    yourPlan: 'Votre formule',
    usersCount: '{count} utilisateurs',
    sessionsPerMonth: '{count} sessions/mois',
    activePlanTag: 'Formule active',
    noPlans: 'Aucune formule disponible pour le moment.',
    historyEyebrow: 'HISTORIQUE',
    noHistory: 'Aucun changement de formule enregistre pour le moment.'
  },
  sessionBuilder: {
    mockModeToast: 'Mode mock actif: catalogue de developpement utilise.',
    catalogUnavailableError: 'Catalogue indisponible. Verifiez l API backend ou activez le mode mock.',
    catalogUnavailableToast: 'Catalogue indisponible. Activez NEXT_PUBLIC_ENABLE_CHALLENGES_MOCK_DATA=true pour le mode mock.',
    addParticipantsFirst: 'Ajoutez d\'abord des participants dans votre espace manager pour creer une session.',
    invalidDateTime: 'Veuillez choisir une date et heure valides.',
    creatingSession: 'Creation de la session...',
    missingSessionId: 'Identifiant de session manquant dans la reponse.',
    createSessionError: 'Impossible de creer la session.',
    updateSessionError: 'Impossible de mettre a jour la session.',
    checkingSessionTitle: 'Verification de la session...',
    loading: 'Chargement en cours.',
    newSessionEyebrow: 'NOUVELLE SESSION',
    prerequisite: 'Prerequis : vous devez disposer d\'au moins un participant cree dans l\'espace manager avant de creer la session.',
    frameTitle: 'Cadre de session',
    sessionName: 'Nom de la session',
    sessionNamePlaceholder: 'Ex: Team Building Q2 2026',
    sessionDateTime: 'Date et heure prevues',
    progressionMode: 'Mode de progression des challenges',
    progressionHint: 'Choisissez le niveau d\'autonomie du deroule.',
    manual: 'Manuel',
    manualHint: 'Le facilitateur garde la main et pilote le rythme de la session.',
    automatic: 'Automatique',
    automaticHint: 'Les challenges s\'enchainent automatiquement une fois le precedent termine.',
    dateHint: 'La date est facultative, mais utile pour planifier et retrouver rapidement vos sessions.',
    assignParticipants: 'Assigner des participants',
    selectedCount: '{count} selectionne(s)',
    createUnavailable: 'Creation indisponible',
    createUnavailableBody: 'Ajoutez d\'abord des participants dans votre espace manager.',
    createSession: 'Creer la session',
    creating: 'Creation...',
    editSessionAria: 'Modifier les informations de session',
    sessionNamePlaceholderShort: 'Nom de la session',
    manualModeOption: 'Mode manuel',
    autoModeOption: 'Mode automatique',
    saving: 'Sauvegarde...',
    save: 'Sauvegarder',
    cancel: 'Annuler'
  },
  challengeRulesPanel: {
    kicker: 'Voir les regles',
    briefTitle: 'Brief de mission',
    startChallenge: 'Demarrer le challenge',
    facilitator: 'Facilitateur',
    participants: 'Participants',
    min: 'Minimum',
    recommended: 'Recommande',
    max: 'Maximum',
    players: 'joueurs',
    averageDuration: 'Duree moyenne',
    averageDurationUnknown: 'Duree moyenne a confirmer',
    showRules: 'Voir les regles',
    closeRules: 'Fermer les regles',
    closeRulesWindow: 'Fermer la fenetre des regles',
    modalTitle: 'Regles - {challengeName}'
  },
  challengeRules: {
    labyrintheSignals: {
      challengeName: 'Labyrinthe des Signaux',
      subtitle: 'Coordonnez votre equipe, evitez les pieges et trouvez la sortie.',
      objective: 'Coordonnez vos efforts pour sortir du labyrinthe en perdant le moins de vies possible.',
      participants: {
        min: '2 joueurs',
        recommended: '4 joueurs',
        max: '6 joueurs'
      },
      facilitator: [
        'Verifier la presence des participants avant le lancement.',
        'Demarrer le chronometre au moment opportun.',
        'Animer la session et envoyer des relances via le chat durant les phases critiques.'
      ],
      participant: [
        'Chaque participant dispose de 3 vies.',
        'Le point de depart est librement choisi, selectionnez une case de depart (Start) pour activer votre curseur et commencer l exploration.',
        'Les explosions restent invisibles jusqu a leur declenchement.',
        'Apres chaque perte de vie, un nouveau point de depart peut etre selectionne.',
        'Les retours en arriere sont bloques, sans perte de vie.',
        'Partagez toutes les informations utiles pour coordonner les deplacements de l equipe.',
        'Le challenge est reussi des qu un participant atteint la sortie.',
        'Deplacements possibles avec les touches directionnelles du clavier ou les clics souris.',
        'Des le lancement du challenge, cette fenetre d information disparait et la vue de jeu devient active.'
      ],
      footnote: ''
    },
    pariSurMoi: {
      challengeName: 'Pari sur moi !',
      subtitle: 'Saurez-vous distinguer le vrai du faux ?',
      objective: 'Saurez-vous distinguer le vrai du faux ? Chaque participant partage des affirmations sur lui-meme et chacun doit identifier lesquelles sont authentiques.',
      participants: {
        min: '2 joueurs',
        recommended: '4 joueurs',
        max: '6 joueurs'
      },
      facilitator: [
        'Verifier que tous les participants sont prets.',
        'Lancer le chronometre et rythmer les tours.'
      ],
      participant: [
        'A chaque tour, un poseur dispose de 40 secondes pour soumettre une affirmation.',
        'Les autres participants disposent de 40 secondes pour voter : Vrai ou Faux.',
        'Un feedback et les scores sont affiches a la fin de chaque manche.',
        'Le challenge debute des le lancement du chronometre.'
      ],
      scoring: [
        'Bonne reponse : +1 point.',
        'Mauvaise reponse : 0 point.',
        'Vote non soumis dans le temps imparti : 0 point.',
        'Affirmation non soumise par le poseur : 0 point.'
      ],
      footnote: ''
    },
    missionCritique: {
      challengeName: 'Mission Critique',
      subtitle: 'Timeline collaborative sous contrainte de temps.',
      objective: 'Reconstituez collectivement une timeline complète et cohérente avant la fin du chronomètre.',
      participants: {
        min: '2 joueurs',
        recommended: '4 joueurs',
        max: '6 joueurs'
      },
      facilitator: [
        'Verifier que tous les participants sont prets.',
        'Lancer le chronometre.',
        'Relancer les echanges en cas de blocage.',
        'Encourager le partage d informations entre les participants.'
      ],
      participant: [
        'Placez les taches dans les phases appropriees.',
        'Chaque participant construit sa propre timeline et ne voit pas celles des autres.',
        'Communiquez avec votre equipe pour identifier l ordre logique des taches.',
        'Respectez les dependances entre les differentes actions.',
        'Validez votre proposition avant la fin du chronometre.'
      ],
      scoring: [
        'A la fin de la partie, les timelines de tous les participants sont fusionnees pour constituer une timeline globale.',
        'Chaque tache correctement positionnee dans la timeline globale rapporte +1 point a l equipe.',
        'Une tache placee plusieurs fois dans la timeline globale entraine une penalite de -1 point par doublon.',
        'Les taches manquantes ne rapportent aucun point.',
        'La validation avant la fin du chronometre est necessaire pour que la proposition soit prise en compte.'
      ],
      footnote: ''
    },
    escapeRoom: {
      challengeName: 'Salle Secrete',
      subtitle: 'Résolvez les énigmes en équipe et trouvez la sortie avant la fin du chronomètre.',
      objective: 'Résolvez les énigmes en équipe et trouvez la sortie avant la fin du chronomètre.',
      participants: {
        min: '2 joueurs',
        recommended: '4 joueurs',
        max: '6 joueurs'
      },
      facilitator: [
        'Verifier que tous les participants sont prets.',
        'Lancer le chronometre.',
        'Debloquer un indice ou passer une enigme si necessaire.',
        'Maintenir un rythme fluide tout au long de la session.'
      ],
      participant: [
        'Analysez les enigmes et partagez vos hypotheses avec l equipe.',
        'Collaborez pour trouver la bonne reponse.',
        'Soumettez une reponse commune pour chaque enigme.',
        'Utilisez le chat pour echanger rapidement des indices et des pistes.',
        'Resoudre un maximum d enigmes avant la fin du temps imparti.'
      ],
      scoring: [
        'Chaque enigme resolue rapporte +1 point a l equipe.',
        'Une enigme non resolue rapporte 0 point.',
        'Le score final correspond au nombre total d enigmes resolues avant la fin du chronometre.',
        'Le challenge est reussi lorsque toutes les enigmes sont resolues.'
      ],
      footnote: ''
    },
    pixelArchitect: {
      challengeName: 'Pixel Architect',
      subtitle: 'Construisez ensemble la structure demandée avant la fin du chronomètre.',
      objective: 'Construisez ensemble la structure demandée avant la fin du chronomètre en coordonnant vos ressources et vos actions.',
      participants: {
        min: '2 joueurs',
        recommended: '4 joueurs',
        max: '6 joueurs'
      },
      facilitator: [
        'Vérifier que tous les participants sont prêts.',
        'Lancer le chronomètre.',
        'Relancer la coordination en cas de blocage.'
      ],
      participant: [
        'Analysez le modèle ou le brief de construction.',
        'Répartissez les rôles et les responsabilités au sein de l’équipe.',
        'Communiquez efficacement pour coordonner vos actions.',
        'Gérez les ressources disponibles et respectez les contraintes du challenge.',
        'Construisez la structure avant la fin du temps imparti.',
        'Validez votre réalisation lorsque la construction est terminée.'
      ],
      scoring: [
        'Chaque élément correctement construit rapporte +1 point.',
        'Les éléments manquants ou incorrects rapportent 0 point.',
        'Le score final dépend de la conformité de la construction au modèle demandé.',
        'Le challenge est réussi lorsque la construction finale correspond au model défini.'
      ],
      footnote: ''
    },
    theQuiz: {
      challengeName: 'THE QUIZ',
      subtitle: 'Répondez correctement au maximum de questions.',
      objective: 'Répondez correctement au maximum de questions.',
      participants: {
        min: '2 joueurs',
        recommended: '4 joueurs',
        max: '6 joueurs'
      },
      facilitator: [
        'Vérifier que tous les participants sont prêts.',
        'Lancer le chronomètre.',
        'Maintenir un rythme dynamique entre les questions.'
      ],
      participant: [
        'Répondez aux questions avant la fin du temps imparti.',
        'Choisissez la réponse qui vous semble correcte.',
        'Consultez le classement en temps réel après chaque question.',
        'Accumulatez un maximum de points pour améliorer votre position et celle de votre équipe.'
      ],
      scoring: [
        'Bonne réponse : +1 point.',
        'Mauvaise réponse : 0 point.',
        'Réponse non soumise avant la fin du temps imparti : 0 point.',
        'Le classement est mis à jour après chaque question.',
        'Le score final correspond au total des points obtenus pendant la partie.'
      ],
      footnote: ''
    },
    phraseMystere: {
      challengeName: 'PHRASE MYSTÈRE',
      subtitle: 'Reconstituez collectivement la phrase complète avant la fin du chronomètre.',
      objective: 'Reconstituez collectivement la phrase complète avant la fin du chronomètre.',
      participants: {
        min: '2 joueurs',
        recommended: '4 joueurs',
        max: '6 joueurs'
      },
      facilitator: [
        'Vérifier que tous les participants sont prêts.',
        'Lancer le chronomètre.',
        'Encourager la coordination et relancer les échanges en cas de blocage.'
      ],
      participant: [
        'Chaque participant dispose uniquement d’une partie des mots de la phrase.',
        'Placez uniquement les mots correspondant à vos emplacements.',
        'Partagez vos hypothèses et vos informations avec l’équipe.',
        'Corrigez les incohérences dès qu’elles sont identifiées.',
        'Utilisez les indices avec discernement pour débloquer la situation.',
        'Reconstituez la phrase complète avant la fin du temps imparti.'
      ],
      hints: [
        'L’équipe dispose de 2 indices « Découvrir un mot » pour l’ensemble de la manche.',
        'Chaque indice révèle automatiquement un mot de la phrase.'
      ],
      scoring: [
        'Chaque mot correctement positionné rapporte +1 point.',
        'Un mot incorrect rapporte 0 point.',
        'Le score final correspond au nombre total de mots correctement placés.',
        'Le challenge est réussi lorsque la phrase est entièrement reconstituée avant la fin du chronomètre.'
      ],
      footnote: ''
    },
    copuzzle: {
      challengeName: 'COPUZZLE',
      subtitle: 'Assemblez le puzzle en équipe avant la fin du chronomètre en coordonnant efficacement le placement de vos pièces.',
      objective: 'Assemblez le puzzle en équipe avant la fin du chronomètre en coordonnant efficacement le placement de vos pièces.',
      participants: {
        min: '2 joueurs',
        recommended: '4 joueurs',
        max: '6 joueurs'
      },
      facilitator: [
        'Vérifier que tous les participants sont prêts.',
        'Lancer le chronomètre.',
        'Suivre la progression de l’équipe.',
        'Relancer les échanges en cas de blocage.'
      ],
      participant: [
        'Chaque participant dispose d’un ensemble de pièces à placer.',
        'Positionnez vos pièces aux emplacements les plus pertinents.',
        'Communiquez vos intentions afin d’éviter les conflits et les doublons.',
        'Aidez l’équipe à identifier les erreurs de placement.',
        'Complétez le puzzle avant la fin du temps imparti.'
      ],
      scoring: [
        'Chaque pièce correctement positionnée rapporte +1 point.',
        'Une pièce mal positionnée rapporte 0 point.',
        'Le score final correspond au nombre total de pièces correctement placées.',
        'Le challenge est réussi lorsque le puzzle est entièrement complété avant la fin du chronomètre.'
      ],
      footnote: ''
    }
  }
};

export default fr;
