// Frise interactive des gouvernements fédéraux (1945 → aujourd'hui).
import { svgEl, url } from "./_ui.js";
import { tooltip, linear, dateToYear, frDate } from "./_chart.js";

// Encre lisible (blanc ou noir) selon la luminance de la couleur du parti.
function inkFor(slug) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--p-${slug || "autre"}`).trim();
  const m = v.match(/^#([0-9a-f]{6})$/i);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  return L > 0.3 ? "#111111" : "#ffffff";
}

const host = document.querySelector("[data-gantt]");
const raw = document.getElementById("gantt-data");
if (host && raw) {
  const govs = JSON.parse(raw.textContent);
  const W = 1200;
  const H = 150;
  const x = linear(1945, new Date().getFullYear() + 1, 20, W - 20);
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", role: "group", "aria-label": "Frise des gouvernements fédéraux depuis 1945" });
  // axe
  for (let y = 1945; y <= new Date().getFullYear() + 1; y += 5) {
    svg.append(svgEl("line", { x1: x(y), x2: x(y), y1: 18, y2: H - 22, stroke: "var(--chart-grid)", "stroke-width": 1 }));
    const t = svgEl("text", { x: x(y), y: H - 6, "text-anchor": "middle", "font-size": 12, fill: "var(--chart-muted)" });
    t.textContent = String(y);
    svg.append(t);
  }
  const tip = tooltip();
  govs.forEach((g, i) => {
    const x0 = x(dateToYear(g.start));
    const x1 = x(dateToYear(g.end));
    const lane = i % 2;
    const yTop = 30 + lane * 42;
    const rect = svgEl("rect", {
      x: x0 + 1,
      y: yTop,
      width: Math.max(2, x1 - x0 - 2),
      height: 34,
      rx: 4,
      tabindex: 0,
      role: "link",
      "aria-label": `${g.name}${g.nickname ? ` (${g.nickname})` : ""}, du ${frDate(g.start)} au ${frDate(g.end)}`,
      style: `fill:var(--p-${g.head_party || "autre"}, var(--p-autre));cursor:pointer`,
    });
    const show = (ev) =>
      tip.show(rect, [
        [g.name, g.nickname ? `« ${g.nickname} »` : ""],
        [`${frDate(g.start)} → ${frDate(g.end)}`, ""],
        ["Chef :", g.head_name],
      ], ev);
    rect.addEventListener("pointermove", show);
    rect.addEventListener("focus", () => show());
    rect.addEventListener("pointerleave", () => tip.hide());
    rect.addEventListener("blur", () => tip.hide());
    const go = () => (location.href = url(`/gouvernements/${g.id}/`));
    rect.addEventListener("click", go);
    rect.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
    svg.append(rect);
    if (x1 - x0 > 52) {
      const label = svgEl("text", { x: x0 + 6, y: yTop + 21, "font-size": 12, fill: inkFor(g.head_party), "pointer-events": "none", "font-weight": 600 });
      label.textContent = g.head_name.split(" ").slice(1).join(" ");
      svg.append(label);
    }
  });
  host.append(svg);
}
