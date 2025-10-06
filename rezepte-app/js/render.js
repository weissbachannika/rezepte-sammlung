import { $, state, getAllTags, matches, RECIPES } from './state.js';
import { openModal } from './modal.js';

export function renderSidebar() {
  const tagEl = $('#tags');
  tagEl.innerHTML = '';

  // Tag-Häufigkeiten zählen
  const counts = new Map();
  for (const r of RECIPES) {
    for (const t of (r.tags || [])) {
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }

  // Alle Tags holen und: erst nach Häufigkeit (desc), dann alphabetisch (asc) sortieren
  const allTags = getAllTags(RECIPES).sort((a, b) => {
    const da = counts.get(a) || 0;
    const db = counts.get(b) || 0;
    if (db !== da) return db - da;          // häufiger → weiter oben
    return a.localeCompare(b, 'de');        // Gleichstand → alphabetisch
  });

  // Flache Liste rendern (keine Überschrift, keine Gruppen)
  const list = document.createElement('div');
  list.className = 'tag-list';

  allTags.forEach((t) => {
    const selected = state.tags.has(t);
    const btn = document.createElement('button');
    btn.className = 'chip' + (selected ? ' active' : '');
    btn.type = 'button';
    btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    btn.title = `${t} • ${counts.get(t) || 0} Rezepte`;
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