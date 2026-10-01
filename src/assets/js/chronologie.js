// Filtres de la chronologie (type, période).
const items = [...document.querySelectorAll(".tl-item")];
const years = [...document.querySelectorAll("[data-tl-year]")];
const chips = [...document.querySelectorAll("[data-tl-types] .chip")];
const from = document.querySelector("[data-tl-from]");
const count = document.querySelector("[data-tl-count]");
let type = "";
function apply() {
  const y0 = Number(from.value || 0);
  let n = 0;
  const visibleYears = new Set();
  for (const it of items) {
    const ok = (!type || it.dataset.type === type) && Number(it.dataset.year) >= y0;
    it.hidden = !ok;
    if (ok) {
      n++;
      visibleYears.add(it.dataset.year);
    }
  }
  for (const y of years) y.hidden = !visibleYears.has(y.dataset.tlYear);
  count.textContent = `${n} événement${n > 1 ? "s" : ""}`;
}
chips.forEach((c) =>
  c.addEventListener("click", () => {
    type = c.dataset.type;
    chips.forEach((x) => {
      const on = x === c;
      x.classList.toggle("is-on", on);
      x.setAttribute("aria-pressed", String(on));
    });
    apply();
  }),
);
from.addEventListener("input", apply);
