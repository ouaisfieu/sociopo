// Plan du site XML (exclut les pages en noindex et les points de données).
export const data = { permalink: "/sitemap.xml", eleventyExcludeFromCollections: true };

export function render({ collections, site }) {
  const abs = (u) => site.url.replace(/\/$/, "") + site.pathPrefix.replace(/\/$/, "") + u;
  const pages = collections.all
    .filter((p) => p.url && p.url.endsWith("/") && !String(p.data.robots || "").includes("noindex"))
    .sort((a, b) => a.url.localeCompare(b.url));
  const prio = (u) => (u === "/" ? "1.0" : /^\/(lexique|themes|partis|jouer|gouvernements|elections|dossiers|chronologie)\/$/.test(u) ? "0.9" : u.startsWith("/notions/") ? "0.8" : "0.6");
  const rows = pages.map((p) => {
    const e = p.data.entry;
    const lastmod = String((e && e.data && e.data.updated) || site.updated).slice(0, 10);
    return `  <url><loc>${abs(p.url)}</loc><lastmod>${lastmod}</lastmod><priority>${prio(p.url)}</priority></url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`;
}
