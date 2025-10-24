// Zentraler Zustand & Utilities
export const state = { q: '', tags: new Set(), category: 'all', maxTime: null };

const SWEET_TAG = 'Süßes';

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
  const { q, tags, category, maxTime } = state;

  // Kategorie-Filter
  const rtags = recipe.tags || [];
  const isSweet = rtags.includes(SWEET_TAG);
  if (category === 'sweet' && !isSweet) return false;
  if (category === 'savory' && isSweet) return false;

  // Zeitfilter (<= maxTime)
  if (Number.isFinite(maxTime)) {
    const total = Number(recipe?.time?.total ?? recipe?.totalTime ?? NaN);
    if (!Number.isFinite(total) || total > maxTime) return false;
  }

  if (tags.size) {
    if (!recipe.tags) return false;
    for (const t of tags) if (!recipe.tags.includes(t)) return false;
  }
  const query = (q || '').trim().toLowerCase();
  if (query) {
    const tokens = query.split(/\s+/).filter(Boolean);
    const notesText = Array.isArray(recipe.notes) ? recipe.notes.join(' ') : String(recipe.notes || ''); // String ODER Array unterstützen
    const hay = [
      recipe.title,
      ...(recipe.ingredients || []),
      //...(recipe.spices || []),
      ...(recipe.tags || []),
      ...(recipe.notes || []),
      notesText,
    ].join(' ').toLowerCase();
    for (const tok of tokens) {
      if (!hay.includes(tok)) return false;
    }
  }
  return true;
}