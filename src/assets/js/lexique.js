// Filtres du lexique (texte, type, thème, nature), insensibles aux accents.
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const q = document.querySelector("[data-lx-q]");
const type = document.querySelector("[data-lx-type]");
const theme = document.querySelector("[data-lx-theme]");
const kind = document.querySelector("[data-lx-kind]");
const count = document.querySelector("[data-lx-count]");
const empty = document.querySelector("[data-lx-empty]");
const items = [...document.querySelectorAll(".index-list li")].map((li) => ({ li, text: norm(li.dataset.text || ""), type: li.dataset.type, kind: li.dataset.kind, themes: (li.dataset.themes || "").split(" ") }));
const groups = [...document.querySelectorAll("[data-lx-group]")];

function apply() {
  const terms = norm(q.value.trim()).split(/\s+/).filter(Boolean);
  let n = 0;
  for (const it of items) {
    const ok =
      (!type.value || it.type === type.value) &&
      (!kind.value || it.kind === kind.value) &&
      (!theme.value || it.themes.includes(theme.value)) &&
      terms.every((t) => it.text.includes(t));
    it.li.hidden = !ok;
    if (ok) n++;
  }
  for (const g of groups) g.hidden = ![...g.querySelectorAll("li")].some((li) => !li.hidden);
  count.textContent = `${n.toLocaleString("fr-BE")} entrée${n > 1 ? "s" : ""}`;
  empty.hidden = n > 0;
  const params = new URLSearchParams();
  if (q.value) params.set("q", q.value);
  if (type.value) params.set("type", type.value);
  if (theme.value) params.set("theme", theme.value);
  if (kind.value) params.set("nature", kind.value);
  history.replaceState(null, "", `${location.pathname}${params.toString() ? `?${params}` : ""}${location.hash}`);
}

const p = new URLSearchParams(location.search);
if (p.get("q")) q.value = p.get("q");
if (p.get("type")) type.value = p.get("type");
if (p.get("theme")) theme.value = p.get("theme");
if (p.get("nature")) kind.value = p.get("nature");
[q, type, theme, kind].forEach((el) => el.addEventListener("input", apply));
if ([...p.keys()].length) apply();
