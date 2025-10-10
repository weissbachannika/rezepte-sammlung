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

  // --- Mobile UI helpers -------------------------------------------------
  const searchBox = document.querySelector('.search');
  const qInput = $('#q');
  const isNarrow = () => window.matchMedia('(max-width:680px)').matches;

  // Icon-Only Suche: auf Handy als Popover öffnen/schließen
  if (searchBox) {
    searchBox.addEventListener('click', (ev) => {
      if (!isNarrow()) return;                    // Desktop: nichts ändern
      if (ev.target === qInput) return;           // direkter Klick ins Input -> kein Toggle
      if (!searchBox.classList.contains('open')) {
        searchBox.classList.add('open');
        requestAnimationFrame(() => qInput && qInput.focus());
      } else {
        // Bereits offen -> einfach Fokus setzen, nicht schließen
        requestAnimationFrame(() => qInput && qInput.focus());
      }
    });
  }

  // Klick außerhalb schließt die Popover-Suche (nur mobil)
  document.addEventListener('click', (ev) => {
    if (!isNarrow()) return;
    if (!searchBox || !searchBox.classList.contains('open')) return;
    const within = searchBox.contains(ev.target);
    const inHeader = ev.target.closest && ev.target.closest('header');
    if (!within && !inHeader) {
      searchBox.classList.remove('open');
    }
  });

  // ESC schließt Popover-Suche (nur mobil)
  document.addEventListener('keydown', (ev) => {
    if (!isNarrow()) return;
    if (ev.key === 'Escape') searchBox && searchBox.classList.remove('open');
  });

  // Tags ein-/ausklappen (Button ist nur mobil sichtbar)
  const tagsEl = $('#tags');
  const tagsToggle = document.querySelector('#tagsToggle');
  if (tagsEl && tagsToggle) {
    tagsToggle.addEventListener('click', () => {
      const listEl = document.querySelector('#tags .tag-list');
      if (!listEl) return;
      const expand = !listEl.classList.contains('expanded');
      listEl.classList.toggle('expanded', expand);
      tagsToggle.setAttribute('aria-expanded', String(expand));
      tagsToggle.textContent = expand ? '✕' : '⌵';
    });
  }

  // Suche
  $('#q').addEventListener('input', (e) => {
    state.q = e.target.value.trim();
    renderAll();
  });

  $('#q').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      state.q = e.target.value.trim();
      renderAll();
    }
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