// Service worker : lecture hors ligne des pages déjà visitées et des ressources du site.
export const data = { permalink: "/sw.js", eleventyExcludeFromCollections: true };

export function render({ site }) {
  const p = site.pathPrefix;
  const precache = ["", "lexique/", "jouer/", "assets/css/main.css", "assets/css/partis.css", "assets/js/core.js", "assets/fonts/inter-latin-wght-normal.woff2", "assets/fonts/source-serif-4-latin-wght-normal.woff2", "assets/img/favicon.svg"].map((u) => p + u);
  return `// Sociopo — service worker (version ${site.buildTime})
const VERSION = ${JSON.stringify(String(site.buildTime))};
const CACHE = "sociopo-" + VERSION;
const PRECACHE = ${JSON.stringify(precache)};

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("sociopo-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.pathname.startsWith(${JSON.stringify(p)})) return;
  if (req.mode === "navigate") {
    // Pages : réseau d'abord, cache ensuite (lecture hors ligne des pages visitées)
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(${JSON.stringify(p)}))),
    );
    return;
  }
  // Ressources : cache d'abord, mise à jour en arrière-plan
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || net;
    }),
  );
});
`;
}
