/* ==========================================================
   PRESSINGS.XYZ: ARCHIVE / HOME PAGE (archive.js)
   Builds the grid, the format strip, the sidebar filters and the
   stats from Airtable. Nothing on this page is typed in by hand.
   ========================================================== */

// Groups every FORMAT value into one of these families for the strip
const FORMAT_FAMILIES = [
  { name: 'Vinyl',    match: f => /vinyl|lp|7"|10"|12"/i.test(f) },
  { name: 'CD',       match: f => /\bcd\b/i.test(f) },
  { name: 'Cassette', match: f => /cassette|tape/i.test(f) },
  { name: 'Box Set',  match: f => /box/i.test(f) },
];
function familyOf(format) {
  const fam = FORMAT_FAMILIES.find(x => x.match(format));
  return fam ? fam.name : (format || 'Other');
}

// Short tag shown on the corner of each cover
function formatTag(format) {
  if (/cassette/i.test(format)) return 'Cass';
  if (/12"/.test(format)) return '12"';
  if (/7"/.test(format)) return '7"';
  return format;
}

// "Standard Case + 4-Panel J-Card" -> ["Standard Case", "4-Panel J-Card"]
function packagingParts(p) {
  return unique(p.packaging.split('+').map(s => s.trim()).filter(Boolean));
}

const SORTS = [
  { label: 'Newest',  fn: (a, b) => b.id.localeCompare(a.id) },
  { label: 'Oldest',  fn: (a, b) => a.id.localeCompare(b.id) },
  { label: 'Year',    fn: (a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0) },
  { label: 'A–Z',     fn: (a, b) => a.title.localeCompare(b.title) },
];

// Sidebar sections: heading + how to read the value(s) from a pressing
const FILTERS = [
  { key: 'packaging', title: 'Packaging', get: p => packagingParts(p) },
  { key: 'finish',    title: 'Finish',    get: p => p.finish },
  { key: 'decade',    title: 'Decade',    get: p => [p.decade], sort: 'name' },
  { key: 'label',     title: 'Label',     get: p => p.labels },
  { key: 'country',   title: 'Country',   get: p => [p.country] },
];

let pressings = [];
const state = { format: 'all', search: '', sort: 0 };
FILTERS.forEach(f => { state[f.key] = 'all'; });

async function init() {
  try {
    pressings = await getPressings();
  } catch (err) {
    console.error('Airtable error:', err);
    showLoadError(document.getElementById('archiveGrid'));
    return;
  }

  const families = unique(pressings.map(p => familyOf(p.format)));
  fillStats({
    pressings: pressings.length,
    formats: families.length,
    formatsWord: families.length === 1 ? 'format' : 'formats',
    labels: unique(pressings.flatMap(p => p.labels)).length,
    designers: unique(pressings.flatMap(p => p.people)).length,
  });

  buildFormatStrip();
  buildSidebar();

  // Links like index.html?q=Sub%20Pop open with the search filled in
  const q = new URLSearchParams(location.search).get('q');
  if (q) {
    document.getElementById('archiveSearch').value = q;
    state.search = q.toLowerCase();
  }

  render();
}

function buildFormatStrip() {
  const strip = document.querySelector('.format-strip');
  const counts = new Map(tally(pressings.map(p => familyOf(p.format))));
  // Always show the four main formats, plus anything else that's in Airtable
  const names = unique([...FORMAT_FAMILIES.map(f => f.name), ...counts.keys()]);
  const cells = [['all', 'All', pressings.length], ...names.map(n => [n, n, counts.get(n) || 0])];

  strip.style.setProperty('--cols', cells.length);
  strip.insertAdjacentHTML('beforeend', cells.map(([val, name, count]) => `
    <div class="format-pill-cell${val === 'all' ? ' active' : ''}" data-format="${esc(val)}">
      <span class="fp-name">${esc(name)}</span><span class="fp-count">${count}</span>
    </div>`).join(''));

  strip.addEventListener('click', e => {
    const cell = e.target.closest('.format-pill-cell');
    if (!cell) return;
    strip.querySelectorAll('.format-pill-cell').forEach(c => c.classList.remove('active'));
    cell.classList.add('active');
    state.format = cell.dataset.format;
    render();
  });
}

function buildSidebar() {
  const sidebar = document.getElementById('archiveSidebar');
  sidebar.innerHTML = FILTERS.map(filter => {
    let rows = tally(pressings.flatMap(filter.get));
    if (!rows.length) return ''; // nothing in Airtable for this yet, so hide the section
    if (filter.sort === 'name') rows.sort((a, b) => a[0].localeCompare(b[0]));
    const items = [['all', 'All', pressings.length], ...rows.map(([v, c]) => [v, v, c])];
    return `
      <div>
        <p class="sidebar-section-title">${filter.title}</p>
        <ul class="sidebar-filter-list" data-filter="${filter.key}">
          ${items.map(([val, name, count]) => `
            <li><a href="#" data-val="${esc(val)}"${val === 'all' ? ' class="active"' : ''}>${esc(name)} <span class="count">${pad2(count)}</span></a></li>`).join('')}
        </ul>
      </div>`;
  }).join('');

  sidebar.addEventListener('click', e => {
    const link = e.target.closest('a[data-val]');
    if (!link) return;
    e.preventDefault();
    const list = link.closest('.sidebar-filter-list');
    list.querySelectorAll('a').forEach(a => a.classList.remove('active'));
    link.classList.add('active');
    state[list.dataset.filter] = link.dataset.val;
    render();
  });
}

function matches(p) {
  if (state.format !== 'all' && familyOf(p.format) !== state.format) return false;
  for (const filter of FILTERS) {
    if (state[filter.key] !== 'all' && !filter.get(p).includes(state[filter.key])) return false;
  }
  if (state.search) {
    const haystack = [p.title, p.artist, p.labels.join(' '), p.format, p.packaging,
      p.people.join(' '), p.genre, p.subgenre, p.country, p.year].join(' ').toLowerCase();
    if (!haystack.includes(state.search)) return false;
  }
  return true;
}

function cardHTML(p) {
  const cover = p.thumb
    ? `<img src="${esc(p.thumb)}" alt="${esc(p.title)}" loading="lazy">`
    : '<div class="press-cover-empty"></div>';
  const label = p.labels.join(', ') || '—';
  const formatDisplay = p.edition ? `${p.format} · ${p.edition}` : p.format;
  const tag = p.page ? 'a' : 'div';
  return `
    <${tag} class="press-item"${p.page ? ` href="${esc(p.page)}"` : ''}>
      <div class="press-cover">
        <div class="press-cover-inner">${cover}</div>
        <span class="press-item-num">${p.id}</span>
        <span class="press-format-tag">${esc(formatTag(p.format))}</span>
        <div class="press-overlay">
          <div class="po-format">${esc(formatDisplay)}</div>
          <div class="po-title">${esc(p.title)}</div>
          <div class="po-artist">${esc(p.artist)}</div>
          <div class="po-rule"></div>
          <div class="po-meta"><span>${esc(p.year)}</span><span>${esc(label)}</span><span>${esc(p.country)}</span></div>
        </div>
      </div>
      <div class="press-foot">
        <div class="pf-title">${esc(p.title)}</div>
        <div class="pf-artist">${esc(p.artist)} · ${esc(p.year)}</div>
      </div>
    </${tag}>`;
}

function render() {
  const grid = document.getElementById('archiveGrid');
  const shown = pressings.filter(matches).sort(SORTS[state.sort].fn);

  grid.innerHTML = shown.length
    ? shown.map(cardHTML).join('')
    : '<p class="archive-empty">No pressings match those filters.</p>';

  grid.querySelectorAll('.press-item').forEach((item, i) => {
    setTimeout(() => item.classList.add('visible'), i * 60);
  });

  const word = shown.length === 1 ? 'result' : 'results';
  document.getElementById('toolbarCount').textContent = `${shown.length} ${word}`;
  document.getElementById('archiveCount').textContent = `Showing ${shown.length} of ${pressings.length}`;
}

document.getElementById('archiveSearch').addEventListener('input', e => {
  state.search = e.target.value.trim().toLowerCase();
  render();
});
document.getElementById('archiveSearch').addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.target.value = ''; state.search = ''; render(); }
});
document.getElementById('sortBtn').addEventListener('click', () => {
  state.sort = (state.sort + 1) % SORTS.length;
  document.getElementById('sortLabel').textContent = SORTS[state.sort].label;
  render();
});

init();
