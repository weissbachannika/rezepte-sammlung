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

  let realSpices = 0;
  (r.spices || []).forEach(item => {
    if (typeof item === 'string' && item.trim()) {
      const li = document.createElement('li');
      li.textContent = item;
      ulSp.appendChild(li);
      realSpices++;
    } else if (item && typeof item === 'object' && 'section' in item) {
      const li = document.createElement('li');
      li.className = 'subsection';   // kleine Überschrift, ohne Bullet
      li.textContent = item.section;
      ulSp.appendChild(li);
    }
  });

  // Box-Elemente finden
  const spicesBox = ulSp.closest('section.box');
  const ingSpicesWrap = document.querySelector('.ing-spices');

  // Gewürze-Box nur zeigen, wenn es echte Gewürze gibt (nicht nur Überschriften)
  const hasRealSpices = realSpices > 0;
  if (spicesBox) spicesBox.style.display = hasRealSpices ? '' : 'none';

  // Layout umschalten: ohne Gewürze -> eine Spalte (Zutaten volle Breite)
  if (ingSpicesWrap) ingSpicesWrap.classList.toggle('one-col', !hasRealSpices);

  // Steps: unterstützt String, {section}, und {text, sub:[]}
  const olSteps = $('#modalSteps');
  olSteps.innerHTML = '';

  function addSubsteps(liParent, subArr) {
    if (!Array.isArray(subArr) || subArr.length === 0) return;
    const ol = document.createElement('ol');
    ol.className = 'substeps'; // CSS sorgt für i, ii, iii …
    subArr.forEach(s => {
      if (!s) return;
      const li = document.createElement('li');
      li.textContent = s;
      ol.appendChild(li);
    });
    liParent.appendChild(ol);
  }

  (r.steps || []).forEach(item => {
    // Fall 1: Zwischenüberschrift (nicht nummeriert)
    if (item && typeof item === 'object' && 'section' in item) {
      const li = document.createElement('li');
      li.className = 'subsection';
      li.textContent = item.section;
      olSteps.appendChild(li);
      return;
    }

    // Fall 2: Nummerierter Schritt mit Untersteps
    if (item && typeof item === 'object' && 'text' in item) {
      const li = document.createElement('li');
      li.textContent = item.text || '';
      olSteps.appendChild(li);
      addSubsteps(li, item.sub);
      return;
    }

    // Fall 3: Normaler Schritt (string)
    if (typeof item === 'string' && item.trim()) {
      const li = document.createElement('li');
      li.textContent = item;
      olSteps.appendChild(li);
    }
  });

  // Notizen (deine renderNotesList-Version verwenden, falls vorhanden)
  const notesWrap = $('#modalNotes');
  notesWrap.innerHTML = renderNotesList ? renderNotesList(r.notes) : '';

  modal.showModal();
}