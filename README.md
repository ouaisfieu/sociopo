# Sociopo — encyclopédie de la sociopolitique belge

Encyclopédie libre, interactive et sans traceur de la politique belge : institutions, fédéralisme, réformes de l'État, partis, élections, piliers, concertation sociale, finances publiques, questions communautaires et histoire politique de 1830 à aujourd'hui.

**Site publié :** https://ouaisfieu.github.io/sociopo/

## Ce que contient le site

- **Lexique** : notices reliées entre elles par des wiki-liens, avec définition courte, niveau de lecture, équivalents officiels en néerlandais, allemand et anglais, renvois, « À ne pas confondre avec », sources et FAQ.
- **Partis, personnalités, gouvernements, élections** : fiches structurées, hémicycles, frise des gouvernements depuis 1945, résultats depuis 1919.
- **Dossiers d'analyse** : rapports de forces politiques et économiques, avec lectures contradictoires.
- **Jouer** : simulateur de coalitions, jeu du formateur, calculateur D'Hondt / Imperiali, quiz, cartes mémoire (répétition espacée), « Qui est compétent ? », lasagne institutionnelle, carte schématique, graphe des notions, généalogie des partis, badges.
- **Données ouvertes** : JSON (`/data/`), thésaurus SKOS (Turtle et JSON-LD), flux Atom, `llms.txt`.
- **Référencement** : JSON-LD schema.org sur chaque page (`DefinedTerm`, `PoliticalParty`, `Person`, `GovernmentOrganization`, `Legislation`, `Event`, `Quiz`, `Dataset`…), plan du site XML, OpenSearch, Open Graph.

## Démarrer

```bash
npm ci
npm run dev        # serveur local avec rechargement (http://localhost:8080/sociopo/)
npm run build      # site complet dans _site/ + index de recherche Pagefind
npm run check      # contrôles : liens internes, JSON-LD, jeux de données, contenu
```

Node 20 ou plus récent (voir `.nvmrc`). La recherche (Pagefind) n'est disponible qu'après `npm run build`.

Variables d'environnement facultatives : `SITE_URL` (défaut `https://ouaisfieu.github.io`) et `PATH_PREFIX` (défaut `/sociopo/`) — par exemple `PATH_PREFIX=/ npm run build` pour un domaine dédié.

## Publication

Le flux `.github/workflows/deploy.yml` construit, contrôle et publie le site sur GitHub Pages à chaque poussée sur `main`. Dans les réglages du dépôt : **Settings → Pages → Source : GitHub Actions**.

## Organisation

```
src/
  content/
    notions/        une notice = un fichier Markdown (front matter YAML)
    partis/
    personnalites/
    dossiers/
  _data/            site, gouvernements, élections, chronologie, quiz, compétences (JSON)
  _includes/        gabarits Nunjucks (layouts, partials)
  pages/            pages et points de données (lexique, thèmes, jouer, données, SEO…)
  assets/           CSS, JavaScript (compilés par esbuild), images
lib/                corpus, Markdown, JSON-LD, taxonomie, hémicycles, données ouvertes
scripts/            check.mjs, split-bundles.mjs, make-images.mjs
```

## Rédiger une notice

```markdown
---
title: Loi spéciale
kind: concept              # concept, procedure, fonction, doctrine, institution, organisation, loi, accord, evenement, territoire
themes: [parlement, federalisme]
level: 1                   # 1 essentiel · 2 approfondi · 3 expert
summary: "Définition courte (une à trois phrases)."
terms: { nl: "bijzondere wet", de: "Sondergesetz", en: "special majority act" }
aliases: ["loi à majorité spéciale"]
related: [majorite-speciale, groupe-linguistique]
legal_basis: "Constitution, art. 4, dernier alinéa"
sources:
  - { title: "Constitution coordonnée", publisher: "Chambre des représentants", url: "https://www.lachambre.be" }
---
Texte en Markdown. Un renvoi : [[majorite-speciale|majorité spéciale]] ou [[groupe-linguistique]].

:::attention Titre facultatif
Encadré (types : note, definition, exemple, attention, debat, chiffres, histoire, actu, methode).
:::
```

Les identifiants de thèmes, de natures et de familles politiques sont définis dans `lib/taxonomy.js`. Les wiki-liens vers des notices pas encore rédigées s'affichent sans lien et sont listés au build (`STRICT=1 npm run check` les rend bloquants).

## Licences

- Textes et données : [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.fr) — voir `LICENSE-CONTENT.md`.
- Code : MIT — voir `LICENSE`.

Rédaction collective et anonyme. Signalements et propositions : onglet *Issues* du dépôt.
