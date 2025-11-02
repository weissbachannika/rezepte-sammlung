import { state, RECIPES } from './state.js';
import { renderSidebar } from './sidebar.js';
import { renderGrid }    from './grid.js';

const getPrep  = (r) => Number(r?.time?.prep ?? r?.time?.total ?? r?.totalTime ?? NaN);
const getTotal = (r) => Number(r?.time?.total ?? r?.totalTime ?? NaN);
function fmtMinutes(min) {
  const n = Number(min);
  if (!Number.isFinite(n)) return '—';
  if (n < 60) return `${n} Min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} Std ${m} Min` : `${h} Std`;
}
function meetsTime(r) {
  const { maxPrep, maxTotal } = state;
  if (Number.isFinite(maxPrep))  { const p = getPrep(r);  if (!Number.isFinite(p) || p > maxPrep)  return false; }
  if (Number.isFinite(maxTotal)) { const t = getTotal(r); if (!Number.isFinite(t) || t > maxTotal) return false; }
  return true;
}
function renderNumericSlider({ sliderSel, labelSel, stateKey, getVal }) {
  const slider = document.querySelector(sliderSel);
  const label  = document.querySelector(labelSel);
  if (!slider || !label) return;

  // Schritte IMMER aus allen Rezepten
  const steps = Array.from(
    new Set(RECIPES.map(getVal).filter(Number.isFinite))
  ).sort((a, b) => a - b);

  const maxIdx = Math.max(steps.length - 1, 0);
  slider.min = '0';
  slider.max = String(maxIdx);
  slider.step = '1';
  slider.disabled = steps.length === 0;

  // Default: größter Wert (= keine Einschränkung)
  if (!Number.isFinite(state[stateKey])) {
    state[stateKey] = steps.length ? steps[maxIdx] : null;
  }

  const idxFromVal = (val) => {
    if (!steps.length || !Number.isFinite(val)) return maxIdx;
    const i = steps.indexOf(val);
    if (i !== -1) return i;
    const j = steps.findIndex(x => x >= val);
    return j === -1 ? maxIdx : j;
  };
  const clampIdx = (i) => Math.min(Math.max(0, i|0), maxIdx);

  const curIdx = clampIdx(idxFromVal(state[stateKey]));
  slider.value = String(curIdx);
  label.textContent = steps.length ? fmtMinutes(steps[curIdx]) : '—';

  slider.oninput = (e) => {
    const i = clampIdx(Number(e.target.value));
    const val = steps.length ? steps[i] : null;
    state[stateKey] = val;
    label.textContent = steps.length ? fmtMinutes(val) : '—';
    renderSidebar();
    renderGrid(); 
  };
}

function renderTimeFilters() {
  renderNumericSlider({
    sliderSel: '#prepSlider',
    labelSel:  '#prepSel',
    stateKey:  'maxPrep',
    getVal:    getPrep,
  });
  renderNumericSlider({
    sliderSel: '#timeSlider',
    labelSel:  '#timeSel',
    stateKey:  'maxTotal',
    getVal:    getTotal,
  });
}

export {
  getPrep, getTotal, fmtMinutes, meetsTime,
  renderNumericSlider, renderTimeFilters
};