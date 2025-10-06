import { $, state, getAllTags, matches, RECIPES } from './state.js';
import { openModal } from './modal.js';

export function renderSidebar() {
  const tagEl = $('#tags');
  tagEl.innerHTML = '';

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
      for (const r of RECIPES) if ((r.tags || []).includes(tag)) c++;
      return c;
    }
    const need = state.tags.has(tag) ? selected : [...selected, tag];
    let c = 0;
    for (const r of RECIPES) if (recipeHasAll(r, need)) c++;
    return c;
  };

  // Alle bekannten Tags aufnehmen und anreichern
  const all = getAllTags(RECIPES).map(t => ({
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

  visible.forEach(({ tag: t, selected, count }) => {
    const btn = document.createElement('button');
    btn.className = 'chip' + (selected ? ' active' : '');
    btn.type = 'button';
    btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    btn.title = selected && state.tags.size
      ? `${t} • ${count} Rezepte (mit aktueller Auswahl)`
      : `${t} • ${count} Rezepte`;
    btn.innerHTML = selected ? `${t} <span class="x">×</span>` : t;

    btn.addEventListener('click', () => {
      if (state.tags.has(t)) state.tags.delete(t);
      else state.tags.add(t);
      renderSidebar();
      renderGrid();
    });

    list.appendChild(btn);
  });

  tagEl.appendChild(list);
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

    const body = document.createElement('div');
    body.className = 'card-body';
    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = r.title;
    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.textContent = (r.tags || []).join(' • ');

    body.appendChild(title);
    body.appendChild(meta);
    card.appendChild(thumb);
    card.appendChild(body);
    wrap.appendChild(card);
  });
}

// Oben gibt es keine aktive-Filter-Liste mehr.
export function renderAll() {
  renderGrid();
}