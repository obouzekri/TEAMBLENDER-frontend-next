import { TEAM_BUILDING_CONTENT } from './teamBuildingContent.js';

export const TEAM_BUILDING_GUIDES = [
  {
    slug: 'a-distance',
    fr: {
      title: 'Team building à distance : préparer et animer une session en ligne',
      description: 'Un guide pour organiser un team building à distance : préparation technique, défis collaboratifs en ligne, animation et débrief avec TeamBlender.',
      intro: 'Un team building à distance réunit des collaborateurs qui participent depuis des lieux différents. Avec TeamBlender, l’animateur prépare un programme de défis collaboratifs et pilote la session en direct. Les participants rejoignent dans leur navigateur ; un outil de visioconférence séparé permet les échanges oraux.',
      formatsTitle: 'Préparer les conditions de participation',
      formats: 'Vérifiez que chacun dispose du lien, du code de session et d’un navigateur accessible. Testez aussi le son et la visioconférence avant de commencer. Prévoyez un canal pour signaler un problème technique et expliquez comment les équipes vont échanger pendant les défis. TeamBlender ne remplace pas votre outil de visioconférence.',
      steps: [
        { title: 'Choisir un objectif commun', text: 'Pour une équipe dispersée, commencez par un besoin précis : faire connaissance, faciliter la communication ou coopérer entre plusieurs sites. Dans le Session Builder, choisissez les défis dont les règles correspondent à cet objectif.' },
        { title: 'Présenter les règles avant de lancer', text: 'Partagez le lien et le code, vérifiez que les participants ont rejoint et présentez le déroulé à voix haute. Clarifiez les rôles dans chaque équipe et les moyens de communication autorisés avant de démarrer les défis.' },
        { title: 'Débriefer aussi la collaboration à distance', text: 'Appuyez-vous sur les résultats disponibles et demandez comment les informations ont circulé : qui a proposé une stratégie, comment une décision a été prise et ce qui a facilité la participation. Convenez d’une pratique à essayer lors des prochaines réunions.' },
      ],
      examplesTitle: 'Quels défis choisir pour une équipe à distance ?',
      examples: 'Un quiz peut servir de point de départ pour échanger ; un puzzle collaboratif peut ouvrir une discussion sur le partage d’informations et la coordination. Vérifiez les règles de chaque défi dans le catalogue animateur. Adaptez votre programme au temps disponible et à la familiarité de l’équipe avec les outils numériques, plutôt que de multiplier les activités.',
      faq: [
        { question: 'Faut-il installer une application pour le team building en ligne ?', answer: 'Les participants accèdent à TeamBlender depuis leur navigateur avec le lien et le code partagés par l’animateur. Pour les échanges oraux à distance, utilisez votre outil habituel de visioconférence en complément.' },
        { question: 'Comment faire participer les personnes moins à l’aise à distance ?', answer: 'Présentez les consignes avant le lancement, vérifiez les accès et invitez chaque personne à contribuer. Pendant le débrief, discutez des obstacles rencontrés sans assimiler un résultat de jeu à une mesure de compétence individuelle.' },
        { question: 'Peut-on consulter les résultats après la session ?', answer: 'Oui, l’animateur peut consulter les résultats disponibles pour revenir sur les défis avec l’équipe. Les indicateurs varient selon les défis ; ils servent de support au débrief, pas de diagnostic psychométrique.' },
      ],
    },
    en: {
      title: 'Remote team building: plan and facilitate an online session',
      description: 'Plan remote team building with TeamBlender: technical preparation, online collaborative challenges, live facilitation and a practical team debrief.',
      intro: 'Remote team building brings together colleagues joining from different locations. With TeamBlender, the facilitator prepares a programme of collaborative challenges and runs the session live. Participants join in their browser; a separate video conferencing tool supports spoken discussions.',
      formatsTitle: 'Prepare the conditions for participation',
      formats: 'Check that everyone has the session link, code and access to a browser. Test audio and video conferencing before starting. Provide a way to report technical issues and explain how teams will communicate during challenges. TeamBlender does not replace your video conferencing tool.',
      steps: [
        { title: 'Choose a shared objective', text: 'For a distributed team, start with a specific need: getting to know colleagues, improving communication or cooperating across locations. In the Session Builder, choose challenges whose rules fit that objective.' },
        { title: 'Explain the rules before starting', text: 'Share the link and code, check that participants have joined and explain the programme aloud. Clarify roles within each team and the communication channels they can use before starting challenges.' },
        { title: 'Debrief remote collaboration as well', text: 'Use available results and ask how information travelled: who suggested a strategy, how decisions were made and what made participation easier. Agree on one practice to try in future meetings.' },
      ],
      examplesTitle: 'Which challenges suit a remote team?',
      examples: 'A quiz can be a starting point for conversation; a collaborative puzzle can prompt discussion about sharing information and coordinating work. Check each challenge’s rules in the facilitator catalogue. Adapt the programme to the time available and the team’s familiarity with digital tools rather than adding more activities.',
      faq: [
        { question: 'Do we need to install an app for online team building?', answer: 'Participants access TeamBlender in their browser using the link and code shared by the facilitator. Use your usual video conferencing tool alongside it for remote spoken discussions.' },
        { question: 'How can we include people less comfortable with remote participation?', answer: 'Explain instructions before starting, check access and invite everyone to contribute. During the debrief, discuss obstacles without treating a game result as a measure of individual ability.' },
        { question: 'Can we review results after the session?', answer: 'Yes, the facilitator can review available results to discuss challenges with the team. Indicators vary by challenge; they support a debrief rather than a psychometric assessment.' },
      ],
    },
  },
  {
    slug: 'hybride',
    fr: {
      title: 'Team building hybride : réunir les équipes sur site et à distance',
      description: 'Préparez un team building hybride avec TeamBlender : accès navigateur, coordination entre sites, consignes communes et débrief des défis collaboratifs.',
      intro: 'Un team building hybride rassemble des personnes présentes dans une salle et des collègues connectés à distance. TeamBlender fournit un espace commun pour les défis et leur progression. L’organisation des échanges reste essentielle pour que les personnes à distance puissent participer aux décisions autant que celles sur site.',
      formatsTitle: 'Donner les mêmes informations à tous',
      formats: 'Partagez les règles dans un canal accessible à toute l’équipe et lisez les consignes à voix haute. Testez le micro de la salle depuis un poste distant. Évitez les décisions prises uniquement autour d’un écran ou dans une conversation que les collègues distants ne peuvent pas entendre. Prévoyez une visioconférence pour les échanges oraux.',
      steps: [
        { title: 'Préparer les accès et les échanges', text: 'Vérifiez les connexions des différents sites, les navigateurs et le matériel audio. Définissez comment les équipes communiqueront et qui pourra signaler une difficulté ou demander une clarification.' },
        { title: 'Animer depuis un programme commun', text: 'Créez la session et sélectionnez les défis dans TeamBlender. Partagez le lien et le code avec tout le groupe. Présentez les règles à tous avant de lancer, puis suivez la progression en direct sans privilégier les échanges dans la salle.' },
        { title: 'Comparer les conditions de collaboration', text: 'Au débrief, recueillez les retours des personnes sur site et à distance. Utilisez les résultats comme support, puis identifiez les ajustements concrets : meilleure prise de parole, consignes écrites ou clarification des rôles.' },
      ],
      examplesTitle: 'Construire un programme pour plusieurs sites',
      examples: 'Privilégiez des défis dont les règles et les informations sont accessibles à tous les participants. Un puzzle collaboratif peut aider à discuter de la répartition des informations ; un quiz peut servir à ouvrir un échange collectif. Consultez les règles du catalogue pour vérifier les interactions requises et préparez les canaux de discussion correspondants.',
      faq: [
        { question: 'Quelle différence entre team building hybride et à distance ?', answer: 'Dans une session à distance, les participants se connectent depuis des lieux séparés. Dans une session hybride, une partie du groupe partage une salle tandis que d’autres personnes participent à distance. Il faut donc veiller particulièrement à l’équilibre des échanges.' },
        { question: 'TeamBlender inclut-il la visioconférence ?', answer: 'Prévoyez un outil de visioconférence séparé pour les échanges oraux. TeamBlender sert à préparer les défis, piloter la session et consulter les résultats disponibles.' },
        { question: 'Comment éviter de désavantager les participants distants ?', answer: 'Donnez les mêmes consignes à tous, testez le son depuis un poste distant et organisez la prise de parole. Vérifiez régulièrement que les collègues distants peuvent suivre les échanges et contribuer aux décisions.' },
      ],
    },
    en: {
      title: 'Hybrid team building: bring on-site and remote colleagues together',
      description: 'Prepare hybrid team building with TeamBlender: browser access, coordination across locations, shared instructions and collaborative challenge debriefs.',
      intro: 'Hybrid team building brings together people in a shared room and colleagues joining remotely. TeamBlender provides a common space for challenges and progress tracking. Organising communication remains essential so that remote participants can contribute to decisions alongside those on site.',
      formatsTitle: 'Give everyone the same information',
      formats: 'Share rules in a channel everyone can access and read instructions aloud. Test the room microphone from a remote device. Avoid decisions made only around a screen or in conversations remote colleagues cannot hear. Plan a video conferencing tool for spoken discussions.',
      steps: [
        { title: 'Prepare access and communication', text: 'Check connections across locations, browsers and audio equipment. Define how teams will communicate and who can report a problem or ask for clarification.' },
        { title: 'Facilitate a shared programme', text: 'Create the session and select challenges in TeamBlender. Share the link and code with the entire group. Explain rules to everyone before starting, then track progress live without favouring conversations in the room.' },
        { title: 'Compare collaboration conditions', text: 'During the debrief, gather feedback from both on-site and remote participants. Use results as a starting point, then identify practical adjustments: clearer turn-taking, written instructions or better-defined roles.' },
      ],
      examplesTitle: 'Build a programme across locations',
      examples: 'Choose challenges with rules and information accessible to every participant. A collaborative puzzle can prompt discussion about information sharing; a quiz can open a group conversation. Consult the catalogue rules to check required interactions and prepare the appropriate discussion channels.',
      faq: [
        { question: 'How does hybrid team building differ from remote team building?', answer: 'In a remote session, participants join from separate locations. In a hybrid session, part of the group shares a room while others join remotely. This requires particular attention to balanced communication.' },
        { question: 'Does TeamBlender include video conferencing?', answer: 'Plan a separate video conferencing tool for spoken discussions. TeamBlender supports challenge preparation, live session facilitation and review of available results.' },
        { question: 'How can we avoid disadvantaging remote participants?', answer: 'Give everyone the same instructions, test audio from a remote device and organise turn-taking. Regularly check that remote colleagues can follow conversations and contribute to decisions.' },
      ],
    },
  },
  {
    slug: 'onboarding',
    fr: {
      title: 'Team building et onboarding : accueillir les nouveaux collaborateurs',
      description: 'Intégrez des défis collaboratifs à votre onboarding avec TeamBlender : faire connaissance, préparer une session et débriefer sans évaluation individuelle.',
      intro: 'Un team building d’onboarding crée une occasion de faire connaissance et de coopérer pendant l’accueil de nouveaux collaborateurs. Avec TeamBlender, managers et équipes RH peuvent préparer une session de défis, l’animer en direct et utiliser les résultats pour ouvrir une discussion. Cette session complète le parcours d’intégration ; elle ne le remplace pas.',
      formatsTitle: 'Créer un cadre accueillant, sans mise à l’épreuve',
      formats: 'Expliquez que la session est un temps de rencontre, pas un examen. Présentez les personnes, les règles et les outils avant de commencer. Choisissez des activités qui ne supposent pas de connaître les habitudes internes de l’entreprise et laissez une place aux questions des nouveaux arrivants.',
      steps: [
        { title: 'Définir ce que la rencontre doit faciliter', text: 'Choisissez une priorité : identifier ses interlocuteurs, découvrir les façons de travailler ensemble ou créer un premier échange entre services. Préparez ensuite le programme dans le Session Builder en vérifiant les règles des défis.' },
        { title: 'Inviter nouveaux arrivants et collègues', text: 'Partagez le lien et le code de session. Prévoyez une présentation des participants et des consignes accessibles. En présentiel, à distance ou en hybride, vérifiez que chacun peut contribuer et demander de l’aide.' },
        { title: 'Conclure par des repères utiles', text: 'Utilisez les défis pour demander ce qui a aidé à coopérer et quelles questions restent ouvertes. Terminez par des repères concrets : personnes à contacter, prochains rendez-vous et ressources du parcours d’intégration.' },
      ],
      examplesTitle: 'Choisir des défis accessibles aux nouveaux arrivants',
      examples: 'Des puzzles collaboratifs ou des quiz peuvent servir de support à une première coopération. Consultez le catalogue pour sélectionner des défis adaptés au groupe. Évitez de transformer les scores en classement des nouveaux collaborateurs ou en décision RH : les résultats de session ne mesurent ni la personnalité ni l’aptitude professionnelle.',
      faq: [
        { question: 'Le team building remplace-t-il le parcours d’onboarding ?', answer: 'Non. Il complète l’accueil et les rencontres avec l’équipe. Les informations métier, les accès aux outils, l’accompagnement et les points de suivi restent à organiser dans votre parcours d’intégration.' },
        { question: 'Peut-on organiser cette session pour un onboarding à distance ?', answer: 'Oui. Les participants rejoignent TeamBlender dans leur navigateur. Pour un groupe à distance ou hybride, prévoyez une visioconférence séparée et présentez les outils et les règles avant les défis.' },
        { question: 'Les résultats servent-ils à évaluer les nouveaux collaborateurs ?', answer: 'Les résultats disponibles servent à débriefer les défis et les stratégies de coopération. Ils ne constituent pas un diagnostic individuel et ne doivent pas être présentés comme une évaluation psychométrique ou une mesure d’aptitude professionnelle.' },
      ],
    },
    en: {
      title: 'Team building for onboarding: welcome new employees',
      description: 'Add collaborative challenges to onboarding with TeamBlender: get to know colleagues, prepare a session and debrief without individual assessment.',
      intro: 'Onboarding team building creates an opportunity to meet colleagues and cooperate while welcoming new employees. With TeamBlender, managers and HR teams can prepare a challenge session, facilitate it live and use results to open a discussion. This session complements the onboarding journey; it does not replace it.',
      formatsTitle: 'Create a welcoming setting, not a test',
      formats: 'Explain that the session is a chance to meet people, not an exam. Introduce participants, rules and tools before starting. Choose activities that do not require prior knowledge of company habits and make room for questions from new joiners.',
      steps: [
        { title: 'Define what the meeting should enable', text: 'Choose a priority: identifying key contacts, discovering ways of working together or starting a conversation across departments. Then prepare the programme in the Session Builder, checking challenge rules.' },
        { title: 'Invite new joiners and colleagues', text: 'Share the session link and code. Plan participant introductions and accessible instructions. Whether in person, remote or hybrid, check that everyone can contribute and ask for help.' },
        { title: 'Finish with useful next steps', text: 'Use challenges to ask what helped cooperation and what questions remain. Finish with practical pointers: people to contact, upcoming meetings and onboarding resources.' },
      ],
      examplesTitle: 'Choose challenges accessible to new joiners',
      examples: 'Collaborative puzzles or quizzes can support an initial shared activity. Consult the catalogue to select challenges suited to the group. Avoid turning scores into a ranking of new employees or an HR decision: session results do not measure personality or professional aptitude.',
      faq: [
        { question: 'Does team building replace the onboarding journey?', answer: 'No. It complements welcoming activities and meetings with colleagues. Job information, tool access, support and follow-up meetings still need to be organised as part of your onboarding process.' },
        { question: 'Can we run this session for remote onboarding?', answer: 'Yes. Participants join TeamBlender in their browser. For remote or hybrid groups, plan a separate video conferencing tool and introduce tools and rules before starting challenges.' },
        { question: 'Are results used to assess new employees?', answer: 'Available results support a debrief of challenges and cooperation strategies. They are not an individual diagnosis and should not be presented as a psychometric assessment or a measure of professional aptitude.' },
      ],
    },
  },
];

export function getTeamBuildingGuide(slug, locale) {
  const guide = TEAM_BUILDING_GUIDES.find((entry) => entry.slug === slug);
  return guide ? { ...TEAM_BUILDING_CONTENT[locale], ...guide[locale] } : null;
}
