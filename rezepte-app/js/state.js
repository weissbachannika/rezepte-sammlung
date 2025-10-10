// Zentraler Zustand & Utilities
export const state = { q: '', tags: new Set() };

// Element-Selector (knackig)
export const $ = (sel) => document.querySelector(sel);

// Einzigartige, sortierte Liste (deutsche Sortierung)
export function uniq(arr) {
  return [...new Set(arr)].sort((a, b) => a.localeCompare(b, 'de'));
}

// Globale Rezeptliste (wird von loader.js gefüllt)
export let RECIPES = [];
export function setRecipes(list) {
  RECIPES = list;
  // fürs Dev-Inspecting:
  window.RECIPES = RECIPES;
}

// Tags extrahieren
export function getAllTags(data) {
  return uniq(data.flatMap(r => r.tags || []));
}

// Filterfunktion
export function matches(recipe) {
  const { q, tags } = state;
  if (tags.size) {
    if (!recipe.tags) return false;
    for (const t of tags) if (!recipe.tags.includes(t)) return false;
  }
  if (q) {
    const hay = [
      recipe.title,
      ...(recipe.ingredients || []),
      ...(recipe.spices || []),
      ...(recipe.tags || []),
      ...(recipe.materials || [])
    ].join(' ').toLowerCase();
    if (!hay.includes(q.toLowerCase())) return false;
  }
  return true;
}