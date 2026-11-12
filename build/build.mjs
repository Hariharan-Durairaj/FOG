// Builds the static site.  Usage: node build/build.mjs <content folder> [output folder]
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../config.mjs';
import { scan, sectionsOf, trail, iconOf } from './scan.mjs';
import { convertDocx, saveImage } from './docx.mjs';
import { convertPdf } from './pdf.mjs';
import { sectionIcon, writeAppIcons } from './icons.mjs';
import { setSiteUpdated, homePage, sectionPage, docPage, notFoundPage, manifest } from './render.mjs';
import { formatDate, hash } from './util.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.resolve(process.argv[2] || 'content');
const outDir = path.resolve(process.argv[3] || 'dist');
const basePath = process.env.FOG_BASE_PATH || '/';
const workDir = `${outDir}.new`;
const warnings = [];
const warn = (file, message) => {
  const where = path.relative(contentDir, file);
  warnings.push({ file: where, message });
  console.warn(`  warning: ${where}: ${message}`);
};

async function inBatches(items, size, task) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: size }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) await task(item);
    }),
  );
}

async function write(file, data) {
  const full = path.join(workDir, file);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
}

async function listFiles(dir, prefix = '') {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const rel = `${prefix}${entry.name}`;
    if (entry.isDirectory()) out.push(...(await listFiles(path.join(dir, entry.name), `${rel}/`)));
    else out.push(rel);
  }
  return out;
}

const started = Date.now();
const tree = await scan(contentDir);
const sections = [...sectionsOf(tree)].filter((s) => s.parent);
const docs = [...sectionsOf(tree)].flatMap((s) => s.docs);
if (!sections.length && !docs.length) {
  console.error(`No content found in ${contentDir}. The existing site was left unchanged.`);
  process.exit(1);
}

await fs.rm(workDir, { recursive: true, force: true });
await fs.mkdir(workDir, { recursive: true });
const mediaDir = path.join(workDir, 'media');

// Icons (sub-folders without one use their parent's)
const iconCache = new Map();
const icons = new Map();
for (const section of sections) {
  const file = iconOf(section);
  if (!file) continue;
  if (!iconCache.has(file)) {
    try {
      iconCache.set(file, await sectionIcon(file, workDir));
    } catch (error) {
      warn(file, `the icon could not be read (${error.message})`);
      iconCache.set(file, null);
    }
  }
  icons.set(section, iconCache.get(file));
}

// Documents
const converted = new Map();
await inBatches(docs, 4, async (doc) => {
  try {
    const result = doc.pdf
      ? await convertPdf(doc.file, { outDir: workDir, mediaDir, title: doc.title })
      : await convertDocx(doc.file, { mediaDir, title: doc.title });
    for (const message of result.warnings) warn(doc.file, message);
    converted.set(doc, result);
  } catch (error) {
    warn(doc.file, `the document could not be read (${error.message})`);
    converted.set(doc, { html: '<p class="empty">This document could not be displayed.</p>', text: '', headings: [], warnings: [] });
  }
});

// Pictures placed in folders
const pictures = new Map();
await inBatches(sections, 4, async (section) => {
  const list = [];
  for (const image of section.images) {
    try {
      list.push({ ...(await saveImage(await fs.readFile(image.file), mediaDir)), title: image.title });
    } catch (error) {
      warn(image.file, `the picture could not be read (${error.message})`);
    }
  }
  pictures.set(section, list);
});

// Pages
const dateOf = (date) => formatDate(date, config);
const parentOf = (section) => ({ url: section.url, title: section.title, trail: trail(section) });
const latest = docs.reduce((max, d) => (d.mtime > max ? d.mtime : max), new Date(0));

setSiteUpdated(docs.length ? dateOf(latest) : '');
await write('index.html', homePage({ sections: tree.sections, docs: tree.docs, icons }));

for (const section of sections) {
  if (section.direct) {
    const doc = section.direct;
    await write(
      `${section.url}index.html`,
      docPage({ doc, parent: parentOf(section.parent), converted: converted.get(doc), updated: dateOf(doc.mtime), images: pictures.get(section) }),
    );
    continue;
  }
  await write(
    `${section.url}index.html`,
    sectionPage({ section, parent: parentOf(section.parent), icon: icons.get(section), images: pictures.get(section) }),
  );
}
for (const doc of docs) {
  if (doc.section.direct === doc) continue;
  await write(`${doc.url}index.html`, docPage({ doc, parent: parentOf(doc.section), converted: converted.get(doc), updated: dateOf(doc.mtime), images: [] }));
}

// Search data
const where = (list) => list.map((s) => s.title).join(' › ');
const searchItems = [
  ...docs.map((doc) => ({
    title: doc.title,
    where: where(trail(doc.section.direct === doc ? doc.section.parent : doc.section)),
    url: doc.url,
    text: converted.get(doc).text,
  })),
  ...sections.filter((s) => !s.direct).map((s) => ({ title: s.title, where: where(trail(s.parent)), url: s.url, text: '' })),
];
await write('search.json', JSON.stringify(searchItems));

// App files
await write('assets/app.css', await fs.readFile(path.join(here, '../src/app.css')));
await write('assets/app.js', await fs.readFile(path.join(here, '../src/app.js')));
await write('assets/minisearch.js', await fs.readFile(path.join(here, '../node_modules/minisearch/dist/umd/index.js')));
await write('manifest.webmanifest', manifest());
await write('404.html', notFoundPage(basePath));
await writeAppIcons(workDir);

// Service worker, listing every file with a fingerprint of its content
const files = {};
for (const file of (await listFiles(workDir)).sort()) files[file] = hash(await fs.readFile(path.join(workDir, file)), 10);
const sw = (await fs.readFile(path.join(here, '../src/sw.js'), 'utf8')).replace('__FILES__', JSON.stringify(files));
await write('sw.js', sw);

await write(
  'build-report.json',
  JSON.stringify({ built: new Date().toISOString(), sections: sections.length, documents: docs.length, files: Object.keys(files).length, warnings }, null, 2),
);

// Publish: swap the finished build into place
const oldDir = `${outDir}.old`;
await fs.rm(oldDir, { recursive: true, force: true });
await fs.rename(outDir, oldDir).catch((error) => {
  if (error.code !== 'ENOENT') throw error;
});
await fs.rename(workDir, outDir);
await fs.rm(oldDir, { recursive: true, force: true });

const bytes = (await Promise.all(Object.keys(files).map((f) => fs.stat(path.join(outDir, f))))).reduce((sum, s) => sum + s.size, 0);
console.log(
  `Built ${sections.length} sections and ${docs.length} documents (${Object.keys(files).length} files, ${(bytes / 1048576).toFixed(1)} MB) in ${((Date.now() - started) / 1000).toFixed(1)} s` +
    (warnings.length ? ` with ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : ''),
);
