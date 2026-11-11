import fs from 'node:fs/promises';
import path from 'node:path';
import { slugify, uniqueSlug } from './util.mjs';

const DOC = /\.docx$/i;
const IMAGE = /\.(jpe?g|png|webp)$/i;
const ICON = /^icon\.(svg|png)$/i;
const OLD_COVER = /^cover\.(jpe?g|png)$/i;
const ORDER = /^(\d+)[\s._-]+(?=\S)/;
const ignored = (name) => /^(_|\.|~\$)/.test(name);

// OneDrive does not allow "/" or ":" in names, so editors use look-alike characters.
export const displayName = (name) =>
  name
    .replace(/\.(docx|jpe?g|png|webp)$/i, '')
    .replace(ORDER, '')
    .replace(/[∕⁄／]/g, '/')
    .replace(/[꞉∶：]/g, ':')
    .replace(/\s+/g, ' ')
    .trim() || name;

const order = (name) => (ORDER.test(name) ? Number(name.match(ORDER)[1]) : Infinity);
const inOrder = (a, b) =>
  order(a.name) - order(b.name) || a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' });

/**
 * Reads the content folder into a tree.
 * Folder = section, .docx = document, icon.svg/icon.png = icon, other images = pictures.
 */
export async function scan(root) {
  async function walk(dir, parent) {
    const entries = (await fs.readdir(dir, { withFileTypes: true })).filter((e) => !ignored(e.name)).sort(inOrder);
    const slugs = new Set();
    const node = {
      title: parent ? displayName(path.basename(dir)) : '',
      dir,
      parent,
      slugs,
      url: '',
      sections: [],
      docs: [],
      images: [],
      iconFile: null,
    };
    if (parent) node.url = `${parent.url}${uniqueSlug(slugify(node.title), parent.slugs)}/`;

    // Folders claim their addresses first, so adding a document never moves a folder.
    for (const entry of entries) {
      if (entry.isDirectory()) node.sections.push(await walk(path.join(dir, entry.name), node));
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const file = path.join(dir, entry.name);
      if (DOC.test(entry.name)) {
        const title = displayName(entry.name);
        const { mtime } = await fs.stat(file);
        node.docs.push({ title, file, mtime, section: node, slug: uniqueSlug(slugify(title), slugs) });
      } else if (ICON.test(entry.name)) {
        if (!node.iconFile || /\.svg$/i.test(entry.name)) node.iconFile = file;
      } else if (OLD_COVER.test(entry.name)) {
        continue;
      } else if (IMAGE.test(entry.name)) {
        node.images.push({ title: displayName(entry.name), file });
      }
    }

    // A folder with exactly one document and no sub-folders opens straight to that document.
    node.direct = parent && node.sections.length === 0 && node.docs.length === 1 ? node.docs[0] : null;
    for (const doc of node.docs) doc.url = node.direct ? node.url : `${node.url}${doc.slug}/`;
    node.topics = node.sections.length + node.docs.length;
    return node;
  }
  return walk(root, null);
}

export function* sectionsOf(node) {
  yield node;
  for (const child of node.sections) yield* sectionsOf(child);
}

/** Titles from the top-level section down to this one. */
export function trail(node) {
  const list = [];
  for (let n = node; n?.parent; n = n.parent) list.unshift(n);
  return list;
}

/** The nearest icon, looking up through parent folders. */
export function iconOf(node) {
  for (let n = node; n; n = n.parent) if (n.iconFile) return n.iconFile;
  return null;
}
