// Moteur Markdown de Sociopo : wiki-liens [[slug|libellé]], encadrés :::type, ancres de titres,
// tableaux défilants et typographie française.

import markdownIt from "markdown-it";
import { slugify, escapeHtml } from "./utils.js";

const CALLOUTS = {
  note: "À retenir",
  definition: "Définition",
  exemple: "Exemple",
  attention: "À ne pas confondre",
  debat: "Points de vue",
  chiffres: "En chiffres",
  histoire: "Repère historique",
  actu: "Actualité 2024-2026",
  methode: "Note de méthode",
};

/** Convertit les blocs « :::type Titre facultatif » … « ::: » en encadrés HTML. */
function transformContainers(src) {
  const lines = src.split("\n");
  const out = [];
  const stack = [];
  for (const line of lines) {
    const open = line.match(/^:::\s*([a-z]+)\s*(.*)$/);
    if (open && open[1]) {
      const type = open[1];
      const title = open[2].trim() || CALLOUTS[type] || "";
      stack.push(type);
      out.push(`<aside class="callout callout-${type}" role="note">`);
      out.push("");
      if (title) out.push(`<p class="callout-title">${escapeHtml(title)}</p>`);
      out.push("");
      continue;
    }
    if (/^:::\s*$/.test(line) && stack.length) {
      stack.pop();
      out.push("");
      out.push("</aside>");
      out.push("");
      continue;
    }
    out.push(line);
  }
  while (stack.length) {
    stack.pop();
    out.push("", "</aside>", "");
  }
  return out.join("\n");
}

export function createMarkdown(corpus, { onBroken } = {}) {
  const md = markdownIt({
    html: true,
    linkify: false,
    typographer: true,
    quotes: ["« ", " »", "“", "”"],
  });

  // Encadrés
  md.core.ruler.before("block", "sociopo_containers", (state) => {
    if (state.src.includes(":::")) state.src = transformContainers(state.src);
  });

  // Wiki-liens [[slug]], [[slug|libellé]], [[slug#ancre|libellé]]
  md.inline.ruler.before("link", "wikilink", (state, silent) => {
    const src = state.src;
    const start = state.pos;
    if (src.charCodeAt(start) !== 0x5b || src.charCodeAt(start + 1) !== 0x5b) return false;
    const end = src.indexOf("]]", start + 2);
    if (end < 0) return false;
    const inner = src.slice(start + 2, end);
    const m = inner.match(/^([a-z0-9][a-z0-9-]*)(?:#([a-z0-9-]+))?(?:\|([\s\S]+))?$/);
    if (!m) return false;
    if (!silent) {
      const [, slug, anchor, label] = m;
      const entry = corpus.get(slug);
      const text = (label || (entry ? entry.label : slug.replace(/-/g, " "))).trim();
      if (entry) {
        const token = state.push("html_inline", "", 0);
        const href = `${entry.url}${anchor ? `#${anchor}` : ""}`;
        token.content = `<a class="wl" href="${href}" data-slug="${slug}">${md.renderInline(text)}</a>`;
      } else {
        if (onBroken) onBroken(slug);
        const token = state.push("html_inline", "", 0);
        token.content = `<span class="wl-missing" title="Notice en préparation">${md.renderInline(text)}</span>`;
      }
    }
    state.pos = end + 2;
    return true;
  });

  // Titres : identifiants stables + table des matières dans env.toc
  md.core.ruler.push("sociopo_headings", (state) => {
    const used = new Set();
    const toc = [];
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type !== "heading_open") continue;
      const level = Number(t.tag.slice(1));
      const inline = tokens[i + 1];
      const text = inline.children
        ? inline.children
            .filter((c) => c.type === "text" || c.type === "code_inline" || c.type === "html_inline")
            .map((c) => c.content.replace(/<[^>]+>/g, ""))
            .join("")
        : inline.content;
      let id = slugify(text) || `section-${i}`;
      let n = 2;
      while (used.has(id)) id = `${slugify(text)}-${n++}`;
      used.add(id);
      t.attrSet("id", id);
      if (level === 2 || level === 3) toc.push({ level, id, text });
    }
    state.env.toc = toc;
  });

  // Tableaux défilants (mobile)
  md.renderer.rules.table_open = () => '<div class="table-wrap" tabindex="0"><table>\n';
  md.renderer.rules.table_close = () => "</table></div>\n";

  // Liens externes : classe + rel
  const defaultLinkOpen =
    md.renderer.rules.link_open || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet("href") || "";
    if (/^https?:\/\//.test(href)) {
      tokens[idx].attrJoin("class", "ext");
      tokens[idx].attrSet("rel", "noopener");
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  return md;
}

/** Rendu Markdown + table des matières (utilisé hors Eleventy : dossiers, données). */
export function renderWithToc(md, src) {
  const env = {};
  const html = md.render(src || "", env);
  return { html, toc: env.toc || [] };
}
