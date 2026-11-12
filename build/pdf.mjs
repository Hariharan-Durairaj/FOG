import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import { getDocument, VerbosityLevel } from 'pdfjs-dist/legacy/build/pdf.mjs';
import config from '../config.mjs';
import { saveImage } from './docx.mjs';
import { hash, slugify, plural } from './util.mjs';

const pdfjsDir = path.dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'));
const asset = (dir) => pathToFileURL(path.join(pdfjsDir, dir)).href + '/';

/**
 * Prepares a PDF for the app:
 *  - copies the original so it can be opened or downloaded (and is kept offline),
 *  - turns each page into a picture, because phones cannot show a PDF inside a page,
 *  - reads its text for search.
 * Returns { html, text, headings, warnings }.
 */
export async function convertPdf(file, { outDir, mediaDir, title }) {
  const data = await fs.readFile(file);
  const { maxPages, width } = config.pdf;
  const warnings = [];

  const pdf = await getDocument({
    data: new Uint8Array(data),
    standardFontDataUrl: asset('standard_fonts'),
    cMapUrl: asset('cmaps'),
    cMapPacked: true,
    wasmUrl: asset('wasm'),
    iccUrl: asset('iccs'),
    isEvalSupported: false,
    verbosity: VerbosityLevel.ERRORS,
  }).promise;

  try {
    const total = pdf.numPages;
    const shown = Math.min(total, maxPages);
    if (total > maxPages) warnings.push(`only the first ${maxPages} of ${total} pages are shown as pictures`);

    const pages = [];
    const text = [];
    for (let n = 1; n <= total; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      text.push(content.items.map((item) => item.str + (item.hasEOL ? ' ' : '')).join(''));
      if (n <= shown) {
        try {
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: Math.min(4, width / base.width) });
          const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
          const context = canvas.getContext('2d');
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: context, canvas, viewport }).promise;
          pages.push(await saveImage(canvas.toBuffer('image/png'), mediaDir));
        } catch (error) {
          warnings.push(`page ${n} could not be shown (${error.message})`);
          pages.push(null);
        }
      }
      page.cleanup();
    }

    // The original file, under a readable name that changes when its content changes
    const fileName = `${slugify(title)}-${hash(data, 8)}.pdf`;
    await fs.mkdir(path.join(outDir, 'files'), { recursive: true });
    await fs.writeFile(path.join(outDir, 'files', fileName), data);

    const html = `<p class="pdf-open"><a href="files/${fileName}" target="_blank" rel="noopener">Open the PDF</a> <span>${plural(total, 'page')}</span></p>
<div class="pdf-pages">
${pages
  .map((p, i) =>
    p
      ? `<figure class="pdf-page"><img src="media/${p.name}" width="${p.width}" height="${p.height}" alt="Page ${i + 1} of ${total}" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async"></figure>`
      : `<p class="empty">Page ${i + 1} could not be displayed. Use “Open the PDF”.</p>`,
  )
  .join('\n')}
</div>
${total > shown ? `<p class="empty">Pages ${shown + 1} to ${total} are in the PDF. Use “Open the PDF”.</p>` : ''}`;

    return { html, text: text.join(' ').replace(/\s+/g, ' ').trim(), headings: [], warnings };
  } finally {
    await pdf.destroy();
  }
}
