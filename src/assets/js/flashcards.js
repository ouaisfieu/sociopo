// Cartes mémoire : répétition espacée (boîtes de Leitner), conservée dans le navigateur.
import { getJSON, el, url, shuffle } from "./_ui.js";
import { load, update } from "./_store.js";

const root = document.querySelector("[data-flash]");
const DAY = 86400000;
const INTERVALS = [0, 0, 1, 3, 7, 21]; // jours avant de revoir une carte selon sa boîte (1 à 5)

let notions = [];
let deck = [];
let current = null;
let flipped = false;
let opts = { theme: "toutes", dir: "fr" };

const DIRS = {
  fr: { label: "Notion → définition", front: (n) => n.t, back: (n) => n.d, ok: () => true },
  nl: { label: "Néerlandais → français", front: (n) => n.nl, back: (n) => `${n.t} — ${n.d}`, ok: (n) => !!n.nl },
  de: { label: "Allemand → français", front: (n) => n.de, back: (n) => `${n.t} — ${n.d}`, ok: (n) => !!n.de },
  en: { label: "Anglais → français", front: (n) => n.en, back: (n) => `${n.t} — ${n.d}`, ok: (n) => !!n.en },
  def: { label: "Définition → notion", front: (n) => n.d, back: (n) => n.t, ok: () => true },
};

function boxes() {
  return load().flash.boxes || {};
}

function buildDeck() {
  const b = boxes();
  const now = Date.now();
  const pool = notions.filter((n) => (opts.theme === "toutes" || n.th.includes(opts.theme)) && DIRS[opts.dir].ok(n));
  const due = pool.filter((n) => {
    const s = b[`${opts.dir}:${n.s}`];
    return !s || s.due <= now;
  });
  // Cartes nouvelles et en boîte 1 d'abord, puis les autres cartes dues.
  const weight = (n) => (b[`${opts.dir}:${n.s}`]?.b || 0) + Math.random();
  deck = shuffle(due).sort((x, y) => weight(x) - weight(y)).slice(0, 20);
  renderStats(pool);
  next();
}

function renderStats(pool) {
  const b = boxes();
  const counts = [0, 0, 0, 0, 0, 0];
  for (const n of pool) counts[b[`${opts.dir}:${n.s}`]?.b || 0]++;
  const s = root.querySelector("[data-stats]");
  s.replaceChildren(
    el("span", { class: "stat-pill" }, `${pool.length} cartes`),
    el("span", { class: "stat-pill" }, `Nouvelles : ${counts[0]}`),
    ...[1, 2, 3, 4, 5].map((k) => el("span", { class: "stat-pill", title: `Boîte ${k} : à revoir après ${INTERVALS[k]} jour(s)` }, `Boîte ${k} : ${counts[k]}`)),
    el("span", { class: "stat-pill" }, `Révisions : ${load().flash.reviewed || 0}`),
  );
}

function next() {
  const stage = root.querySelector("[data-card]");
  current = deck.shift();
  flipped = false;
  if (!current) {
    stage.replaceChildren(
      el(
        "div",
        { class: "empty-state" },
        el("p", { class: "lead" }, "Bravo, aucune carte à réviser pour l'instant dans ce paquet."),
        el("p", {}, "Revenez demain, ou choisissez un autre thème ou un autre sens de révision."),
        el("button", { type: "button", class: "btn", onclick: () => ((deck = shuffle(notions.filter((n) => (opts.theme === "toutes" || n.th.includes(opts.theme)) && DIRS[opts.dir].ok(n))).slice(0, 20)), next()) }, "Réviser quand même 20 cartes"),
      ),
    );
    return;
  }
  const d = DIRS[opts.dir];
  const card = el(
    "div",
    { class: "flashcard", tabindex: "0", role: "button", "aria-label": "Retourner la carte", onclick: flip, onkeydown: (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), flip()) },
    el(
      "div",
      { class: "flashcard-inner" },
      el("div", { class: "flashcard-face" }, el("p", { class: "eyebrow" }, current.kl || "Notion"), el("p", { class: opts.dir === "def" ? "" : "term" }, d.front(current)), el("p", { class: "small muted" }, "Cliquez ou appuyez sur Espace pour retourner")),
      el("div", { class: "flashcard-face back" }, el("p", {}, d.back(current)), el("p", { class: "small" }, el("a", { href: url(current.u), onclick: (e) => e.stopPropagation() }, "Lire la notice"))),
    ),
  );
  const actions = el(
    "div",
    { class: "cluster", style: { justifyContent: "center", marginTop: "1rem" } },
    el("button", { type: "button", class: "btn btn-ghost", onclick: () => grade(false) }, "← À revoir"),
    el("button", { type: "button", class: "btn", onclick: () => grade(true) }, "Je savais →"),
  );
  stage.replaceChildren(card, actions, el("p", { class: "small muted center" }, `Encore ${deck.length} carte${deck.length > 1 ? "s" : ""} dans cette série`));
}

function flip() {
  flipped = !flipped;
  root.querySelector(".flashcard")?.classList.toggle("flipped", flipped);
}

function grade(knew) {
  if (!current) return;
  const key = `${opts.dir}:${current.s}`;
  update((s) => {
    s.flash.boxes ||= {};
    const prev = s.flash.boxes[key]?.b || 0;
    const b = knew ? Math.min(5, Math.max(1, prev) + (prev ? 1 : 1)) : 1;
    s.flash.boxes[key] = { b, due: Date.now() + INTERVALS[b] * DAY };
    s.flash.reviewed = (s.flash.reviewed || 0) + 1;
    if (knew && b >= 4) s.mastered[current.s] ||= Date.now();
  });
  if (!knew) deck.splice(Math.min(3, deck.length), 0, current);
  renderStats(notions.filter((n) => (opts.theme === "toutes" || n.th.includes(opts.theme)) && DIRS[opts.dir].ok(n)));
  next();
}

async function init() {
  if (!root) return;
  try {
    notions = (await getJSON("/data/notions.json")).data;
  } catch (e) {
    root.querySelector("[data-card]").textContent = "Impossible de charger les cartes.";
    return;
  }
  const dirSel = root.querySelector("[name=dir]");
  for (const [k, d] of Object.entries(DIRS)) dirSel.append(el("option", { value: k }, d.label));
  dirSel.addEventListener("change", () => ((opts.dir = dirSel.value), buildDeck()));
  const thSel = root.querySelector("[name=theme]");
  thSel.addEventListener("change", () => ((opts.theme = thSel.value), buildDeck()));
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, select, textarea")) return;
    if (e.key === "ArrowRight") grade(true);
    else if (e.key === "ArrowLeft") grade(false);
    else if (e.key === " " && document.activeElement === document.body) {
      e.preventDefault();
      flip();
    }
  });
  buildDeck();
}

init();
