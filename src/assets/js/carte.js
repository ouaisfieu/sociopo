// Carte schématique de la Belgique en tuiles (une tuile ≈ 22 km × 22 km).
// Volontairement approximative : elle sert à situer, pas à mesurer.
import { el, svgEl, url, params } from "./_ui.js";
import { update } from "./_store.js";

const root = document.querySelector("[data-carte]");

// Grille 12 colonnes (ouest → est) × 10 lignes (nord → sud)
const GRID = [
  "..W..AAA....",
  "WWWOOAAAAL..",
  "WWWOOVAVLLL.",
  "WHWOOBVVLGL.",
  "..HHHRRNGGGD",
  "...HHHNNNGGD",
  ".....HNNXXXD",
  ".....HNNXXX.",
  ".......XXX..",
  ".........XX.",
];

const P = {
  W: { short: "Fl.-Occ.", name: "Flandre-Occidentale", cap: "Bruges", region: "flandre", lang: "nl", circ: 16, label: [1, 2] },
  O: { short: "Fl.-Or.", name: "Flandre-Orientale", cap: "Gand", region: "flandre", lang: "nl", circ: 20, label: [3.5, 2] },
  A: { short: "Anvers", name: "Anvers", cap: "Anvers", region: "flandre", lang: "nl", circ: 24, label: [6, 1] },
  L: { short: "Limbourg", name: "Limbourg", cap: "Hasselt", region: "flandre", lang: "nl", circ: 12, label: [9, 2], note: "La commune des Fourons (Voeren), enclave limbourgeoise entre la province de Liège et les Pays-Bas, offre des facilités aux francophones." },
  V: { short: "Brab. fl.", name: "Brabant flamand", cap: "Louvain", region: "flandre", lang: "nl", circ: 15, label: [7, 3], note: "Entoure Bruxelles ; six communes à facilités pour les francophones (Drogenbos, Kraainem, Linkebeek, Rhode-Saint-Genèse, Wemmel, Wezembeek-Oppem)." },
  B: { short: "BXL", name: "Région de Bruxelles-Capitale", cap: "Bruxelles", region: "bruxelles", lang: "bi", circ: 16, label: [5, 3], note: "19 communes, région bilingue ; ne fait partie d'aucune province depuis 1995." },
  R: { short: "Brab. w.", name: "Brabant wallon", cap: "Wavre", region: "wallonie", lang: "fr", circ: 5, label: [5.5, 4] },
  H: { short: "Hainaut", name: "Hainaut", cap: "Mons", region: "wallonie", lang: "fr", circ: 17, label: [3.5, 4.5], note: "Comprend Mouscron et Comines-Warneton (facilités pour les néerlandophones), rattachées au Hainaut en 1963." },
  N: { short: "Namur", name: "Namur", cap: "Namur", region: "wallonie", lang: "fr", circ: 7, label: [7, 5], note: "Namur est la capitale de la Wallonie." },
  G: { short: "Liège", name: "Liège", cap: "Liège", region: "wallonie", lang: "fr", circ: 14, label: [9.2, 4.5], note: "Malmedy et Waimes offrent des facilités aux germanophones." },
  D: { short: "DG", name: "Communauté germanophone (province de Liège)", cap: "Eupen", region: "wallonie", lang: "de", circ: 14, label: [11, 5], note: "Neuf communes de langue allemande (Eupen, Kelmis, Lontzen, Raeren au nord ; Amel, Büllingen, Burg-Reuland, Bütgenbach, Saint-Vith au sud), avec facilités pour les francophones. Elles relèvent de la province et de la circonscription de Liège." },
  X: { short: "Luxemb.", name: "Luxembourg", cap: "Arlon", region: "wallonie", lang: "fr", circ: 4, label: [8.8, 7], note: "La plus vaste et la moins peuplée des provinces ; la plus petite circonscription de la Chambre (4 sièges)." },
};

const LAYERS = {
  regions: {
    label: "Régions",
    color: (p) => ({ flandre: "var(--p-n-va)", wallonie: "var(--brick)", bruxelles: "var(--accent)" })[p.region],
    legend: [["var(--p-n-va)", "Région flamande"], ["var(--brick)", "Région wallonne"], ["var(--accent)", "Région de Bruxelles-Capitale"]],
    text: (p) => P[p] && ({ flandre: "Région flamande", wallonie: "Région wallonne", bruxelles: "Région de Bruxelles-Capitale" })[P[p].region],
  },
  langues: {
    label: "Régions linguistiques",
    color: (p) => ({ nl: "var(--p-n-va)", fr: "var(--brick)", de: "var(--violet)", bi: "var(--accent)" })[p.lang],
    legend: [["var(--p-n-va)", "Langue néerlandaise"], ["var(--brick)", "Langue française"], ["var(--violet)", "Langue allemande"], ["var(--accent)", "Bilingue (Bruxelles-Capitale)"]],
  },
  provinces: {
    label: "Provinces",
    color: (p, k) => `color-mix(in srgb, ${({ flandre: "var(--p-n-va)", wallonie: "var(--brick)", bruxelles: "var(--accent)" })[p.region]} ${[100, 70, 85, 55, 100, 100, 55, 100, 70, 85, 85, 55]["WOALVBRHNGDX".indexOf(k)]}%, var(--surface))`,
    legend: [["var(--p-n-va)", "Provinces flamandes"], ["var(--brick)", "Provinces wallonnes"], ["var(--accent)", "Hors province"]],
  },
  circonscriptions: {
    label: "Sièges à la Chambre (2024)",
    color: (p) => `color-mix(in srgb, var(--accent) ${Math.round(20 + (p.circ / 24) * 80)}%, var(--surface))`,
    legend: [["color-mix(in srgb, var(--accent) 25%, var(--surface))", "4 sièges"], ["color-mix(in srgb, var(--accent) 60%, var(--surface))", "14 sièges"], ["var(--accent)", "24 sièges"]],
  },
};

let layer = "regions";
let selected = null;

function info(k) {
  const box = root.querySelector("[data-info]");
  if (!k) {
    box.replaceChildren(el("p", { class: "muted" }, "Cliquez sur une tuile pour afficher la fiche du territoire."));
    return;
  }
  const p = P[k];
  const regLabel = { flandre: ["Région flamande", "region-flamande"], wallonie: ["Région wallonne", "region-wallonne"], bruxelles: ["Région de Bruxelles-Capitale", "region-de-bruxelles-capitale"] }[p.region];
  const langLabel = { nl: "néerlandaise", fr: "française", de: "allemande", bi: "bilingue français-néerlandais" }[p.lang];
  box.replaceChildren(
    el("h2", { class: "h3" }, p.name),
    el(
      "dl",
      { class: "facts" },
      el("dt", {}, k === "B" || k === "D" ? "Siège" : "Chef-lieu"),
      el("dd", {}, p.cap),
      el("dt", {}, "Région"),
      el("dd", {}, el("a", { href: url(`/notions/${regLabel[1]}/`) }, regLabel[0])),
      el("dt", {}, "Région linguistique"),
      el("dd", {}, langLabel),
      el("dt", {}, "Circonscription"),
      el("dd", {}, `${p.circ} sièges à la Chambre (2024)`),
    ),
    p.note ? el("p", { class: "small" }, p.note) : "",
  );
}

function draw() {
  const size = 46;
  const gap = 3;
  const svg = svgEl("svg", { class: "map-svg", viewBox: `0 0 ${12 * size} ${10 * size}`, role: "group", "aria-label": `Carte schématique de la Belgique — ${LAYERS[layer].label}` });
  GRID.forEach((row, r) =>
    [...row].forEach((k, c) => {
      if (k === ".") return;
      const p = P[k];
      const g = svgEl("g", { class: "tile", tabindex: 0, role: "button", "aria-label": p.name, "aria-pressed": String(selected === k) });
      const rect = svgEl("rect", { x: c * size + gap / 2, y: r * size + gap / 2, width: size - gap, height: size - gap, rx: 7, style: `fill:${LAYERS[layer].color(p, k)}` });
      if (selected === k) rect.setAttribute("style", `${rect.getAttribute("style")};stroke:var(--ink);stroke-width:3px`);
      const t = svgEl("title");
      t.textContent = p.name;
      g.append(rect, t);
      const act = () => {
        selected = k;
        info(k);
        draw();
      };
      g.addEventListener("click", act);
      g.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), act()));
      svg.append(g);
    }),
  );
  // Étiquettes
  for (const [k, p] of Object.entries(P)) {
    const [cx, cy] = p.label;
    const txt = layer === "circonscriptions" ? (k === "D" ? "" : String(p.circ)) : p.short;
    const t = svgEl("text", { x: cx * size + size / 2, y: cy * size + size / 2 + 5, "text-anchor": "middle", "font-size": layer === "circonscriptions" ? 17 : 12, "font-weight": 700, fill: "#fff", stroke: "rgba(0,0,0,.45)", "stroke-width": 3, "paint-order": "stroke" });
    t.textContent = txt;
    svg.append(t);
  }
  const stage = root.querySelector("[data-map]");
  stage.replaceChildren(svg);
  const legend = root.querySelector("[data-legend]");
  legend.replaceChildren(...LAYERS[layer].legend.map(([c, l]) => el("span", {}, el("i", { style: { background: c } }), l)));
}

function init() {
  if (!root) return;
  const nav = root.querySelector("[data-layers]");
  for (const [id, L] of Object.entries(LAYERS)) {
    nav.append(
      el("button", { type: "button", class: "chip", "aria-pressed": String(id === layer), dataset: { layer: id }, onclick: () => {
        layer = id;
        nav.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.layer === id)));
        draw();
      } }, L.label),
    );
  }
  const q = params().get("p");
  if (q && P[q]) selected = q;
  draw();
  info(selected);
  update((s) => {
    s.games.carte = (s.games.carte || 0) + 1;
  });
}

init();
