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
  const closeSearchBtn = $('#closeSearch');

  function closeMobileSearch() {
    if (!isNarrow()) return;
    if (searchBox) searchBox.classList.remove('open');
    if (closeSearchBtn) closeSearchBtn.style.display = 'none';
    if (qInput) qInput.blur();
  }

  // Icon-Only Suche: auf Handy als Popover öffnen/schließen
  if (searchBox) {
    searchBox.addEventListener('click', (ev) => {
      if (ev.target === closeSearchBtn) return;
      if (!isNarrow()) return;                    // Desktop: nichts ändern
      if (ev.target === qInput) return;           // direkter Klick ins Input -> kein Toggle
      if (!searchBox.classList.contains('open')) {
        searchBox.classList.add('open');
        if (closeSearchBtn) closeSearchBtn.style.display = '';
        requestAnimationFrame(() => qInput && qInput.focus());
      } else {
        // Bereits offen -> einfach Fokus setzen, nicht schließen
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
    const gapBottom = 60; // px

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