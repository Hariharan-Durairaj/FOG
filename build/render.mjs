import config from './config.mjs';
import { esc } from './util.mjs';

const icon = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
};

export const resolveRoot = (html, prefix) => html.replaceAll('@root/', prefix);

function shell({ title, prefix, body, header, pageClass = '' }) {
  const pageTitle = title === config.siteName ? config.siteName : `${title} | ${config.siteName}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="${config.themeColor}">
<meta name="description" content="${esc(config.description)}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${esc(config.shortName)}">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>${esc(pageTitle)}</title>
<link rel="manifest" href="${prefix}manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="${prefix}icons/favicon-32.png">
<link rel="apple-touch-icon" href="${prefix}icons/apple-touch-icon.png">
<link rel="stylesheet" href="${prefix}assets/styles.css">
</head>
<body class="${pageClass}" data-root="${prefix}">
${header}
<div class="offline-bar" id="offline-bar" hidden>Offline. Showing saved information.</div>
<main id="main">
${body}
</main>
<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
<dialog class="sheet" id="install-sheet" aria-labelledby="install-title">
  <div class="sheet-body">
    <button class="icon-button sheet-close" type="button" data-close aria-label="Close">${icon.close}</button>
    <h2 id="install-title">Download ${esc(config.siteName)}</h2>
    <div id="install-steps"></div>
  </div>
</dialog>
<dialog class="lightbox" id="lightbox" aria-label="Image">
  <button class="icon-button lightbox-close" type="button" data-close aria-label="Close">${icon.close}</button>
  <img alt="">
</dialog>
<script src="${prefix}assets/app.js" defer></script>
</body>
</html>
`;
}

function pageHeader({ prefix, back, title }) {
  return `<header class="bar">
  <a class="icon-button" href="${back}" aria-label="Back">${icon.back}</a>
  <span class="bar-title">${esc(title)}</span>
  <a class="icon-button" href="${prefix}" aria-label="Home">${icon.home}</a>
</header>`;
}

export function tileSize(section) {
  const n = section.sections.length;
  if (n >= config.tiles.largeFrom) return 'tile-large';
  if (n >= config.tiles.wideFrom) return 'tile-wide';
  return '';
}

const maskStyle = (url) => `-webkit-mask-image:url('${url}');mask-image:url('${url}')`;

function nearestIcon(section, ctx) {
  for (let s = section; s; s = s.parent) if (ctx.iconUrl(s)) return ctx.iconUrl(s);
  return null;
}

function tile({ href, title, iconUrl, size = '', count = 0 }) {
  const glyph = iconUrl ? `<span class="tile-icon" style="${maskStyle(iconUrl)}"></span>` : '';
  const meta = count > 1 ? `<span class="tile-meta">${count} topics</span>` : '';
  return `<a class="tile ${size} ${title.length > 28 ? 'tile-long' : ''}" href="${href}">${glyph}<span class="tile-title">${esc(title)}</span>${meta}</a>`;
}

export function sectionTiles(section, prefix, ctx) {
  const tiles = [
    ...section.sections.map((child) => {
      const target = ctx.directDoc(child);
      const iconUrl = nearestIcon(child, ctx);
      return tile({ href: prefix + (target ? target.path : child.path), title: child.name, iconUrl: iconUrl && prefix + iconUrl, size: tileSize(child), count: target ? 0 : child.sections.length + child.docs.length });
    }),
    ...section.docs.map((doc) => tile({ href: prefix + doc.path, title: doc.name })),
  ];
  return tiles.length ? `<nav class="tiles" aria-label="${esc(section.name || config.siteName)}">${tiles.join('')}</nav>` : '';
}

function gallery(images, prefix) {
  if (!images.length) return '';
  return `<section class="gallery" aria-label="Images">${images
    .map(
      (img) =>
        `<a href="${prefix}${img.url}" data-lightbox><img src="${prefix}${img.url}" alt="${esc(img.name)}" width="${img.width}" height="${img.height}" loading="lazy" decoding="async"></a>`,
    )
    .join('')}</section>`;
}

export function renderHome({ root, ctx, updated }) {
  const prefix = '';
  const header = `<header class="home-bar">
  <h1 class="brand">${esc(config.siteName)}</h1>
  <button class="icon-button install-button" type="button" id="install-button" aria-label="Download app" title="Download app" hidden>${icon.download}</button>
</header>`;
  const body = `<form class="search" role="search" id="search-form" autocomplete="off">
  <label class="visually-hidden" for="search-input">Search</label>
  ${icon.search}
  <input id="search-input" type="search" placeholder="Search" enterkeyhint="search" spellcheck="false">
  <button class="icon-button search-clear" type="button" id="search-clear" aria-label="Clear search" hidden>${icon.close}</button>
</form>
<section class="results" id="search-results" aria-live="polite" hidden></section>
<div id="home-content">
${sectionTiles(root, prefix, ctx)}
</div>
<footer class="foot">Updated ${esc(updated)}</footer>`;
  return shell({ title: config.siteName, prefix, header, body, pageClass: 'home' });
}

function sectionItems(section, prefix, ctx) {
  return [
    ...section.sections.map((child) => {
      const target = ctx.directDoc(child);
      const count = child.sections.length + child.docs.length;
      return { href: prefix + (target ? target.path : child.path), title: child.name, meta: !target && count > 1 ? `${count} topics` : '' };
    }),
    ...section.docs.map((doc) => ({ href: prefix + doc.path, title: doc.name, meta: '' })),
  ];
}

function hero(section, prefix, ctx, count) {
  const iconUrl = nearestIcon(section, ctx);
  const parent = section.parent?.parent ? `<p class="hero-parent">${esc(section.parent.name)}</p>` : '';
  return `<header class="hero">${iconUrl ? `<span class="hero-icon" style="${maskStyle(prefix + iconUrl)}"></span>` : ''}<div class="hero-text">${parent}<h1>${esc(section.name)}</h1>${count ? `<p class="hero-count">${count} ${count === 1 ? 'topic' : 'topics'}</p>` : ''}</div></header>`;
}

function filterBox(section, count) {
  if (count < 10) return '';
  return `<div class="filter">${icon.search}<input id="section-filter" type="search" placeholder="Filter ${esc(section.name)}" aria-label="Filter topics" autocomplete="off" spellcheck="false"></div><p class="filter-empty" id="filter-empty" hidden>No matching topics</p>`;
}

function itemList(items) {
  return `<nav class="list">${items
    .map((it) => `<a class="row" href="${it.href}" data-filter="${esc(it.title.toLowerCase())}"><span class="row-title">${esc(it.title)}</span>${it.meta ? `<span class="row-meta">${it.meta}</span>` : ''}<span class="row-chevron">${icon.chevron}</span></a>`)
    .join('')}</nav>`;
}

export function renderSection({ section, ctx, prefix, back, images }) {
  const header = pageHeader({ prefix, back, title: section.parent?.name || config.siteName });
  const items = sectionItems(section, prefix, ctx);
  const empty = images.length ? '' : '<p class="empty">No information has been added to this section yet.</p>';
  const body = `${hero(section, prefix, ctx, items.length)}
${filterBox(section, items.length)}
${items.length ? itemList(items) : empty}
${gallery(images, prefix)}`;
  return shell({ title: section.name, prefix, header, body, pageClass: 'section-page' });
}

export function renderDoc({ doc, prefix, back, backTitle, html, headings, images, updated }) {
  const header = pageHeader({ prefix, back, title: backTitle });
  const contents =
    headings.filter((h) => h.level === 2).length >= 3
      ? `<details class="contents"><summary>Contents</summary><ol>${headings
          .filter((h) => h.level === 2)
          .map((h) => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`)
          .join('')}</ol></details>`
      : '';
  const body = `<h1 class="page-title">${esc(doc.name)}</h1>
<p class="meta">Updated ${esc(updated)}</p>
${contents}
<article class="doc">${resolveRoot(html, prefix)}</article>
${gallery(images, prefix)}`;
  return shell({ title: doc.name, prefix, header, body, pageClass: 'doc-page' });
}

export function renderNotFound() {
  const header = `<header class="bar"><span class="icon-button"></span><span class="bar-title">${esc(config.siteName)}</span><span class="icon-button"></span></header>`;
  const body = `<h1 class="page-title">Page not found</h1><p class="empty">This page may have been moved or removed.</p><p><a class="button" href="./">Go to home</a></p>`;
  return shell({ title: 'Page not found', prefix: './', header, body });
}

