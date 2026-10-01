// Progression du lecteur, conservée uniquement dans son navigateur (localStorage).
// Toute lecture/écriture est protégée : navigation privée, stockage bloqué, etc.

const KEY = "sociopo:progress:v1";

const EMPTY = () => ({ visited: {}, mastered: {}, quiz: {}, games: {}, badges: {}, flash: {} });

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY();
    const data = JSON.parse(raw);
    return { ...EMPTY(), ...data };
  } catch (e) {
    return EMPTY();
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}

export function update(fn) {
  const s = load();
  fn(s);
  save(s);
  const newly = evaluateBadges(s);
  if (newly.length) save(s);
  window.dispatchEvent(new CustomEvent("sociopo:progress", { detail: { state: s, newly } }));
  return { state: s, newly };
}

export function reset() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    /* rien */
  }
}

/** Badges : condition évaluée sur l'état ; attribution datée et définitive. */
export const BADGES = [
  { id: "premiers-pas", label: "Premiers pas", desc: "Consulter une première notice", icon: "book-open", test: (s) => count(s.visited) >= 1 },
  { id: "curieux", label: "Curieux·se", desc: "Consulter 25 entrées", icon: "eye", test: (s) => count(s.visited) >= 25 },
  { id: "erudit", label: "Érudit·e", desc: "Consulter 100 entrées", icon: "book", test: (s) => count(s.visited) >= 100 },
  { id: "encyclopediste", label: "Encyclopédiste", desc: "Consulter 300 entrées", icon: "star", test: (s) => count(s.visited) >= 300 },
  { id: "maitre-notions", label: "Maître des notions", desc: "Marquer 30 notions comme maîtrisées", icon: "check", test: (s) => count(s.mastered) >= 30 },
  { id: "quizz-reussi", label: "Premier quiz", desc: "Terminer un quiz avec au moins 50 %", icon: "quiz", test: (s) => Object.values(s.quiz).some((q) => q.best >= 0.5) },
  { id: "sans-faute", label: "Sans-faute", desc: "Obtenir 100 % à un quiz d'au moins 10 questions", icon: "trophy", test: (s) => Object.values(s.quiz).some((q) => q.best >= 1 && q.n >= 10) },
  { id: "polyvalent", label: "Polyvalent·e", desc: "Réussir (≥ 70 %) des quiz dans 5 thèmes", icon: "target", test: (s) => Object.values(s.quiz).filter((q) => q.best >= 0.7).length >= 5 },
  { id: "formateur", label: "Formateur royal", desc: "Constituer une majorité viable dans le simulateur", icon: "crown", test: (s) => !!s.games.coalitionWin },
  { id: "dhondt", label: "Calculateur·rice", desc: "Utiliser le calculateur D'Hondt", icon: "ballot", test: (s) => !!s.games.dhondt },
  { id: "competences", label: "As des compétences", desc: "Réussir au moins 80 % au jeu « Qui est compétent ? »", icon: "layers", test: (s) => (s.quiz.competences?.best || 0) >= 0.8 },
  { id: "negociateur", label: "Négociateur·rice", desc: "Mener une formation à son terme dans le jeu du formateur", icon: "handshake", test: (s) => (s.games.formateur?.formed || 0) >= 1 },
  { id: "explorateur", label: "Explorateur·rice", desc: "Ouvrir le graphe et la carte", icon: "map", test: (s) => !!s.games.graphe && !!s.games.carte },
  { id: "memoire", label: "Mémoire d'éléphant", desc: "Réviser 50 cartes mémoire", icon: "cards", test: (s) => (s.flash.reviewed || 0) >= 50 },
];

function count(o) {
  return Object.keys(o || {}).length;
}

export function evaluateBadges(s) {
  const newly = [];
  for (const b of BADGES) {
    if (!s.badges[b.id] && b.test(s)) {
      s.badges[b.id] = new Date().toISOString().slice(0, 10);
      newly.push(b);
    }
  }
  return newly;
}

export function stats(s = load()) {
  return {
    visited: count(s.visited),
    mastered: count(s.mastered),
    badges: count(s.badges),
    quizzes: count(s.quiz),
  };
}
