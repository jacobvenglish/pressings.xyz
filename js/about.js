/* ==========================================================
   PRESSINGS.XYZ: ABOUT PAGE (about.js)
   Fills the quick-fact numbers from Airtable.
   ========================================================== */

getPressings()
  .then(pressings => {
    fillStats({
      pressings: pressings.length,
      designers: unique(pressings.flatMap(p => p.people)).length,
      labels: unique(pressings.flatMap(p => p.labels)).length,
    });
  })
  .catch(err => console.error('Airtable error:', err));
