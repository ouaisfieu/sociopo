// Calculateur de répartition des sièges : D'Hondt, Imperiali, Sainte-Laguë, Hare (plus forts restes).
import { el, getJSON, fmt, params, toast } from "./_ui.js";
import { update } from "./_store.js";

const root = document.querySelector("[data-dhondt]");

const METHODS = {
  dhondt: { label: "D'Hondt", div: (n) => n + 1, note: "Diviseurs 1, 2, 3, 4… Utilisée pour la Chambre, les parlements régionaux et communautaires, le Parlement européen et les conseils provinciaux." },
  imperiali: { label: "Imperiali", div: (n) => 1 + n / 2, note: "Diviseurs 1 ; 1,5 ; 2 ; 2,5… (ce qui revient à diviser par 2, 3, 4, 5… : D'Hondt privé de son premier diviseur). Historiquement appliquée aux conseils communaux, elle avantage davantage les grandes listes que D'Hondt." },
  sainteLague: { label: "Sainte-Laguë", div: (n) => 2 * n + 1, note: "Diviseurs 1, 3, 5, 7… Plus favorable aux petites listes ; utilisée notamment en Allemagne et dans les pays scandinaves (sous une forme modifiée)." },
  hare: { label: "Hare (plus forts restes)", quota: true, note: "Chaque liste reçoit autant de sièges que de fois le quotient (voix ÷ sièges), les sièges restants allant aux plus forts restes." },
};

const PRESETS = {
  exemple: {
    label: "Exemple pédagogique (7 sièges)",
    seats: 7,
    threshold: 0,
    lists: [
      ["Liste A", 34000],
      ["Liste B", 25000],
      ["Liste C", 16000],
      ["Liste D", 9000],
      ["Liste E", 4500],
    ],
  },
  communale: {
    label: "Conseil communal fictif (25 sièges)",
    seats: 25,
    threshold: 0,
    lists: [
      ["Liste du bourgmestre", 6120],
      ["Alternative", 3980],
      ["Ensemble", 2410],
      ["Écologie locale", 1350],
      ["Citoyens", 620],
      ["Indépendants", 310],
    ],
  },
};

let state = { method: "dhondt", seats: 7, threshold: 0, lists: PRESETS.exemple.lists.map(([n, v]) => ({ n, v })) };

function allocate({ method, seats, threshold, lists }) {
  const total = lists.reduce((a, l) => a + (Number(l.v) || 0), 0);
  const eligible = lists.map((l) => ({ ...l, v: Number(l.v) || 0, ok: total > 0 && (Number(l.v) || 0) / total >= threshold / 100 }));
  const res = eligible.map((l) => ({ ...l, seats: 0, q: [] }));
  const M = METHODS[method];
  const pool = res.filter((r) => r.ok && r.v > 0);
  if (!pool.length || seats < 1) return { res, total, winners: [] };
  if (M.quota) {
    const vt = pool.reduce((a, r) => a + r.v, 0);
    const quota = vt / seats;
    for (const r of pool) {
      r.seats = Math.floor(r.v / quota);
      r.rest = r.v - r.seats * quota;
    }
    let left = seats - pool.reduce((a, r) => a + r.seats, 0);
    const byRest = [...pool].sort((a, b) => b.rest - a.rest);
    for (let i = 0; left > 0; i = (i + 1) % byRest.length, left--) byRest[i].seats++;
    return { res, total, quota, winners: [] };
  }
  // Méthodes du plus fort quotient : on génère assez de quotients pour chaque liste.
  const all = [];
  for (const r of pool) {
    for (let k = 0; k < seats; k++) {
      const q = r.v / M.div(k);
      r.q.push(q);
      all.push({ r, k, q });
    }
  }
  all.sort((a, b) => b.q - a.q || b.r.v - a.r.v);
  const winners = all.slice(0, seats);
  for (const w of winners) {
    w.r.seats++;
    w.win = true;
  }
  const last = winners[winners.length - 1];
  return { res, total, winners, last, next: all[seats] };
}

function gallagher(res, total, seats) {
  if (!total || !seats) return 0;
  const s = res.reduce((a, r) => a + ((r.v / total) * 100 - (r.seats / seats) * 100) ** 2, 0);
  return Math.sqrt(s / 2);
}

function render() {
  const out = allocate(state);
  const { res, total } = out;
  const M = METHODS[state.method];
  const box = root.querySelector("[data-result]");
  box.replaceChildren();

  // Tableau des quotients
  if (!M.quota) {
    const cols = Math.min(state.seats, 12);
    const winSet = new Set(out.winners.map((w) => `${res.indexOf(w.r)}:${w.k}`));
    const thead = el("tr", {}, el("th", {}, "Liste"), el("th", { class: "num" }, "Voix"), ...Array.from({ length: cols }, (_, k) => el("th", { class: "num" }, `÷ ${fmt(M.div(k), M.div(k) % 1 ? 1 : 0)}`)), el("th", { class: "num" }, "Sièges"));
    const rows = res.map((r, i) =>
      el(
        "tr",
        { class: r.seats ? "win" : "" },
        el("td", {}, r.n || `Liste ${i + 1}`, r.ok ? "" : el("small", { class: "muted" }, " (sous le seuil)")),
        el("td", { class: "num" }, fmt(r.v)),
        ...Array.from({ length: cols }, (_, k) => el("td", { class: `num${winSet.has(`${i}:${k}`) ? " q-win" : ""}` }, r.ok && r.v ? fmt(r.v / M.div(k)) : "—")),
        el("td", { class: "num" }, el("b", {}, String(r.seats))),
      ),
    );
    box.append(
      el("h2", { class: "h3" }, "Tableau des quotients"),
      el("p", { class: "small muted" }, `Les ${state.seats} plus grands quotients (surlignés) emportent chacun un siège.${state.seats > cols ? ` Seules les ${cols} premières colonnes sont affichées.` : ""}`),
      el("div", { class: "table-wrap" }, el("table", { class: "data" }, el("thead", {}, thead), el("tbody", {}, rows))),
    );
    if (out.last && out.next)
      box.append(
        el(
          "p",
          { class: "callout callout-exemple" },
          `Dernier siège attribué à « ${out.last.r.n} » (quotient ${fmt(out.last.q)}). Prochain en lice : « ${out.next.r.n} » (${fmt(out.next.q)}), à qui il aurait manqué environ ${fmt(Math.ceil((out.last.q - out.next.q) * METHODS[state.method].div(out.next.k)))} voix.`,
        ),
      );
  } else {
    box.append(el("p", { class: "callout callout-exemple" }, `Quotient de Hare : ${fmt(out.quota, 1)} voix par siège.`));
  }

  // Barres voix / sièges
  const bars = el("div", { class: "stack" });
  for (const r of res) {
    const pv = total ? (r.v / total) * 100 : 0;
    const ps = state.seats ? (r.seats / state.seats) * 100 : 0;
    bars.append(
      el(
        "div",
        { class: "vs-row" },
        el("span", {}, r.n),
        el(
          "div",
          { class: "bars", "aria-hidden": "true" },
          el("div", { style: { width: `${pv}%`, background: "var(--muted)" }, title: `${fmt(pv, 1)} % des voix` }),
          el("div", { style: { width: `${ps}%`, background: "var(--accent)" }, title: `${fmt(ps, 1)} % des sièges` }),
        ),
        el("span", { class: "v" }, `${fmt(pv, 1)} % des voix → ${r.seats} siège${r.seats > 1 ? "s" : ""} (${fmt(ps, 1)} %)`),
      ),
    );
  }
  const g = gallagher(res, total, state.seats);
  box.append(
    el("h2", { class: "h3" }, "Voix et sièges"),
    el("p", { class: "small muted" }, "Pour chaque liste : part des voix (barre grise) et part des sièges (barre colorée)."),
    bars,
    el(
      "p",
      { class: "score-line" },
      el("span", { class: "stat-pill" }, `Indice de disproportionnalité de Gallagher : ${fmt(g, 2)}`),
      el("span", { class: "small muted" }, g < 3 ? "très proportionnel" : g < 6 ? "modérément proportionnel" : "fortement disproportionnel"),
    ),
  );
  root.querySelector("[data-method-note]").textContent = M.note;
}

function renderInputs() {
  const tb = root.querySelector("[data-lists]");
  tb.replaceChildren();
  state.lists.forEach((l, i) => {
    tb.append(
      el(
        "tr",
        {},
        el("td", {}, el("input", { class: "input", type: "text", value: l.n, "aria-label": `Nom de la liste ${i + 1}`, oninput: (e) => ((l.n = e.target.value), render()) })),
        el("td", {}, el("input", { class: "input num", type: "number", min: 0, step: 1, value: l.v, "aria-label": `Voix de la liste ${i + 1}`, oninput: (e) => ((l.v = Number(e.target.value) || 0), render()) })),
        el("td", {}, el("button", { type: "button", class: "btn btn-small btn-ghost", "aria-label": `Supprimer la liste ${i + 1}`, onclick: () => (state.lists.splice(i, 1), renderInputs(), render()) }, "×")),
      ),
    );
  });
  root.querySelector("[name=seats]").value = state.seats;
  root.querySelector("[name=threshold]").value = state.threshold;
  root.querySelector("[name=method]").value = state.method;
}

function load(preset) {
  state = { ...state, seats: preset.seats, threshold: preset.threshold, lists: preset.lists.map(([n, v]) => ({ n, v })) };
  renderInputs();
  render();
}

async function init() {
  if (!root) return;
  root.querySelector("[name=seats]").addEventListener("input", (e) => ((state.seats = Math.max(1, Math.min(200, Number(e.target.value) || 1))), render()));
  root.querySelector("[name=threshold]").addEventListener("input", (e) => ((state.threshold = Math.max(0, Math.min(50, Number(e.target.value) || 0))), render()));
  root.querySelector("[name=method]").addEventListener("change", (e) => ((state.method = e.target.value), render()));
  root.querySelector("[data-add]").addEventListener("click", () => {
    state.lists.push({ n: `Liste ${String.fromCharCode(65 + state.lists.length)}`, v: 1000 });
    renderInputs();
    render();
  });
  const sel = root.querySelector("[name=preset]");
  for (const [k, p] of Object.entries(PRESETS)) sel.append(el("option", { value: k }, p.label));
  // Préréglage « circonscription unique » à partir des résultats 2024
  try {
    const el24 = (await getJSON("/data/elections.json")).data.items.find((e) => e.id === "chambre-2024");
    const lists = el24.seats.filter((s) => s.votes).map((s) => [s.label, s.votes]);
    PRESETS.unique = { label: "Chambre 2024 : et si la Belgique était une circonscription unique ?", seats: 150, threshold: 5, lists, real: el24.seats };
    sel.append(el("option", { value: "unique" }, PRESETS.unique.label));
  } catch (e) {
    /* hors ligne : préréglages locaux seulement */
  }
  sel.addEventListener("change", () => {
    const p = PRESETS[sel.value];
    if (!p) return;
    load(p);
    const note = root.querySelector("[data-preset-note]");
    note.textContent = p.real
      ? `Résultat réel (11 circonscriptions) : ${p.real.map((s) => `${s.label} ${s.seats}`).join(", ")}. Seules les listes ayant obtenu des sièges sont reprises ; les voix des autres listes sont ignorées.`
      : "";
  });
  const m = params().get("methode");
  if (m && METHODS[m]) state.method = m;
  renderInputs();
  render();
  update((s) => {
    s.games.dhondt = (s.games.dhondt || 0) + 1;
  });
}

init();
