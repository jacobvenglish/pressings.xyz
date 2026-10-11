# pressings.xyz
Music Packaging Design Archive

## How the site is organised

```
index.html, labels.html, designers.html, formats.html, about.html, folders.html
one .html file per pressing (bloom-beach-house.html, ...)
pressing-template.html     copy this to make a new pressing page

css/
  styles.css               shared by every page: colours, fonts, nav, footer, page header
  archive.css              index.html only
  labels.css               labels.html only
  designers.css            designers.html only
  formats.css              formats.html only
  about.css                about.html only
  folders.css              folders.html only
  pressing.css             every pressing page

js/
  api.js                   talks to Airtable; PAGE_MAP lives here
  nav.js                   mobile menu, every page
  archive.js, labels.js, designers.js, formats.js, about.js, folders.js
  pressing.js              every pressing page
```

Every page loads `css/styles.css` first, then its own CSS file. No styling lives in the HTML.

## Where the data comes from

Everything about the archive is read live from Airtable through the Cloudflare Worker:
the grid, filters and stats on the homepage, every label card, every designer, the format
counts and covers, the About numbers, and the pressing pages. Values like "N/A", "None"
and "Needs Updating" are hidden automatically (see `EMPTY_VALUES` in `js/api.js`).

Pages keep the data for 5 minutes while you browse, so a new Airtable record can take up to
5 minutes (or a new tab) to show up.

## Adding a pressing

1. Add the record in Airtable (give it an ID like `0012`).
2. Duplicate `pressing-template.html` and name it, e.g. `album-name-artist.html`.
3. In the new file, change `data-pressing="0000"` to the ID.
4. In `js/api.js`, add a line to `PAGE_MAP`: `'0012': 'album-name-artist.html',`

The labels, designers, formats and homepage pick it up on their own.
