// Flux Atom : dossiers et notices les plus récemment mis à jour.
export const data = { permalink: "/feed.xml", eleventyExcludeFromCollections: true };
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function render({ rawCorpus, site, taxonomy }) {
  const abs = (u) => site.url.replace(/\/$/, "") + site.pathPrefix.replace(/\/$/, "") + u;
  const date = (e) => String(e.data.updated || e.data.published || site.updated).slice(0, 10);
  const items = rawCorpus.all
    .filter((e) => ["notion", "parti", "personne", "dossier"].includes(e.type))
    .sort((a, b) => date(b).localeCompare(date(a)) || (a.type === "dossier" ? -1 : b.type === "dossier" ? 1 : 0) || a.title.localeCompare(b.title, "fr"))
    .slice(0, 60);
  const entries = items.map(
    (e) => `  <entry>
    <id>${abs(e.url)}</id>
    <title>${esc(e.title)}</title>
    <link rel="alternate" type="text/html" href="${abs(e.url)}"/>
    <updated>${date(e)}T00:00:00Z</updated>
    <summary type="text">${esc(e.summary)}</summary>
${(e.themes || []).map((t) => `    <category term="${esc(t)}" label="${esc((taxonomy.THEME_BY_SLUG[t] || {}).label || t)}"/>`).join("\n")}
  </entry>`,
  );
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="fr-BE">
  <id>${abs("/")}</id>
  <title>${esc(site.title)}</title>
  <subtitle>${esc(site.description)}</subtitle>
  <link rel="self" type="application/atom+xml" href="${abs("/feed.xml")}"/>
  <link rel="alternate" type="text/html" href="${abs("/")}"/>
  <updated>${String(site.updated).slice(0, 10)}T00:00:00Z</updated>
  <author><name>${esc(site.editor)}</name></author>
  <rights>${esc(site.license.name)}</rights>
${entries.join("\n")}
</feed>
`;
}
