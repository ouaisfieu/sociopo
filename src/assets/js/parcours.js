// Mon parcours : statistiques, badges, export / import de la progression (aucune donnée ne quitte le navigateur).
import { el, url, toast } from "./_ui.js";
import { load, save, reset, BADGES, stats, evaluateBadges } from "./_store.js";

const root = document.querySelector("[data-parcours]");
const LABELS = { mixte: "Quiz mixte", definitions: "Définitions", langues: "NL · DE · EN", chronologie: "Chronologie", gouvernement: "Gouvernements", elections: "Élections", partis: "Partis", competences: "Qui est compétent ?" };

function render() {
  const s = load();
  const st = stats(s);
  root.querySelector("[data-stats]").replaceChildren(
    ...[
      [st.visited, "entrées consultées"],
      [st.mastered, "notions maîtrisées"],
      [st.quizzes, "quiz joués"],
      [`${st.badges} / ${BADGES.length}`, "badges"],
    ].map(([v, l]) => el("div", { class: "stat" }, el("span", { class: "v" }, String(v)), el("span", { class: "l" }, l))),
  );
  root.querySelector("[data-badges]").replaceChildren(
    ...BADGES.map((b) => {
      const got = s.badges[b.id];
      return el(
        "div",
        { class: `badge-card${got ? " earned" : ""}` },
        el("div", { class: "medal", "aria-hidden": "true" }),
        el("b", {}, b.label),
        el("span", {}, got ? `Obtenu le ${new Date(got).toLocaleDateString("fr-BE")}` : b.desc),
      );
    }),
  );
  // Icônes des médailles (sprite SVG du site)
  root.querySelectorAll(".badge-card .medal").forEach((m, i) => {
    m.innerHTML = `<svg aria-hidden="true"><use href="#i-${BADGES[i].icon}"></use></svg>`;
  });
  const q = Object.entries(s.quiz);
  root.querySelector("[data-quiz]").replaceChildren(
    q.length
      ? el(
          "table",
          { class: "data" },
          el("thead", {}, el("tr", {}, el("th", {}, "Jeu"), el("th", { class: "num" }, "Meilleur score"), el("th", { class: "num" }, "Parties"))),
          el("tbody", {}, q.map(([k, v]) => el("tr", {}, el("td", {}, LABELS[k] || k.replace(/-/g, " ")), el("td", { class: "num" }, `${Math.round((v.best || 0) * 100)} %`), el("td", { class: "num" }, String(v.plays || 1))))),
        )
      : el("p", { class: "empty-state" }, "Aucun quiz joué pour l'instant. ", el("a", { href: url("/jouer/quiz/") }, "Lancer un quiz")),
  );
}

function init() {
  if (!root) return;
  render();
  root.querySelector("[data-export]").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(load(), null, 1)], { type: "application/json" });
    const a = el("a", { href: URL.createObjectURL(blob), download: `sociopo-parcours-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a);
    a.click();
    a.remove();
  });
  root.querySelector("[data-import]").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (typeof data !== "object" || !data.visited) throw new Error("format");
      evaluateBadges(data);
      save(data);
      render();
      toast("Parcours importé.");
    } catch (err) {
      toast("Fichier non reconnu.");
    }
  });
  root.querySelector("[data-reset]").addEventListener("click", () => {
    if (!confirm("Effacer toute votre progression enregistrée dans ce navigateur ?")) return;
    reset();
    render();
    toast("Progression effacée.");
  });
  window.addEventListener("sociopo:progress", render);
}

init();
