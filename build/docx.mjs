import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import sharp from 'sharp';
import * as cheerio from 'cheerio';
import config from '../config.mjs';
import { hash, slugify, uniqueSlug } from './util.mjs';

// Word's highlighter colours, softened so dark text stays readable on them.
const HIGHLIGHTS = {
  yellow: '#fff2a8', green: '#c8f0c4', cyan: '#bfeef5', magenta: '#f6c9ee', blue: '#c9dcff', red: '#ffc7c7',
  darkBlue: '#c9d2fb', darkCyan: '#a9e3e8', darkGreen: '#bde4c1', darkMagenta: '#e8c8f1', darkRed: '#f4c4c4',
  darkYellow: '#f1e0a3', darkGray: '#d5d5da', lightGray: '#ececf0', black: '#d5d5da',
};

const STYLE_MAP = [
  "p[style-name='Title'] => p.doc-title:fresh",
  "p[style-name='Subtitle'] => p.subtitle:fresh",
  "p[style-name='heading 1'] => h2:fresh",
  "p[style-name='heading 2'] => h3:fresh",
  "p[style-name='heading 3'] => h4:fresh",
  "p[style-name='heading 4'] => h5:fresh",
  "p[style-name='heading 5'] => h6:fresh",
  "p[style-name='heading 6'] => h6:fresh",
  "p[style-name='Quote'] => blockquote > p:fresh",
  "p[style-name='Intense Quote'] => blockquote.callout > p:fresh",
  "r[style-name='Strong'] => strong",
  "r[style-name='Emphasis'] => em",
  'u => u',
  'strike => s',
  ...Object.keys(HIGHLIGHTS).map((name) => `highlight[color='${name}'] => mark.hl-${name}`),
  "r[style-name='FogMark'] => span.fog-mark",
];

const HEX = /^[0-9a-f]{6}$/i;
const colourOf = (xml, tag, attr) => {
  const value = xml.match(new RegExp(`<w:${tag}\\b[^>]*\\bw:${attr}="([^"]+)"`))?.[1];
  return value && HEX.test(value) ? value.toLowerCase() : '';
};
const plainText = (hex) => !hex || hex === '000000';
const plainFill = (hex) => !hex || hex === 'ffffff';

const PARA_OPEN = /<w:p(?:\s[^>]*)?>(?:<w:pPr\/>|<w:pPr>[\s\S]*?<\/w:pPr>)?/;
const marker = (text) => `<w:r><w:rPr><w:rStyle w:val="FogMark"/></w:rPr><w:t>${text}</w:t></w:r>`;

/**
 * Mammoth drops text colour and shading because Word stores them as direct formatting.
 * This rewrites the document so they survive conversion:
 *  - coloured or shaded runs get a generated character style, mapped to a span;
 *  - shaded table cells and paragraphs get a small marker run that is turned into a
 *    background colour on the cell or paragraph afterwards.
 */
async function keepColours(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const docFile = zip.file('word/document.xml');
  const stylesFile = zip.file('word/styles.xml');
  if (!docFile || !stylesFile) return { buffer, styleMap: [], runStyles: new Map() };

  const runStyles = new Map();
  let marked = false;
  let xml = await docFile.async('string');
  xml = xml.replace(/<w:p(\s[^>]*)?\/>/g, '<w:p$1></w:p>');

  // Table cell shading
  xml = xml.replace(/<w:tc>([\s\S]*?)<\/w:tc>/g, (whole, inner) => {
    const props = inner.match(/^\s*<w:tcPr>[\s\S]*?<\/w:tcPr>/)?.[0] ?? '';
    const fill = colourOf(props, 'shd', 'fill');
    if (plainFill(fill)) return whole;
    marked = true;
    return `<w:tc>${inner.replace(PARA_OPEN, (open) => `${open}${marker(`cell:${fill}`)}`)}</w:tc>`;
  });

  // Paragraph shading
  xml = xml.replace(/<w:p(?:\s[^>]*)?><w:pPr>[\s\S]*?<\/w:pPr>/g, (open) => {
    const props = open.replace(/<w:rPr>[\s\S]*?<\/w:rPr>/g, '');
    const fill = colourOf(props, 'shd', 'fill');
    if (plainFill(fill)) return open;
    marked = true;
    return `${open}${marker(`para:${fill}`)}`;
  });

  // Run colour and shading
  xml = xml.replace(/<w:r(?:\s[^>]*)?><w:rPr>([\s\S]*?)<\/w:rPr>/g, (whole, inner) => {
    if (inner.includes('<w:rStyle')) return whole;
    const colour = colourOf(inner, 'color', 'val');
    const fill = colourOf(inner, 'shd', 'fill');
    const c = plainText(colour) ? '' : colour;
    const f = plainFill(fill) ? '' : fill;
    if (!c && !f) return whole;
    const id = `FogRun${c ? `C${c}` : ''}${f ? `F${f}` : ''}`;
    runStyles.set(id, [c && `color:#${c}`, f && `background-color:#${f}`].filter(Boolean).join(';'));
    return whole.replace('<w:rPr>', `<w:rPr><w:rStyle w:val="${id}"/>`);
  });

  if (!runStyles.size && !marked) return { buffer, styleMap: [], runStyles };

  const added = [...runStyles.keys(), 'FogMark']
    .map((id) => `<w:style w:type="character" w:customStyle="1" w:styleId="${id}"><w:name w:val="${id}"/></w:style>`)
    .join('');
  zip.file('word/document.xml', xml);
  zip.file('word/styles.xml', (await stylesFile.async('string')).replace('</w:styles>', `${added}</w:styles>`));
  return {
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
    styleMap: [...runStyles.keys()].map((id) => `r[style-name='${id}'] => span.${id}`),
    runStyles,
  };
}

/** Resizes a picture to WebP in the media folder. Returns null if it cannot be read. */
export async function saveImage(input, mediaDir) {
  const name = `${hash(input, 16)}.webp`;
  const out = path.join(mediaDir, name);
  const { data, info } = await sharp(input, { failOn: 'none' })
    .rotate()
    .resize({ width: config.images.maxWidth, height: config.images.maxWidth * 2, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: config.images.quality })
    .toBuffer({ resolveWithObject: true });
  await fs.mkdir(mediaDir, { recursive: true });
  await fs.writeFile(out, data);
  return { name, width: info.width, height: info.height };
}

const BLOCKS = /<\/?(p|li|td|th|tr|h[1-6]|br|div|blockquote|table|ul|ol)\b[^>]*>/gi;
export const textOf = (html) =>
  cheerio.load(`<div>${html.replace(BLOCKS, ' ')}</div>`, null, false)('div').text().replace(/\s+/g, ' ').trim();

/**
 * Converts a Word document to clean HTML.
 * Returns { html, text, headings, warnings }.
 */
export async function convertDocx(file, { mediaDir, title }) {
  const warnings = [];
  const sizes = new Map();
  const prepared = await keepColours(await fs.readFile(file));

  const result = await mammoth.convertToHtml(
    { buffer: prepared.buffer },
    {
      styleMap: [...STYLE_MAP, ...prepared.styleMap],
      convertImage: mammoth.images.imgElement(async (image) => {
        try {
          const saved = await saveImage(await image.readAsBuffer(), mediaDir);
          sizes.set(saved.name, saved);
          return { src: `media/${saved.name}`, alt: image.altText || '' };
        } catch {
          warnings.push(`a picture (${image.contentType || 'unknown type'}) could not be read and was left out`);
          return { src: '' };
        }
      }),
    },
  );
  for (const m of result.messages) {
    if (m.type !== 'warning' || /Fog(Run|Mark)|Unrecognised (paragraph|run) style/.test(m.message)) continue;
    warnings.push(m.message);
  }

  const $ = cheerio.load(`<article>${result.value}</article>`, null, false);
  const article = $('article');

  // Shading markers
  article.find('span.fog-mark').each((_, el) => {
    const [kind, fill] = $(el).text().split(':');
    const target = kind === 'cell' ? $(el).closest('td, th') : $(el).closest('p, li, h2, h3, h4, h5, h6');
    if (HEX.test(fill ?? '')) {
      target.attr('style', `background-color:#${fill}`);
      if (kind !== 'cell') target.addClass('shaded');
    }
    $(el).remove();
  });

  // Text colour and run shading
  article.find('span[class^="FogRun"]').each((_, el) => {
    const css = prepared.runStyles.get($(el).attr('class'));
    $(el).removeAttr('class');
    if (css) $(el).attr('style', css);
    else $(el).replaceWith($(el).contents());
  });

  // Highlights
  article.find('mark').each((_, el) => {
    const colour = HIGHLIGHTS[($(el).attr('class') || '').replace('hl-', '')];
    $(el).removeAttr('class').attr('style', `background-color:${colour || HIGHLIGHTS.yellow}`);
  });

  // Pictures
  article.find('img').each((_, el) => {
    const src = $(el).attr('src');
    const size = sizes.get(path.basename(src || ''));
    if (!src || !size) return void $(el).remove();
    $(el).attr({ width: size.width, height: size.height, loading: 'lazy', decoding: 'async' });
    if (!$(el).attr('alt')) $(el).attr('alt', '');
  });

  // A Title that repeats the file name would show the page title twice
  const first = article.children().first();
  const same = (a, b) => a.replace(/\s+/g, ' ').trim().toLowerCase() === b.replace(/\s+/g, ' ').trim().toLowerCase();
  if (first.is('p.doc-title') && same(first.text(), title)) first.remove();

  // Empty paragraphs and list items
  article.find('p, li, h2, h3, h4, h5, h6').each((_, el) => {
    if (!$(el).text().trim() && !$(el).find('img').length) $(el).remove();
  });
  article.find('ul, ol').each((_, el) => {
    if (!$(el).children().length) $(el).remove();
  });

  // Tables scroll sideways instead of stretching the page
  article.find('table').each((_, el) => {
    if (!$(el).parents('table').length) $(el).wrap('<div class="table-scroll" tabindex="0"></div>');
  });

  // Links
  article.find('a').each((_, el) => {
    const href = $(el).attr('href');
    if (href === undefined) return;
    if (/^https?:\/\//i.test(href)) $(el).attr({ target: '_blank', rel: 'noopener noreferrer' });
    else if (!/^(mailto:|tel:|#)/i.test(href)) $(el).replaceWith($(el).contents());
  });
  article.find('a[id]:not([href])').each((_, el) => {
    if (!$(el).contents().length) $(el).remove();
  });

  // Heading anchors for the contents list
  const used = new Set();
  const headings = [];
  article.find('h2').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    const id = uniqueSlug(slugify(text), used);
    $(el).attr('id', id);
    headings.push({ id, text });
  });

  const html = article.html().trim();
  return { html, text: textOf(html), headings, warnings: [...new Set(warnings)] };
}
