import config from '../config.mjs';
import { esc, plural } from './util.mjs';

const svg = (body) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const ui = {
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  next: svg('<path d="M9 5l7 7-7 7"/>'),
  home: svg('<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
  download: svg('<path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  offline: svg('<path d="M3 3l18 18"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 13a10 10 0 0 1 3-2M19 13a10 10 0 0 0-5-2.7"/><path d="M2 9.5a15 15 0 0 1 4-2.6M22 9.5A15 15 0 0 0 10.5 5"/><path d="M12 20h.01"/>'),
  folder: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  doc: svg('<path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>'),
  quick: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  list: svg('<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>'),
  contacts: svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
  location: svg('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  share: svg('<path d="M12 15V4"/><path d="M8 8l4-4 4 4"/><path d="M6 12v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7"/>'),
};

const iconHtml = (icon, root) =>
  icon?.inline
    ? `<span class="icon">${icon.inline}</span>`
    : icon?.src
      ? `<span class="icon icon-img"><img src="${root}${esc(icon.src)}" alt="" width="48" height="48"></span>`
      : `<span class="icon">${ui.folder}</span>`;

let siteUpdated = '';
let siteLogo = null;
let govLogo = null;
export const setSiteLogo = (logo, gov = null) => {
  siteLogo = logo;
  govLogo = gov;
};
export const setSiteUpdated = (text) => (siteUpdated = text);

const rootOf = (url) => '../'.repeat(url.split('/').filter(Boolean).length);

// Bottom bar on phones; the same pages are linked from the header on wide screens
export const TABS = [
  { key: 'home', label: 'Home', icon: 'home', url: '' },
  { key: 'sections', label: 'Sections', icon: 'list', url: 'sections/', long: 'All sections' },
  { key: 'call', label: 'Call', icon: 'contacts', url: 'key-contacts/', long: 'Key contacts' },
  { key: 'w3w', label: 'what3words', icon: 'location', url: 'my-location/', long: 'what3words' },
];
const tabbar = (r, tab) =>
  `<nav class="tabbar" aria-label="Main">${TABS.map((t) => `<a href="${r}${t.url}"${t.key === tab ? ' aria-current="page"' : ''}>${ui[t.icon]}<span>${t.label}</span></a>`).join('')}</nav>`;
const barLinks = (r, tab) =>
  `<nav class="bar-links" aria-label="Shortcuts">${TABS.filter((t) => t.long).map((t) => `<a href="${r}${t.url}"${t.key === tab ? ' aria-current="page"' : ''}>${esc(t.long)}</a>`).join('')}</nav>`;

function shell({ url, title, bodyClass, header, main, tab = '' }) {
  const root = rootOf(url);
  const r = root || './';
  const pageTitle = title ? `${title} · ${config.siteName}` : config.siteName;
  return `<!doctype html>
<html lang="${config.locale}" data-root="${r}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(config.description)}">
<meta name="theme-color" content="${config.colours.theme}">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${esc(config.shortName)}">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="format-detection" content="telephone=no">
<link rel="manifest" href="${r}manifest.webmanifest">
<link rel="icon" href="${r}icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="${r}icons/favicon-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="${r}icons/favicon.png" type="image/png" sizes="48x48">
<link rel="apple-touch-icon" href="${r}icons/apple-touch-icon.png">
<link rel="stylesheet" href="${r}assets/app.css">
<script src="${r}assets/app.js" defer></script>
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
<header class="bar">
<div class="bar-in">
${siteLogo ? `<a class="bar-logo" href="${r}" aria-label="Home"><img src="${r}${siteLogo.src}" alt="SES" width="${siteLogo.width}" height="${siteLogo.height}"></a>` : ''}
${header(r)}
${barLinks(r, tab)}
<a class="bar-btn bar-search" href="${r}search/" aria-label="Search">${ui.search}</a>
<button class="bar-btn" id="install" type="button" hidden aria-label="Download app">${ui.download}</button>
</div>
<div class="search-bar" id="search-bar">
<form class="search" id="search" role="search" action="${r}" autocomplete="off">
<label class="sr" for="q">Search the guide</label>
${ui.search}
<input id="q" name="q" type="search" placeholder="Search the guide" enterkeyhint="search" autocapitalize="off" spellcheck="false">
<button type="button" id="q-clear" class="search-clear" aria-label="Clear search" hidden>${ui.close}</button>
</form>
</div>
</header>
<div class="notice" id="offline" role="status" hidden>${ui.offline}<span>You are offline. Showing saved information.</span></div>
<main id="main">
<div class="wrap" id="results-wrap" hidden><div id="results" class="results" aria-live="polite"></div></div>
<div id="content">
${main(r)}
</div>
</main>
<footer class="foot"><div class="foot-in">
<div class="foot-logos">${siteLogo ? `<img class="foot-ses" src="${r}${siteLogo.src}" alt="SA State Emergency Service" width="${siteLogo.width}" height="${siteLogo.height}">` : ''}${
    govLogo ? `<img class="foot-gov" src="${r}${govLogo.src}" alt="Government of South Australia" width="${govLogo.width}" height="${govLogo.height}">` : ''
  }</div>
<p class="foot-text"><span>${esc(config.description)}</span>${siteUpdated ? `<span>Updated ${esc(siteUpdated)}</span>` : ''}</p>
</div></footer>
${tabbar(r, tab)}
<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
</body>
</html>
`;
}

const innerHeader = (parentUrl, parentTitle) => (r) => `<a class="bar-back" href="${r}${esc(parentUrl)}" aria-label="Back to ${esc(parentTitle)}">${ui.back}<span>${esc(parentTitle)}</span></a>
<span class="bar-gap"></span>
<a class="bar-btn" href="${r}" aria-label="Home">${ui.home}</a>`;

const crumbs = (items, r) =>
  items.length
    ? `<nav class="crumbs" aria-label="Location">${items.map((s) => `<a href="${r}${esc(s.url)}">${esc(s.title)}</a>`).join('<span aria-hidden="true">›</span>')}</nav>`
    : '';

const gallery = (images, r) =>
  images.length
    ? `<section class="gallery" aria-label="Pictures">
${images.map((i) => `<figure><img src="${r}media/${i.name}" width="${i.width}" height="${i.height}" alt="${esc(i.title)}" loading="lazy" decoding="async"><figcaption>${esc(i.title)}</figcaption></figure>`).join('\n')}
</section>`
    : '';

// ---------- Home ----------

// On laptops and desktops the home entries are laid out in rows of at least config.desktopRows.min
// entries (only the last row may have fewer). Bigger sections take a bigger share of their row.
const WEIGHT = { md: 2, lg: 3, xl: 4 };
function desktopRows(items, sizeOf) {
  const { min, max, maxWeight } = config.desktopRows;
  const out = [];
  let count = 0;
  let weight = 0;
  for (const [item, html] of items) {
    const w = WEIGHT[item.sections ? sizeOf(item) : 'md'];
    if (count >= min && (count >= max || weight + w > maxWeight)) {
      out.push('<li class="row-break" role="presentation" aria-hidden="true"></li>');
      count = 0;
      weight = 0;
    }
    count++;
    weight += w;
    out.push(html);
  }
  return out;
}

const CALL = svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>');
const MAIL = svg('<rect x="3" y="5" width="18" height="14"/><path d="m3 6 9 7 9-7"/>');
function contactList(contacts) {
  return `<ul class="contact-list">${contacts
    .map(
      (c) =>
        `<li><span class="contact-name">${esc(c.name)}${c.email ? `<small>${esc(c.email)}</small>` : ''}${c.note ? `<small>${esc(c.note)}</small>` : ''}</span>${
          c.tel ? `<a class="contact-number" href="tel:${esc(c.tel)}">${esc(c.number)}</a>` : ''
        }<span class="contact-actions">${c.tel ? `<a class="contact-btn" href="tel:${esc(c.tel)}" aria-label="Call ${esc(c.name)}, ${esc(c.number)}">${CALL}</a>` : ''}${
          c.email ? `<a class="contact-btn contact-mail" href="mailto:${esc(c.email)}" aria-label="Email ${esc(c.name)}">${MAIL}</a>` : ''
        }</span></li>`,
    )
    .join('')}</ul>`;
}

// Highlighted cards, quick access links and key contacts from the home page folder
function homeExtras(home) {
  if (!home) return '';
  const warnIcon = svg('<path d="M12 3 2 21h20z"/><path d="M12 10v5"/><path d="M12 18h.01"/>');
  const cards = home.cards
    .map(
      (c, i) => `<section class="home-card" aria-labelledby="card-${i}"><h2 id="card-${i}">${warnIcon}<span>${esc(c.title)}</span></h2><div class="prose">${c.html}</div></section>`,
    )
    .join('\n');
  const quick = home.quick.length
    ? `<nav class="home-quick" aria-labelledby="quick-title"><h2 class="kicker" id="quick-title">Quick access</h2><ul>${home.quick
        .map((q) => `<li><a href="${esc(q.url)}"><span class="qa-icon">${ui.quick}</span><span class="qa-title">${esc(q.title)}</span>${ui.next}</a></li>`)
        .join('')}</ul></nav>`
    : '';
  const contacts = home.contacts.length
    ? `<section class="home-contacts" aria-labelledby="contacts-title"><h2 class="kicker" id="contacts-title">Key contacts</h2>${contactList(home.contacts)}</section>`
    : '';
  if (!cards && !quick && !contacts) return '';
  return `<div class="home-extras">
${quick}
<div class="home-columns">${cards ? `<div class="home-cards">${cards}</div>` : ''}${contacts}</div>
</div>
<h2 class="kicker">All sections</h2>`;
}

export function homePage({ sections, docs, icons, home }) {
  const { biggerFrom, biggestFrom } = config.entrySizes;
  const sizeOf = (s) => (s.sections.length >= biggestFrom ? 'xl' : s.sections.length >= biggerFrom ? 'lg' : 'md');
  const byTitle = (a, b) => a.title.localeCompare(b.title, config.locale, { numeric: true, sensitivity: 'base' });
  if (config.order === 'alphabetical') {
    sections = [...sections].sort(byTitle);
    docs = [...docs].sort(byTitle);
  }
  // On phones, small sections with short names sit two to a row, in pairs that keep the order.
  // One left without a partner takes the full row.
  const { halfMaxChars, halfMaxWord } = config.phonePairs;
  const short = (item) =>
    (!item.sections || sizeOf(item) === 'md') &&
    item.title.length <= halfMaxChars &&
    Math.max(...item.title.split(/\s+/).map((w) => w.length)) <= halfMaxWord;
  const half = new Set();
  const all = [...sections, ...docs];
  for (let i = 0; i < all.length; i++) {
    if (short(all[i]) && i + 1 < all.length && short(all[i + 1])) {
      half.add(all[i]).add(all[i + 1]);
      i++;
    }
  }
  const md = (item) => (half.has(item) ? 'entry-md entry-half' : 'entry-md');
  const entry = (s) => {
    const size = sizeOf(s) === 'md' ? md(s).slice(6) : sizeOf(s);
    const count = s.direct ? '' : `<span class="entry-count">${plural(s.topics, 'topic')}</span>`;
    return `<li class="entry-${size}"><a class="entry" href="${esc(s.url)}">${iconHtml(icons.get(s), '')}<span class="entry-text"><span class="entry-title">${esc(s.title)}</span>${count}</span></a></li>`;
  };
  const docEntry = (d) =>
    `<li class="${md(d)}"><a class="entry" href="${esc(d.url)}"><span class="icon">${ui.doc}</span><span class="entry-text"><span class="entry-title">${esc(d.title)}</span></span></a></li>`;

  return shell({
    url: '',
    title: '',
    bodyClass: 'home',
    tab: 'home',
    header: () => `<span class="brand">${esc(config.headerName || config.shortName)}</span><span class="bar-gap"></span>`,
    main: () => `<div class="wrap">
<h1 class="sr">${esc(config.siteName)}</h1>
${homeExtras(home)}
<ul class="entries" id="entries">
${desktopRows([...sections.map((x) => [x, entry(x)]), ...docs.map((x) => [x, docEntry(x)])], sizeOf).join('\n')}
</ul>
</div>`,
  });
}

// ---------- Bottom bar pages ----------

const tabHeader = () => `<span class="brand">${esc(config.headerName || config.shortName)}</span><span class="bar-gap"></span>`;

export function searchPage({ count }) {
  return shell({
    url: 'search/',
    title: 'Search',
    bodyClass: 'search-page',
    tab: 'search',
    header: tabHeader,
    main: () => `<div class="wrap narrow"><h1>Search</h1><p class="meta">Search all ${count} pages by title or text. Works without signal.</p></div>`,
  });
}

export function sectionsPage({ sections, docs, icons }) {
  const byTitle = (a, b) => a.title.localeCompare(b.title, config.locale, { numeric: true, sensitivity: 'base' });
  const rows = [...sections, ...docs].sort(byTitle);
  return shell({
    url: 'sections/',
    title: 'All sections',
    bodyClass: 'tab-page',
    tab: 'sections',
    header: tabHeader,
    main: (r) => `<div class="wrap narrow"><h1>All sections</h1><p class="meta">${plural(rows.length, 'section')}</p>
<div class="filter">
<label class="sr" for="filter">Filter sections</label>
${ui.search}
<input id="filter" type="search" placeholder="Filter ${plural(rows.length, 'section')}" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false">
</div>
<p class="empty" id="filter-empty" hidden>No sections match.</p>
<ul class="topics section-list" id="topics">
${rows
  .map((s) => {
    const icon = s.sections ? icons.get(s) : null;
    const pic = icon?.inline ? `<span class="row-icon">${icon.inline}</span>` : icon?.src ? `<span class="row-icon"><img src="${r}${esc(icon.src)}" alt="" width="28" height="28"></span>` : `<span class="row-icon">${s.sections ? ui.folder : ui.doc}</span>`;
    const count = s.sections && !s.direct ? `<span class="topic-count">${s.topics}</span>` : '';
    return `<li><a href="${r}${esc(s.url)}">${pic}<span class="topic-title">${esc(s.title)}</span>${count}${ui.next}</a></li>`;
  })
  .join('\n')}
</ul>
</div>`,
  });
}

export function contactsPage({ home }) {
  return shell({
    url: 'key-contacts/',
    title: 'Key contacts',
    bodyClass: 'tab-page',
    tab: 'call',
    header: tabHeader,
    main: () => `<div class="wrap narrow"><h1>Key contacts</h1><p class="meta">Tap to call or email.</p>
${home.contacts.length ? `<div class="home-contacts">${contactList(home.contacts)}</div>` : '<p class="empty">No contacts have been added yet.</p>'}
</div>`,
  });
}

export function locationPage({ w3wKey }) {
  return shell({
    url: 'my-location/',
    title: 'what3words',
    bodyClass: 'tab-page',
    tab: 'w3w',
    header: tabHeader,
    main: () => `<div class="wrap narrow"><h1>what3words</h1>
<section class="loc-card" aria-labelledby="pos-title">
<h2 id="pos-title">My position</h2>
<p class="meta">From the phone's GPS. Works without signal.</p>
<button class="big-btn" id="locate" type="button">${ui.location}<span>Show my location</span></button>
<div id="loc-result" hidden>
<p class="loc-coords" id="loc-coords"></p>
<p class="meta" id="loc-acc"></p>
<div class="loc-actions"><button type="button" class="line-btn" id="loc-copy">Copy</button><button type="button" class="line-btn" id="loc-share" hidden>Share</button><a class="line-btn" id="loc-map" target="_blank" rel="noopener noreferrer">Open in Maps</a></div>
</div>
<p class="loc-error" id="loc-error" role="alert" hidden></p>
</section>
${w3wKey ? `<section class="loc-card" aria-labelledby="w3w-find-title" id="w3w-find" data-key="${esc(w3wKey)}">
<h2 id="w3w-find-title">Find a what3words address</h2>
<p>Type the three words you were given, for example from a job or a caller. Needs signal.</p>
<form class="w3w-form" id="w3w-form" autocomplete="off"><label class="sr" for="w3w">what3words address</label><span class="w3w-prefix" aria-hidden="true">///</span><input id="w3w" type="text" inputmode="text" placeholder="word.word.word" autocapitalize="off" spellcheck="false" enterkeyhint="search"></form>
<p class="meta" id="w3w-status" aria-live="polite"></p>
<ul class="w3w-results" id="w3w-results"></ul>
</section>` : ''}
</div>`,
  });
}

// ---------- Section ----------

export function sectionPage({ section, parent, icon, images }) {
  const rows = [
    ...section.sections.map((s) => ({ title: s.title, url: s.url, count: s.direct ? 0 : s.topics, folder: !s.direct })),
    ...section.docs.map((d) => ({ title: d.title, url: d.url, count: 0, folder: false })),
  ];
  if (config.order === 'alphabetical') rows.sort((a, b) => a.title.localeCompare(b.title, config.locale, { numeric: true, sensitivity: 'base' }));
  const filter =
    rows.length >= config.filterFrom
      ? `<div class="filter">
<label class="sr" for="filter">Filter ${esc(section.title)}</label>
${ui.search}
<input id="filter" type="search" placeholder="Filter ${plural(rows.length, 'topic')}" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false">
</div>
<p class="empty" id="filter-empty" hidden>No topics match.</p>`
      : '';
  return shell({
    url: section.url,
    title: section.title,
    bodyClass: 'section',
    header: innerHeader(parent.url, parent.title || 'Home'),
    main: (r) => `<div class="wrap narrow">
${crumbs(parent.trail, r)}
<div class="head">
${iconHtml(icon, r)}
<div><h1>${esc(section.title)}</h1><p class="meta">${plural(rows.length, 'topic')}</p></div>
</div>
${filter}
${rows.length ? '' : '<p class="empty">Nothing has been added here yet.</p>'}
<ul class="topics" id="topics">
${rows.map((row) => `<li><a href="${r}${esc(row.url)}"><span class="topic-title">${esc(row.title)}</span>${row.folder ? `<span class="topic-count">${row.count}</span>` : ''}${ui.next}</a></li>`).join('\n')}
</ul>
${gallery(images, r)}
</div>`,
  });
}

// ---------- Document ----------

export function docPage({ doc, parent, converted, updated, images }) {
  const contents =
    converted.headings.length >= config.contentsFrom
      ? `<nav class="contents" aria-labelledby="contents-title">
<h2 id="contents-title">Contents</h2>
<ol>
${converted.headings.map((h) => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`).join('\n')}
</ol>
</nav>`
      : '';
  return shell({
    url: doc.url,
    title: doc.title,
    bodyClass: 'doc',
    header: innerHeader(parent.url, parent.title || 'Home'),
    main: (r) => `<article class="wrap narrow">
${crumbs(parent.trail, r)}
<h1>${esc(doc.title)}</h1>
<p class="meta">Updated ${esc(updated)}</p>
${contents}
<div class="prose">
${converted.html.replace(/(<img\b[^>]*\bsrc=")media\//g, `$1${r}media/`).replace(/(<a\b[^>]*\bhref=")files\//g, `$1${r}files/`)}
</div>
${gallery(images, r)}
</article>`,
  });
}

// ---------- Not found ----------

// Shown for unknown addresses at any depth, so it carries its own styles and finds the home address itself.
export function notFoundPage(basePath) {
  return `<!doctype html>
<html lang="${config.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found · ${esc(config.siteName)}</title>
<meta name="theme-color" content="${config.colours.theme}">
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:${config.colours.background};color:#1e3d78;font:17px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{padding:24px;text-align:center;max-width:26rem}
p.name{margin:0 0 24px;font-weight:700;letter-spacing:.04em;font-size:.85rem;color:#4a5670}
h1{margin:0 0 8px;font-size:1.6rem}
p{margin:0 0 28px;color:#3b4760}
a{display:inline-block;padding:14px 28px;background:#1e3d78;color:#fff;font-weight:600;text-decoration:none}
a:focus-visible{outline:3px solid #d95700;outline-offset:3px}
</style>
</head>
<body>
<main>
<p class="name">${esc(config.siteName)}</p>
<h1>Page not found</h1>
<p>This page may have been moved or renamed.</p>
<a id="home" href="${esc(basePath)}">Go to the home screen</a>
</main>
<script>
if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistration().then(function (r) { if (r) document.getElementById('home').href = r.scope; }).catch(function () {});
</script>
</body>
</html>
`;
}

export function manifest() {
  return JSON.stringify(
    {
      name: config.siteName,
      short_name: config.shortName,
      description: config.description,
      id: './',
      start_url: './',
      scope: './',
      display: 'standalone',
      orientation: 'any',
      lang: config.locale,
      theme_color: config.colours.theme,
      background_color: config.colours.background,
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  );
}
