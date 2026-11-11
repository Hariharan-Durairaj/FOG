import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import sharp from 'sharp';
import * as cheerio from 'cheerio';
import config from './config.mjs';
import { exists, sha, slugify, uniqueSlug } from './util.mjs';

const HIGHLIGHTS = {
  yellow: '#fff3a3', green: '#c9f2c7', cyan: '#bdeef4', magenta: '#f7c8ec', blue: '#c7dcff', red: '#ffc9c9',
  darkBlue: '#c7d2fe', darkCyan: '#a5e4e8', darkGreen: '#bbe5c0', darkMagenta: '#e9c6f2', darkRed: '#f5c2c2',
  darkYellow: '#f3e1a0', darkGray: '#d4d4d8', lightGray: '#ececef', black: '#d4d4d8',
};

const BASE_STYLE_MAP = [
  "p[style-name='Title'] => p.doc-title:fresh",
  "p[style-name='Subtitle'] => p.doc-subtitle:fresh",
  "p[style-name='heading 1'] => h2:fresh",
  "p[style-name='heading 2'] => h3:fresh",
  "p[style-name='heading 3'] => h4:fresh",
  "p[style-name='heading 4'] => h5:fresh",
  "p[style-name='heading 5'] => h5:fresh",
  "p[style-name='heading 6'] => h5:fresh",
  "p[style-name='Quote'] => blockquote > p:fresh",
  "p[style-name='Intense Quote'] => blockquote.callout > p:fresh",
  "r[style-name='Strong'] => strong",
  "r[style-name='Emphasis'] => em",
  'u => u',
  'strike => s',
  ...Object.keys(HIGHLIGHTS).map((name) => `highlight[color='${name}'] => mark.hl-${name}`),
];

const isPlainColour = (hex) => !hex || /^(auto|000000)$/i.test(hex);
const isPlainFill = (hex) => !hex || /^(auto|ffffff)$/i.test(hex);

// Word stores text colour and shading as direct run formatting, which mammoth ignores.
// Give each distinct colour/shading combination its own character style so it can be mapped to HTML.
async function tagRunFormatting(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const docFile = zip.file('word/document.xml');
  const stylesFile = zip.file('word/styles.xml');
  if (!docFile || !stylesFile) return { buffer, styleMap: [] };

  const created = new Map();
  const xml = (await docFile.async('string')).replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/g, (whole, inner) => {
    if (inner.includes('<w:rStyle')) return whole;
    const colour = inner.match(/<w:color\b[^>]*\bw:val="([0-9A-Fa-f]{6}|auto)"/)?.[1];
    const fill = inner.match(/<w:shd\b[^>]*\bw:fill="([0-9A-Fa-f]{6}|auto)"/)?.[1];
    const c = isPlainColour(colour) ? '' : colour.toLowerCase();
    const f = isPlainFill(fill) ? '' : fill.toLowerCase();
    if (!c && !f) return whole;
    const id = `FogFmt${c ? `C${c}` : ''}${f ? `F${f}` : ''}`;
    created.set(id, { colour: c, fill: f });
    return `<w:rPr><w:rStyle w:val="${id}"/>${inner}</w:rPr>`;
  });
  if (!created.size) return { buffer, styleMap: [] };

  const styleXml = [...created.keys()]
    .map((id) => `<w:style w:type="character" w:customStyle="1" w:styleId="${id}"><w:name w:val="${id}"/></w:style>`)
    .join('');
  const styles = (await stylesFile.async('string')).replace('</w:styles>', `${styleXml}</w:styles>`);
  zip.file('word/document.xml', xml);
  zip.file('word/styles.xml', styles);

  return {
    buffer: await zip.generateAsync({ type: 'nodebuffer' }),
    styleMap: [...created.keys()].map((id) => `r[style-name='${id}'] => span.${id}`),
    formats: created,
  };
}

export async function convertDocx(file, { distDir, title }) {
  const warnings = [];
  const mediaDir = path.join(distDir, 'media');
  await fs.mkdir(mediaDir, { recursive: true });
  const imageSizes = new Map();

  const tagged = await tagRunFormatting(await fs.readFile(file));

  const result = await mammoth.convertToHtml(
    { buffer: tagged.buffer },
    {
      styleMap: [...BASE_STYLE_MAP, ...tagged.styleMap],
      includeDefaultStyleMap: true,
      convertImage: mammoth.images.imgElement(async (image) => {
        try {
          const input = await image.readAsBuffer();
          if (!/image\/(png|jpe?g|gif|webp|bmp|tiff)/i.test(image.contentType)) {
            warnings.push(`image of type ${image.contentType} is not supported and was left out`);
            return { src: '' };
          }
          const name = `${sha(input)}.webp`;
          const out = path.join(mediaDir, name);
          if (!(await exists(out))) {
            await sharp(input)
              .rotate()
              .resize({ width: config.images.maxWidth, withoutEnlargement: true })
              .webp({ quality: config.images.quality })
              .toFile(out);
          }
          const meta = await sharp(out).metadata();
          imageSizes.set(name, meta);
          return { src: `@root/media/${name}`, alt: image.altText || '' };
        } catch (error) {
          warnings.push(`an image could not be read (${error.message})`);
          return { src: '' };
        }
      }),
    },
  );

  for (const message of result.messages) {
    if (message.type === 'warning' && !/FogFmt|Unrecognised (paragraph|run) style/.test(message.message)) {
      warnings.push(message.message);
    }
  }

  const $ = cheerio.load(`<article>${result.value}</article>`, null, false);
  const article = $('article');

  // Text colour and shading
  article.find('span[class^="FogFmt"]').each((_, el) => {
    const id = $(el).attr('class');
    const format = tagged.formats?.get(id);
    if (!format) return;
    const css = [];
    if (format.colour) css.push(`color:#${format.colour}`);
    if (format.fill) css.push(`background-color:#${format.fill}`);
    $(el).removeAttr('class').attr('style', css.join(';'));
  });

  // Highlights
  for (const [name, colour] of Object.entries(HIGHLIGHTS)) {
    article.find(`mark.hl-${name}`).attr('style', `background-color:${colour}`).removeAttr('class');
  }

  // Images
  article.find('img').each((_, el) => {
    const src = $(el).attr('src');
    if (!src) return $(el).remove();
    const meta = imageSizes.get(path.basename(src));
    if (meta) $(el).attr({ width: meta.width, height: meta.height });
    $(el).attr({ loading: 'lazy', decoding: 'async' });
  });

  // A Title paragraph that repeats the file name would duplicate the page heading
  const first = article.children().first();
  if (first.is('p.doc-title') && first.text().trim().toLowerCase() === title.trim().toLowerCase()) first.remove();

  // Empty paragraphs
  article.find('p').each((_, el) => {
    const p = $(el);
    if (!p.text().trim() && !p.find('img').length) p.remove();
  });

  // Tables scroll sideways on small screens rather than breaking the layout
  article.find('table').each((_, el) => {
    $(el).wrap('<div class="table-wrap"></div>');
  });

  // Links
  article.find('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (/^https?:/i.test(href)) $(el).attr({ target: '_blank', rel: 'noopener' });
  });

  // Section headings for the contents list
  const used = new Set();
  const headings = [];
  article.find('h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (!text) return;
    const id = uniqueSlug(slugify(text), used);
    $(el).attr('id', id);
    headings.push({ id, text, level: el.tagName === 'h2' ? 2 : 3 });
  });

  return {
    html: article.html(),
    text: cheerio.load(`<div>${article.html().replace(/<\/?(p|li|td|th|h[1-6]|br|tr|div|blockquote)\b[^>]*>/gi, ' ')}</div>`)('div').text().replace(/\s+/g, ' ').trim(),
    headings,
    warnings: [...new Set(warnings)],
  };
}
