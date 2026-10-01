export const data = { permalink: "/data/apercus.json", eleventyExcludeFromCollections: true };
export function render({ derived }) {
  return JSON.stringify(derived.previews);
}
