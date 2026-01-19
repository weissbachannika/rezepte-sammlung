import { $, state, matches, RECIPES, syncHashFromState } from './state.js';
import { meetsTime } from './time_filters.js';
import { openModal } from './modal.js';
import { renderSidebar } from './sidebar.js';

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
      syncHashFromState();
    });
    wrap.appendChild(div);
  });
}

function __searchTier(recipe, tokens) {
  if (!tokens || tokens.length === 0) return 99;
  const lc = (s) => String(s || '').toLowerCase();
  const title = lc(recipe.title);
  const tags = (recipe.tags || []).map(lc);
  const ingText = (recipe.ingredients || [])
    .map(x => typeof x === 'string' ? x : '')
    .join(' ') 
    .toLowerCase();
  const notesText = Array.isArray(recipe.notes)
    ? recipe.notes.join(' ').toLowerCase()
    : lc(recipe.notes);

  // For each token, find the best field it matches; take the best across tokens
  let best = 99;
  for (const tok of tokens) {
    const t = tok.toLowerCase();
    let tier = 99;
    if (title.includes(t)) tier = Math.min(tier, 1);
    else if (tags.some(tag => tag.includes(t))) tier = Math.min(tier, 2);
    else if (ingText.includes(t)) tier = Math.min(tier, 3);
    else if (notesText.includes(t)) tier = Math.min(tier, 4);
    best = Math.min(best, tier);
  }
  return best;
}

export function renderGrid() {
  const wrap = $('#grid');
  wrap.innerHTML = '';
  const items = RECIPES.filter(r => matches(r) && meetsTime(r));
  const q = (state.q || '').trim().toLowerCase();
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
  if (tokens.length) {
    items.sort((a, b) => {
      const ta = __searchTier(a, tokens);
      const tb = __searchTier(b, tokens);
      if (ta !== tb) return ta - tb;                   // 1:title, 2:tags, 3:ingredients, 4:notes
      return a.title.localeCompare(b.title, 'de');     // tie-breaker: A–Z
    });
  }
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

    const visibleTags = (r.tags || []).filter(t => {
      if (state.tags.has(t)) return false;
      if (state.category === 'sweet' && t === 'Süßes') return false;
      return true;
    });

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