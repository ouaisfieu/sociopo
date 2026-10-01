// Comportements communs à toutes les pages : thème, menu, recherche Pagefind,
// aperçus au survol, progression, sommaire actif, citation, mode hors ligne.
import { base, url, toast, getJSON, el } from "./_ui.js";
import { load, update, stats } from "./_store.js";

/* ---------- Thème clair / sombre ---------- */
function currentTheme() {
  const forced = document.documentElement.getAttribute("data-theme");
  if (forced === "light" || forced === "dark") return forced;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("sociopo-theme", next);
    } catch (e) {
      /* stockage indisponible */
    }
    toast(next === "dark" ? "Thème sombre activé" : "Thème clair activé", 1600);
    window.dispatchEvent(new CustomEvent("sociopo:theme", { detail: next }));
  });
});

/* ---------- Menu mobile ---------- */
const menuBtn = document.querySelector("[data-menu-toggle]");
const nav = document.getElementById("main-nav");
if (menuBtn && nav) {
  menuBtn.addEventListener("click", () => {
    const open = !nav.classList.contains("open");
    nav.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      nav.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    }
  });
}

/* ---------- Recherche (Pagefind) ---------- */
const dialog = document.getElementById("search-dialog");
const input = document.getElementById("search-input");
const results = document.getElementById("search-results");
let pagefind = null;
let selected = -1;

async function getPagefind() {
  if (pagefind) return pagefind;
  try {
    pagefind = await import(/* @vite-ignore */ url("/pagefind/pagefind.js"));
    await pagefind.options({ baseUrl: base, excerptLength: 22 });
    pagefind.init();
  } catch (e) {
    pagefind = null;
  }
  return pagefind;
}

function openSearch(q = "") {
  if (!dialog) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  input.value = q || input.value;
  input.focus();
  input.select();
  getPagefind();
  if (input.value) runSearch(input.value);
  else renderHint();
}
function closeSearch() {
  if (!dialog) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}
function renderHint() {
  results.replaceChildren(
    el("div", { class: "search-empty" },
      el("p", { style: "margin:0 0 .4rem" }, "Essayez : ", el("b", { text: "formateur" }), ", ", el("b", { text: "sonnette d'alarme" }), ", ", el("b", { text: "Arizona" }), ", ", el("b", { text: "facilités" }), ", ", el("b", { text: "norme salariale" }), "."),
      el("p", { class: "small", style: "margin:0" }, "La recherche porte sur toutes les notices, partis, personnalités, gouvernements, élections et dossiers."),
    ),
  );
}

let searchToken = 0;
async function runSearch(q) {
  const token = ++searchToken;
  const pf = await getPagefind();
  if (!pf) {
    results.replaceChildren(el("div", { class: "search-empty", text: "L'index de recherche n'est pas disponible dans cette version (il est généré lors de la publication)." }));
    return;
  }
  if (!q.trim()) {
    renderHint();
    return;
  }
  const search = await pf.debouncedSearch(q, {}, 120);
  if (search === null || token !== searchToken) return;
  const top = await Promise.all(search.results.slice(0, 14).map((r) => r.data()));
  if (token !== searchToken) return;
  selected = -1;
  if (!top.length) {
    results.replaceChildren(el("div", { class: "search-empty" }, `Aucun résultat pour « ${q} ». Vérifiez l'orthographe ou essayez un synonyme, en français ou en néerlandais.`));
    return;
  }
  const frag = document.createDocumentFragment();
  top.forEach((r, i) => {
    const a = el("a", { href: r.url, role: "option", id: `sr-${i}`, "aria-selected": "false" });
    const head = el("div");
    head.append(el("span", { class: "rt", text: (r.meta && r.meta.title) || r.url }));
    const kind = r.filters && r.filters.type && r.filters.type[0];
    if (kind) head.append(el("span", { class: "rk", text: kind }));
    const ex = el("div", { class: "rx" });
    // L'extrait Pagefind ne contient que du texte échappé et des balises <mark>.
    ex.innerHTML = r.excerpt;
    a.append(head, ex);
    frag.append(a);
  });
  results.replaceChildren(frag);
}

function moveSelection(delta) {
  const items = [...results.querySelectorAll("a[role=option]")];
  if (!items.length) return;
  selected = (selected + delta + items.length) % items.length;
  items.forEach((it, i) => it.setAttribute("aria-selected", String(i === selected)));
  items[selected].scrollIntoView({ block: "nearest" });
  input.setAttribute("aria-activedescendant", items[selected].id);
}

if (dialog) {
  document.querySelectorAll("[data-search-open]").forEach((b) => b.addEventListener("click", () => openSearch()));
  document.querySelectorAll("[data-search-close]").forEach((b) => b.addEventListener("click", closeSearch));
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) closeSearch();
  });
  input.addEventListener("input", () => runSearch(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveSelection(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveSelection(-1);
    } else if (e.key === "Enter") {
      const items = [...results.querySelectorAll("a[role=option]")];
      const target = items[selected >= 0 ? selected : 0];
      if (target) location.href = target.href;
    }
  });
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
      e.preventDefault();
      openSearch();
    }
  });
  const q = new URLSearchParams(location.search).get("q");
  if (q && document.body.classList.contains("page-recherche")) openSearch(q);
}

/* ---------- Aperçus au survol des liens internes ---------- */
const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
let pop = null;
let hideTimer = null;
let showTimer = null;

function hidePreview() {
  clearTimeout(showTimer);
  hideTimer = setTimeout(() => {
    if (pop) {
      pop.remove();
      pop = null;
    }
  }, 160);
}

async function showPreview(a) {
  const slug = a.dataset.slug;
  if (!slug || slug === document.body.dataset.slug) return;
  let data;
  try {
    data = (await getJSON("/data/apercus.json"))[slug];
  } catch (e) {
    return;
  }
  if (!data) return;
  clearTimeout(hideTimer);
  if (pop) pop.remove();
  pop = el("div", { class: "preview-pop", role: "tooltip" },
    el("span", { class: "k", text: data.k }),
    el("span", { class: "t", text: data.t }),
    el("p", { style: "margin:0 0 .5rem", text: data.s }),
    el("a", { href: url(data.u) }, "Lire la notice →"),
  );
  document.body.append(pop);
  const r = a.getBoundingClientRect();
  const w = pop.offsetWidth;
  const left = Math.min(Math.max(8, r.left + window.scrollX), window.scrollX + document.documentElement.clientWidth - w - 8);
  let top = r.bottom + window.scrollY + 8;
  if (r.bottom + pop.offsetHeight + 16 > window.innerHeight) top = r.top + window.scrollY - pop.offsetHeight - 8;
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
  pop.addEventListener("mouseenter", () => clearTimeout(hideTimer));
  pop.addEventListener("mouseleave", hidePreview);
}

if (canHover) {
  document.addEventListener("mouseover", (e) => {
    const a = e.target.closest("a[data-slug]");
    if (!a) return;
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    showTimer = setTimeout(() => showPreview(a), 380);
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest("a[data-slug]")) hidePreview();
  });
}
document.addEventListener("focusin", (e) => {
  const a = e.target.closest && e.target.closest("a.wl[data-slug]");
  if (a) showTimer = setTimeout(() => showPreview(a), 500);
});
document.addEventListener("focusout", (e) => {
  if (e.target.closest && e.target.closest("a.wl[data-slug]")) hidePreview();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && pop) {
    pop.remove();
    pop = null;
  }
});

/* ---------- Progression & badges ---------- */
function refreshPill() {
  const pill = document.querySelector("[data-progress-pill]");
  if (!pill) return;
  const s = stats();
  if (s.visited > 0) {
    pill.hidden = false;
    pill.textContent = String(s.visited);
    pill.parentElement.title = `Mon parcours : ${s.visited} entrées consultées, ${s.badges} badge(s)`;
  }
}

window.addEventListener("sociopo:progress", (ev) => {
  refreshPill();
  for (const b of ev.detail.newly || []) toast(`🏅 Badge débloqué : ${b.label}`, 4200);
});

const slug = document.body.dataset.slug;
if (slug) {
  update((s) => {
    if (!s.visited[slug]) s.visited[slug] = Date.now();
  });
  const btn = document.querySelector("[data-mastered]");
  if (btn) {
    const sync = () => {
      const on = !!load().mastered[slug];
      btn.setAttribute("aria-pressed", String(on));
      btn.querySelector("span").textContent = on ? "Notion maîtrisée" : "Je maîtrise cette notion";
    };
    sync();
    btn.addEventListener("click", () => {
      update((s) => {
        if (s.mastered[slug]) delete s.mastered[slug];
        else s.mastered[slug] = Date.now();
      });
      sync();
    });
  }
} else {
  refreshPill();
}

// Liens déjà lus : soulignement ocre
try {
  const visited = load().visited;
  document.querySelectorAll("a.wl[data-slug]").forEach((a) => {
    if (visited[a.dataset.slug]) a.classList.add("visited-entry");
  });
} catch (e) {
  /* rien */
}

/* ---------- Sommaire actif ---------- */
const tocLinks = [...document.querySelectorAll(".toc a[href^='#']")];
if (tocLinks.length && "IntersectionObserver" in window) {
  const map = new Map(tocLinks.map((a) => [decodeURIComponent(a.getAttribute("href").slice(1)), a]));
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          tocLinks.forEach((a) => a.classList.remove("is-active"));
          const a = map.get(en.target.id);
          if (a) a.classList.add("is-active");
        }
      }
    },
    { rootMargin: "-80px 0px -70% 0px" },
  );
  map.forEach((_, id) => {
    const h = document.getElementById(id);
    if (h) io.observe(h);
  });
}

/* ---------- Copier la référence ---------- */
document.querySelectorAll("[data-copy-cite]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const code = btn.parentElement.querySelector("[data-cite]");
    const text = code ? code.textContent.trim() : location.href;
    try {
      await navigator.clipboard.writeText(text);
      toast("Référence copiée dans le presse-papiers");
    } catch (e) {
      toast("Copie impossible : sélectionnez le texte manuellement");
    }
  });
});

/* ---------- Ancres de titres ---------- */
document.querySelectorAll(".prose h2[id], .prose h3[id]").forEach((h) => {
  const a = el("a", { class: "anchor", href: `#${h.id}`, "aria-label": `Lien vers la section « ${h.textContent} »` }, "#");
  h.append(a);
});

/* ---------- Hors ligne (service worker) ---------- */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(url("/sw.js"), { scope: base }).catch(() => {});
  });
}
