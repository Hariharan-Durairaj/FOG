import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import config from '../config.mjs';
import { convertDocx } from './docx.mjs';
import { displayName, trail } from './scan.mjs';

// Word changes " - " to a dash and ' to a curly quote, and editors may type / instead of the look-alike.
const normalise = (text) =>
  displayName(String(text))
    .toLowerCase()
    .replace(/[‐-―−]/g, '-')
    .replace(/[‘’‛′`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s*([-/])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

const telOf = (number) => {
  const digits = number.replace(/[^\d+]/g, '');
  return digits.length === 8 && /^[1-9]/.test(digits) ? `${config.phoneAreaCode}${digits}` : digits;
};

/**
 * Reads the home page folder: key contacts, quick access links and highlighted cards.
 * Problems are reported as warnings; they never stop the build.
 */
export async function buildHome(dir, { mediaDir, docs, sections, warn }) {
  const home = { cards: [], contacts: [], quick: [] };
  if (!dir) return home;
  const files = (await fs.readdir(dir)).filter((f) => /\.docx$/i.test(f) && !/^(_|\.|~\$)/.test(f)).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  const is = (file, name) => normalise(file) === normalise(name);

  for (const file of files) {
    const full = path.join(dir, file);
    const title = displayName(file);
    let converted;
    try {
      converted = await convertDocx(full, { mediaDir, title });
    } catch (error) {
      warn(full, `could not be read (${error.message})`);
      continue;
    }
    const $ = cheerio.load(`<div>${converted.html}</div>`, null, false);

    if (is(file, config.home.contacts)) {
      $('tr').each((_, tr) => {
        const cells = $(tr).children('td, th').map((__, c) => $(c).text().replace(/\s+/g, ' ').trim()).get();
        const [name, number = '', note = ''] = cells;
        if (!name || !/\d{3}/.test(number.replace(/\s/g, ''))) return; // heading row or empty row
        home.contacts.push({ name, number, note, tel: telOf(number) });
      });
      if (!home.contacts.length) warn(full, 'no contacts found: use a table with the columns Name, Number and Note');
    } else if (is(file, config.home.quickAccess)) {
      let items = $('li').map((_, li) => $(li).clone().children('ul, ol').remove().end().text().trim()).get();
      if (!items.length) items = $('p').map((_, p) => $(p).text().trim()).get();
      const pages = [
        ...docs.map((d) => ({ title: d.title, url: d.url, where: trail(d.section.direct === d ? d.section.parent : d.section).map((s) => s.title) })),
        ...sections.filter((s) => !s.direct).map((s) => ({ title: s.title, url: s.url, where: trail(s.parent).map((p) => p.title) })),
      ];
      for (const item of items.filter(Boolean)) {
        const parts = item.split(/\s*[›>]\s*/).map(normalise);
        const wanted = parts.pop();
        // "Section › Page" must match the page's full location; a bare title matches anywhere
        const named = pages.filter((p) => normalise(p.title) === wanted);
        const matches = parts.length
          ? named.filter((p) => p.where.length === parts.length && p.where.every((w, i) => normalise(w) === parts[i]))
          : named;
        if (!matches.length) {
          warn(full, `quick access: no page called "${item}"`);
          continue;
        }
        if (matches.length > 1) warn(full, `quick access: "${item}" matches ${matches.length} pages; showing the first. Write it as "Section › Page" to choose.`);
        home.quick.push({ title: matches[0].title, url: matches[0].url });
      }
    } else {
      home.cards.push({ title, html: converted.html, text: converted.text });
    }
  }
  return home;
}
