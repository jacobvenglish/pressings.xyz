/* ==========================================================
   PRESSINGS.XYZ: DESIGNERS PAGE (designers.js)
   Every person in the credit columns in Airtable (Art Director,
   Graphic Designer, Photographer...), grouped by role.
   ========================================================== */

const ROLES = CREDIT_ROLES.filter(r => r.people !== false);
const state = { role: 'all', decade: 'all', label: 'all', style: 'all', search: '' };

// Sidebar sections: heading + which values a person has
const PERSON_FILTERS = [
  { key: 'decade', title: 'Era',       get: d => d.decades, sort: 'name' },
  { key: 'label',  title: 'Label',     get: d => d.labels },
  { key: 'style',  title: 'Aesthetic', get: d => d.styles },
];

let people = [];   // one entry per person
let byRole = {};   // role field -> [people in that role]

// Collects each person's pressings, labels, years and styles
function buildPeople(pressings) {
  const map = new Map();
  pressings.forEach(p => {
    ROLES.forEach(role => {
      (p.credits[role.field] || []).forEach(name => {
        if (!map.has(name)) map.set(name, { name, roles: new Set(), pressings: [] });
        const person = map.get(name);
        person.roles.add(role.field);
        if (!person.pressings.includes(p)) person.pressings.push(p);
      });
    });
  });

  people = [...map.values()].map(d => ({
    ...d,
    slug: slug(d.name),
    roleLabels: ROLES.filter(r => d.roles.has(r.field)).map(r => r.label),
    labels: unique(d.pressings.flatMap(p => p.labels)),
    decades: unique(d.pressings.map(p => p.decade)),
    years: d.pressings.map(p => p.year),
    styles: tally(d.pressings.flatMap(p => p.styles)).map(([s]) => s),
    artists: unique(d.pressings.map(p => p.artist)),
  }));

  byRole = {};
  ROLES.forEach(role => {
    byRole[role.field] = people
      .filter(d => d.roles.has(role.field))
      .sort((a, b) => b.pressings.length - a.pressings.length || a.name.localeCompare(b.name));
  });
}

function rowHTML(d) {
  return `
    <tr class="designer-row" data-person="${d.slug}">
      <td><div class="dr-name-cell"><div class="dr-initials">${esc(initials(d.name))}</div><div><span class="dr-name">${esc(d.name)}</span><span class="dr-dates">${esc(d.roleLabels.join(' · '))}</span></div></div></td>
      <td><div class="dr-labels">${d.labels.map(l => `<a class="dr-label-tag" href="labels.html#${slug(l)}">${esc(l)}</a>`).join('')}</div></td>
      <td><span class="dr-era">${esc(yearRange(d.years))}</span></td>
      <td><div class="dr-tags">${d.styles.slice(0, 2).map(s => `<span class="dr-tag">${esc(s)}</span>`).join('')}</div></td>
      <td><span class="dr-count">${d.pressings.length}</span><span class="dr-count-label">${d.pressings.length === 1 ? 'Pressing' : 'Pressings'}</span></td>
      <td><span class="dr-arrow">→</span></td>
    </tr>`;
}

function sectionHTML(role, i) {
  const list = byRole[role.field];
  return `
    <div class="role-section" id="section-${slug(role.field)}" data-role="${esc(role.field)}">
      <div class="role-section-header">
        <span class="role-section-num">${pad2(i + 1)}</span>
        <span class="role-section-title">${esc(role.group)}</span>
        <div class="role-section-meta">
          <span>${list.length} credited</span>
          <span class="role-toggle">↓</span>
        </div>
      </div>
      <div class="role-section-body">
        <table class="designer-table">
          <thead>
            <tr><th>Name</th><th>Associated Labels</th><th>Years</th><th>Aesthetic</th><th>Pressings</th><th></th></tr>
          </thead>
          <tbody>${list.map(rowHTML).join('')}</tbody>
        </table>
      </div>
    </div>`;
}

async function init() {
  let pressings;
  try {
    pressings = await getPressings();
  } catch (err) {
    console.error('Airtable error:', err);
    showLoadError(document.getElementById('roleSections'));
    return;
  }
  buildPeople(pressings);

  const stats = { people: people.length };
  ROLES.forEach(r => { stats[r.field] = byRole[r.field].length; });
  fillStats(stats);

  const activeRoles = ROLES.filter(r => byRole[r.field].length);
  buildRoleStrip(activeRoles);
  buildSidebar();
  document.getElementById('roleSections').innerHTML = activeRoles.map(sectionHTML).join('');

  // Links like designers.html?q=Brian%20Roettinger open with the search filled in
  const q = new URLSearchParams(location.search).get('q');
  if (q) {
    document.getElementById('searchInput').value = q;
    state.search = q.toLowerCase();
  }

  applyFilters();
  revealOnScroll('.designer-row', 30);
}

function buildRoleStrip(activeRoles) {
  const strip = document.getElementById('roleStrip');
  const cells = [['all', 'All', people.length], ...activeRoles.map(r => [r.field, r.group, byRole[r.field].length])];
  strip.style.setProperty('--cols', cells.length);
  strip.insertAdjacentHTML('beforeend', cells.map(([val, name, count]) => `
    <div class="role-cell${val === 'all' ? ' active' : ''}" data-role="${esc(val)}">
      <span class="rc-name">${esc(name)}</span><span class="rc-count">${count}</span>
    </div>`).join(''));

  strip.addEventListener('click', e => {
    const cell = e.target.closest('.role-cell');
    if (!cell) return;
    strip.querySelectorAll('.role-cell').forEach(c => c.classList.remove('active'));
    cell.classList.add('active');
    state.role = cell.dataset.role;
    applyFilters();
  });
}

function buildSidebar() {
  const sidebar = document.getElementById('designersSidebar');
  sidebar.innerHTML = PERSON_FILTERS.map(filter => {
    let rows = tally(people.flatMap(filter.get));
    if (!rows.length) return '';
    if (filter.sort === 'name') rows.sort((a, b) => a[0].localeCompare(b[0]));
    const items = [['all', 'All', people.length], ...rows.map(([v, c]) => [v, v, c])];
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

function personMatches(d) {
  const searchText = [d.name, ...d.labels, ...d.artists, ...d.styles, ...d.roleLabels].join(' ').toLowerCase();
  return PERSON_FILTERS.every(f => state[f.key] === 'all' || f.get(d).includes(state[f.key])) &&
    (!state.search || searchText.includes(state.search));
}

function applyFilters() {
  const visiblePeople = new Set();
  document.querySelectorAll('.role-section').forEach(section => {
    const roleOn = state.role === 'all' || state.role === section.dataset.role;
    let rowsShown = 0;
    section.querySelectorAll('.designer-row').forEach(row => {
      const d = people.find(x => x.slug === row.dataset.person);
      const show = roleOn && personMatches(d);
      row.hidden = !show;
      if (show) { rowsShown++; visiblePeople.add(d.slug); }
    });
    section.hidden = rowsShown === 0;
  });
  const n = visiblePeople.size;
  document.getElementById('toolbarCount').textContent = `${n} designer${n === 1 ? '' : 's'}`;
}

// Section headers collapse their table. Rows open the archive filtered to that person.
document.getElementById('roleSections').addEventListener('click', e => {
  const header = e.target.closest('.role-section-header');
  if (header) { header.parentElement.classList.toggle('collapsed'); return; }
  if (e.target.closest('a')) return;
  const row = e.target.closest('.designer-row');
  if (row) {
    const d = people.find(x => x.slug === row.dataset.person);
    window.location = `index.html?q=${encodeURIComponent(d.name)}`;
  }
});

document.getElementById('searchInput').addEventListener('input', e => {
  state.search = e.target.value.trim().toLowerCase();
  applyFilters();
});

init();
