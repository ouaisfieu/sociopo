#!/usr/bin/env node
// Découpe un ou plusieurs « paquets » de rédaction en fichiers individuels.
// Format : chaque entrée commence par une ligne « @@@ collection/slug », suivie du fichier Markdown complet.
//   node scripts/split-bundles.mjs chemin/vers/paquet.md [...]
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CONTENT = path.join(ROOT, "src", "content");
const VALID = new Set(["notions", "partis", "personnalites", "dossiers"]);

let written = 0;
const errors = [];
for (const file of process.argv.slice(2)) {
  const raw = fs.readFileSync(file, "utf8");
  const parts = raw.split(/^@@@\s+/m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf("\n");
    const target = part.slice(0, nl).trim();
    // Eleventy réserve la clé « date » : une année nue (nombre YAML) doit être une chaîne.
    const body = (part.slice(nl + 1).replace(/^\s*\n/, "").replace(/\s+$/, "") + "\n")
      .replace(/^date: (\d{4})$/m, 'date: "$1"');
    const [col, slug] = target.split("/");
    if (!VALID.has(col) || !/^[a-z0-9][a-z0-9-]*$/.test(slug || "")) {
      errors.push(`${file}: cible invalide « ${target} »`);
      continue;
    }
    try {
      const fm = matter(body);
      if (!fm.data.title) errors.push(`${target}: titre manquant`);
    } catch (e) {
      errors.push(`${target}: front matter invalide — ${e.message}`);
      continue;
    }
    const out = path.join(CONTENT, col, `${slug}.md`);
    fs.writeFileSync(out, body);
    written++;
  }
}
console.log(`${written} fichier(s) écrit(s).`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
}
