export const data = { permalink: "/data/graphe.json", eleventyExcludeFromCollections: true };
export function render({ derived }) {
  return JSON.stringify(derived.graph);
}
