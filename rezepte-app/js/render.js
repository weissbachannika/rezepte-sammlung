import { $, state, getAllTags, matches, RECIPES } from './state.js';
import { openModal } from './modal.js';

export function renderFiltersBar() {
  const wrap = $('#activeFilters');
  wrap.innerHTML = '';
  const addChip = (label, onClear) => {
    const chip = document.createElement('button');
    chip.className = 'chip active';
    chip.innerHTML = `${label} <span class="x">×</span>`;
    chip.addEventListener('click', onClear);
    wrap.appendChild(chip);
  };
  state.tags.forEach(t => addChip(t, () => { state.tags.delete(t); renderAll(); }));
  if (state.q) addChip(`Suche: “${state.q}”`, () => { state.q = ''; $('#q').value = ''; renderAll(); });
  if (!wrap.children.length) {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = 'Keine aktiven Filter';
    wrap.appendChild(chip);
  }
}

export function renderSidebar() {
  const tagEl = $('#tags');
  tagEl.innerHTML = '';
  getAllTags(RECIPES).forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'chip' + (state.tags.has(t) ? ' active' : '');
    btn.textContent = t;
    btn.addEventListener('click', () => {
      if (state.tags.has(t)) state.tags.delete(t);
      else state.tags.add(t);
      renderAll();
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

export function renderAll() {
  renderFiltersBar();
  renderGrid();
}