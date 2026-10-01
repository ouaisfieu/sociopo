// « Qui est compétent ? » : deviner le niveau de pouvoir responsable d'une matière.
import { getJSON, el, url, shuffle } from "./_ui.js";
import { update } from "./_store.js";

const root = document.querySelector("[data-competences]");
const N = 12;
const ORDER = ["europe", "federal", "communautes", "regions", "local", "partagee"];
const COLORS = { europe: "var(--violet)", federal: "var(--accent)", communautes: "var(--brick)", regions: "var(--green)", local: "var(--ochre)", partagee: "var(--muted)" };

let data = null;
let known = new Set();
let game = null;

function start() {
  game = { items: shuffle(data.items).slice(0, N), i: 0, score: 0, streak: 0, best: 0 };
  show();
}

function show() {
  const stage = root.querySelector("[data-stage]");
  if (game.i >= game.items.length) return finish();
  const it = game.items[game.i];
  const fb = el("div", { "aria-live": "polite" });
  const buttons = el("div", { class: "choice-grid", role: "group", "aria-label": "Niveau de pouvoir" });
  for (const lv of ORDER) {
    const b = el("button", { type: "button", class: "quiz-choice", dataset: { lv } }, el("span", { class: "letter", style: { background: COLORS[lv], color: "#fff" }, "aria-hidden": "true" }, lv === "partagee" ? "+" : data.levels[lv].short.charAt(0)), el("span", {}, lv === "partagee" ? "Plusieurs niveaux" : data.levels[lv].label));
    b.addEventListener("click", () => answer(lv, buttons, fb));
    buttons.append(b);
  }
  stage.replaceChildren(
    el("div", { class: "quiz-top" }, el("span", {}, `Matière ${game.i + 1} / ${game.items.length}`), el("span", { class: "stat-pill" }, `Score : ${game.score}`), game.streak > 1 ? el("span", { class: "stat-pill" }, `Série : ${game.streak}`) : ""),
    el("div", { class: "progressbar", "aria-hidden": "true" }, el("span", { style: { width: `${(game.i / game.items.length) * 100}%` } })),
    el("p", { class: "eyebrow" }, "Qui est compétent pour…"),
    el("p", { class: "quiz-q", tabindex: "-1" }, `${it.q} ?`),
    buttons,
    fb,
  );
  if (game.i > 0) stage.querySelector(".quiz-q").focus();
}

function answer(lv, buttons, fb) {
  const it = game.items[game.i];
  const ok = lv === it.a;
  if (ok) {
    game.score++;
    game.streak++;
    game.best = Math.max(game.best, game.streak);
  } else game.streak = 0;
  for (const b of buttons.querySelectorAll("button")) {
    b.disabled = true;
    if (b.dataset.lv === it.a) b.classList.add("correct");
    else if (b.dataset.lv === lv) b.classList.add("wrong");
  }
  fb.append(
    el(
      "div",
      { class: "quiz-explain" },
      el("p", {}, el("strong", {}, ok ? "Exact ! " : `Non : ${data.levels[it.a].label}. `), it.x),
      it.link && known.has(it.link) ? el("p", {}, el("a", { href: url(`/notions/${it.link}/`) }, "Lire la notice →")) : "",
      el("button", { type: "button", class: "btn", onclick: () => ((game.i += 1), show()) }, game.i + 1 < game.items.length ? "Matière suivante" : "Voir mon score"),
    ),
  );
  fb.querySelector("button").focus();
}

function finish() {
  const ratio = game.score / game.items.length;
  update((s) => {
    const prev = s.quiz.competences || { best: 0, n: 0, plays: 0 };
    s.quiz.competences = { best: Math.max(prev.best, ratio), n: game.items.length, plays: (prev.plays || 0) + 1, last: ratio };
    s.games.competences = (s.games.competences || 0) + 1;
  });
  const msg = ratio >= 0.9 ? "Digne d'un conseiller au Comité de concertation !" : ratio >= 0.6 ? "Bonne maîtrise de la lasagne institutionnelle." : "Rassurez-vous : même les ministres s'y perdent parfois.";
  root.querySelector("[data-stage]").replaceChildren(
    el(
      "div",
      { class: "center stack" },
      el("p", { class: "eyebrow" }, "Résultat"),
      el("p", { class: "score-big" }, `${game.score} / ${game.items.length}`),
      el("p", { class: "lead" }, msg),
      el("p", { class: "small muted" }, `Meilleure série : ${game.best}`),
      el("div", { class: "cluster", style: { justifyContent: "center" } }, el("button", { type: "button", class: "btn", onclick: start }, "Nouvelle partie"), el("a", { class: "btn btn-ghost", href: "#tableau" }, "Voir le tableau complet")),
    ),
  );
}

async function init() {
  if (!root) return;
  try {
    const [c, n] = await Promise.all([getJSON("/data/competences.json"), getJSON("/data/notions.json")]);
    data = c.data;
    known = new Set(n.data.map((x) => x.s));
  } catch (e) {
    root.querySelector("[data-stage]").textContent = "Impossible de charger les données.";
    return;
  }
  start();
}

init();
