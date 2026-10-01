export const data = { permalink: "/manifest.webmanifest", eleventyExcludeFromCollections: true };
export function render({ site }) {
  const p = site.pathPrefix;
  return JSON.stringify(
    {
      name: site.title,
      short_name: "Sociopo",
      description: site.description,
      lang: "fr-BE",
      dir: "ltr",
      start_url: p,
      scope: p,
      display: "standalone",
      background_color: "#fbfaf6",
      theme_color: "#1f3a63",
      categories: ["education", "reference", "politics"],
      icons: [
        { src: `${p}assets/img/icon-192.png`, sizes: "192x192", type: "image/png" },
        { src: `${p}assets/img/logo-512.png`, sizes: "512x512", type: "image/png" },
        { src: `${p}assets/img/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      shortcuts: [
        { name: "Lexique A–Z", url: `${p}lexique/` },
        { name: "Simulateur de coalitions", url: `${p}jouer/coalitions/` },
        { name: "Quiz", url: `${p}jouer/quiz/` },
      ],
    },
    null,
    2,
  );
}
