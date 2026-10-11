/* ==========================================================
   PRESSINGS.XYZ: MY FOLDERS PAGE (folders.js)
   Folder moodboards. Not connected to Airtable.
   ========================================================== */

// ── DATA ──
// Your folders. (These reset on reload for now. Saving for real
// needs accounts or browser storage, which is a later step.)
let folders = [
  { id: 1, name: 'Favourites',     color: 'accent-red',   createdAt: Date.now() - 86400000 * 3, items: [] },
  { id: 2, name: 'Typography Ref', color: 'accent-blue',  createdAt: Date.now() - 86400000 * 2, items: [] },
  { id: 3, name: 'Colour Ref',     color: 'accent-green', createdAt: Date.now() - 86400000,     items: [] },
];
let nextId = 4;
let currentFolderId = null;
let editingFolderId = null;
let deletingFolderId = null;
let movingItem = null;
let moveFromFolderId = null;
let selectedColor = 'accent-red';
let currentSort = 'name';

const COLOR_MAP = {
  'accent-red':   '#d42b2b',
  'accent-blue':  '#185FA5',
  'accent-green': '#3B6D11',
  'accent-amber': '#BA7517',
  'accent-ink':   '#0f0f0f',
};

// ── UTILITIES ──
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function updateStats() {
  const total = folders.reduce((s, f) => s + f.items.length, 0);
  document.getElementById('statFolders').textContent = folders.length;
  document.getElementById('statItems').textContent = total;
  document.getElementById('folderCountLabel').textContent = folders.length + ' folder' + (folders.length !== 1 ? 's' : '');
}

function sortedFolders() {
  const f = [...folders];
  if (currentSort === 'name') f.sort((a, b) => a.name.localeCompare(b.name));
  if (currentSort === 'count') f.sort((a, b) => b.items.length - a.items.length);
  if (currentSort === 'recent') f.sort((a, b) => b.createdAt - a.createdAt);
  return f;
}

// ── RENDER GRID ──
function renderGrid() {
  const grid = document.getElementById('foldersGrid');
  const sorted = sortedFolders();
  grid.innerHTML = '';

  sorted.forEach((f, i) => {
    const card = document.createElement('div');
    card.className = 'folder-card';
    card.dataset.id = f.id;

    // Preview thumbnails
    const previewItems = [...f.items].slice(0, 4);
    while (previewItems.length < 4) previewItems.push(null);
    const bgClasses = ['fpi-1','fpi-2','fpi-3','fpi-4','fpi-5','fpi-6'];

    card.innerHTML = `
      <div class="fc-accent ${f.color}"></div>
      <div class="fc-preview">
        ${previewItems.map((item, idx) => item
          ? `<div class="fc-preview-item" style="background:${item.bg};">
              <svg width="50%" viewBox="0 0 60 60" opacity="0.3">
                <circle cx="30" cy="30" r="24" stroke="#0f0f0f" stroke-width="1" fill="none"/>
                <circle cx="30" cy="30" r="6" fill="#0f0f0f" opacity="0.4"/>
              </svg>
            </div>`
          : `<div class="fc-preview-item empty ${bgClasses[idx]}"></div>`
        ).join('')}
      </div>
      <div class="fc-body">
        <span class="fc-name">${f.name}</span>
        <div class="fc-meta">
          <span class="fc-count">${f.items.length} item${f.items.length !== 1 ? 's' : ''}</span>
          <span class="fc-arrow">→</span>
        </div>
      </div>
      <div class="fc-actions">
        <button class="fc-action-btn" title="Rename" onclick="openRenameModalFor(event,${f.id})">✎</button>
        <button class="fc-action-btn del" title="Delete" onclick="openDeleteModal(event,${f.id})">✕</button>
      </div>
    `;

    card.addEventListener('click', () => openFolder(f.id));

    grid.appendChild(card);

    // Stagger entrance
    setTimeout(() => card.classList.add('visible'), i * 60);
  });

  // New folder card
  const newCard = document.createElement('div');
  newCard.className = 'folder-card-new';
  newCard.innerHTML = `<span class="fc-new-icon">+</span><span class="fc-new-label">New Folder</span>`;
  newCard.onclick = openNewFolderModal;
  grid.appendChild(newCard);

  updateStats();
}

// ── FOLDER DETAIL ──
function openFolder(id) {
  currentFolderId = id;
  const f = folders.find(x => x.id === id);
  if (!f) return;

  document.getElementById('fdTitle').textContent = f.name;
  document.getElementById('fdSubtitle').textContent = f.items.length + ' item' + (f.items.length !== 1 ? 's' : '');
  document.getElementById('fdAccent').style.background = COLOR_MAP[f.color] || '#d42b2b';

  renderDetailGrid(f);

  document.getElementById('foldersSection').style.display = 'none';
  document.getElementById('folderDetail').classList.add('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderDetailGrid(f) {
  const grid = document.getElementById('fdGrid');

  if (f.items.length === 0) {
    grid.innerHTML = `<div class="fd-empty fd-empty-full"><p>No items saved yet. <a href="index.html">Browse the archive →</a></p></div>`;
    return;
  }

  grid.innerHTML = f.items.map((item, idx) => `
    <div class="fd-item">
      <div class="fd-item-inner" style="background:${item.bg};">
        <svg width="55%" viewBox="0 0 100 100" opacity="0.25">
          <circle cx="50" cy="50" r="44" stroke="#0f0f0f" stroke-width="1" fill="none"/>
          <circle cx="50" cy="50" r="10" fill="#0f0f0f" opacity="0.5"/>
        </svg>
      </div>
      <div class="fd-item-label">
        <span>${item.label}</span>
        <small>${item.pressing}</small>
      </div>
      <div class="fd-item-overlay">
        <button class="fd-overlay-btn" onclick="openMoveModal(${idx})">Move</button>
        <button class="fd-overlay-btn remove" onclick="removeItem(${idx})">Remove</button>
      </div>
    </div>
  `).join('');
}

function closeDetail() {
  currentFolderId = null;
  document.getElementById('foldersSection').style.display = '';
  document.getElementById('folderDetail').classList.remove('open');
  renderGrid();
}

function removeItem(itemIdx) {
  const f = folders.find(x => x.id === currentFolderId);
  if (!f) return;
  const removed = f.items.splice(itemIdx, 1)[0];
  toast('Removed "' + removed.label + '" from folder');
  document.getElementById('fdSubtitle').textContent = f.items.length + ' item' + (f.items.length !== 1 ? 's' : '');
  renderDetailGrid(f);
  updateStats();
}

// ── MODALS ──
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function selectColor(el) {
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  selectedColor = el.dataset.color;
}

function openNewFolderModal() {
  editingFolderId = null;
  document.getElementById('folderModalTitle').textContent = 'New Folder';
  document.getElementById('folderNameInput').value = '';
  document.querySelectorAll('.color-swatch').forEach((s, i) => s.classList.toggle('selected', i === 0));
  selectedColor = 'accent-red';
  openModal('folderModal');
  setTimeout(() => document.getElementById('folderNameInput').focus(), 100);
}

function openRenameModalFor(e, id) {
  e.stopPropagation();
  const f = folders.find(x => x.id === id);
  if (!f) return;
  editingFolderId = id;
  document.getElementById('folderModalTitle').textContent = 'Rename Folder';
  document.getElementById('folderNameInput').value = f.name;
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('selected', s.dataset.color === f.color);
  });
  selectedColor = f.color;
  openModal('folderModal');
  setTimeout(() => document.getElementById('folderNameInput').focus(), 100);
}

function openRenameModal() {
  if (!currentFolderId) return;
  openRenameModalFor({ stopPropagation: () => {} }, currentFolderId);
}

function submitFolderModal() {
  const name = document.getElementById('folderNameInput').value.trim();
  if (!name) return;
  if (editingFolderId) {
    const f = folders.find(x => x.id === editingFolderId);
    f.name = name;
    f.color = selectedColor;
    toast('Folder renamed to "' + name + '"');
    if (currentFolderId === editingFolderId) {
      document.getElementById('fdTitle').textContent = name;
      document.getElementById('fdAccent').style.background = COLOR_MAP[selectedColor];
    }
  } else {
    folders.push({ id: nextId++, name, color: selectedColor, createdAt: Date.now(), items: [] });
    toast('Folder "' + name + '" created');
  }
  closeModal('folderModal');
  renderGrid();
}

function openDeleteModal(e, id) {
  e.stopPropagation();
  deletingFolderId = id;
  const f = folders.find(x => x.id === id);
  document.getElementById('deleteFolderName').textContent = '"' + f.name + '"';
  openModal('deleteModal');
}

function confirmDelete() {
  const f = folders.find(x => x.id === deletingFolderId);
  folders = folders.filter(x => x.id !== deletingFolderId);
  toast('Folder "' + f.name + '" deleted');
  closeModal('deleteModal');
  if (currentFolderId === deletingFolderId) closeDetail();
  renderGrid();
}

// ── MOVE ITEM ──
function openMoveModal(itemIdx) {
  const f = folders.find(x => x.id === currentFolderId);
  movingItem = f.items[itemIdx];
  moveFromFolderId = currentFolderId;

  const list = document.getElementById('moveFolderList');
  list.innerHTML = folders
    .filter(x => x.id !== currentFolderId)
    .map(x => `
      <li class="move-folder-opt" data-id="${x.id}" onclick="selectMoveTarget(this)">
        <div class="mfo-icon" style="background:${COLOR_MAP[x.color]};"></div>
        <span class="mfo-name">${x.name}</span>
      </li>
    `).join('');

  openModal('moveModal');
}

function selectMoveTarget(el) {
  document.querySelectorAll('.move-folder-opt').forEach(x => x.classList.remove('selected'));
  el.classList.add('selected');
}

function confirmMove() {
  const selected = document.querySelector('.move-folder-opt.selected');
  if (!selected) { toast('Please select a folder'); return; }
  const targetId = parseInt(selected.dataset.id);
  const target = folders.find(x => x.id === targetId);
  const source = folders.find(x => x.id === moveFromFolderId);

  // Remove from source
  source.items = source.items.filter(x => x.key !== movingItem.key);
  // Add to target
  target.items.push(movingItem);

  toast('Moved to "' + target.name + '"');
  closeModal('moveModal');

  const f = folders.find(x => x.id === currentFolderId);
  document.getElementById('fdSubtitle').textContent = f.items.length + ' item' + (f.items.length !== 1 ? 's' : '');
  renderDetailGrid(f);
  updateStats();
}

// ── SORT ──
function setSort(el, sort) {
  document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  currentSort = sort;
  renderGrid();
}

// ── EXPORT PDF ──
function exportPDF() {
  const f = folders.find(x => x.id === currentFolderId);
  if (!f) return;
  toast('Preparing "' + f.name + '" PDF export…');
  // In production this would call a server-side PDF generator
  // For now we trigger the browser print dialog styled for the folder
  setTimeout(() => {
    const w = window.open('', '_blank');
    const color = COLOR_MAP[f.color] || '#d42b2b';
    w.document.write(`
      <!DOCTYPE html><html><head>
      <title>${f.name} — Pressings.xyz</title>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f4f1eb; font-family: 'IBM Plex Mono', monospace; padding: 40px; }
        .pdf-header { border-bottom: 3px solid ${color}; padding-bottom: 24px; margin-bottom: 32px; display: flex; align-items: flex-end; justify-content: space-between; }
        .pdf-title { font-family: 'Barlow Condensed', sans-serif; font-size: 48px; font-weight: 700; text-transform: uppercase; color: #0f0f0f; line-height: 1; }
        .pdf-meta { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b6b6b; text-align: right; }
        .pdf-meta strong { color: #0f0f0f; display: block; font-size: 11px; margin-bottom: 4px; }
        .pdf-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .pdf-item { background: #fff; border: 1px solid #d4d0c8; }
        .pdf-thumb { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; }
        .pdf-item-label { padding: 8px 10px; border-top: 1px solid #d4d0c8; }
        .pdf-item-label span { font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: #0f0f0f; display: block; }
        .pdf-item-label small { font-size: 7px; color: #c8c4bb; margin-top: 1px; display: block; }
        .pdf-footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #d4d0c8; font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: #c8c4bb; display: flex; justify-content: space-between; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <div class="pdf-header">
        <div class="pdf-title">${f.name}</div>
        <div class="pdf-meta"><strong>Pressings.xyz</strong>${f.items.length} items · ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</div>
      </div>
      <div class="pdf-grid">
        ${f.items.map(item => `
          <div class="pdf-item">
            <div class="pdf-thumb" style="background:${item.bg};">
              <svg width="55%" viewBox="0 0 100 100" opacity="0.2">
                <circle cx="50" cy="50" r="44" stroke="#0f0f0f" stroke-width="1.5" fill="none"/>
                <circle cx="50" cy="50" r="10" fill="#0f0f0f"/>
              </svg>
            </div>
            <div class="pdf-item-label">
              <span>${item.label}</span>
              <small>${item.pressing}</small>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="pdf-footer">
        <span>pressings.xyz — physical music packaging archive</span>
        <span>Exported ${new Date().toLocaleDateString()}</span>
      </div>
      <script>window.onload = () => window.print();<\/script>
      </body></html>
    `);
    w.document.close();
  }, 600);
}

// ── INIT ──
renderGrid();
