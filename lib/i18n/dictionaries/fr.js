const fr = {
  nav: {
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    mainAria: 'Navigation principale',
    accountAria: 'Accès compte',
    product: 'Produit',
    pricing: 'Tarifs',
    contact: 'Contact',
    login: 'Connexion',
    signup: 'Créer un compte',
    myAccount: 'Mon compte',
    avatarAlt: 'Avatar de {name}'
  },
  footer: {
    brandCopy: 'Activez des sessions d\'équipe claires et mesurables.',
    columnsAria: 'Liens footer',
    product: 'Produit',
    resources: 'Ressources',
    legal: 'Légal',
    contact: 'Contact',
    home: 'Accueil',
    signup: 'Créer un compte',
    pricing: 'Tarification',
    offers: 'Offres',
    askDemo: 'Demander une démo',
    clientArea: 'Espace client',
    legalNotice: 'Mentions légales',
    privacy: 'Politique de confidentialité',
    talkToExpert: 'Parler à un expert'
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
    backToSessions: 'Retour à mes sessions',
    backToDashboard: 'Retour au tableau de bord',
    mySessions: 'Mes sessions',
    sessions: 'Sessions',
    participants: 'Participants',
    account: 'Compte',
    backToAdmin: 'Retour admin',
    userMenu: 'Menu utilisateur',
    userMenuOf: 'Menu de {name}',
    avatarOf: 'Avatar de {name}',
    settings: 'Paramètres',
    closeSettings: 'Fermer les paramètres',
    logout: 'Déconnexion'
  },
  vom: {
    title: 'Pari sur moi !',
    subtitle: 'Devinez le vrai du faux et découvrez votre équipe autrement',
    selectingTitle: 'Sélection d\'affirmation',
    currentPoser: 'Poseur actuel: {name}',
    selectingInstruction: 'Cliquez sur une question pour ouvrir la réponse rapide.',
    poserLabel: '(poseur)',
    selectedOption: 'Option choisie: {option}',
    selected: 'Sélectionnée',
    alreadyUsed: 'Déjà utilisée par vous',
    poserHelper: 'Le poseur choisit une affirmation dans le catalogue.',
    votingTitle: 'Votes ouverts',
    poserAsks: '{name} pose :',
    voteTrue: '✔️ Vrai',
    voteFalse: '❌ Mensonge',
    currentVote: 'Votre vote actuel: {vote}',
    absent: 'absent',
    facilitatorObserve: 'Le facilitateur observe le tour sans voter.',
    poserNoVote: 'Vous êtes poseur, vous ne votez pas.',
    roundResultTitle: 'Résultat du tour',
    instantFeedback: 'Feedback instantané',
    correctFeedback: '✅ Bonne réponse ! Le poseur a répondu : {truth} +1 point',
    incorrectFeedback: '❌ Vous vous êtes trompé. Le poseur a répondu : {truth} 0 point gagné',
    poserFeedback: 'Vous étiez poseur: +{points} point(s) (joueurs trompés)',
    myScore: 'Mon score',
    points: 'points',
    transitionText: 'Classement en transition ({clock}) avant le prochain tour.',
    timeoutFeedback: 'Temps écoulé',
    ranking: 'Classement',
    transitionTitle: 'Transition',
    transitionBody: 'Préparation du tour suivant...',
    pausedTitle: 'Pause temporaire',
    pausedBody: 'Le poseur est déconnecté. La partie reprend automatiquement à sa reconnexion.',
    finalDebrief: 'Débriefing final',
    rankedParticipants: 'participants classés',
    playedCycles: 'cycles joués',
    bestScore: 'meilleur score',
    finalScore: 'Votre score final',
    finalRanking: 'Classement final',
    noParticipants: 'Aucun participant détecté.',
    yourQuestion: 'Votre question',
    chooseTruth: 'Choisissez explicitement la vérité de votre affirmation.',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    badges: {
      good: '🟢 Bonne réponse',
      bad: '🔴 Mauvaise réponse',
      top: '🏆 Top joueur',
      streak: '🔥 Série de bonnes réponses x{count}'
    }
  },
  chatCard: {
    title: 'Chat',
    empty: 'Aucun message pour le moment.',
    placeholder: 'Écrire un message',
    expandAria: 'Afficher le chat',
    collapseAria: 'Réduire le chat',
    expandTitle: 'Afficher',
    collapseTitle: 'Réduire',
    sendAria: 'Envoyer',
    systemAuthor: 'system',
    counter: '{count}/{max} caractères'
  },
  checkout: {
    loadPlansError: 'Impossible de charger les formules disponibles.',
    selectPlanError: 'Sélectionnez une formule.',
    paypalConfigError: 'PayPal n\'est pas configuré sur le serveur. Activez la configuration backend pour rediriger vers PayPal.',
    paypalNoUrlError: 'Aucune URL PayPal valide reçue. Réessayez ou contactez le support.',
    paypalGenericError: 'Paiement PayPal impossible pour le moment.',
    bankRequestSuccess: 'Demande envoyée{ref}. Notre équipe vous contactera à {email}.',
    bankRef: ' (ref. {value})',
    bankRequestError: 'Envoi de la demande impossible pour le moment.',
    loading: 'Chargement...',
    redirectTitle: 'Redirection vers PayPal',
    redirectDescription: 'Vous allez être redirigé vers PayPal pour finaliser votre paiement en toute sécurité.',
    redirectInProgress: 'Redirection en cours...',
    continuePaypal: 'Continuer vers PayPal',
    paypalTrust: 'Paiement sécurisé via PayPal - carte et compte acceptés',
    heroEyebrow: 'PAIEMENT',
    heroTitle: 'Choisissez votre mode de paiement',
    heroBody: 'Activez votre formule en quelques secondes via PayPal, ou faites une demande de virement bancaire.',
    selectedPlanEyebrow: 'FORMULE SÉLECTIONNÉE',
    requestSentEyebrow: 'DEMANDE ENVOYÉE',
    requestSentTitle: 'Merci pour votre demande !',
    requestSentBody: 'Notre équipe va traiter votre demande et vous contacter prochainement pour confirmer l\'activation de votre formule.',
    backToAccount: 'Retour au compte',
    goToApp: 'Accéder à l\'application',
    paypalMethodTitle: 'Payer avec PayPal',
    paypalMethodBody: 'Paiement immédiat et sécurisé. Votre formule est activée instantanément.',
    paypalRedirectCta: 'Redirection vers PayPal...',
    paypalContinueCta: 'Continuer avec PayPal ->',
    paypalSecureNote: 'Redirection sécurisée vers PayPal. Aucune donnée bancaire n\'est stockée sur nos serveurs.',
    wireMethodTitle: 'Virement bancaire',
    wireMethodBody: 'Envoyez une demande d\'activation. Notre équipe vous communique les coordonnées bancaires.',
    optionalMessage: 'Message (facultatif)',
    wirePlaceholder: 'Précisez votre nom d\'entreprise, référence commande, ou toute information utile...',
    sending: 'Envoi en cours...',
    sendRequest: 'Envoyer la demande'
  },
  account: {
    paypalReturnMissingOrder: 'Retour PayPal sans identifiant de commande. Veuillez contacter le support.',
    paypalConfirmedWithPlan: 'Paiement confirmé ! Votre plan {plan} est maintenant actif.',
    paypalConfirmedGeneric: 'Paiement PayPal confirmé ! Votre compte est actif.',
    paypalConfirmError: 'Confirmation du paiement PayPal échouée. Veuillez contacter le support.',
    loadAccountError: 'Impossible de charger les informations du compte.',
    loadPlansError: 'Impossible de charger les plans tarifaires.',
    noPlan: 'Aucun plan',
    roleAdmin: 'Admin',
    roleManager: 'Manager',
    profileUpdated: 'Profil mis à jour.',
    profileUpdateError: 'Mise à jour du profil impossible.',
    passwordAllRequired: 'Tous les champs mot de passe sont requis.',
    passwordMin: 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
    passwordConfirmMismatch: 'La confirmation du mot de passe ne correspond pas.',
    passwordUpdated: 'Mot de passe modifié avec succès.',
    passwordUpdateError: 'Modification du mot de passe impossible.',
    passwordResetConfirm: 'Générer un mot de passe temporaire maintenant ?',
    passwordResetDone: 'Mot de passe réinitialisé.',
    passwordResetTemp: 'Mot de passe temporaire généré: {temp}',
    passwordResetError: 'Réinitialisation impossible.',
    currentPlanAlreadyActive: 'Ce plan est déjà actif sur votre compte.',
    planUpdated: 'Plan tarifaire mis à jour.',
    pricingUnavailable: 'La tarification est temporairement indisponible. La migration pricing_plan_id doit être appliquée côté backend.',
    planChangeError: 'Changement de plan impossible.',
    noPlanAvailable: 'Aucun plan disponible. Rechargez la page.',
    loadingTitle: 'Chargement du compte...',
    loadingBody: 'Merci de patienter.',
    paywallAria: 'Limite de plan atteinte',
    paywallEyebrow: 'LIMITE ATTEINTE',
    paywallTitle: 'Votre formule a atteint sa limite de sessions.',
    paywallBody: 'Passez à Pro pour continuer sans interruption.',
    checkoutPaypal: 'Payer avec PayPal',
    checkoutWire: 'Demander par virement',
    heroEyebrow: 'ESPACE MANAGER',
    heroTitle: 'Mon compte',
    heroBody: 'Gérez votre profil, votre sécurité et votre formule depuis un seul espace.',
    heroProfile: 'Profil',
    heroSecurity: 'Sécurité',
    heroPricing: 'Tarification',
    summaryAria: 'Synthèse compte',
    avatarAlt: 'Avatar de {name}',
    yourAccount: 'Votre compte',
    activePlan: 'Plan actif :',
    role: 'Rôle:',
    profileEyebrow: 'PROFIL',
    profileTitle: 'Informations professionnelles',
    profileSubtitle: 'Gardez vos informations à jour pour faciliter le support et le suivi des sessions.',
    firstName: 'Prénom',
    lastName: 'Nom',
    jobTitle: 'Fonction',
    jobTitlePlaceholder: 'Ex : HR Manager',
    department: 'Département',
    departmentPlaceholder: 'Ex : Ressources Humaines',
    immutableNameHint: 'Prénom et nom sont définis à la création du compte et ne peuvent pas être modifiés ici.',
    savingProfile: 'Enregistrement...',
    saveProfile: 'Enregistrer le profil',
    securityEyebrow: 'SÉCURITÉ',
    securityTitle: 'Mot de passe',
    securitySubtitle: 'Renforcez la protection de votre compte avec un mot de passe fort et régulièrement actualisé.',
    currentPassword: 'Mot de passe actuel',
    currentPasswordPlaceholder: 'Votre mot de passe actuel',
    newPassword: 'Nouveau mot de passe',
    newPasswordPlaceholder: 'Minimum 8 caractères',
    confirmPassword: 'Confirmation',
    confirmPasswordPlaceholder: 'Retapez le nouveau mot de passe',
    generating: 'Génération...',
    forgotPassword: 'Mot de passe oublié ?',
    updating: 'Mise à jour...',
    changePassword: 'Modifier le mot de passe',
    pricingEyebrow: 'TARIFICATION',
    pricingTitle: 'Votre formule',
    pricingSubtitle: 'Choisissez la formule adaptée à vos besoins d\'équipe.',
    activeBadgeEyebrow: 'Formule active',
    recommended: 'Recommandé',
    yourPlan: 'Votre formule',
    usersCount: '{count} utilisateurs',
    sessionsPerMonth: '{count} sessions/mois',
    activePlanTag: 'Formule active',
    noPlans: 'Aucune formule disponible pour le moment.',
    historyEyebrow: 'HISTORIQUE',
    noHistory: 'Aucun changement de formule enregistré pour le moment.'
  },
  sessionBuilder: {
    mockModeToast: 'Mode mock actif: catalogue de développement utilisé.',
    catalogUnavailableError: 'Catalogue indisponible. Vérifiez l\'API backend ou activez le mode mock.',
    catalogUnavailableToast: 'Catalogue indisponible. Activez NEXT_PUBLIC_ENABLE_CHALLENGES_MOCK_DATA=true pour le mode mock.',
    addParticipantsFirst: 'Ajoutez d\'abord des participants dans votre espace manager pour créer une session.',
    invalidDateTime: 'Veuillez choisir une date et heure valides.',
    creatingSession: 'Création de la session...',
    missingSessionId: 'Identifiant de session manquant dans la réponse.',
    createSessionError: 'Impossible de créer la session.',
    updateSessionError: 'Impossible de mettre à jour la session.',
    checkingSessionTitle: 'Vérification de la session...',
    loading: 'Chargement en cours.',
    newSessionEyebrow: 'NOUVELLE SESSION',
    prerequisite: 'Prérequis : vous devez disposer d\'au moins un participant créé dans l\'espace manager avant de créer la session.',
    frameTitle: 'Cadre de session',
    sessionName: 'Nom de la session',
    sessionNamePlaceholder: 'Ex: Team Building Q2 2026',
    sessionDateTime: 'Date et heure prévues',
    progressionMode: 'Mode de progression des challenges',
    progressionHint: 'Choisissez le niveau d\'autonomie du déroulé.',
    manual: 'Manuel',
    manualHint: 'Le facilitateur garde la main et pilote le rythme de la session.',
    automatic: 'Automatique',
    automaticHint: 'Les challenges s\'enchaînent automatiquement une fois le précédent terminé.',
    dateHint: 'La date est facultative, mais utile pour planifier et retrouver rapidement vos sessions.',
    assignParticipants: 'Assigner des participants',
    selectedCount: '{count} sélectionné(s)',
    createUnavailable: 'Création indisponible',
    createUnavailableBody: 'Ajoutez d\'abord des participants dans votre espace manager.',
    createSession: 'Créer la session',
    creating: 'Création...',
    editSessionAria: 'Modifier les informations de session',
    sessionNamePlaceholderShort: 'Nom de la session',
    manualModeOption: 'Mode manuel',
    autoModeOption: 'Mode automatique',
    saving: 'Sauvegarde...',
    save: 'Sauvegarder',
    cancel: 'Annuler'
  },
  challengeRulesPanel: {
    kicker: 'Voir les règles',
    briefTitle: 'Brief de mission',
    startChallenge: 'Démarrer le challenge',
    facilitator: 'Facilitateur',
    participants: 'Participants',
    min: 'Minimum',
    recommended: 'Recommandé',
    max: 'Maximum',
    players: 'joueurs',
    averageDuration: 'Durée moyenne',
    averageDurationUnknown: 'Durée moyenne à confirmer',
    showRules: 'Voir les règles',
    closeRules: 'Fermer les règles',
    closeRulesWindow: 'Fermer la fenêtre des règles',
    modalTitle: 'Règles - {challengeName}'
  },
  challengeRules: {
    labyrintheSignals: {
      challengeName: 'Labyrinthe des Signaux',
      subtitle: 'Coordonnez votre équipe, évitez les pièges et trouvez la sortie.',
      objective: 'Coordonnez vos efforts pour sortir du labyrinthe en perdant le moins de vies possible.',
      participants: {
        min: '2 joueurs',
        recommended: '4 joueurs',
        max: '6 joueurs'
      },
      facilitator: [
        'Vérifier la présence des participants avant le lancement.',
        'Démarrer le chronomètre au moment opportun.',
        'Animer la session et envoyer des relances via le chat durant les phases critiques.'
      ],
      participant: [
        'Chaque participant dispose de 3 vies.',
        'Le point de départ est librement choisi, sélectionnez une case de départ (Start) pour activer votre curseur et commencer l\'exploration.',
        'Les explosions restent invisibles jusqu\'à leur déclenchement.',
        'Après chaque perte de vie, un nouveau point de départ peut être sélectionné.',
        'Les retours en arrière sont bloqués, sans perte de vie.',
        'Partagez toutes les informations utiles pour coordonner les déplacements de l\'équipe.',
        'Le challenge est réussi dès qu\'un participant atteint la sortie.',
        'Déplacements possibles avec les touches directionnelles du clavier ou les clics souris.',
        'Dès le lancement du challenge, cette fenêtre d\'information disparaît et la vue de jeu devient active.'
      ],
      footnote: ''
    },
    pariSurMoi: {
      challengeName: 'Pari sur moi !',
      subtitle: 'Saurez-vous distinguer le vrai du faux ?',
      objective: 'Saurez-vous distinguer le vrai du faux ? Chaque participant partage des affirmations sur lui-même et chacun doit identifier lesquelles sont authentiques.',
      participants: {
        min: '2 joueurs',
        recommended: '4 joueurs',
        max: '6 joueurs'
      },
      facilitator: [
        'Vérifier que tous les participants sont prêts.',
        'Lancer le chronomètre et rythmer les tours.'
      ],
      participant: [
        'À chaque tour, un poseur dispose de 40 secondes pour soumettre une affirmation.',
        'Les autres participants disposent de 40 secondes pour voter : Vrai ou Faux.',
        'Un feedback et les scores sont affichés à la fin de chaque manche.',
        'Le challenge débute dès le lancement du chronomètre.'
      ],
      scoring: [
        'Bonne réponse : +1 point.',
        'Mauvaise réponse : 0 point.',
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
        'Vérifier que tous les participants sont prêts.',
        'Lancer le chronomètre.',
        'Relancer les échanges en cas de blocage.',
        'Encourager le partage d\'informations entre les participants.'
      ],
      participant: [
        'Placez les tâches dans les phases appropriées.',
        'Chaque participant construit sa propre timeline et ne voit pas celles des autres.',
        'Communiquez avec votre équipe pour identifier l\'ordre logique des tâches.',
        'Respectez les dépendances entre les différentes actions.',
        'Validez votre proposition avant la fin du chronomètre.'
      ],
      scoring: [
        'À la fin de la partie, les timelines de tous les participants sont fusionnées pour constituer une timeline globale.',
        'Chaque tâche correctement positionnée dans la timeline globale rapporte +1 point à l\'équipe.',
        'Une tâche placée plusieurs fois dans la timeline globale entraîne une pénalité de -1 point par doublon.',
        'Les tâches manquantes ne rapportent aucun point.',
        'La validation avant la fin du chronomètre est nécessaire pour que la proposition soit prise en compte.'
      ],
      footnote: ''
    },
    escapeRoom: {
      challengeName: 'Salle Secrète',
      subtitle: 'Résolvez les énigmes en équipe et trouvez la sortie avant la fin du chronomètre.',
      objective: 'Résolvez les énigmes en équipe et trouvez la sortie avant la fin du chronomètre.',
      participants: {
        min: '2 joueurs',
        recommended: '4 joueurs',
        max: '6 joueurs'
      },
      facilitator: [
        'Vérifier que tous les participants sont prêts.',
        'Lancer le chronomètre.',
        'Débloquer un indice ou passer une énigme si nécessaire.',
        'Maintenir un rythme fluide tout au long de la session.'
      ],
      participant: [
        'Analysez les énigmes et partagez vos hypothèses avec l\'équipe.',
        'Collaborez pour trouver la bonne réponse.',
        'Soumettez une réponse commune pour chaque énigme.',
        'Utilisez le chat pour échanger rapidement des indices et des pistes.',
        'Résoudre un maximum d\'énigmes avant la fin du temps imparti.'
      ],
      scoring: [
        'Chaque énigme résolue rapporte +1 point à l\'équipe.',
        'Une énigme non résolue rapporte 0 point.',
        'Le score final correspond au nombre total d\'énigmes résolues avant la fin du chronomètre.',
        'Le challenge est réussi lorsque toutes les énigmes sont résolues.'
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
        'Le challenge est réussi lorsque la construction finale correspond au modèle défini.'
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
