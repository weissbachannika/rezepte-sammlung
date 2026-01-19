// Zentraler Zustand & Utilities
export const state = { q: '', tags: new Set(), category: 'all', maxTotal: null, maxPrep: null };

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
export function matchesWith(recipe, opts = {}) {
  const SWEET_TAG = 'Süßes';
  const { q, tags, category } = state;
  const maxTotal = opts.hasOwnProperty('maxTotal') ? opts.maxTotal : state.maxTotal;
  const maxPrep  = opts.hasOwnProperty('maxPrep')  ? opts.maxPrep  : state.maxPrep;

  // Kategorie
  const rtags = recipe.tags || [];
  const isSweet = rtags.includes(SWEET_TAG);
  if (category === 'sweet' && !isSweet) return false;
  if (category === 'savory' && isSweet) return false;

  // Zeitfilter
  if (Number.isFinite(maxTotal)) {
    const total = Number(recipe?.time?.total ?? recipe?.totalTime ?? NaN);
    if (!Number.isFinite(total) || total > maxTotal) return false;
  }
  if (Number.isFinite(maxPrep)) {
    const prep = Number(recipe?.time?.prep ?? recipe?.time?.total ?? recipe?.totalTime ?? NaN);
    if (!Number.isFinite(prep) || prep > maxPrep) return false;
  }

  // Tags
  if (tags.size) {
    if (!recipe.tags) return false;
    for (const t of tags) if (!recipe.tags.includes(t)) return false;
  }

  // Suche
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
export const matches = (r) => matchesWith(r);

export function syncHashFromState() {
  const params = new URLSearchParams(location.hash.replace(/^#/, ''));

  // q
  const q = (state.q || '').trim();
  if (q) params.set('q', q);
  else params.delete('q');

  // category
  const cat = state.category || 'all';
  if (cat && cat !== 'all') params.set('cat', cat);
  else params.delete('cat');

  // tags (multi)
  params.delete('tag');
  for (const t of state.tags) params.append('tag', t);

  // time filters
  const prep = state.maxPrep;
  if (Number.isFinite(prep)) params.set('prep', String(prep));
  else params.delete('prep');

  const total = state.maxTotal;
  if (Number.isFinite(total)) params.set('total', String(total));
  else params.delete('total');

  const next = params.toString();
  const hash = next ? `#${next}` : '';
  history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
}

export function applyStateFromHash() {
  if (!location.hash.startsWith('#')) return;

  const params = new URLSearchParams(location.hash.slice(1));

  // q
  state.q = (params.get('q') || '').trim();

  // category
  const cat = params.get('cat');
  state.category = (cat === 'savory' || cat === 'sweet' || cat === 'all') ? cat : 'all';

  // tags
  state.tags.clear();
  for (const t of params.getAll('tag')) state.tags.add(t);

  // time
  const prep = Number(params.get('prep'));
  state.maxPrep = Number.isFinite(prep) ? prep : state.maxPrep;

  const total = Number(params.get('total'));
  state.maxTotal = Number.isFinite(total) ? total : state.maxTotal;
}