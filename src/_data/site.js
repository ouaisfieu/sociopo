// Configuration globale du site. Adaptez SITE_URL / PATH_PREFIX pour un domaine personnalisé :
//   SITE_URL=https://exemple.be PATH_PREFIX=/ npm run build
const url = (process.env.SITE_URL || "https://ouaisfieu.github.io").replace(/\/$/, "");
let pathPrefix = process.env.PATH_PREFIX || "/sociopo/";
if (!pathPrefix.startsWith("/")) pathPrefix = `/${pathPrefix}`;
if (!pathPrefix.endsWith("/")) pathPrefix = `${pathPrefix}/`;

export default {
  name: "Sociopo",
  title: "Sociopo — Encyclopédie interactive de la sociopolitique belge",
  tagline: "Comprendre la Belgique politique, sociale et institutionnelle — en jouant.",
  description:
    "Encyclopédie libre, interactive et sans traceur de la sociopolitique belge : institutions, fédéralisme, réformes de l'État, partis, élections, piliers, concertation sociale, finances publiques et histoire politique de 1830 à 2026. Notices reliées, termes NL/DE/EN, simulateurs, quiz et données ouvertes.",
  url,
  pathPrefix,
  base: url + pathPrefix.replace(/\/$/, ""),
  lang: "fr-BE",
  locale: "fr_BE",
  editor: "Rédaction Sociopo",
  repo: "https://github.com/ouaisfieu/sociopo",
  issues: "https://github.com/ouaisfieu/sociopo/issues",
  license: { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/deed.fr" },
  codeLicense: { name: "MIT", url: "https://opensource.org/license/mit" },
  // Date de l'état des connaissances (mise à jour éditoriale générale)
  updated: "2026-10-01",
  updatedLabel: "1er octobre 2026",
  nextElections: { label: "Élections fédérales, régionales et européennes", date: "2029-06" },
  related: [
    { name: "Le Dossier Arizona", url: "https://ouaisfieu.github.io/arizona/", desc: "Enquête au long cours sur la coalition fédérale 2025-2026." },
    { name: "Le Budget Arizona", url: "https://ouaisfieu.github.io/arizona/budget/", desc: "Dossier chiffré du budget fédéral 2025-2029." },
    { name: "Le Conclave", url: "https://ouaisfieu.github.io/conclave/fr/", desc: "Simulateur du conclave budgétaire fédéral." },
  ],
  themeColor: "#1f3a5f",
  buildTime: new Date().toISOString(),
};
