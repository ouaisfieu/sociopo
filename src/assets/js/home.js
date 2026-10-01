// Accueil : notion du jour (recalculée côté client chaque jour) et tirage au hasard.
import { getJSON, url, hash } from "./_ui.js";

const card = document.querySelector("[data-daily]");
async function init() {
  let data;
  try {
    data = await getJSON("/data/apercus.json");
  } catch (e) {
    return;
  }
  const notions = Object.entries(data).filter(([, v]) => v.u.startsWith("/notions/"));
  if (!notions.length) return;
  const today = new Date().toISOString().slice(0, 10);
  const [slug, v] = notions[hash(today + "notion") % notions.length];
  const link = card && card.querySelector("[data-daily-link]");
  if (link) {
    link.textContent = v.t;
    link.href = url(v.u);
    link.dataset.slug = slug;
    card.querySelector("[data-daily-summary]").textContent = v.s;
    card.querySelector("[data-daily-btn]").href = url(v.u);
  }
  document.querySelectorAll("[data-random]").forEach((b) =>
    b.addEventListener("click", () => {
      const all = Object.values(data);
      const pick = all[Math.floor(Math.random() * all.length)];
      location.href = url(pick.u);
    }),
  );
}
init();
