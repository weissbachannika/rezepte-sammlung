import { $, RECIPES } from './state.js';

const modal = $('#recipeModal');
const closeBtn = $('#modalClose');

let modalStack = [];
let currentId = null;

// statt direkt .close():
function handleClose() {
  if (modalStack.length > 0) {
    const prevId = modalStack.pop();
    openModal(prevId, { /* push */ push: false }); // zurück ohne erneut zu pushen
  } else {
    currentId = null;
    modal.close();
  }
}

closeBtn.addEventListener('click', handleClose);
modal.addEventListener('click', (e) => {
  if (e.target === modal) handleClose(); // Klick auf den Backdrop = "zurück" oder schließen
});
// ESC abfangen → wie Close behandeln
modal.addEventListener('cancel', (e) => { e.preventDefault(); handleClose(); });

// ---------------- Helpers ----------------
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toArray(maybeArrayOrString) {
  if (!maybeArrayOrString) return [];
  if (Array.isArray(maybeArrayOrString)) return maybeArrayOrString.filter(Boolean);
  return String(maybeArrayOrString).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

// --- Link-Helpers: [Titel](#rezeptdatei.json) -> <a data-file="...">
function slugifyTitle(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g,'');
}

function renderInline(text) {
  const str = String(text ?? '');
  const re = /\[([^\]]+)\]\(#([^\)]+)\)/g;
  let out = '', last = 0, m;
  while ((m = re.exec(str))) {
    out += escapeHtml(str.slice(last, m.index));   // normaler Text vorher
    const title = escapeHtml(m[1]);
    const file  = m[2].replace(/^#/, '').trim();
    out += `<a href="#" class="recipe-link" data-file="${escapeHtml(file)}">${title}</a>`;
    last = re.lastIndex;
  }
  out += escapeHtml(str.slice(last));
  return out;
}

function renderNotesList(notes) {
  const arr = toArray(notes);
  if (!arr.length) return '';
  const items = arr.map(n => `<li>${renderInline(n)}</li>`).join('');
  return `<ul class="notes">${items}</ul>`;
}

function addSubsteps(liParent, subArr) {
  if (!Array.isArray(subArr) || subArr.length === 0) return;
  const ol = document.createElement('ol');
  ol.className = 'substeps'; // CSS macht i, ii, iii …
  subArr.forEach(s => {
    if (!s) return;
    const li = document.createElement('li');
    li.innerHTML = renderInline(s);
    ol.appendChild(li);
  });
  liParent.appendChild(ol);
}
// --------------- Main ---------------
export function openModal(id, opts = {}) {
  const { push = false, reset = false } = opts;

  // Stack-Handling
  if (reset || !modal.open) modalStack = [];
  if (push && currentId) modalStack.push(currentId);

  const r = RECIPES.find(x => x.id === id);
  if (!r) return;
  currentId = id;

  $('#modalTitle').textContent = r.title;

  const modalBody = document.querySelector('#recipeModal .modal-body');
  const imgWrap   = $('#modalImg');

  // Bild-Handling: wenn kein Bild -> Container ausblenden
  imgWrap.innerHTML = '';
  if (r.image) {
    const img = document.createElement('img');
    img.src = r.image;
    img.alt = r.title;
    img.loading = 'lazy';
    imgWrap.appendChild(img);
    imgWrap.style.display = '';
    modalBody?.classList.remove('no-img');
  } else {
    imgWrap.style.display = 'none';
    modalBody?.classList.add('no-img');
  }

  // Zutaten (unterstützt Strings und {section:"…"})
  const ulIng = $('#modalIngredients');
  ulIng.innerHTML = '';
  (r.ingredients || []).forEach(item => {
    if (typeof item === 'string') {
      const li = document.createElement('li');
      li.innerHTML = renderInline(item);
      ulIng.appendChild(li);
    } else if (item && typeof item === 'object' && 'section' in item) {
      const li = document.createElement('li');
      li.className = 'subsection';
      li.textContent = item.section;
      ulIng.appendChild(li);
    }
  });

  // Gewürze (Strings / {section}) + Auto-Layout
  const ulSp = $('#modalSpices');
  ulSp.innerHTML = '';
  let realSpices = 0;
  (r.spices || []).forEach(item => {
    if (typeof item === 'string' && item.trim()) {
      const li = document.createElement('li');
      li.innerHTML = renderInline(item);
      ulSp.appendChild(li);
      realSpices++;
    } else if (item && typeof item === 'object' && 'section' in item) {
      const li = document.createElement('li');
      li.className = 'subsection';
      li.textContent = item.section;
      ulSp.appendChild(li);
    }
  });
  const spicesBox = ulSp.closest('section.box');
  const ingSpicesWrap = document.querySelector('.ing-spices');
  const hasRealSpices = realSpices > 0;
  if (spicesBox) spicesBox.style.display = hasRealSpices ? '' : 'none';
  if (ingSpicesWrap) ingSpicesWrap.classList.toggle('one-col', !hasRealSpices);

  // Steps: Strings, {section}, {text, sub:[]}
  const olSteps = $('#modalSteps');
  olSteps.innerHTML = '';
  (r.steps || []).forEach(item => {
    if (item && typeof item === 'object' && 'section' in item) {
      const li = document.createElement('li');
      li.className = 'subsection';
      li.textContent = item.section;
      olSteps.appendChild(li);
      return;
    }
    if (item && typeof item === 'object' && 'text' in item) {
      const li = document.createElement('li');
      li.innerHTML = renderInline(item.text || '');
      olSteps.appendChild(li);
      addSubsteps(li, item.sub);
      return;
    }
    if (typeof item === 'string' && item.trim()) {
      const li = document.createElement('li');
      li.innerHTML = renderInline(item);
      olSteps.appendChild(li);
    }
  });

  // Notizen
  const notesWrap = $('#modalNotes');
  notesWrap.innerHTML = renderNotesList(r.notes);

  modal.showModal();
}

// --- Klickbare Rezept-Links im Modal (Delegation) ---
modal.addEventListener('click', (e) => {
  const a = e.target.closest('.recipe-link');
  if (!a) return;
  e.preventDefault();
  const targetFile = a.dataset.file.replace(/^\#/, '').replace(/\.json$/,'').trim();
  const hit = RECIPES.find(r => slugifyTitle(r.title) === targetFile);
  if (hit) {
    openModal(hit.id, { push: true });  //beim Linkklick vorheriges Rezept merken
  } else {
    alert(`Rezept "${targetFile}" nicht gefunden 😕`);
  }
});
