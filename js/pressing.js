/* ==========================================================
   PRESSINGS.XYZ: PRESSING PAGE (pressing.js)
   Shared by every pressing page. Each page only says which record
   it is with <body data-pressing="0003">, and this file fills the
   page in from Airtable.
   ========================================================== */

const PRESSING_ID = document.body.dataset.pressing;

// Scan columns in Airtable, the label shown under each scan,
// and which tab (Exterior / Interior / Object) it belongs to.
const SCAN_FIELDS = [
  { field: 'Scan: Outer - Front',              label: 'Outer — Front',     tab: 'exterior' },
  { field: 'Scan: Outer - Back',               label: 'Outer — Back',      tab: 'exterior' },
  { field: 'Scan: Outer - Spine 1',            label: 'Outer — Spine L',   tab: 'exterior' },
  { field: 'Scan: Outer: Spine 2',             label: 'Outer — Spine R',   tab: 'exterior' },
  { field: 'Scan: O-Ring / Transparent Outer', label: 'O-Ring / Outer',    tab: 'exterior' },
  { field: 'Scan: Front Cover',                label: 'Case — Front',      tab: 'exterior' },
  { field: 'Scan: Back Cover',                 label: 'Case — Back',       tab: 'exterior' },
  { field: 'Scan: Spine 1',                    label: 'Spine',             tab: 'exterior' },
  { field: 'Scan: Spine 2',                    label: 'Spine 2',           tab: 'exterior' },
  { field: 'Scan: CD Inside',                  label: 'CD — Inside',       tab: 'interior' },
  { field: 'Scan: Hype Sticker',               label: 'Hype Sticker',      tab: 'exterior' },
  { field: 'Scan: Obi Strip',                  label: 'Obi Strip',         tab: 'exterior' },
  { field: 'Scan: Inner Sleeve',               label: 'Inner Sleeve',      tab: 'interior' },
  { field: 'Scan: Gatefold Interior',          label: 'Gatefold Interior', tab: 'interior' },
  { field: 'Scan: Booklet Cover',              label: 'Booklet Cover',     tab: 'interior' },
  { field: 'Scan: Booklet Pages',              label: 'Booklet',           tab: 'interior' },
  { field: 'Scan: J-Card Front',               label: 'J-Card — Front',    tab: 'interior' },
  { field: 'Scan: J-Card Rear/Spine',          label: 'J-Card — Back',     tab: 'interior' },
  { field: 'Scan: Tray Card Inner',            label: 'Tray Card — Inner', tab: 'interior' },
  { field: 'Scan: Tray Card Back',             label: 'Tray Card — Back',  tab: 'exterior' },
  { field: 'Scan: Lyric Sheet',                label: 'Lyric Sheet',       tab: 'interior' },
  { field: 'Scan: Poster',                     label: 'Poster',            tab: 'interior' },
  { field: 'Scan: Insert / Other',             label: 'Insert',            tab: 'interior' },
  { field: 'Scan: Record Label Side A',        label: 'Label — Side A',    tab: 'object' },
  { field: 'Scan: Record Label Side B',        label: 'Label — Side B',    tab: 'object' },
  { field: 'Scan: Record (Full)',              label: 'Record',            tab: 'object' },
  { field: 'Scan: CD / Disc',                  label: 'CD / Disc',         tab: 'object' },
  { field: 'Scan: Cassette (Front)',           label: 'Cassette — Front',  tab: 'object' },
  { field: 'Scan: Cassette (Back)',            label: 'Cassette — Back',   tab: 'object' },
  { field: 'Scan: Box / Outer Packaging',      label: 'Box / Outer',       tab: 'exterior' },
  { field: 'Photo: Object Detail',             label: 'Detail',            tab: 'object' },
];

// Rows in the header box under the title
const META_FIELDS = [
  { field: 'Label',                         label: 'Label' },
  { field: 'Catalogue Number',              label: 'Cat. No.' },
  { field: 'Year (This Pressing)',          label: 'Year' },
  { field: 'Original Release Date',         label: 'Released' },
  { field: 'Country',                       label: 'Country' },
  { field: 'FORMAT',                        label: 'Format' },
  { field: 'Edition',                       label: 'Edition' },
  { field: 'Color (cassette / CD / vinyl)', label: 'Colour' },
  { field: 'Number of Discs',               label: 'Discs' },
  { field: 'Packaging Type',                label: 'Packaging' },
  { field: 'Condition',                     label: 'Condition' },
];

// The "Print & Production" grid
const PROD_FIELDS = [
  { field: 'FORMAT',                        label: 'Format' },
  { field: 'Packaging Type',                label: 'Packaging' },
  { field: 'Color (cassette / CD / vinyl)', label: 'Colour' },
  { field: 'Edition',                       label: 'Edition' },
  { field: 'Number of Discs',               label: 'Discs' },
  { field: 'Print Finish',                  label: 'Print Finish' },
  { field: 'Special Features',              label: 'Special Features' },
  { field: 'Insert Types',                  label: 'Inserts' },
  { field: 'Speed',                         label: 'Speed' },
  { field: 'Catalogue Number',              label: 'Cat. No.' },
  { field: 'Original Release Date',         label: 'Release Date' },
  { field: 'Typography / Lettering',        label: 'Typography' },
];

const TAG_FIELDS = ['Design Style', 'Subgenre', 'Color Styles', 'Type Styles', 'Aesthetic Tags'];
const FORMAT_TAG_FIELDS = ['FORMAT', 'Edition', 'Packaging Type', 'Special Features', 'Color (cassette / CD / vinyl)'];

let scanData = [];
let currentScan = 0;
let prevPage = null;
let nextPage = null;

const $ = id => document.getElementById(id);

async function loadPressing() {
  let all;
  try {
    all = await getPressings();
  } catch (err) {
    console.error('Airtable error:', err);
    return;
  }

  const p = all.find(x => x.id === String(PRESSING_ID).padStart(4, '0'));
  if (!p) { console.error('No record found for:', PRESSING_ID); return; }
  const f = p.fields;

  // Title area
  document.title = `${p.title} — ${p.artist} · Pressings.xyz`;
  $('pressNumber').textContent = `Pressing #${p.id}`;
  $('recordTitle').textContent = p.title;
  $('recordArtist').textContent = p.artist || '—';
  $('bcArtist').textContent = p.artist || '—';
  $('bcTitle').textContent = p.title;
  $('bcGenre').textContent = p.subgenre || p.genre || '—';
  $('lightboxSub').textContent = `${p.title} · ${p.artist}`;

  // Format tags in the left column
  FORMAT_TAG_FIELDS.forEach((field, i) => {
    const v = text(f, field);
    if (!v) return;
    $('formatTags').insertAdjacentHTML('beforeend',
      `<span class="rh-format-tag${i === 0 ? ' active' : ''}">${esc(v)}</span>`);
  });

  // Meta rows. Labels link to their card on the Labels page.
  META_FIELDS.forEach(m => {
    let v = text(f, m.field);
    if (!v) return;
    v = m.field === 'Label'
      ? values(f, 'Label').map(l => `<a href="labels.html#${slug(l)}">${esc(l)}</a>`).join(', ')
      : esc(v);
    $('metaRows').insertAdjacentHTML('beforeend',
      `<div class="meta-row"><span class="meta-key">${m.label}</span><span class="meta-val">${v}</span></div>`);
  });

  renderScans(f);

  // Design credits. Names link to the Designers page.
  let hasCredits = false;
  CREDIT_ROLES.forEach(role => {
    const names = p.credits[role.field];
    if (!names) return;
    hasCredits = true;
    const cell = role.people === false
      ? esc(names.join(', '))
      : names.map(n => `<a href="designers.html?q=${encodeURIComponent(n)}">${esc(n)}</a>`).join(', ');
    $('creditsTable').insertAdjacentHTML('beforeend', `<tr><td>${role.label}</td><td>${cell}</td></tr>`);
  });
  $('creditsBlock').hidden = !hasCredits;

  // Print & production
  let hasProd = false;
  PROD_FIELDS.forEach(item => {
    const v = text(f, item.field);
    if (!v) return;
    hasProd = true;
    $('productionGrid').insertAdjacentHTML('beforeend',
      `<div class="prod-cell"><span class="prod-key">${item.label}</span><span class="prod-val">${esc(v)}</span></div>`);
  });
  $('productionBlock').hidden = !hasProd;

  // Aesthetic tags (no duplicates)
  const tags = unique(TAG_FIELDS.flatMap(field => values(f, field).flatMap(v => v.split(',').map(t => t.trim()))));
  $('tagsBlock').hidden = tags.length === 0;
  $('aestheticTags').innerHTML = tags.map(t => `<span class="tag">${esc(t)}</span>`).join('');

  // Curator notes
  const notes = text(f, 'Design Notes');
  if (notes) {
    $('curatorNotes').textContent = notes;
    $('notesBlock').hidden = false;
  }

  renderLabelCard(p, all);
  renderNav(p, all);
  renderRelated(p, all);
}

function renderScans(f) {
  scanData = [];
  SCAN_FIELDS.forEach(s => {
    const atts = f[s.field];
    if (!Array.isArray(atts)) return;
    atts.forEach(att => {
      const idx = scanData.length;
      scanData.push({ src: att.url, label: s.label, tab: s.tab });
      $('scanGrid').insertAdjacentHTML('beforeend', `
        <div class="scan-cell" data-tab="${s.tab}" data-idx="${idx}">
          <img src="${esc(att.url)}" alt="${esc(s.label)}" loading="lazy">
          <div class="scan-cell-label"><span class="scl-name">${esc(s.label)}</span><span class="scl-dim">600 dpi · JPEG</span></div>
          <div class="scan-cell-overlay"><span class="zoom-icon">⊕ Zoom</span></div>
          <button class="save-whole-btn" data-dd="whole-${idx}">+ Save pressing</button>
          <button class="save-btn" data-dd="scan-${idx}"><svg viewBox="0 0 16 16"><path d="M8 2v8M5 7l3 3 3-3"/><line x1="3" y1="13" x2="13" y2="13"/></svg></button>
          <div class="folder-dd" id="scan-${idx}"></div>
          <div class="folder-dd whole-dd" id="whole-${idx}"></div>
        </div>`);
    });
  });
  document.querySelector('.scan-count').textContent = `${scanData.length} scans`;

  // Hide tabs that have no scans
  document.querySelectorAll('.scan-tab[data-tab]').forEach(tab => {
    const t = tab.dataset.tab;
    tab.hidden = t !== 'all' && !scanData.some(s => s.tab === t);
  });

  revealOnScroll('.scan-cell', 50);
}

function renderLabelCard(p, all) {
  $('labelName').textContent = p.labels.join(' · ') || '—';
  $('labelCardBody').innerHTML = p.labels.map(label => {
    const count = all.filter(x => x.labels.includes(label)).length;
    return `<a class="label-card-link" href="labels.html#${slug(label)}">
      <span>${esc(label)}</span><span>${count} in archive →</span></a>`;
  }).join('');
}

function renderNav(p, all) {
  const idx = all.findIndex(x => x.id === p.id);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx < all.length - 1 ? all[idx + 1] : null;

  if (prev) {
    $('prevTitle').textContent = prev.title;
    $('prevArtist').textContent = prev.artist || '—';
    prevPage = prev.page;
  } else {
    $('prevDir').textContent = 'Back to';
    $('prevTitle').textContent = 'Archive';
    $('prevArtist').textContent = 'All Pressings';
    prevPage = 'index.html';
  }

  if (next) {
    $('nextTitle').textContent = next.title;
    $('nextArtist').textContent = next.artist || '—';
    nextPage = next.page;
  } else {
    $('nextDir').textContent = 'Back to';
    $('nextTitle').textContent = 'Archive';
    $('nextArtist').textContent = 'All Pressings';
    nextPage = 'index.html';
  }
}

// "Also in Archive": pressings that share a label, designer or genre come first
function renderRelated(p, all) {
  const score = x =>
    x.labels.filter(l => p.labels.includes(l)).length * 3 +
    x.people.filter(n => p.people.includes(n)).length * 2 +
    (x.subgenre && x.subgenre === p.subgenre ? 1 : 0);

  const related = all
    .filter(x => x.id !== p.id && x.page)
    .map(x => ({ x, s: score(x) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map(r => r.x);

  $('relatedList').innerHTML = related.map(r => `
    <li><a class="related-item" href="${esc(r.page)}">
      <div class="rel-thumb">${r.thumb ? `<img src="${esc(r.thumb)}" alt="${esc(r.title)}">` : ''}</div>
      <div class="rel-text"><span class="rel-title">${esc(r.title)}</span><span class="rel-artist">${esc(r.artist)}</span></div>
      <span class="rel-year">${esc(r.year)}</span>
    </a></li>`).join('');
}

/* ── PREV / NEXT ── */
document.querySelector('.record-nav-cell.prev').addEventListener('click', () => { if (prevPage) window.location = prevPage; });
document.querySelector('.record-nav-cell.next').addEventListener('click', () => { if (nextPage) window.location = nextPage; });

/* ── SCAN TABS ── */
document.querySelectorAll('.scan-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.scan-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const t = tab.dataset.tab;
    document.querySelectorAll('.scan-cell').forEach(cell => {
      cell.hidden = t !== 'all' && cell.dataset.tab !== t;
    });
  });
});

/* ── LIGHTBOX ── */
function openLightbox(idx) {
  if (!scanData[idx]) return;
  currentScan = idx;
  $('lightboxImg').src = scanData[idx].src;
  $('lightboxLabel').innerHTML = `<strong>${esc(scanData[idx].label)}</strong>`;
  $('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  $('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}
function lbNav(dir) {
  currentScan = (currentScan + dir + scanData.length) % scanData.length;
  openLightbox(currentScan);
}
$('lightboxClose').addEventListener('click', closeLightbox);
$('lightbox').addEventListener('click', e => { if (e.target === $('lightbox')) closeLightbox(); });
$('lightboxPrev').addEventListener('click', () => lbNav(-1));
$('lightboxNext').addEventListener('click', () => lbNav(1));
document.addEventListener('keydown', e => {
  if (!$('lightbox').classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') lbNav(1);
  if (e.key === 'ArrowLeft') lbNav(-1);
});

/* ── SAVE TO FOLDER MENUS ──
   (Demo only for now: folders reset when the page reloads.) */
const FOLDER_COLORS = ['fi-red', 'fi-blue', 'fi-green', 'fi-amber'];
let folders = [
  { id: 1, name: 'Favourites',     color: 'fi-red',   items: [] },
  { id: 2, name: 'Typography Ref', color: 'fi-blue',  items: [] },
  { id: 3, name: 'Colour Ref',     color: 'fi-green', items: [] },
];
let nextFolderId = 4;
let activeDD = null; // { id, key }

function toast(msg) {
  const t = $('saveToast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function folderRowsHTML(key) {
  return folders.map(fo => `
    <div class="dd-folder-row" data-folder="${fo.id}">
      <div class="dd-folder-icon ${fo.color}"></div>
      <span class="dd-folder-name">${esc(fo.name)}</span>
      <span class="dd-folder-count">${fo.items.length}</span>
      <div class="dd-check ${fo.items.includes(key) ? 'on' : ''}"></div>
    </div>`).join('');
}

function openDD(ddId, heading, name, key) {
  closeAllDD();
  const dd = $(ddId);
  dd.innerHTML = `
    <div class="dd-head"><span class="dd-head-label">${heading}</span><span class="dd-head-name">${esc(name)}</span></div>
    <div class="dd-folders">${folderRowsHTML(key)}</div>
    <div class="dd-new-section">
      <input class="dd-new-input" placeholder="New folder name…">
      <div class="dd-new-row">
        <button class="dd-create-btn">Create + save</button>
        <button class="dd-cancel-btn">Cancel</button>
      </div>
    </div>`;
  dd.classList.add('open');
  activeDD = { id: ddId, key };
}

function closeAllDD() {
  document.querySelectorAll('.folder-dd').forEach(d => d.classList.remove('open'));
  activeDD = null;
}

function refreshDD() {
  if (!activeDD) return;
  $(activeDD.id).querySelector('.dd-folders').innerHTML = folderRowsHTML(activeDD.key);
}

function createFolder() {
  const input = $(activeDD.id).querySelector('.dd-new-input');
  const name = input.value.trim();
  if (!name) return;
  folders.push({ id: nextFolderId, name, color: FOLDER_COLORS[nextFolderId % FOLDER_COLORS.length], items: [activeDD.key] });
  nextFolderId++;
  toast(`Folder "${name}" created`);
  input.value = '';
  refreshDD();
}

// One click handler for everything inside the scan grid
$('scanGrid').addEventListener('click', e => {
  const cell = e.target.closest('.scan-cell');
  if (!cell) return;

  const saveBtn = e.target.closest('[data-dd]');
  if (saveBtn) {
    e.stopPropagation();
    if (saveBtn.classList.contains('save-whole-btn')) {
      const title = $('recordTitle').textContent;
      openDD(saveBtn.dataset.dd, 'Save pressing', title, 'pressing:' + title);
    } else {
      const scanName = cell.querySelector('.scl-name').textContent;
      openDD(saveBtn.dataset.dd, 'Save scan', scanName, 'scan:' + scanName);
    }
    return;
  }

  const dd = e.target.closest('.folder-dd');
  if (dd) {
    e.stopPropagation();
    const row = e.target.closest('.dd-folder-row');
    if (row) {
      const fo = folders.find(x => x.id == row.dataset.folder);
      const i = fo.items.indexOf(activeDD.key);
      if (i === -1) { fo.items.push(activeDD.key); toast('Saved to ' + fo.name); }
      else { fo.items.splice(i, 1); toast('Removed from ' + fo.name); }
      refreshDD();
    }
    if (e.target.closest('.dd-create-btn')) createFolder();
    if (e.target.closest('.dd-cancel-btn')) closeAllDD();
    return;
  }

  openLightbox(Number(cell.dataset.idx));
});

$('scanGrid').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.classList.contains('dd-new-input')) createFolder();
});

document.addEventListener('click', e => {
  if (!e.target.closest('.folder-dd') && !e.target.closest('[data-dd]')) closeAllDD();
});

loadPressing();
