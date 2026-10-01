// Quiz : questions rédigées + questions générées à partir des données ouvertes du site.
import { getJSON, el, url, shuffle, params, fmt } from "./_ui.js";
import { update, load } from "./_store.js";

const root = document.querySelector("[data-quiz]");
const ROUND = 10;
const LETTERS = ["A", "B", "C", "D"];

let bank = []; // { id, mode[], q, choices[], answer, x, link }
let themes = [];
let round = null;

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pick = (arr, n, rnd = Math.random) => shuffle(arr, rnd).slice(0, n);
const uniqBy = (arr, f) => {
  const seen = new Set();
  return arr.filter((x) => {
    const k = f(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

function mask(text, title) {
  let out = text;
  const words = [title, title.replace(/^(la|le|les|l')\s*/i, "")].filter((w) => w.length > 3);
  for (const w of words) out = out.replace(new RegExp(escRe(w), "gi"), "…");
  return out;
}

function fromCurated(items) {
  return items.map((it) => ({ id: `c:${it.id}`, modes: ["mixte", it.th], q: it.q, choices: it.c, answer: it.c[it.a], x: it.x, link: it.l, curated: true }));
}

function fromNotions(notions) {
  const out = [];
  const byTheme = {};
  for (const n of notions) for (const t of n.th) (byTheme[t] ||= []).push(n);
  for (const n of notions) {
    const peers = uniqBy([...(byTheme[n.th[0]] || []), ...notions], (p) => p.s).filter((p) => p.s !== n.s);
    if (peers.length < 3) continue;
    const distract = pick(peers.slice(0, 40), 3).map((p) => p.t);
    out.push({
      id: `d:${n.s}`,
      modes: ["definitions", ...n.th],
      q: `Quelle notion correspond à cette définition ? « ${mask(n.d, n.t)} »`,
      choices: [n.t, ...distract],
      answer: n.t,
      x: `${n.t} : ${n.d}`,
      link: n.s,
      linkUrl: n.u,
    });
    for (const [lang, label] of [["nl", "néerlandais"], ["de", "allemand"], ["en", "anglais"]]) {
      if (!n[lang]) continue;
      out.push({
        id: `t:${lang}:${n.s}`,
        modes: ["langues"],
        q: `Quelle notion se dit « ${n[lang]} » en ${label} ?`,
        choices: [n.t, ...pick(peers.slice(0, 40), 3).map((p) => p.t)],
        answer: n.t,
        x: `${n.t} — NL : ${n.nl || "—"} · DE : ${n.de || "—"} · EN : ${n.en || "—"}.`,
        link: n.s,
        linkUrl: n.u,
      });
    }
  }
  return out;
}

function fromChrono(chrono) {
  const items = chrono.items.filter((e) => /^\d{4}/.test(e.date));
  return items.map((e, i) => {
    const y = Number(e.date.slice(0, 4));
    const pool = uniqBy(items.map((o) => Number(o.date.slice(0, 4))).filter((o) => o !== y && Math.abs(o - y) <= 25), (v) => v);
    const near = pick(pool, 3);
    while (near.length < 3) near.push(y + (near.length + 1) * 3);
    return {
      id: `h:${i}`,
      modes: ["chronologie", "histoire"],
      q: `En quelle année : « ${e.title} » ?`,
      choices: [String(y), ...near.map(String)],
      answer: String(y),
      x: e.text,
      link: e.link || null,
    };
  });
}

function fromGovs(govs) {
  const fed = govs.items.filter((g) => g.level === "federal");
  const heads = uniqBy(fed, (g) => g.head_name).map((g) => g.head_name);
  const out = [];
  for (const g of fed) {
    if (!g.start) continue;
    const y = g.start.slice(0, 4);
    out.push({
      id: `g:${g.id}`,
      modes: ["gouvernement"],
      q: `Qui a dirigé le gouvernement fédéral ${g.nickname ? `« ${g.nickname} » ` : ""}entré en fonction en ${y} ?`,
      choices: [g.head_name, ...pick(heads.filter((h) => h !== g.head_name), 3)],
      answer: g.head_name,
      x: g.summary,
      linkUrl: `/gouvernements/${g.id}/`,
    });
  }
  for (const level of ["flandre", "wallonie", "bruxelles", "fwb", "dg"]) {
    const list = govs.items.filter((g) => g.level === level);
    const lheads = uniqBy(govs.items.filter((g) => g.level !== "federal"), (g) => g.head_name).map((g) => g.head_name);
    for (const g of list) {
      out.push({
        id: `g:${g.id}`,
        modes: ["gouvernement", "federalisme"],
        q: `Qui a présidé le gouvernement (${g.level_label}) formé en ${g.start.slice(0, 4)} ?`,
        choices: [g.head_name, ...pick(lheads.filter((h) => h !== g.head_name), 3)],
        answer: g.head_name,
        x: g.summary,
        linkUrl: `/gouvernements/${g.id}/`,
      });
    }
  }
  return out;
}

function fromElections(elections) {
  const out = [];
  for (const e of elections.items.filter((x) => x.type === "chambre" && x.seats?.some((s) => s.seats))) {
    const sorted = [...e.seats].filter((s) => s.seats).sort((a, b) => b.seats - a.seats);
    if (sorted.length < 4 || sorted[0].seats === sorted[1].seats) continue;
    const y = e.date.slice(0, 4);
    out.push({
      id: `e:${e.id}`,
      modes: ["elections"],
      q: `Quel parti a obtenu le plus de sièges à la Chambre en ${y} ?`,
      choices: sorted.slice(0, 4).map((s) => s.label),
      answer: sorted[0].label,
      x: `${sorted[0].label} : ${sorted[0].seats} sièges sur ${e.total}. ${e.summary || ""}`,
      linkUrl: `/elections/${e.id}/`,
    });
  }
  return out;
}

function fromPartis(partis) {
  const withPres = partis.filter((p) => p.president && !p.dissolved);
  const names = withPres.map((p) => p.president.name);
  return withPres.map((p) => ({
    id: `p:${p.slug}`,
    modes: ["partis"],
    q: `Qui préside ${p.short} (${p.title}) en 2026 ?`,
    choices: [p.president.name, ...pick(names.filter((n) => n !== p.president.name), 3)],
    answer: p.president.name,
    x: `${p.president.name} préside ${p.short}${p.president.since ? ` depuis ${p.president.since.slice(0, 4)}` : ""}.`,
    linkUrl: p.url,
  }));
}

const MODES = [
  { id: "mixte", label: "Mixte" },
  { id: "definitions", label: "Définitions" },
  { id: "langues", label: "NL · DE · EN" },
  { id: "chronologie", label: "Chronologie" },
  { id: "gouvernement", label: "Gouvernements" },
  { id: "elections", label: "Élections" },
  { id: "partis", label: "Partis" },
];

function questionsFor(mode) {
  return bank.filter((q) => q.modes.includes(mode) || (mode === "mixte" && !q.curated && Math.random() < 0.08));
}

function start(mode) {
  const pool = questionsFor(mode);
  const curated = shuffle(pool.filter((q) => q.curated));
  const generated = shuffle(pool.filter((q) => !q.curated));
  // Moitié de questions rédigées quand c'est possible, le reste généré.
  const chosen = [...curated.slice(0, Math.ceil(ROUND / 2)), ...generated].slice(0, ROUND);
  const list = shuffle(chosen.length >= ROUND ? chosen : [...chosen, ...curated.slice(Math.ceil(ROUND / 2))].slice(0, ROUND));
  round = { mode, list, i: 0, score: 0, answers: [] };
  const p = new URLSearchParams(location.search);
  p.set("mode", mode);
  history.replaceState(null, "", `${location.pathname}?${p}`);
  show();
}

function show() {
  const stage = root.querySelector("[data-stage]");
  stage.replaceChildren();
  if (round.i >= round.list.length) return finish();
  const q = round.list[round.i];
  const choices = shuffle(uniqBy(q.choices, (c) => c)).slice(0, 4);
  if (!choices.includes(q.answer)) choices[0] = q.answer;
  const top = el(
    "div",
    { class: "quiz-top" },
    el("span", {}, `Question ${round.i + 1} / ${round.list.length}`),
    el("span", { class: "stat-pill" }, `Score : ${round.score}`),
  );
  const bar = el("div", { class: "progressbar", "aria-hidden": "true" }, el("span", { style: { width: `${(round.i / round.list.length) * 100}%` } }));
  const qEl = el("p", { class: "quiz-q", id: "quiz-q", tabindex: "-1" }, q.q);
  const list = el("div", { class: "quiz-choices", role: "group", "aria-labelledby": "quiz-q" });
  const explain = el("div", { "aria-live": "polite" });
  choices.forEach((c, k) => {
    const b = el("button", { type: "button", class: "quiz-choice" }, el("span", { class: "letter", "aria-hidden": "true" }, LETTERS[k]), el("span", {}, c));
    b.addEventListener("click", () => {
      const ok = c === q.answer;
      if (ok) round.score++;
      round.answers.push({ q, ok, given: c });
      for (const btn of list.querySelectorAll("button")) {
        btn.disabled = true;
        const txt = btn.lastChild.textContent;
        if (txt === q.answer) btn.classList.add("correct");
        else if (btn === b) btn.classList.add("wrong");
      }
      const href = q.linkUrl ? url(q.linkUrl) : q.link ? url(`/notions/${q.link}/`) : null;
      explain.append(
        el(
          "div",
          { class: "quiz-explain" },
          el("p", {}, el("strong", {}, ok ? "Bonne réponse ! " : `Raté — la réponse était « ${q.answer} ». `), q.x || ""),
          href && (q.linkUrl || known.has(q.link)) ? el("p", {}, el("a", { href }, "Lire la notice →")) : "",
          el(
            "button",
            { type: "button", class: "btn", onclick: () => ((round.i += 1), show()) },
            round.i + 1 < round.list.length ? "Question suivante" : "Voir mon score",
          ),
        ),
      );
      explain.querySelector("button").focus();
    });
    list.append(b);
  });
  stage.append(top, bar, qEl, list, explain);
  if (round.i > 0) qEl.focus();
}

function finish() {
  const stage = root.querySelector("[data-stage]");
  const n = round.list.length;
  const ratio = n ? round.score / n : 0;
  update((s) => {
    const prev = s.quiz[round.mode] || { best: 0, n: 0, plays: 0 };
    s.quiz[round.mode] = { best: Math.max(prev.best, ratio), n: Math.max(prev.n, n), plays: (prev.plays || 0) + 1, last: ratio };
  });
  const msg = ratio === 1 ? "Sans-faute ! Vous pourriez négocier une réforme de l'État." : ratio >= 0.7 ? "Très bien : vous maîtrisez le sujet." : ratio >= 0.5 ? "Pas mal ! Quelques notices à relire." : "Le compromis à la belge s'apprend avec le temps. Rejouez !";
  const missed = round.answers.filter((a) => !a.ok);
  stage.replaceChildren(
    el(
      "div",
      { class: "center stack" },
      el("p", { class: "eyebrow" }, "Résultat"),
      el("p", { class: "score-big" }, `${round.score} / ${n}`),
      el("p", { class: "lead" }, msg),
      el(
        "div",
        { class: "cluster", style: { justifyContent: "center" } },
        el("button", { type: "button", class: "btn", onclick: () => start(round.mode) }, "Rejouer"),
        el("a", { class: "btn btn-ghost", href: url("/parcours/") }, "Mes badges"),
      ),
    ),
    missed.length
      ? el(
          "div",
          { class: "section" },
          el("h2", { class: "h3" }, "À revoir"),
          el(
            "ul",
            { class: "notice-list" },
            missed.map((a) => el("li", {}, el("b", {}, a.q.answer), el("p", {}, a.q.q))),
          ),
        )
      : "",
  );
}

let known = new Set();

async function init() {
  if (!root) return;
  try {
    const [quiz, notions, chrono, govs, elections, partis] = await Promise.all(
      ["quiz", "notions", "chronologie", "gouvernements", "elections", "partis"].map((n) => getJSON(`/data/${n}.json`).then((r) => r.data)),
    );
    known = new Set(notions.map((n) => n.s));
    bank = [...fromCurated(quiz.items), ...fromNotions(notions), ...fromChrono(chrono), ...fromGovs(govs), ...fromElections(elections), ...fromPartis(partis)];
    themes = [...new Set(quiz.items.map((q) => q.th))];
  } catch (e) {
    root.querySelector("[data-stage]").textContent = "Impossible de charger les questions.";
    return;
  }
  const best = load().quiz;
  const nav = root.querySelector("[data-modes]");
  const labels = Object.fromEntries([...document.querySelectorAll("[data-theme-label]")].map((n) => [n.dataset.themeLabel, n.textContent]));
  const modes = uniqBy([...MODES, ...themes.map((t) => ({ id: t, label: labels[t] || t }))], (m) => m.id);
  for (const m of modes) {
    const count = questionsFor(m.id).length;
    if (count < 4) continue;
    const b = best[m.id];
    nav.append(
      el(
        "button",
        { type: "button", class: "chip", "aria-pressed": "false", dataset: { mode: m.id }, onclick: () => {
          nav.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.mode === m.id)));
          start(m.id);
        } },
        m.label,
        b ? ` · ${Math.round(b.best * 100)} %` : "",
      ),
    );
  }
  const cnt = document.querySelector("[data-count]");
  if (cnt) cnt.textContent = fmt(bank.length);
  const m = params().get("mode");
  const initial = m && questionsFor(m).length >= 4 ? m : "mixte";
  nav.querySelector(`[data-mode="${initial}"]`)?.setAttribute("aria-pressed", "true");
  start(initial);
}

init();
