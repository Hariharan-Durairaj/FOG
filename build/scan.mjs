import fs from 'node:fs/promises';
import path from 'node:path';
import { slugify, uniqueSlug } from './util.mjs';

const DOC = /\.docx$/i;
const IMAGE = /\.(jpe?g|png|webp)$/i;
const COVER = /^cover\.(jpe?g|png|webp)$/i;
const ORDER_PREFIX = /^(\d{1,3})[\s._-]+/;

const isHidden = (name) => /^[_.~]/.test(name) || /^(thumbs\.db|desktop\.ini)$/i.test(name);
const orderOf = (name) => Number(name.match(ORDER_PREFIX)?.[1] ?? Infinity);
// Folder and file names cannot contain "/" or ":", so look-alike characters are shown as the real ones.
const LOOKALIKE_SLASH = /[\u2215\u2044\uFF0F]/g;
const LOOKALIKE_COLON = /[\uA789\u2236\uFF1A]/g;
export const displayName = (name) =>
  name.replace(/\.(docx|jpe?g|png|webp)$/i, '').replace(ORDER_PREFIX, '').replace(LOOKALIKE_SLASH, '/').replace(LOOKALIKE_COLON, ':').trim() || name;

const byOrder = (a, b) => orderOf(a.name) - orderOf(b.name) || a.name.localeCompare(b.name, undefined, { numeric: true });

/**
 * Reads the content folder into a tree of sections.
 * Every folder is a section; Word documents are pages; cover.* is the tile image;
 * other images make up the section gallery.
 */
export async function scanContent(root) {
  async function walk(dir, parent) {
    const entries = (await fs.readdir(dir, { withFileTypes: true })).filter((e) => !isHidden(e.name)).sort(byOrder);
    const used = new Set();
    const section = {
      name: parent ? displayName(path.basename(dir)) : '',
      dir,
      path: parent ? `${parent.path}${uniqueSlug(slugify(displayName(path.basename(dir))), parent.childSlugs)}/` : '',
      parent,
      childSlugs: used,
      sections: [],
      docs: [],
      images: [],
      cover: null,
    };

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) continue;
      if (DOC.test(entry.name)) {
        const name = displayName(entry.name);
        const { mtime } = await fs.stat(full);
        section.docs.push({ name, file: full, source: entry.name, slug: uniqueSlug(slugify(name), used), mtime, section });
      } else if (COVER.test(entry.name)) {
        section.cover = full;
      } else if (IMAGE.test(entry.name)) {
        section.images.push({ name: displayName(entry.name), file: full, source: entry.name });
      }
    }
    for (const entry of entries) {
      if (entry.isDirectory()) section.sections.push(await walk(path.join(dir, entry.name), section));
    }
    for (const doc of section.docs) doc.path = `${section.path}${doc.slug}/`;
    return section;
  }
  return walk(root, null);
}

export function* allSections(section) {
  yield section;
  for (const child of section.sections) yield* allSections(child);
}

export const trail = (section) => {
  const list = [];
  for (let s = section; s?.parent; s = s.parent) list.unshift(s);
  return list;
};

/** A section holding one document and nothing else opens that document directly. */
export const directDoc = (section) =>
  section.sections.length === 0 && section.docs.length === 1 ? section.docs[0] : null;
