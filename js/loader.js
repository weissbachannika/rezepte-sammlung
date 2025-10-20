import { setRecipes } from './state.js';
import { recipeFileNames } from './data.js';  // <-- hier kommt die Liste her

export async function loadRecipes() {
  // Basis ist die Seite selbst (rezepte.html)
  const base = new URL('.', location.href);

  // WICHTIG: kein "../" – JSONs liegen unter <seite>/rezepte/
  const urls = recipeFileNames.map(f =>
    new URL(`./rezepte/${f}`, base).toString()
  );

  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    })
  );

  const ok = [];
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') ok.push(r.value);
    else errors.push({ file: recipeFileNames[i], url: urls[i], err: r.reason });
  });

  if (errors.length) {
    console.group('%cRezept-Ladefehler', 'color:#ff6b6b');
    errors.forEach(e => console.error(`❌ ${e.file}`, e.url, e.err));
    console.groupEnd();
    const grid = document.getElementById('grid');
    if (grid) {
      const msg = errors.map(e => `• ${e.file}`).join('<br>');
      grid.insertAdjacentHTML('afterbegin',
        `<div class="muted" style="grid-column:1 / -1;">
          Einige Rezepte konnten nicht geladen werden:<br>${msg}
        </div>`);
    }
  }

  setRecipes(ok);
  console.log('Geladen:', ok.length, ok.map(r => r.title));
}