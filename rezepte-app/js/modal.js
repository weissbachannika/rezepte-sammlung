import { $, RECIPES } from './state.js';

const modal = $('#recipeModal');
const closeBtn = $('#modalClose');

closeBtn.addEventListener('click', () => modal.close());
modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

export function openModal(id) {
  const r = RECIPES.find(x => x.id === id);
  if (!r) return;

  $('#modalTitle').textContent = r.title;

  const imgWrap = $('#modalImg');
  imgWrap.innerHTML = '';
  if (r.image) {
    const img = document.createElement('img');
    img.src = r.image; img.alt = r.title;
    imgWrap.appendChild(img);
  } else {
    imgWrap.textContent = 'Kein Bild';
  }

  const ulIng = $('#modalIngredients');
  ulIng.innerHTML = '';
  (r.ingredients || []).forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    ulIng.appendChild(li);
  });

  const ulSp = $('#modalSpices');
  ulSp.innerHTML = '';
  (r.spices || []).forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    ulSp.appendChild(li);
  });

  const olSteps = $('#modalSteps');
  olSteps.innerHTML = '';
  (r.steps || []).forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    olSteps.appendChild(li);
  });

  $('#modalNotes').textContent = r.notes || '—';
  modal.showModal();
}