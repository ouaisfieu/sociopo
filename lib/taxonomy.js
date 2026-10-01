// Taxonomie éditoriale de Sociopo : thèmes (navigation) et natures d'entrées (typage sémantique).

/**
 * Thèmes : chaque notice appartient à un ou plusieurs thèmes.
 * `icon` renvoie à un symbole SVG du sprite (src/_includes/partials/icons.njk).
 */
export const THEMES = [
  {
    slug: "institutions-federales",
    label: "Institutions fédérales",
    short: "Institutions",
    icon: "columns",
    intro:
      "Le Roi, les Chambres, le gouvernement fédéral et les grandes juridictions : l'architecture de l'État fédéral belge et la manière dont ses organes se contrôlent mutuellement.",
  },
  {
    slug: "federalisme",
    label: "Fédéralisme et entités fédérées",
    short: "Fédéralisme",
    icon: "layers",
    intro:
      "Régions, Communautés, commissions communautaires : la « lasagne » institutionnelle belge, la répartition des compétences, leur financement et les outils de coopération.",
  },
  {
    slug: "reformes-etat",
    label: "Réformes de l'État",
    short: "Réformes de l'État",
    icon: "wrench",
    intro:
      "De l'État unitaire de 1831 à l'État fédéral : six grandes réformes (1970-2014), les accords qui les ont rendues possibles et les débats sur la suivante.",
  },
  {
    slug: "pouvoirs-locaux",
    label: "Provinces et pouvoirs locaux",
    short: "Pouvoirs locaux",
    icon: "home",
    intro:
      "Communes, provinces, CPAS, intercommunales, zones de police : le niveau de pouvoir le plus proche des citoyens et sa tutelle régionale.",
  },
  {
    slug: "gouvernement",
    label: "Formation et vie des gouvernements",
    short: "Gouvernements",
    icon: "crown-chair",
    intro:
      "Informateurs, formateurs, accords de coalition, affaires courantes, kern : comment se forme, fonctionne et tombe un gouvernement en Belgique.",
  },
  {
    slug: "parlement",
    label: "Parlement et fabrication des normes",
    short: "Parlement",
    icon: "hemicycle",
    intro:
      "Lois, décrets, ordonnances : les procédures législatives, le contrôle parlementaire, les majorités spéciales et les mécanismes de protection des minorités.",
  },
  {
    slug: "elections",
    label: "Élections et systèmes électoraux",
    short: "Élections",
    icon: "ballot",
    intro:
      "Vote obligatoire, représentation proportionnelle, D'Hondt, seuil électoral, circonscriptions : les règles qui transforment des voix en sièges.",
  },
  {
    slug: "partis",
    label: "Partis et familles politiques",
    short: "Partis",
    icon: "flag",
    intro:
      "Un système partisan scindé par la frontière linguistique : familles politiques, particratie, cordon sanitaire et recompositions successives.",
  },
  {
    slug: "piliers-societe-civile",
    label: "Clivages, piliers et société civile",
    short: "Piliers",
    icon: "pillars",
    intro:
      "Les trois grands clivages, les mondes catholique, socialiste et libéral, la pilarisation, et l'univers associatif qui structure la société belge.",
  },
  {
    slug: "travail-concertation",
    label: "Travail et concertation sociale",
    short: "Concertation sociale",
    icon: "handshake",
    intro:
      "Syndicats, organisations patronales, commissions paritaires, accords interprofessionnels, norme salariale, grèves : la démocratie sociale à la belge.",
  },
  {
    slug: "protection-sociale",
    label: "Sécurité sociale et protection sociale",
    short: "Sécurité sociale",
    icon: "shield",
    intro:
      "Du Pacte social de 1944 aux réformes de 2025-2026 : branches de la sécurité sociale, assistance sociale, acteurs et débats sur sa régionalisation.",
  },
  {
    slug: "economie-finances",
    label: "Économie, finances publiques et fiscalité",
    short: "Économie & finances",
    icon: "coins",
    intro:
      "Budget, dette, fiscalité, Banque nationale, holdings et entreprises publiques : les rapports de forces économiques et la contrainte budgétaire européenne.",
  },
  {
    slug: "communautaire",
    label: "Question communautaire et linguistique",
    short: "Communautaire",
    icon: "languages",
    intro:
      "Lois linguistiques, frontière linguistique, facilités, BHV, mouvements flamand et wallon : le conflit qui a refaçonné l'État.",
  },
  {
    slug: "bruxelles",
    label: "Bruxelles",
    short: "Bruxelles",
    icon: "building",
    intro:
      "Région bilingue, capitale fédérale et européenne : des institutions d'une complexité unique, des garanties pour les néerlandophones et une périphérie disputée.",
  },
  {
    slug: "ethique-enseignement-cultes",
    label: "Enseignement, cultes et questions éthiques",
    short: "Éthique & cultes",
    icon: "book",
    intro:
      "Guerres scolaires, Pacte scolaire, cultes reconnus, laïcité organisée et grandes lois éthiques : le clivage philosophique en action.",
  },
  {
    slug: "monarchie",
    label: "Monarchie",
    short: "Monarchie",
    icon: "crown",
    intro:
      "Une monarchie constitutionnelle et parlementaire : pouvoirs du Roi, contreseing ministériel, Question royale et débats sur la monarchie protocolaire.",
  },
  {
    slug: "justice-droits",
    label: "Justice, droits et sécurité",
    short: "Justice & droits",
    icon: "scales",
    intro:
      "Organisation judiciaire, juridictions administratives et constitutionnelle, droits fondamentaux, police et renseignement.",
  },
  {
    slug: "histoire",
    label: "Histoire politique",
    short: "Histoire",
    icon: "hourglass",
    intro:
      "De la révolution de 1830 à la législature 2024-2029 : les crises, les compromis et les ruptures qui expliquent la Belgique d'aujourd'hui.",
  },
  {
    slug: "europe-international",
    label: "Europe et relations internationales",
    short: "Europe & monde",
    icon: "globe",
    intro:
      "La Belgique dans l'Union européenne et l'OTAN, la politique étrangère d'un État fédéral, l'héritage colonial.",
  },
  {
    slug: "medias-democratie",
    label: "Médias, opinion et participation",
    short: "Médias & démocratie",
    icon: "megaphone",
    intro:
      "Paysage médiatique, sondages, lobbying, démocratie participative, transparence et contrôle des dépenses électorales.",
  },
  {
    slug: "administration",
    label: "Administration et services publics",
    short: "Administration",
    icon: "folder",
    intro:
      "SPF, organismes d'intérêt public, entreprises publiques, fonction publique et cabinets ministériels.",
  },
  {
    slug: "migrations-diversite",
    label: "Migrations, nationalité et diversité",
    short: "Migrations",
    icon: "passport",
    intro:
      "Immigration de travail, asile, nationalité, régularisations, lutte contre les discriminations : un champ politique devenu central.",
  },
  {
    slug: "energie-environnement",
    label: "Énergie, climat et environnement",
    short: "Énergie & climat",
    icon: "leaf",
    intro:
      "Nucléaire, sécurité d'approvisionnement, politiques climatiques réparties entre niveaux de pouvoir : un dossier où s'entremêlent État, marché et Régions.",
  },
];

export const THEME_BY_SLUG = Object.fromEntries(THEMES.map((t) => [t.slug, t]));

/**
 * Natures d'entrées : déterminent le libellé, l'article de présentation
 * et le typage schema.org de l'entité décrite.
 */
export const KINDS = {
  concept: { label: "Notion", plural: "Notions", schema: ["DefinedTerm"], lower: true },
  procedure: { label: "Procédure", plural: "Procédures", schema: ["DefinedTerm"], lower: true },
  fonction: { label: "Fonction", plural: "Fonctions et mandats", schema: ["DefinedTerm"], lower: true },
  doctrine: { label: "Doctrine / courant", plural: "Doctrines et courants", schema: ["DefinedTerm"], lower: true },
  institution: { label: "Institution", plural: "Institutions", schema: ["GovernmentOrganization"], lower: false },
  organisation: { label: "Organisation", plural: "Organisations", schema: ["Organization"], lower: false },
  loi: { label: "Texte normatif", plural: "Textes normatifs", schema: ["Legislation"], lower: false },
  accord: { label: "Accord / pacte", plural: "Accords et pactes", schema: ["CreativeWork"], lower: false },
  evenement: { label: "Événement", plural: "Événements", schema: ["Event"], lower: false },
  territoire: { label: "Territoire", plural: "Territoires", schema: ["AdministrativeArea"], lower: false },
  parti: { label: "Parti politique", plural: "Partis politiques", schema: ["PoliticalParty"], lower: false },
  personne: { label: "Personnalité", plural: "Personnalités", schema: ["Person"], lower: false },
  dossier: { label: "Dossier", plural: "Dossiers", schema: ["Article"], lower: false },
  gouvernement: { label: "Gouvernement", plural: "Gouvernements", schema: ["GovernmentOrganization"], lower: false },
  election: { label: "Élection", plural: "Élections", schema: ["Event"], lower: false },
};

/** Familles politiques (pour les partis, la généalogie et les couleurs de repli). */
export const FAMILIES = {
  "chretienne-democrate": { label: "Démocratie chrétienne / centre", order: 6 },
  liberale: { label: "Libéralisme", order: 8 },
  socialiste: { label: "Socialisme / social-démocratie", order: 2 },
  ecologiste: { label: "Écologie politique", order: 4 },
  "gauche-radicale": { label: "Gauche radicale / communisme", order: 1 },
  "nationaliste-flamande": { label: "Nationalisme flamand", order: 9 },
  "extreme-droite": { label: "Extrême droite / droite radicale", order: 10 },
  regionaliste: { label: "Régionalisme / défense des francophones", order: 5 },
  regionaliste_de: { label: "Régionalisme germanophone", order: 5 },
  populiste: { label: "Populisme / divers droite", order: 9 },
  autre: { label: "Autres", order: 7 },
};

/** Libellé en contexte courant (« les affaires courantes ») selon la nature. */
export function runningLabel(entry) {
  if (entry.label) return entry.label;
  const k = KINDS[entry.kind];
  if (k && k.lower && entry.title) return entry.title.charAt(0).toLowerCase() + entry.title.slice(1);
  return entry.title;
}
