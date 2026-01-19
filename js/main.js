import { $, state, setRecipes, applyStateFromHash, syncHashFromState } from './state.js';
import { loadRecipes } from './loader.js';
import { renderAll } from './grid.js';
import { renderSidebar } from './sidebar.js';
import { openModal } from './modal.js';

window.addRecipe = (r) => {
  const list = window.RECIPES || [];
  list.push(r);
  setRecipes(list);
  renderSidebar(); renderAll();
};

async function main() {
  await loadRecipes();    // Daten holen (setzt RECIPES)
  applyStateFromHash();
  const qInput = $('#q');
  if (qInput) qInput.value = state.q || '';
  renderSidebar();        // Tags aufbauen
  renderAll();            // Filterleiste + Grid

  document.addEventListener('filters-changed', () => {
    renderSidebar();
    renderAll();
  });

  // Reopen recipe from hash (#r=ID oder #recipe=ID)
  try {
    const params = new URLSearchParams(location.hash.slice(1));
    const recipeId = params.get('r') || params.get('recipe');
    if (recipeId) {
      requestAnimationFrame(() => {
        openModal(recipeId, { reset: true, push: false });
      });
    }
  } catch { /* noop */ }

  // --- Mobile UI helpers -------------------------------------------------
  const searchBox = document.querySelector('.search');
  const isNarrow = () => window.matchMedia('(max-width:680px)').matches;
  const closeSearchBtn = $('#closeSearch');

  function closeMobileSearch() {
    if (!isNarrow()) return;
    if (searchBox) searchBox.classList.remove('open');
    if (closeSearchBtn) closeSearchBtn.style.display = 'none';
    if (qInput) qInput.blur();
  }

  if (searchBox) {
    searchBox.addEventListener('click', (ev) => {
      if (ev.target === closeSearchBtn) return;
      if (!isNarrow()) return;                    
      if (ev.target === qInput) return;         
      if (!searchBox.classList.contains('open')) {
        searchBox.classList.add('open');
        if (closeSearchBtn) closeSearchBtn.style.display = '';
        requestAnimationFrame(() => qInput && qInput.focus());
      } else {
        requestAnimationFrame(() => qInput && qInput.focus());
      }
    });
  }

  if (closeSearchBtn) {
    closeSearchBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();           // verhindert Re-Öffnen durch den Container-Handler
      if (qInput) qInput.value = '';  // Suchfeld leeren
      state.q = '';                   // Filter zurücksetzen
      renderAll(); 
      syncHashFromState();
      closeMobileSearch();
    });
  }

  // Klick außerhalb schließt die Popover-Suche (nur mobil)
  document.addEventListener('click', (ev) => {
    if (!isNarrow()) return;
    if (!searchBox || !searchBox.classList.contains('open')) return;
    const within = searchBox.contains(ev.target);
    const inHeader = ev.target.closest && ev.target.closest('header');
    const hasText = qInput && qInput.value.trim().length > 0;
    if (!within && !inHeader && !hasText) {
      closeMobileSearch();
    }
  });

  // ESC schließt Popover-Suche (nur mobil)
  document.addEventListener('keydown', (ev) => {
    if (!isNarrow()) return;
    if (ev.key === 'Escape') {
      const hasText = qInput && qInput.value.trim().length > 0;
      if (!hasText) closeMobileSearch();
    }
  });

  // Suche
  $('#q').addEventListener('input', (e) => {
    state.q = e.target.value.trim();
    renderAll();
    syncHashFromState();
  });

  $('#q').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      state.q = e.target.value.trim();
      renderAll();
    }
  });

  window.addEventListener('resize', () => {
    if (!isNarrow() && closeSearchBtn) {
      closeSearchBtn.style.display = 'none';
    }
  });

  function capTagList() {
    const aside = document.querySelector('aside');
    const scroll = document.getElementById('tagsScroll');
    const footer = document.getElementById('siteFooter');
    if (!aside || !scroll || !footer) return;

    const asideRect  = aside.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();

    // sichtbarer Footer-Anteil
    const footerVisible = Math.max(
      0,
      Math.min(footerRect.bottom, window.innerHeight) - Math.max(footerRect.top, 0)
    );

    // Abstand, der unter der Liste frei bleiben soll
    const gapBottom = 46; // px

    // verfügbare Höhe ab Oberkante Aside bis Viewport-Unterkante, abzüglich sichtbarem Footer + Gap
    const availableAside = Math.max(0, window.innerHeight - asideRect.top - footerVisible - gapBottom);

    // "Chrome" oberhalb der Scrollfläche im Aside (Titelzeile, Padding usw.)
    const chromeTop = document.querySelector('.section-title') 
        ? document.querySelector('.section-title').getBoundingClientRect().bottom - asideRect.top
        : 0;
    const padBottom = parseFloat(getComputedStyle(aside).paddingBottom) || 0;

    const availableForScroll = Math.max(0, availableAside - chromeTop - padBottom);

    scroll.style.maxHeight = `${availableForScroll}px`;
  }

  window.addEventListener('scroll', capTagList, { passive: true });
  window.addEventListener('resize', capTagList);
  document.addEventListener('DOMContentLoaded', capTagList);
  capTagList();
}

main();