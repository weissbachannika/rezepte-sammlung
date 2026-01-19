import { $, state, getAllTags, RECIPES, syncHashFromState } from './state.js';
import { renderTimeFilters, meetsTime } from './time_filters.js';
import {
  __renderTagLabel, __updateTagsLayout, __updateToggleButton, positionTimeFilters
} from './tags_ui.js';
import { renderGrid } from './grid.js';

export function renderSidebar() {
  const tagEl = $('#tags');
  renderTimeFilters();
  positionTimeFilters();
  tagEl.innerHTML = '';
    
  // Always start collapsed via __updateTagsLayout below
  tagEl.classList.toggle('expanded', state.tagsExpanded);

  // Basisdaten auf Kategorie einschränken
  const inCategory = (r) => {
    const SWEET_TAG = 'Süßes';
    const isSweet = (r.tags || []).includes(SWEET_TAG);
    if (state.category === 'sweet')  return isSweet;
    if (state.category === 'savory') return !isSweet;
    return true;
  };

  const BASE = RECIPES.filter(inCategory).filter(meetsTime);

  // aktuell ausgewählte Tags als Array
  const selected = Array.from(state.tags);

  // Helper: prüft, ob ein Rezept alle gegebenen Tags enthält
  const recipeHasAll = (r, mustTags) => {
    const rt = r.tags || [];
    for (const tg of mustTags) if (!rt.includes(tg)) return false;
    return true;
  };

  // Anzahl der Rezepte für:
  // - keine Auswahl: globale Häufigkeit des Tags
  // - mit Auswahl: bedingte Häufigkeit für (selected ∪ {tag})
  const countFor = (tag) => {
    if (selected.length === 0) {
      let c = 0;
      for (const r of BASE) if ((r.tags || []).includes(tag)) c++;
      return c;
    }
    const need = state.tags.has(tag) ? selected : [...selected, tag];
    let c = 0;
    for (const r of BASE) if (recipeHasAll(r, need)) c++;
    return c;
  };

  // Alle bekannten Tags aufnehmen und anreichern
  const all = getAllTags(BASE)
    .filter(t => t !== 'Süßes')  // "Süßes" ausblenden
    .map(t => ({
      tag: t,
      selected: state.tags.has(t),
      count: countFor(t)
  }));

  // Sichtbar sind:
  // - immer: bereits ausgewählte Tags (damit man abwählen kann)
  // - zusätzlich: nur Tags, die mit der aktuellen Auswahl noch Treffer liefern (count > 0)
  const visible = all.filter(x => x.selected || x.count > 0);

  // Sortierung: zuerst ausgewählte Tags nach oben, dann nach count (absteigend), dann alphabetisch
  visible.sort((a, b) => {
    if (a.selected !== b.selected) return a.selected ? -1 : 1;
    if (b.count !== a.count) return b.count - a.count;
    return a.tag.localeCompare(b.tag, 'de');
  });

  // Flache Liste rendern
  const list = document.createElement('div');
  list.className = 'tag-list';
  if (state.tagsExpanded) list.classList.add('expanded');

  visible.forEach(({ tag: t, selected, count }) => {
    const btn = document.createElement('button');
    btn.className = 'chip' + (selected ? ' active' : '');
    btn.type = 'button';
    btn.setAttribute('aria-pressed', selected ? 'true' : 'false');

    const label = __renderTagLabel(t);

    btn.title = selected && state.tags.size
      ? `${label} • ${count} Rezepte (mit aktueller Auswahl)`
      : `${label} • ${count} Rezepte`;

    if (selected) {
      // Text + schließ-Icon als separates Span, verhindert HTML-Injection und Umbrüche
      btn.append(document.createTextNode(label + ' '));
      const x = document.createElement('span');
      x.className = 'x';
      x.textContent = '×';
      btn.appendChild(x);
    } else {
      btn.textContent = label;
    }

    btn.addEventListener('click', () => {
      if (state.tags.has(t)) state.tags.delete(t);
      else state.tags.add(t);
      renderSidebar();
      renderGrid();
      syncHashFromState();
    });

    list.appendChild(btn);
  });

  tagEl.appendChild(list);
  __updateTagsLayout(list);
  __updateToggleButton();
}