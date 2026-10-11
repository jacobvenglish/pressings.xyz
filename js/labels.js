/* ==========================================================
   PRESSINGS.XYZ: LABELS PAGE (labels.js)
   One card per record label found in the Label column in Airtable,
   with the pressings, artists and designers that belong to it.
   ========================================================== */

let labels = [];
const state = { era: 'all', country: 'all', genre: 'all', format: 'all', search: '' };

// Sidebar sections: heading + which values a label has
const LABEL_FILTERS = [
  { key: 'country', title: 'Country', get: l => l.countries },
  { key: 'genre',   title: 'Genre',   get: l => l.genres },
  { key: 'format',  title: 'Format',  get: l => l.formats },
];

// Collects everything we know about each label from its pressings
function buildLabels(pressings) {
  const byName = new Map();
  pressings.forEach(p => {
    p.labels.forEach(name => {
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(p);
    });
  });

  return [...byName.entries()].map(([name, list]) => ({
    name,
    slug: slug(name),
    pressings: list,
    countries: unique(list.map(p => p.country)),
    decades: unique(list.map(p => p.decade)).sort(),
    years: list.map(p => p.year),
    artists: unique(list.map(p => p.artist)),
    people: tally(list.flatMap(p => p.people)).map(([n]) => n),
    formats: unique(list.map(p => p.format)),
    genres: unique(list.map(p => p.genre)),
    tags: unique(list.flatMap(p => [p.genre, p.subgenre, ...p.styles])),
  })).sort((a, b) => b.pressings.length - a.pressings.length || a.name.localeCompare(b.name));
}

// Colour bar on top of each card, based on decade
function accentClass(decades) {
  if (decades.length !== 1) return 'era-multi';
  return 'era-' + decades[0].slice(2); // "2010s" -> "era-10s"
}

function cardHTML(l) {
  const meta = [
    ['Artists', l.artists.join(', ')],
    ['Designers', l.people.slice(0, 4).join(', ')],
    ['Formats', l.formats.join(', ')],
  ].filter(([, v]) => v);

  return `
    <div class="label-card" id="${l.slug}">
      <div class="lc-accent ${accentClass(l.decades)}"></div>
      <div class="lc-body">
        <div class="lc-header">
          <div>
            <div class="lc-name">${esc(l.name)}</div>
            <span class="lc-country">${esc(l.countries.join(' · '))}</span>
          </div>
          <div class="lc-count-block">
            <span class="lc-count-n">${l.pressings.length}</span>
            <span class="lc-count-l">${l.pressings.length === 1 ? 'Pressing' : 'Pressings'}</span>
          </div>
        </div>
        <div class="lc-meta">
          ${meta.map(([k, v]) => `<div class="lc-meta-row"><span class="lc-meta-key">${k}</span><span class="lc-meta-val">${esc(v)}</span></div>`).join('')}
        </div>
        <div class="lc-releases">
          ${l.pressings.slice(0, 6).map(p => coverThumbHTML(p, 'lc-release-thumb')).join('')}
        </div>
        <div class="lc-tags">${l.tags.slice(0, 5).map(t => `<span class="lc-tag">${esc(t)}</span>`).join('')}</div>
      </div>
      <a class="lc-footer" href="index.html?q=${encodeURIComponent(l.name)}">
        <span class="lc-era">${esc(yearRange(l.years))}</span>
        <span class="lc-arrow">→</span>
      </a>
    </div>`;
}

async function init() {
  let pressings;
  try {
    pressings = await getPressings();
  } catch (err) {
    console.error('Airtable error:', err);
    showLoadError(document.getElementById('labelsGrid'));
    return;
  }
  labels = buildLabels(pressings);

  fillStats({
    labels: labels.length,
    pressings: pressings.length,
    countries: unique(pressings.map(p => p.country)).length,
  });

  buildEraStrip();
  buildSidebar();
  document.getElementById('labelsGrid').innerHTML = labels.map(cardHTML).join('');
  applyFilters();
  revealOnScroll('.label-card', 60);

  // labels.html#sub-pop jumps to that label's card
  if (location.hash) {
    const card = document.getElementById(location.hash.slice(1));
    if (card) {
      card.classList.add('is-target');
      setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
  }
}

function buildEraStrip() {
  const strip = document.getElementById('eraStrip');
  const eras = tally(labels.flatMap(l => l.decades)).sort((a, b) => a[0].localeCompare(b[0]));
  const cells = [['all', 'All', labels.length], ...eras.map(([d, c]) => [d, d, c])];
  strip.style.setProperty('--cols', cells.length);
  strip.insertAdjacentHTML('beforeend', cells.map(([val, name, count]) => `
    <div class="era-cell${val === 'all' ? ' active' : ''}" data-era="${esc(val)}">
      <span class="ec-name">${esc(name)}</span><span class="ec-count">${count}</span>
    </div>`).join(''));

  strip.addEventListener('click', e => {
    const cell = e.target.closest('.era-cell');
    if (!cell) return;
    strip.querySelectorAll('.era-cell').forEach(c => c.classList.remove('active'));
    cell.classList.add('active');
    state.era = cell.dataset.era;
    applyFilters();
  });
}

function buildSidebar() {
  const sidebar = document.getElementById('labelsSidebar');
  sidebar.innerHTML = LABEL_FILTERS.map(filter => {
    const rows = tally(labels.flatMap(filter.get));
    if (!rows.length) return '';
    const items = [['all', 'All', labels.length], ...rows.map(([v, c]) => [v, v, c])];
    return `
      <div>
        <p class="sidebar-section-title">${filter.title}</p>
        <ul class="sidebar-list" data-filter="${filter.key}">
          ${items.map(([val, name, count]) => `
            <li><a href="#" data-val="${esc(val)}"${val === 'all' ? ' class="active"' : ''}>${esc(name)} <span class="count">${count}</span></a></li>`).join('')}
        </ul>
      </div>`;
  }).join('');

  sidebar.addEventListener('click', e => {
    const link = e.target.closest('a[data-val]');
    if (!link) return;
    e.preventDefault();
    const list = link.closest('.sidebar-list');
    list.querySelectorAll('a').forEach(a => a.classList.remove('active'));
    link.classList.add('active');
    state[list.dataset.filter] = link.dataset.val;
    applyFilters();
  });
}

function applyFilters() {
  let visible = 0;
  labels.forEach(l => {
    const card = document.getElementById(l.slug);
    const searchText = [l.name, ...l.artists, ...l.people, ...l.countries, ...l.tags].join(' ').toLowerCase();
    const show =
      (state.era === 'all' || l.decades.includes(state.era)) &&
      LABEL_FILTERS.every(f => state[f.key] === 'all' || f.get(l).includes(state[f.key])) &&
      (!state.search || searchText.includes(state.search));
    card.hidden = !show;
    if (show) visible++;
  });
  document.getElementById('labelCount').textContent = `${visible} label${visible === 1 ? '' : 's'}`;
}

// Clicking a card opens the archive filtered to that label
// (clicking a cover thumbnail goes straight to that pressing instead)
document.getElementById('labelsGrid').addEventListener('click', e => {
  if (e.target.closest('a')) return;
  const card = e.target.closest('.label-card');
  if (card) window.location = card.querySelector('.lc-footer').href;
});

document.getElementById('labelSearch').addEventListener('input', e => {
  state.search = e.target.value.trim().toLowerCase();
  applyFilters();
});

init();
