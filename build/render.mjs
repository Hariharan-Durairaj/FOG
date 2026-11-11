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
  share: svg('<path d="M12 15V4"/><path d="M8 8l4-4 4 4"/><path d="M6 12v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7"/>'),
};

const iconHtml = (icon, root) =>
  icon?.inline
    ? `<span class="icon">${icon.inline}</span>`
    : icon?.src
      ? `<span class="icon icon-img"><img src="${root}${esc(icon.src)}" alt="" width="48" height="48"></span>`
      : `<span class="icon">${ui.folder}</span>`;

let siteUpdated = '';
export const setSiteUpdated = (text) => (siteUpdated = text);

const rootOf = (url) => '../'.repeat(url.split('/').filter(Boolean).length);

function shell({ url, title, bodyClass, header, main }) {
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
<link rel="icon" href="${r}icons/favicon.png" type="image/png" sizes="48x48">
<link rel="apple-touch-icon" href="${r}icons/apple-touch-icon.png">
<link rel="stylesheet" href="${r}assets/app.css">
<script src="${r}assets/app.js" defer></script>
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
<header class="bar">
<div class="bar-in">
${header(r)}
<button class="bar-btn search-toggle" id="search-toggle" type="button" aria-label="Search" aria-controls="search-bar" aria-expanded="false">${ui.search}</button>
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
<footer class="foot"><div class="foot-in"><span>${esc(config.siteName)}</span>${siteUpdated ? `<span>Updated ${esc(siteUpdated)}</span>` : ''}</div></footer>
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

export function homePage({ sections, docs, icons }) {
  const { biggerFrom, biggestFrom } = config.entrySizes;
  const sizeOf = (s) => (s.sections.length >= biggestFrom ? 'xl' : s.sections.length >= biggerFrom ? 'lg' : 'md');
  const byTitle = (a, b) => a.title.localeCompare(b.title, config.locale, { numeric: true, sensitivity: 'base' });
  if (config.homeOrder === 'alphabetical') {
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
    header: () => `<span class="brand">${esc(config.siteName)}</span><span class="bar-gap"></span>`,
    main: () => `<div class="wrap">
<h1 class="sr">${esc(config.siteName)}</h1>
<ul class="entries" id="entries">
${[...sections.map(entry), ...docs.map(docEntry)].join('\n')}
</ul>
</div>`,
  });
}

// ---------- Section ----------

export function sectionPage({ section, parent, icon, images }) {
  const rows = [
    ...section.sections.map((s) => ({ title: s.title, url: s.url, count: s.direct ? 0 : s.topics, folder: !s.direct })),
    ...section.docs.map((d) => ({ title: d.title, url: d.url, count: 0, folder: false })),
  ];
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
${converted.html.replace(/(<img\b[^>]*\bsrc=")media\//g, `$1${r}media/`)}
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
body{margin:0;min-height:100vh;display:grid;place-items:center;background:${config.colours.background};color:#14213d;font:17px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{padding:24px;text-align:center;max-width:26rem}
p.name{margin:0 0 24px;font-weight:700;letter-spacing:.04em;font-size:.85rem;color:#4a5670}
h1{margin:0 0 8px;font-size:1.6rem}
p{margin:0 0 28px;color:#3b4760}
a{display:inline-block;padding:14px 28px;background:#14213d;color:#fff;font-weight:600;text-decoration:none}
a:focus-visible{outline:3px solid #f76707;outline-offset:3px}
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
