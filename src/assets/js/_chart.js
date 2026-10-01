// Outils graphiques partagés : infobulle accessible, échelles simples, formatage.
import { el } from "./_ui.js";

let tip = null;
export function tooltip() {
  if (!tip) {
    tip = el("div", { class: "preview-pop", role: "tooltip", style: { position: "absolute", pointerEvents: "none", display: "none", width: "auto", maxWidth: "320px" } });
    document.body.append(tip);
  }
  return {
    show(target, rows, ev) {
      tip.replaceChildren(...rows.map(([strong, rest]) => el("div", {}, el("b", { text: strong }), rest ? el("span", { class: "muted", text: ` ${rest}` }) : null)));
      tip.style.display = "block";
      const r = target.getBoundingClientRect();
      const x = ev && ev.pageX ? ev.pageX : r.left + window.scrollX + r.width / 2;
      const y = ev && ev.pageY ? ev.pageY : r.top + window.scrollY;
      const w = tip.offsetWidth;
      tip.style.left = `${Math.max(8, Math.min(x - w / 2, window.scrollX + document.documentElement.clientWidth - w - 8))}px`;
      tip.style.top = `${y - tip.offsetHeight - 14}px`;
    },
    hide() {
      tip.style.display = "none";
    },
  };
}

export const linear = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

export function dateToYear(s) {
  if (!s) return new Date().getFullYear() + new Date().getMonth() / 12;
  const [y, m = "06", d = "15"] = String(s).split("-");
  return Number(y) + (Number(m) - 1) / 12 + (Number(d) - 1) / 365;
}

export function frDate(s) {
  if (!s) return "en fonction";
  const mois = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const [y, m, d] = String(s).split("-");
  if (!m) return y;
  if (!d) return `${mois[Number(m) - 1]} ${y}`;
  return `${Number(d)} ${mois[Number(m) - 1]} ${y}`;
}
