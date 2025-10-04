import { $, state, setRecipes } from './state.js';
import { loadRecipes } from './loader.js';
import { renderAll, renderSidebar } from './render.js';

// Optional: Rezepte dynamisch ergänzen (wie vorher)
window.addRecipe = (r) => {
  // kleiner Helper: aktuelle Liste aus window.RECIPES holen
  const list = window.RECIPES || [];
  list.push(r);
  setRecipes(list);
  renderSidebar(); renderAll();
};

async function main() {
  await loadRecipes();    // Daten holen (setzt RECIPES)
  renderSidebar();        // Tags aufbauen
  renderAll();            // Filterleiste + Grid

  // Suche
  $('#q').addEventListener('input', (e) => {
    state.q = e.target.value.trim();
    renderAll();
  });

  // Hash-Filter (optional)
  try {
    if (location.hash.startsWith('#')) {
      const params = new URLSearchParams(location.hash.slice(1));
      const tag = params.get('tag');
      if (tag) state.tags.add(tag);
      renderAll();
    }
  } catch { /* noop */ }
}

main();