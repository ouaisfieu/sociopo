// llms.txt (présentation pour les modèles de langage) et llms-full.txt (corpus complet en Markdown).
export const data = {
  pagination: { data: "llmsFiles", size: 1, alias: "which" },
  llmsFiles: ["llms", "llms-full"],
  permalink: (d) => `/${d.which}.txt`,
  eleventyExcludeFromCollections: true,
};

export function render({ which, rawCorpus, site, taxonomy }) {
  const abs = (u) => site.url.replace(/\/$/, "") + site.pathPrefix.replace(/\/$/, "") + u;
  const clean = (md = "") =>
    md
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
      .replace(/\[\[([^\]]+)\]\]/g, (_, s) => rawCorpus.get(s.trim())?.title || s)
      .replace(/^:::\s*(\w+)\s*(.*)$/gm, (_, t, title) => (title ? `**${title}**` : ""))
      .replace(/^:::\s*$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  const head = `# ${site.name}

> ${site.description} Contenus sous licence ${site.license.name} ; état des connaissances : ${site.updatedLabel}.

Sociopo est une encyclopédie francophone et interactive de la politique belge : institutions, fédéralisme, partis, élections, gouvernements, concertation sociale, finances publiques, questions communautaires et histoire politique. Chaque notion donne son équivalent officiel en néerlandais, en allemand et en anglais. Les dossiers d'analyse exposent les rapports de forces et les lectures contradictoires ; les notices sont factuelles.
`;
  if (which === "llms") {
    const essentials = rawCorpus.ofType("notion").filter((n) => n.level === 1).sort((a, b) => a.title.localeCompare(b.title, "fr"));
    const sec = (title, list) => `\n## ${title}\n\n${list.map(([t, u, d]) => `- [${t}](${abs(u)})${d ? `: ${d}` : ""}`).join("\n")}\n`;
    return (
      head +
      sec("Sections", [
        ["Lexique A–Z", "/lexique/", "toutes les notions"],
        ["Thèmes", "/themes/", `${taxonomy.THEMES.length} thèmes`],
        ["Partis politiques", "/partis/", "partis actuels et historiques"],
        ["Personnalités", "/personnalites/", "figures clés"],
        ["Gouvernements", "/gouvernements/", "fédéraux depuis 1945, entités fédérées depuis 1999"],
        ["Élections", "/elections/", "résultats depuis 1919"],
        ["Chronologie", "/chronologie/", "1789-2026"],
        ["Dossiers", "/dossiers/", "analyses des rapports de forces"],
      ]) +
      sec("Notions essentielles", essentials.map((n) => [n.title, n.url, n.summary])) +
      sec("Données", [
        ["Jeux de données JSON", "/donnees/", "notions, partis, gouvernements, élections, compétences"],
        ["Thésaurus SKOS (Turtle)", "/thesaurus.ttl", ""],
        ["Corpus complet", "/llms-full.txt", "toutes les notices en Markdown"],
      ]) +
      sec("Optional", [
        ["Méthode et ligne éditoriale", "/methodologie/", ""],
        ["Sources", "/sources/", ""],
        ["Jeux et outils interactifs", "/jouer/", ""],
      ])
    );
  }
  const order = ["notion", "parti", "personne", "dossier"];
  const blocks = rawCorpus.all
    .filter((e) => order.includes(e.type))
    .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || a.title.localeCompare(b.title, "fr"))
    .map((e) => {
      const t = e.terms || {};
      const terms = [t.nl && `NL : ${t.nl}`, t.de && `DE : ${t.de}`, t.en && `EN : ${t.en}`].filter(Boolean).join(" · ");
      return `---\n\n## ${e.title}\n\nURL : ${abs(e.url)}\n${terms ? `Termes : ${terms}\n` : ""}\n${e.summary}\n\n${clean(e.body)}\n`;
    });
  return `${head}\n${blocks.join("\n")}`;
}
