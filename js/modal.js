import { $, RECIPES } from './state.js';

const modal = $('#recipeModal');
if (modal && modal.style) modal.style.overscrollBehavior = 'contain';
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
    unlockBodyScroll();
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
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g,'');
}

function formatInlineEscaped(s) {
  // erst escapen, dann Markdown-Bold einsetzen
  return escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>');
}

function renderInline(text) {
  const str = String(text ?? '');
  const re = /\[([^\]]+)\]\(#([^\)]+)\)/g;
  let out = '', last = 0, m;
  while ((m = re.exec(str))) {
    out += formatInlineEscaped(str.slice(last, m.index));   // normaler Text
    const title = formatInlineEscaped(m[1]);
    const file  = m[2].replace(/^#/, '').trim();
    out += `<a href="#" class="recipe-link" data-file="${escapeHtml(file)}">${title}</a>`;
    last = re.lastIndex;
  }
  out += formatInlineEscaped(str.slice(last));
  return out;
}

function renderNotesList(notes) {
  const arr = toArray(notes);
  if (!arr.length) return '—';
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

function renderExternalLinks(text) {
  const s = String(text ?? '');

  // 1) Markdown-Links [Text](https://example.com)
  let html = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
  );

  // 2) Autolinks außerhalb vorhandener <a>
  const urlRe = /(https?:\/\/[^\s<]+)/g;
  html = html
    .split(/(<a\b[^>]*>.*?<\/a>)/gis)
    .map((part, i) =>
      i % 2
        ? part
        : part.replace(
            urlRe,
            (u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`
          )
    )
    .join('');

  return html;
}

function __resetModalScroll() {
  // reset scroll position of the dialog and its inner body
  if (modal) modal.scrollTop = 0;
  const body = modal && modal.querySelector('.modal-body');
  if (body) body.scrollTop = 0;
}

function lockBodyScroll() {
  document.documentElement.style.overflow = 'hidden';
}

function unlockBodyScroll() {
  document.documentElement.style.overflow = '';
}

function formatMinutes(min) {
  const m = Number(min);
  if (!Number.isFinite(m) || m <= 0) return '';
  if (m < 60) return `${m} Min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} Std ${r} Min` : `${h} Std`;
}

// --------------- Main ---------------

export function openModal(id, opts = {}) {
  const { push = false, reset = false } = opts;
  if (reset || !modal.open) modalStack = [];
  if (push && currentId) modalStack.push(currentId);

  const r = RECIPES.find(x => x.id === id);
  if (!r) return;
  currentId = id;

  $('#modalTitle').textContent = r.title;

  const metaGrid    = $('#metaGrid');
  const imgWrap     = $('#modalImg');
  const spicesBox   = $('#spicesBox');
  const ulSp        = $('#modalSpices');
  const ingBox      = $('#ingredientsBox');
  const ulIng       = $('#modalIngredients');
  const servings    = $('#servings');

  const timeChip    = $('#timeChip');
  const prepText    = $('#modalPrepText');
  const totalText   = $('#modalTotalText');
  const prepIcon    = $('#prepIcon');
  const totalIcon   = $('#totalIcon');

  const matsBox     = $('#materialsBox');
  const ulMat       = $('#modalMaterials');

  // --- ZEIT (Prep + Gesamtzeit in einer Zeile, ohne Überschrift) ---
  // Unterstützt ints in Minuten. Prep wird nur angezeigt wenn vorhanden.
  const prepMin  = r?.time?.prep  ?? r?.prepTime ?? null;
  const totalMin = r?.time?.total ?? r?.totalTime ?? null;

  const prepStr  = formatMinutes(prepMin);
  const totalStr = formatMinutes(totalMin);

  const showPrep  = !!prepStr;
  const showTotal = !!totalStr;

  if (prepIcon)  prepIcon.style.display  = showPrep  ? '' : 'none';
  if (prepText)  {
    prepText.textContent = showPrep ? prepStr : '';
    prepText.style.display = showPrep ? '' : 'none';
  }
  if (totalIcon) totalIcon.style.display = showTotal ? '' : 'none';
  if (totalText) {
    totalText.textContent = showTotal ? totalStr : '';
    totalText.style.display = showTotal ? '' : 'none';
  }

  timeChip.style.display = (showPrep || showTotal) ? 'flex' : 'none';

  const amt = Number(r?.amount);
  if (Number.isFinite(amt) && amt > 0) {
    const label = amt === 1 ? 'Portion' : 'Portionen';
    servings.textContent = `${amt} ${label}`;
    servings.style.display = '';
  } else {
    servings.textContent = '';
    servings.style.display = 'none';
  }

  // --- Zutaten ---
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

  // --- Bild (rechts) ---
  imgWrap.innerHTML = '';
  let hasImage = false;
  if (r.image) {
    const src = String(r.image).trim();
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = r.title;
      img.loading = 'lazy';
      imgWrap.appendChild(img);
      imgWrap.style.display = '';
      hasImage = true;
    } else {
      imgWrap.style.display = 'none';
    }
  } else {
    imgWrap.style.display = 'none';
  }

  // --- Gewürze (rechts unter Bild) ---
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
  const hasSpices = realSpices > 0;
  spicesBox.style.display = hasSpices ? '' : 'none';

  // --- Rechte Spalte leer? -> linke volle Breite ---
  const nothingRight = !hasImage && !hasSpices;
  metaGrid.classList.toggle('no-right', nothingRight);

  // --- Steps (unverändert) ---
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

  // --- MATERIALIEN (über Steps) ---
  const matWrap = $('#modalMaterials');
  matWrap.textContent = '';

  if (typeof r.materials === 'string' && r.materials.trim()) {
    matWrap.textContent = r.materials.trim();
    matsBox.style.display = '';
  } else {
    matsBox.style.display = 'none';
  }

  // --- Notizen ---
  const notesHeader = $('#notesHeader');
  const notesWrap = $('#modalNotes');

  // sowohl String als auch Array unterstützen -> immer Liste rendern
  const notesArr = toArray(r.notes); // split bei \n, filtert Leerzeilen
  if (notesArr.length) {
    notesWrap.innerHTML = `<ul class="notes">${notesArr
      .map(n => `<li>${renderInline(n)}</li>`)
      .join('')}</ul>`;
    notesHeader.style.display = '';
    notesWrap.style.display = '';
  } else {
    notesHeader.style.display = 'none';
    notesWrap.style.display = 'none';
  }

  // --- Credits ---
  const creditsHeader = $('#creditsHeader');
  const creditsWrap = $('#modalCredits');
  if (typeof r.credits === 'string' && r.credits.trim()) {
    creditsWrap.innerHTML = renderExternalLinks(r.credits.trim()); // <-- neu
    creditsHeader.style.display = '';
    creditsWrap.style.display = '';
  } else {
    creditsHeader.style.display = 'none';
    creditsWrap.style.display = 'none';
  }
  // ensure we start at the top when switching recipes
  __resetModalScroll();
  lockBodyScroll();
  modal.showModal();
  // enforce again on next frame in case layout shifts
  requestAnimationFrame(__resetModalScroll);
}

// --- Klickbare Rezept-Links im Modal (Delegation) ---
modal.addEventListener('click', (e) => {
  const a = e.target.closest('.recipe-link');
  if (!a) return;
  e.preventDefault();
  const targetFile = a.dataset.file.replace(/^\#/, '').replace(/\.json$/,'').trim();
  const sameBase = (s) => !!s && s.replace(/^\.\/?/, '').replace(/^rezepte\//, '').replace(/\.json$/,'').trim() === targetFile;
  const hit = RECIPES.find(r => sameBase(r.file) || slugifyTitle(r.title) === targetFile);
  if (hit) {
    openModal(hit.id, { push: true });  //beim Linkklick vorheriges Rezept merken
  } else {
    alert(`Rezept "${targetFile}" nicht gefunden 😕`);
  }
});

modal.addEventListener('close', unlockBodyScroll);
