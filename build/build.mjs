import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import MiniSearch from 'minisearch';
import { generateSW } from 'workbox-build';
import config from './config.mjs';
import { convertDocx } from './docx.mjs';
import { scanContent, allSections, trail, directDoc } from './scan.mjs';
import { renderHome, renderSection, renderDoc, renderNotFound } from './render.mjs';
import { exists, sha, slugify } from './util.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.resolve(process.argv[2] || path.join(ROOT, 'content'));
const DIST = path.resolve(process.argv[3] || path.join(ROOT, 'dist'));
const BASE_PATH = (process.env.SITE_BASE_PATH || '').replace(/\/+$/, '');
const inCI = Boolean(process.env.GITHUB_ACTIONS);

const warnings = [];
const warn = (where, message) => warnings.push({ where, message });

const dateFormat = new Intl.DateTimeFormat(config.locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: config.timeZone });
const formatDate = (date) => dateFormat.format(date);

async function write(file, data) {
  const out = path.join(DIST, file);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, data);
}

const prefixFor = (urlPath) => '../'.repeat(urlPath.split('/').filter(Boolean).length);

// SVG icons come from editors, so remove anything that could run as script.
const cleanSvg = (svg) =>
  svg
    .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/(href\s*=\s*["'])\s*javascript:[^"']*/gi, '$1#');

async function processImages(section) {
  const iconUrl = new Map();
  const galleries = new Map();
  await fs.mkdir(path.join(DIST, 'images'), { recursive: true });
  for (const s of allSections(section)) {
    if (s.icon) {
      try {
        const data = await fs.readFile(s.icon);
        if (/\.svg$/i.test(s.icon)) {
          const svg = data.toString('utf8');
          if (!/<svg[\s>]/i.test(svg)) throw new Error('not a valid SVG file');
          const name = `images/icon-${sha(data, 12)}.svg`;
          await fs.writeFile(path.join(DIST, name), cleanSvg(svg));
          iconUrl.set(s, name);
        } else {
          const name = `images/icon-${sha(data, 12)}.png`;
          await sharp(data).resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(DIST, name));
          iconUrl.set(s, name);
        }
      } catch (error) {
        warn(path.relative(CONTENT, s.icon), `icon could not be read (${error.message})`);
      }
    }
    const list = [];
    for (const img of s.images) {
      try {
        const name = `images/${sha(await fs.readFile(img.file))}.webp`;
        const out = path.join(DIST, name);
        if (!(await exists(out))) {
          await sharp(img.file).rotate().resize({ width: config.images.maxWidth, withoutEnlargement: true }).webp({ quality: config.images.quality }).toFile(out);
        }
        const { width, height } = await sharp(out).metadata();
        list.push({ name: img.name, url: name, width, height });
      } catch (error) {
        warn(path.relative(CONTENT, img.file), `image could not be read (${error.message})`);
      }
    }
    galleries.set(s, list);
  }
  return { iconUrl, galleries };
}

async function copyStatic() {
  await fs.cp(path.join(ROOT, 'src/assets'), path.join(DIST, 'assets'), { recursive: true });
  await fs.cp(path.join(ROOT, 'src/icons'), path.join(DIST, 'icons'), { recursive: true });
  await fs.copyFile(path.join(ROOT, 'node_modules/minisearch/dist/umd/index.js'), path.join(DIST, 'assets/minisearch.js'));
  const manifest = {
    name: config.siteName,
    short_name: config.shortName,
    description: config.description,
    id: './',
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'portrait',
    background_color: config.backgroundColor,
    theme_color: config.themeColor,
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  await write('manifest.webmanifest', JSON.stringify(manifest, null, 2));
}

async function main() {
  if (!(await exists(CONTENT))) throw new Error(`Content folder not found: ${CONTENT}`);
  const root = await scanContent(CONTENT);
  if (!root.sections.length && !root.docs.length) {
    throw new Error('The content folder is empty. Add at least one folder containing a Word document.');
  }

  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(DIST, { recursive: true });
  await copyStatic();

  const { iconUrl, galleries } = await processImages(root);
  const ctx = { directDoc, iconUrl: (s) => iconUrl.get(s) };

  const searchDocs = [];
  let latest = new Date(0);
  let pages = 0;

  for (const section of allSections(root)) {
    if (!section.parent) continue;
    const prefix = prefixFor(section.path);
    const back = prefix + (section.parent.path || '');
    const crumbs = trail(section).map((s) => s.name);
    if (directDoc(section)) continue;
    searchDocs.push({ id: `s:${section.path}`, kind: 'section', title: section.name, trail: crumbs.slice(0, -1).join(' › '), url: section.path, text: '' });
    await write(`${section.path}index.html`, renderSection({ section, ctx, prefix, back, images: galleries.get(section) || [] }));
    pages++;
  }

  for (const section of allSections(root)) {
    for (const doc of section.docs) {
      const prefix = prefixFor(doc.path);
      const direct = directDoc(section) === doc;
      const backSection = direct ? section.parent : section;
      const relSource = path.relative(CONTENT, doc.file);
      let converted;
      try {
        converted = await convertDocx(doc.file, { distDir: DIST, title: doc.name });
        for (const message of converted.warnings) warn(relSource, message);
      } catch (error) {
        warn(relSource, `document could not be read (${error.message})`);
        converted = { html: '<p>This document could not be displayed.</p>', text: '', headings: [] };
      }
      if (doc.mtime > latest) latest = doc.mtime;
      await write(
        `${doc.path}index.html`,
        renderDoc({
          doc,
          prefix,
          back: prefix + (backSection?.path || ''),
          backTitle: backSection?.name || config.siteName,
          html: converted.html,
          headings: converted.headings,
          images: direct ? galleries.get(section) || [] : [],
          updated: formatDate(doc.mtime),
        }),
      );
      pages++;
      const crumbs = trail(section).map((s) => s.name);
      const label = direct ? crumbs.slice(0, -1) : crumbs;
      searchDocs.push({ id: `d:${doc.path}`, kind: 'doc', title: doc.name, trail: label.join(' › '), url: doc.path, text: converted.text });
    }
  }

  const updated = formatDate(latest.getTime() ? latest : new Date());
  await write('index.html', renderHome({ root, ctx, updated }));
  await write('404.html', renderNotFound().replaceAll('href="./', `href="${BASE_PATH}/`).replaceAll('src="./', `src="${BASE_PATH}/`));

  const mini = new MiniSearch({ fields: ['title', 'trail', 'text'], storeFields: ['kind', 'title', 'trail', 'url', 'text'] });
  mini.addAll(searchDocs);
  await write('search-index.json', JSON.stringify(mini));

  await generateSW({
    globDirectory: DIST,
    globPatterns: ['**/*.{html,js,css,json,webmanifest,png,webp,svg}'],
    globIgnores: ['build-report.json'],
    swDest: path.join(DIST, 'sw.js'),
    directoryIndex: 'index.html',
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true,
    navigateFallback: '404.html',
    maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
    sourcemap: false,
    inlineWorkboxRuntime: true,
  });

  const report = { updated, pages: pages + 1, documents: searchDocs.filter((d) => d.kind === 'doc').length, warnings };
  await write('build-report.json', JSON.stringify(report, null, 2));

  console.log(`Built ${report.pages} pages from ${report.documents} documents. Content last changed ${updated}.`);
  for (const w of warnings) {
    console.log(inCI ? `::warning title=${w.where}::${w.message}` : `Warning: ${w.where}: ${w.message}`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [`### Site built`, `${report.pages} pages from ${report.documents} documents. Content last changed ${updated}.`];
    if (warnings.length) lines.push('', '**Check these files:**', ...warnings.map((w) => `- \`${w.where}\`: ${w.message}`));
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
  }
}

main().catch((error) => {
  console.error(inCI ? `::error::${error.message}` : `Error: ${error.message}`);
  process.exit(1);
});
