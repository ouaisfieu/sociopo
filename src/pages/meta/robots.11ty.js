export const data = { permalink: "/robots.txt", eleventyExcludeFromCollections: true };
export function render({ site }) {
  const root = site.url.replace(/\/$/, "") + site.pathPrefix;
  return `# Sociopo — encyclopédie libre (CC BY 4.0). Exploration bienvenue.
User-agent: *
Allow: /
Disallow: ${site.pathPrefix}recherche/?

Sitemap: ${root}sitemap.xml
`;
}
