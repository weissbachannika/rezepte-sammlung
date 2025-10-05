import { $, state, getAllTags, matches, RECIPES } from './state.js';
import { openModal } from './modal.js';

export function renderSidebar() {
  const tagEl = $('#tags');
  tagEl.innerHTML = '';

  getAllTags(RECIPES).forEach(t => {
    const selected = state.tags.has(t);

    const btn = document.createElement('button');
    btn.className = 'chip' + (selected ? ' active' : '');
    btn.type = 'button';
    btn.setAttribute('aria-pressed', selected ? 'true' : 'false');

    // Wenn ausgewählt, wie die alten "Aktive Filter"-Chips: mit '×'
    btn.innerHTML = selected ? `${t} <span class="x">×</span>` : t;

    btn.addEventListener('click', () => {
      if (state.tags.has(t)) state.tags.delete(t);
      else state.tags.add(t);

      // Sidebar neu zeichnen, damit das '×' / active-Style direkt passt
      renderSidebar();
      // Grid neu filtern
      renderGrid();
    });

    tagEl.appendChild(btn);
  });
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