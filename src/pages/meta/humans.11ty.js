export const data = { permalink: "/humans.txt", eleventyExcludeFromCollections: true };
export function render({ site }) {
  return `/* ÉQUIPE */
Rédaction : ${site.editor} (collectif anonyme)
Contact : ${site.issues}

/* SITE */
Dernière mise à jour : ${site.updated}
Langue : français (termes officiels en néerlandais, allemand et anglais)
Licences : textes et données ${site.license.name}, code ${site.codeLicense.name}
Outils : Eleventy, markdown-it, esbuild, Pagefind, d3-force
Polices : Source Serif 4, Inter (auto-hébergées)
Principes : aucun cookie, aucun traceur, aucune ressource tierce
`;
}
