import { $, RECIPES } from './state.js';

const modal = $('#recipeModal');
const closeBtn = $('#modalClose');

closeBtn.addEventListener('click', () => modal.close());
modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

// --- HELPERS: sicher & flexibel rendern ---
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toArray(maybeArrayOrString) {
  if (!maybeArrayOrString) return [];
  if (Array.isArray(maybeArrayOrString)) return maybeArrayOrString.filter(Boolean);
  // Falls noch alte JSONs mit String+Zeilenumbrüchen existieren:
  return String(maybeArrayOrString).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

function renderNotesList(notes) {
  const arr = toArray(notes);
  if (!arr.length) return '—';
  const items = arr.map(n => `<li>${escapeHtml(n)}</li>`).join('');
  return `<ul class="notes">${items}</ul>`;
}

export function openModal(id) {
  const r = RECIPES.find(x => x.id === id);
  if (!r) return;

  $('#modalTitle').textContent = r.title;

  const modalBody = document.querySelector('#recipeModal .modal-body');
  const imgWrap   = $('#modalImg');

  // Bild-Handling
  imgWrap.innerHTML = '';
  if (r.image) {
    const img = document.createElement('img');
    img.src = r.image;
    img.alt = r.title;
    img.loading = 'lazy';
    imgWrap.appendChild(img);
    imgWrap.style.display = '';           // sichtbar
    modalBody.classList.remove('no-img'); // optional, falls du Styles daran knüpfen willst
  } else {
    imgWrap.style.display = 'none';       // komplett aus dem Layout nehmen
    modalBody.classList.add('no-img');    // optional
  }

  // Zutaten
  const ulIng = $('#modalIngredients');
  ulIng.innerHTML = '';

  (r.ingredients || []).forEach(item => {
    if (typeof item === 'string') {
      // normaler Stichpunkt
      const li = document.createElement('li');
      li.textContent = item;
      ulIng.appendChild(li);
    } else if (item && typeof item === 'object' && 'section' in item) {
      // Abschnittsüberschrift (kleiner Titel, ohne Bullet)
      const li = document.createElement('li');
      li.className = 'subsection';
      li.textContent = item.section;
      ulIng.appendChild(li);
    }
  });

  // Gewürze
  const ulSp = $('#modalSpices');
  ulSp.innerHTML = '';

  (r.spices || []).forEach(s => {
    // ignoriert leere/null/undefined Items
    if (typeof s === 'string' ? s.trim() : s) {
      const li = document.createElement('li');
      li.textContent = typeof s === 'string' ? s : String(s);
      ulSp.appendChild(li);
    }
  });

  // Box-Elemente finden
  const spicesBox = ulSp.closest('section.box');                 // Gewürze-Box
  const ingSpicesWrap = document.querySelector('.ing-spices');   // 2-Spalten-Wrapper

  const hasSpices = ulSp.children.length > 0;

  // Gewürze-Box ein-/ausblenden
  if (spicesBox) spicesBox.style.display = hasSpices ? '' : 'none';

  // Layout: wenn keine Gewürze -> Zutaten 1 Spalte (volle Breite), sonst 2 Spalten
  if (ingSpicesWrap) {
    if (hasSpices) ingSpicesWrap.classList.remove('one-col');
    else ingSpicesWrap.classList.add('one-col');
  }

  // Steps
  const olSteps = $('#modalSteps');
  olSteps.innerHTML = '';
  (r.steps || []).forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    olSteps.appendChild(li);
  });

  // Notizen (deine renderNotesList-Version verwenden, falls vorhanden)
  const notesWrap = $('#modalNotes');
  notesWrap.innerHTML = renderNotesList ? renderNotesList(r.notes) : '';

  modal.showModal();
}