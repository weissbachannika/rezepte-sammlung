import { $ } from './state.js';

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
      chip.style.display = 'none'; 
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
  positionTimeFilters();
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

function __updateTagsLayout(listEl) {
  // Merke aktuelle Liste und initialisiere das UI einmalig
  __tagsUI.list = listEl;
  __initTagsUI();

  // Anwenden des passenden Modus (mobil/desktop)
  __applyMode();

  // Wenn mobil und eingeklappt, überstehende Chips ausblenden
  if (isMobile() && !__tagsUI.expanded) {
    const scroll = $('#tagsScroll');
    __hideOverflowingChips(listEl, scroll);
  }
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

function positionTimeFilters() {
  const wrap = document.querySelector('.time-filter-wrapper');
  const tagsBar = document.querySelector('.tags-bar');
  const scroller = document.querySelector('.tag-scroller');
  const aside = document.querySelector('aside');
  if (!wrap || !tagsBar || !scroller || !aside) return;

  const isMobile = window.matchMedia('(max-width: 690px)').matches;

  if (isMobile) {
    // Mobile: Wrapper direkt NACH der gesamten Tags-Bar platzieren
    if (tagsBar.nextElementSibling !== wrap) {
      tagsBar.parentNode.insertBefore(wrap, tagsBar.nextSibling);
    }
    // Nur anzeigen, wenn die Tag-Liste ausgeklappt ist
    const expanded = scroller.classList.contains('expanded');
    wrap.style.display = expanded ? 'flex' : 'none';
  } else {
    // Desktop: oben im aside, immer sichtbar
    if (aside.firstElementChild !== wrap) {
      aside.insertBefore(wrap, aside.firstChild);
    }
    wrap.style.display = ''; // CSS übernimmt Layout
  }
}

window.addEventListener('resize', positionTimeFilters);

export {
  __renderTagLabel,
  __updateTagsLayout,
  __updateToggleButton,
  positionTimeFilters
};