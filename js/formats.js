/* ==========================================================
   PRESSINGS.XYZ: FORMATS PAGE (formats.js)
   The spec sheets (sizes, bleed, board stock) are reference info
   written into formats.html. Everything about YOUR archive on this
   page (counts, sub-format counts, the covers in each section)
   comes from Airtable.
   ========================================================== */

// Which format family each FORMAT value belongs to
const FAMILIES = [
  { name: 'Vinyl',    match: f => /vinyl|lp|7"|10"|12"/i.test(f) },
  { name: 'CD',       match: f => /\bcd\b/i.test(f) },
  { name: 'Cassette', match: f => /cassette|tape/i.test(f) },
  { name: 'Box Set',  match: f => /box/i.test(f) },
];
function familyOf(format) {
  const fam = FAMILIES.find(x => x.match(format));
  return fam ? fam.name : 'Other';
}

// How each sub-format is spotted. Words are searched for in the FORMAT,
// Packaging Type, Special Features and Print Finish columns.
// Edit these if a count looks wrong.
const SUB_FORMATS = {
  'vinyl-lp12':        /12"|\blp\b/i,
  'vinyl-single7':     /7"/,
  'vinyl-ep10':        /10"/,
  'vinyl-gatefold':    /gatefold/i,
  'vinyl-tipon':       /tip-?on/i,
  'vinyl-picturedisc': /picture disc/i,
  'cd-jewel':          /jewel/i,
  'cd-digipak':        /digipak|digipack/i,
  'cd-slim':           /slim/i,
  'cd-cardboard':      /cardboard|card sleeve/i,
  'cassette-jcard':    /j-?card/i,
  'cassette-ocard':    /o-?card|outer case|slipcase/i,
  'cassette-shell':    /shell print|printed shell/i,
  'boxset-slipcase':   /slip ?case/i,
  'boxset-clamshell':  /clamshell/i,
  'boxset-liftlid':    /lift-?lid/i,
};

function searchText(p) {
  return [p.format, p.packaging, text(p.fields, 'Special Features'), p.finish.join(' ')].join(' ');
}

async function init() {
  let pressings;
  try {
    pressings = await getPressings();
  } catch (err) {
    console.error('Airtable error:', err);
    return;
  }

  const byFamily = {};
  FAMILIES.forEach(f => { byFamily[f.name] = pressings.filter(p => familyOf(p.format) === f.name); });

  fillStats({
    formats: unique(pressings.map(p => familyOf(p.format))).length,
    packaging: unique(pressings.flatMap(p => p.packaging.split('+').map(s => s.trim()))).length,
    pressings: pressings.length,
  });

  // "In Archive" numbers in the jump strip and each section header
  document.querySelectorAll('[data-format-count]').forEach(el => {
    el.textContent = pad2((byFamily[el.dataset.formatCount] || []).length);
  });

  // Sub-format counts
  document.querySelectorAll('.sub-format-btn[data-spec]').forEach(btn => {
    const family = btn.closest('.format-section').querySelector('.format-archive').dataset.format;
    const rule = SUB_FORMATS[btn.dataset.spec];
    const count = rule ? (byFamily[family] || []).filter(p => rule.test(searchText(p))).length : 0;
    btn.querySelector('.sfb-count').textContent = count;
  });

  // Covers of every pressing in each format
  document.querySelectorAll('.format-archive').forEach(strip => {
    const list = byFamily[strip.dataset.format] || [];
    strip.innerHTML = `
      <div class="fa-label"><span>In the archive</span></div>
      <div class="fa-items">
        ${list.length
          ? list.map(p => `
            <a class="fa-item" href="${esc(p.page || '#')}">
              ${coverThumbHTML({ ...p, page: null }, 'fa-thumb')}
              <span class="fa-title">${esc(p.title)}</span>
              <span class="fa-artist">${esc(p.artist)}</span>
            </a>`).join('')
          : '<span class="fa-empty">Nothing archived in this format yet</span>'}
      </div>`;
  });
}

/* ── PAGE CONTROLS ── */

// Highlight the format you're looking at in the sticky strip
const sectionIds = ['vinyl', 'cd', 'cassette', 'boxset'];
const navCells = document.querySelectorAll('.fn-cell');
window.addEventListener('scroll', () => {
  let current = sectionIds[0];
  sectionIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 120) current = id;
  });
  navCells.forEach(cell => cell.classList.toggle('active', cell.getAttribute('href') === '#' + current));
});

// Clicking a section header collapses it
document.querySelectorAll('.format-section-header').forEach(header => {
  header.addEventListener('click', () => header.closest('.format-section').classList.toggle('collapsed'));
});

// Sub-format buttons switch which spec sheet is showing
document.querySelectorAll('.sub-format-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const section = btn.closest('.format-section');
    section.querySelectorAll('.sub-format-btn').forEach(b => b.classList.remove('active'));
    section.querySelectorAll('.spec-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById(btn.dataset.spec);
    if (panel) panel.classList.add('active');
  });
});

init();
