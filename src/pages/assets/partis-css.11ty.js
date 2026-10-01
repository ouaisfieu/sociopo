// Feuille de style générée : couleurs des partis (clair / sombre), validées pour la lisibilité
// des hémicycles (voir docs/couleurs.md). Usage : var(--p-<slug>).
export const data = { permalink: "/assets/css/partis.css", eleventyExcludeFromCollections: true };
export function render({ corpus }) {
  const parties = corpus.partis.filter((p) => p.data.color);
  const light = parties.map((p) => `--p-${p.slug}:${p.data.color}`).join(";");
  const dark = parties.map((p) => `--p-${p.slug}:${p.data.color_dark || p.data.color}`).join(";");
  return `:root{${light};--p-autre:#9a9890}\n@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${dark};--p-autre:#77756f}}\n:root[data-theme="dark"]{${dark};--p-autre:#77756f}\n`;
}
