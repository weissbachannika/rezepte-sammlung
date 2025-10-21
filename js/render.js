import { $, state, getAllTags, matches, RECIPES } from './state.js';
import { openModal } from './modal.js';

// ---- Tags UI helpers: single source of truth for collapse/expand + overflow hiding ----
// This module-scope state persists across re-renders of the tag list.
const __tagsUI = {
  initialized: false,
  expanded: false,
  list: null,   // current .tag-list element
  mode: null,
  mobileInitDone: false,
};

function __showAllChips(listEl) {
  if (!listEl) return;
  Array.from(listEl.children).forEach(c => { c.style.display = ''; });
}

function __hideOverflowingChips(listEl, scrollEl) {
  if (!listEl || !scrollEl) return;
  // make all visible first
  __showAllChips(listEl);

  const chips = Array.from(listEl.children);
  const cs = getComputedStyle(listEl);
  const gap = parseFloat(cs.gap || '0');
  const maxW = scrollEl.clientWidth;

  let used = 0;
  for (const chip of chips) {
    const w = chip.offsetWidth;
    const next = used === 0 ? w : used + gap + w;
    if (next <= maxW) {
      used = next;
    } else {
      chip.style.display = 'none'; // completely hide chips that do not fully fit
    }
  }
}

function __setExpanded(on) {
  const btn = $('#tagsToggle');
  const scroll = $('#tagsScroll');
  const list = __tagsUI.list;

  __tagsUI.expanded = !!on;
  if (btn) btn.setAttribute('aria-expanded', String(__tagsUI.expanded));
  if (!list || !scroll) return;

  const mobile = isMobile();

  if (mobile && __tagsUI.expanded) {
    // Mobile: ausgeklappt = mehrere Zeilen sichtbar, kein innerer Scroll
    list.classList.add('expanded');
    list.style.flexWrap = 'wrap';
    scroll.classList.add('expanded');
    scroll.style.overflow = 'visible';
    __showAllChips(list);
  } else if (mobile && !__tagsUI.expanded) {
    // Mobile: eingeklappt = exakt eine Zeile, überstehende Chips komplett ausblenden
    list.classList.remove('expanded');
    list.style.flexWrap = 'nowrap';
    scroll.classList.remove('expanded');
    scroll.style.overflow = 'hidden';
    __hideOverflowingChips(list, scroll);
  } else {
    // Desktop: immer offen halten, Button-Zustand nur der Vollständigkeit halber
    list.classList.add('expanded');
    list.style.flexWrap = 'wrap';
    scroll.classList.add('expanded');
    scroll.style.overflow = 'visible';
    __showAllChips(list);
  }
  __updateToggleButton();
}

const isMobile = () => window.matchMedia('(max-width: 690px)').matches;

function __applyMode() {
  const btn = $('#tagsToggle');
  const scroll = $('#tagsScroll');
  const list = __tagsUI.list;
  if (!list || !scroll) return;

  const mobile = isMobile();
  const currentMode = mobile ? 'mobile' : 'desktop';
  if (!__tagsUI.mobileInitDone) {
    // Mobile: Default = eingeklappt, keine Auto-Logik
    __tagsUI.expanded = false;
    __tagsUI.mobileInitDone = true;
  }

  if (!mobile) {
    // Desktop: immer offen, kein Inner-Scroll
    __tagsUI.expanded = true;
    if (btn) { btn.style.display = 'none'; btn.setAttribute('aria-expanded', 'true'); }
    list.classList.add('expanded'); list.style.flexWrap = 'wrap';
    scroll.classList.add('expanded'); scroll.style.overflow = 'visible';
    __showAllChips(list);
    __updateToggleButton();
    return;
  }

  // Mobile: Button anzeigen
  if (btn) { btn.style.display = ''; btn.setAttribute('aria-expanded', String(__tagsUI.expanded)); }

  if (!__tagsUI.mobileInitDone) {
    // Nur beim ersten Setup auf Mobile anhand der Breite entscheiden
    __showAllChips(list);
    const need = list.scrollWidth;
    const avail = scroll.clientWidth;
    const shouldCollapse = need > avail;
    __tagsUI.expanded = !shouldCollapse;
    __tagsUI.mobileInitDone = true;
  }

  // Ab hier wird der Zustand nie mehr von selbst geändert
  if (__tagsUI.expanded) {
    list.classList.add('expanded'); list.style.flexWrap = 'wrap';
    scroll.classList.add('expanded'); scroll.style.overflow = 'visible';
    __showAllChips(list);
    __updateToggleButton();
  } else {
    list.classList.remove('expanded'); list.style.flexWrap = 'nowrap';
    scroll.classList.remove('expanded'); scroll.style.overflow = 'hidden';
    __hideOverflowingChips(list, scroll);
    __updateToggleButton();
  }
}

function __initTagsUI() {
  if (__tagsUI.initialized) return;
  const btn = $('#tagsToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      if (!isMobile()) return; // Button nur mobil wirksam
      __setExpanded(!__tagsUI.expanded);
    }, { passive: true });
  }
  window.addEventListener('resize', () => {
    if (!__tagsUI.list) return;
    const now = isMobile() ? 'mobile' : 'desktop';
    if (__tagsUI.mode !== now) {
      __tagsUI.mode = now;
      __tagsUI.mobileInitDone = false;   // beim Wechsel neu initialisieren
    }
    __applyMode();
    __updateToggleButton();
    if (isMobile() && !__tagsUI.expanded) {
      const scroll = $('#tagsScroll');
      __hideOverflowingChips(__tagsUI.list, scroll);
    }
  });
  __tagsUI.initialized = true;
}

// ---- tag label helper: prevent line breaks inside hyphenated words ----
function __renderTagLabel(label) {
  return label.replace(/-/g, '\u2011');
}

function __canExpand(listEl, scrollEl) {
  if (!listEl || !scrollEl) return false;

  // Zustand sichern
  const prevWrap = listEl.style.flexWrap;
  const prevExpanded = listEl.classList.contains('expanded');
  const prevDisplays = Array.from(listEl.children).map(ch => ch.style.display);

  // Für Messung: alles zeigen, einzeilig erzwingen
  __showAllChips(listEl);
  listEl.classList.remove('expanded');
  listEl.style.flexWrap = 'nowrap';

  const need = listEl.scrollWidth;
  const avail = scrollEl.clientWidth;
  const can = need > avail;

  // Zustand zurücksetzen
  prevDisplays.forEach((v, i) => { listEl.children[i].style.display = v; });
  if (prevExpanded) listEl.classList.add('expanded');
  listEl.style.flexWrap = prevWrap;

  return can;
}

function __updateToggleButton() {
  const btn = $('#tagsToggle');
  const scroll = $('#tagsScroll');
  const list = __tagsUI.list;
  if (!btn || !list || !scroll) return;

  if (!isMobile()) { btn.style.display = 'none'; return; }

  const can = __canExpand(list, scroll);

  // Button nur anzeigen, wenn Ausklappen sinnvoll ist
  if (!can) {
    btn.style.display = 'none';
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<i class="fa-solid fa-caret-down"></i>';
    return;
  }

  btn.style.display = '';
  if (__tagsUI.expanded) {
    btn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    btn.setAttribute('aria-expanded', 'true');
  } else {
    btn.innerHTML = '<i class="fa-solid fa-caret-down"></i>';
    btn.setAttribute('aria-expanded', 'false');
  }
}

function __updateTagsLayout(listEl) {
  __initTagsUI();
  __tagsUI.list = listEl;
  __applyMode();
  __updateToggleButton();
}
// ---- end tags helpers ----

function renderCategoryBar() {
  const wrap = $('#catBar');
  if (!wrap) return;
  wrap.innerHTML = '';

  const buttons = [
    { key: 'all',    label: 'Alles' },
    { key: 'savory', label: 'Herzhaftes' },
    { key: 'sweet',  label: 'Süßes' },
  ];

  buttons.forEach(b => {
    const div = document.createElement('div');
    div.className = 'category-item' + (state.category === b.key ? ' active' : '');
    div.textContent = b.label;
    div.addEventListener('click', () => {
      state.category = b.key;
      renderSidebar();
      renderAll();
    });
    wrap.appendChild(div);
  });
}

export function renderSidebar() {
  const tagEl = $('#tags');
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

  const BASE = RECIPES.filter(inCategory);

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
    });

    list.appendChild(btn);
  });

  tagEl.appendChild(list);
  __updateTagsLayout(list);
  __updateToggleButton();
}

export function renderGrid() {
  const wrap = $('#grid');
  wrap.innerHTML = '';
  const items = RECIPES.filter(matches);
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.style.gridColumn = '1 / -1';
    empty.textContent = 'Nichts gefunden. Filter anpassen oder Suchbegriff ändern.';
    wrap.appendChild(empty);
    return;
  }
  items.forEach(r => {
    const card = document.createElement('article');
    card.className = 'card';
    card.setAttribute('tabindex', '0');
    card.addEventListener('click', () => openModal(r.id));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') openModal(r.id); });

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    if (r.image) {
      const img = document.createElement('img');
      img.alt = r.title; img.loading = 'lazy'; img.src = r.image;
      thumb.appendChild(img);
    } else {
      thumb.textContent = 'Kein Bild';
    }

    const visibleTags = (r.tags || []).filter(t => t !== 'Süßes');

    const body = document.createElement('div');
    body.className = 'card-body';
    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = r.title;
    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.textContent = (visibleTags || []).join(' • ');

    body.appendChild(title);
    body.appendChild(meta);
    card.appendChild(thumb);
    card.appendChild(body);
    wrap.appendChild(card);
  });
}

// Oben gibt es keine aktive-Filter-Liste mehr.
export function renderAll() {
  renderCategoryBar();
  renderGrid();
}