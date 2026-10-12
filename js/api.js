/* ==========================================================
   PRESSINGS.XYZ: SHARED DATA (api.js)
   Every page loads this file first. It is the only place that
   talks to Airtable (through the Cloudflare Worker), so if a field
   name or the worker URL ever changes, this is the file to edit.
   ========================================================== */

const WORKER_URL = 'https://pressings-api.jenglish-projects.workers.dev';

// ── PRESSING PAGES ──
// When you add a new pressing:
//   1. Duplicate pressing-template.html and rename it (e.g. my-album-artist.html)
//   2. Inside it, change data-pressing="0000" to the record's ID from Airtable
//   3. Add one line below:  'ID': 'file-name.html',
// That is the only list. Every page (archive, labels, designers, formats,
// prev/next links) reads from here.
const PAGE_MAP = {
  '0001': 'ii-bon-iver.html',
  '0002': 'live-laugh-love-earl-sweatshirt.html',
  '0003': 'bloom-beach-house.html',
  '0004': 'bambi-hippocampus.html',
  '0005': 'roadrunner-brockhampton.html',
  '0006': 'im-sorry-i-love-you-alexander-23.html',
  '0007': 'fix-yourself-not-the-world-the-wombats.html',
  '0008': 'you-just-might-regret-this-swansea-skag.html',
  '0009': 'good-kid-maad-city-kendrick-lamar.html',
  '0010': 'madvillainy-madvillain.html',
  '0011': 'the-new-abnormal-the-strokes.html'
  '0012': 'mark-william-lewis-mark-william-lewis.html'
};

// ── DESIGN CREDIT FIELDS ──
// field = Airtable column, label = how a pressing page shows it,
// group = heading on the Designers page. people:false means the column
// holds styles, not names, so it stays off the Designers page.
const CREDIT_ROLES = [
  { field: 'Art Director',           label: 'Art Direction',      group: 'Art Directors' },
  { field: 'Creative Director',      label: 'Creative Direction', group: 'Creative Directors' },
  { field: 'Graphic Designer',       label: 'Graphic Design',     group: 'Graphic Designers' },
  { field: 'Photographer',           label: 'Photography',        group: 'Photographers' },
  { field: 'Illustrator',            label: 'Illustration',       group: 'Illustrators' },
  { field: 'Typography / Lettering', label: 'Typography',         group: 'Typography', people: false },
  { field: 'Print Studio',           label: 'Print Studio',       group: 'Print Studios' },
  { field: 'Assist.',                label: 'Assistance',         group: 'Assistants' },
];

// Values that mean "nothing here yet". They are hidden everywhere on the site.
const EMPTY_VALUES = ['', 'n/a', 'na', 'none', 'needs updating', 'tbd', 'unknown', '-', '—'];

// The example row at the top of the Airtable table
const EXAMPLE_TITLE = 'Album / release title';

/* ── SMALL HELPERS ───────────────────────────────────────── */

// Always returns a clean array of strings, with "N/A"-style values removed
function values(fields, key) {
  let v = fields[key];
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) v = [v];
  return v
    .filter(x => typeof x !== 'object')
    .map(x => String(x).trim())
    .filter(x => !EMPTY_VALUES.includes(x.toLowerCase()));
}

// One field as display text: "Sub Pop" or "RCA, Cult Records"
function text(fields, key) {
  return values(fields, key).join(', ');
}

// Makes Airtable text safe to put inside HTML
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// "Sub Pop" -> "sub-pop" (used for #anchors)
function slug(str) {
  return String(str).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// "Brian Roettinger" -> "BR"
function initials(name) {
  return name.split(/\s+/).filter(w => /[a-z0-9]/i.test(w)).slice(0, 2)
    .map(w => w[0].toUpperCase()).join('');
}

// 2012 -> "2010s"
function decadeOf(year) {
  const y = parseInt(year, 10);
  return y ? `${Math.floor(y / 10) * 10}s` : '';
}

// Counts how many times each value appears. Returns [[value, count], ...] biggest first
function tally(list) {
  const counts = new Map();
  list.forEach(v => { if (v) counts.set(v, (counts.get(v) || 0) + 1); });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

// [1, 2, 2, 3] -> [1, 2, 3]
function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

// "2012 – 2021" or "2019"
function yearRange(years) {
  const ys = years.map(Number).filter(Boolean).sort();
  if (!ys.length) return '';
  return ys[0] === ys[ys.length - 1] ? String(ys[0]) : `${ys[0]} – ${ys[ys.length - 1]}`;
}

// 7 -> "07"
function pad2(n) {
  return String(n).padStart(2, '0');
}

/* ── LOADING THE ARCHIVE ─────────────────────────────────── */

// Turns one raw Airtable record into the tidy shape every page uses
function toPressing(rec) {
  const f = rec.fields;
  const id = String(f['ID'] ?? '').padStart(4, '0');
  const credits = {};
  CREDIT_ROLES.forEach(role => {
    const names = values(f, role.field);
    if (names.length) credits[role.field] = names;
  });
  const thumb = f['Thumbnail'] || f['Scan: Front Cover'] || f['Scan: Outer - Front'];
  const year = text(f, 'Year (This Pressing)') || text(f, 'Original Release Year');
  return {
    id,
    page: PAGE_MAP[id] || null,
    title: text(f, 'Title') || 'Untitled',
    artist: text(f, 'Artist'),
    labels: values(f, 'Label'),
    format: text(f, 'FORMAT'),
    edition: text(f, 'Edition'),
    packaging: text(f, 'Packaging Type'),
    finish: values(f, 'Print Finish'),
    country: text(f, 'Country'),
    year,
    decade: decadeOf(year),
    genre: text(f, 'GENRE & TAGS'),
    subgenre: text(f, 'Subgenre'),
    styles: values(f, 'Design Style'),
    credits,
    people: unique(CREDIT_ROLES.filter(r => r.people !== false).flatMap(r => credits[r.field] || [])),
    thumb: thumb && thumb[0] ? thumb[0].url : null,
    fields: f,
  };
}

const CACHE_KEY = 'pressings-data-v1';
const CACHE_MINUTES = 5;

// Gets every pressing from Airtable. Results are kept for a few minutes
// so moving between pages is instant.
async function getPressings() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
    if (cached && Date.now() - cached.time < CACHE_MINUTES * 60 * 1000) {
      return cached.records.map(toPressing);
    }
  } catch (e) { /* no cache available, that's fine */ }

  // Airtable sends 100 records at a time. If there are more, keep asking.
  let records = [];
  let offset = null;
  for (let page = 0; page < 20; page++) {
    const url = offset ? `${WORKER_URL}?offset=${encodeURIComponent(offset)}` : WORKER_URL;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.records) throw new Error('No records returned from Airtable');
    records = records.concat(data.records);
    if (!data.offset || data.offset === offset) break;
    offset = data.offset;
  }

  records = records.filter(r => r.fields && r.fields['Title'] && r.fields['Title'] !== EXAMPLE_TITLE);

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), records }));
  } catch (e) { /* storage full or blocked, skip caching */ }

  return records.map(toPressing);
}

/* ── SHARED PAGE PIECES ──────────────────────────────────── */

// Fades items in as they scroll into view (cards, rows, scans)
function revealOnScroll(selector, stagger = 50) {
  const obs = new IntersectionObserver(entries => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), i * stagger);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.05 });
  document.querySelectorAll(selector).forEach(el => obs.observe(el));
}

// Fills any element that has data-stat="..." with a live number
function fillStats(stats) {
  document.querySelectorAll('[data-stat]').forEach(el => {
    const v = stats[el.dataset.stat];
    if (v !== undefined) el.textContent = el.dataset.pad ? pad2(v) : v;
  });
}

// Small square cover image used in lists. Links to the pressing page.
function coverThumbHTML(p, className) {
  const img = p.thumb ? `<img src="${esc(p.thumb)}" alt="${esc(p.title)}" loading="lazy">` : '';
  const tag = p.page ? 'a' : 'div';
  const href = p.page ? ` href="${esc(p.page)}"` : '';
  return `<${tag} class="${className}"${href} title="${esc(p.title)} · ${esc(p.artist)}">${img}</${tag}>`;
}

// Text shown when Airtable can't be reached
function showLoadError(el) {
  if (el) el.innerHTML = '<p class="load-error">Couldn’t load the archive right now. Try refreshing the page.</p>';
}
