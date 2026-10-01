// Page de recherche complète (Pagefind) avec filtres ; reçoit ?q= (OpenSearch).
import { el, url, base, params } from "./_ui.js";

const root = document.querySelector("[data-recherche]");
let pf = null;
let filters = {};
let current = [];
let shown = 0;
let token = 0;

async function getPf() {
  if (pf) return pf;
  try {
    pf = await import(/* @vite-ignore */ url("/pagefind/pagefind.js"));
    await pf.options({ baseUrl: base, excerptLength: 30 });
    pf.init();
  } catch (e) {
    pf = null;
  }
  return pf;
}

async function renderFilters() {
  const p = await getPf();
  if (!p) return;
  const f = await p.filters();
  const box = root.querySelector("[data-filters]");
  box.replaceChildren();
  for (const [name, values] of Object.entries(f)) {
    const sel = el("select", { class: "input", "aria-label": `Filtrer par ${name}` }, el("option", { value: "" }, name === "type" ? "Tous les types" : "Tous les thèmes"));
    for (const [v, n] of Object.entries(values).sort((a, b) => a[0].localeCompare(b[0], "fr"))) sel.append(el("option", { value: v }, `${v} (${n})`));
    sel.addEventListener("change", () => {
      if (sel.value) filters[name] = sel.value;
      else delete filters[name];
      run();
    });
    box.append(sel);
  }
}

async function more() {
  const list = root.querySelector("[data-results]");
  const next = await Promise.all(current.slice(shown, shown + 20).map((r) => r.data()));
  shown += next.length;
  for (const r of next) {
    const ex = el("p", { class: "rx" });
    ex.innerHTML = r.excerpt; // texte échappé par Pagefind + balises <mark>
    const kind = r.filters?.type?.[0];
    list.append(el("li", {}, el("a", { href: r.url }, r.meta?.title || r.url), kind ? el("span", { class: "badge", style: { marginLeft: "0.5rem" } }, kind) : "", ex));
  }
  root.querySelector("[data-more]").hidden = shown >= current.length;
}

async function run() {
  const t = ++token;
  const q = root.querySelector("input[name=q]").value.trim();
  const p = await getPf();
  const status = root.querySelector("[data-status]");
  const list = root.querySelector("[data-results]");
  if (!p) {
    status.textContent = "L'index de recherche n'est pas disponible dans cette version (il est généré lors de la publication).";
    return;
  }
  const u = new URLSearchParams(location.search);
  if (q) u.set("q", q);
  else u.delete("q");
  history.replaceState(null, "", `${location.pathname}${u.toString() ? `?${u}` : ""}`);
  if (!q && !Object.keys(filters).length) {
    list.replaceChildren();
    status.textContent = "Tapez un mot-clé : une notion, un parti, une personnalité, un sigle (BHV, COCOF), un terme néerlandais…";
    root.querySelector("[data-more]").hidden = true;
    return;
  }
  const res = await p.search(q || null, { filters });
  if (t !== token) return;
  current = res.results;
  shown = 0;
  list.replaceChildren();
  status.textContent = current.length ? `${current.length} résultat${current.length > 1 ? "s" : ""}` : `Aucun résultat pour « ${q} ».`;
  await more();
}

function init() {
  if (!root) return;
  const input = root.querySelector("input[name=q]");
  input.value = params().get("q") || "";
  let timer;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(run, 180);
  });
  root.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    run();
  });
  root.querySelector("[data-more]").addEventListener("click", more);
  renderFilters();
  run();
}

init();
