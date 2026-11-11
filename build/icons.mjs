import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import * as cheerio from 'cheerio';
import config from '../config.mjs';
import { hash } from './util.mjs';

const BLACK = /^(#000|#000000|black)$/i;
const MONO = /^(none|transparent|currentcolor|#000|#000000|black)$/i;
const UNSAFE_URL = /^\s*(javascript|vbscript|data:text)/i;

/** Removes anything in an editor's SVG that could run code or load remote content. */
export function cleanSvg(source) {
  const $ = cheerio.load(source, { xml: true });
  const svg = $('svg').first();
  if (!svg.length) throw new Error('not an SVG file');
  $('script, foreignObject, iframe, object, embed').remove();
  $('style').each((_, el) => {
    if (/@import|url\s*\(/i.test($(el).text())) $(el).remove();
  });
  $('*').each((_, el) => {
    for (const [name, value] of Object.entries(el.attribs ?? {})) {
      const clean = String(value).replace(/[\u0000- ]/g, '');
      const isLink = /^(xlink:)?href$/i.test(name);
      if (
        /^on/i.test(name) ||
        UNSAFE_URL.test(clean) ||
        (isLink && !/^(#|data:image\/(png|jpeg|webp|gif);)/i.test(clean)) ||
        (name === 'style' && /url\s*\(|expression/i.test(value))
      ) {
        $(el).removeAttr(name);
      }
    }
  });
  return { $, svg };
}

/**
 * Prepares a section icon.
 * Single-colour SVGs are returned as inline markup that takes the surrounding text colour.
 * Anything else is published as a file and returned as { src }.
 */
export async function sectionIcon(file, outDir) {
  const data = await fs.readFile(file);
  const iconDir = path.join(outDir, 'icons');
  await fs.mkdir(iconDir, { recursive: true });

  if (/\.png$/i.test(file)) {
    const name = `s-${hash(data)}.webp`;
    await sharp(data).resize({ width: 192, height: 192, fit: 'inside' }).webp({ quality: 90 }).toFile(path.join(iconDir, name));
    return { src: `icons/${name}` };
  }

  const { $, svg } = cleanSvg(data.toString('utf8'));
  const colours = [];
  $('*').each((_, el) => {
    for (const attr of ['fill', 'stroke', 'color', 'stop-color']) if (el.attribs?.[attr]) colours.push(el.attribs[attr].trim());
  });
  const complex = $('style, linearGradient, radialGradient, pattern, image, mask, filter, use, [style], [id], [class]').length > 0;
  const inline = !complex && colours.every((c) => MONO.test(c)) && (svg.attr('viewBox') || (svg.attr('width') && svg.attr('height')));

  if (!inline) {
    const name = `s-${hash(data)}.svg`;
    await fs.writeFile(path.join(iconDir, name), $.xml());
    return { src: `icons/${name}` };
  }

  $('*').each((_, el) => {
    for (const attr of ['fill', 'stroke', 'color']) if (BLACK.test(el.attribs?.[attr] ?? '')) $(el).attr(attr, 'currentColor');
  });
  if (!svg.attr('fill') && !svg.attr('stroke')) svg.attr('fill', 'currentColor');
  if (!svg.attr('viewBox')) svg.attr('viewBox', `0 0 ${parseFloat(svg.attr('width'))} ${parseFloat(svg.attr('height'))}`);
  svg.removeAttr('width').removeAttr('height').attr({ 'aria-hidden': 'true', focusable: 'false' });
  $('title, desc, metadata').remove();
  return { inline: $.xml(svg).replace(/>\s+</g, '><').trim() };
}

// ---------- App icons ----------

const wordmark = (scale) => {
  const w = 428 * scale;
  const h = 196 * scale;
  return `<g transform="translate(${(512 - w) / 2} ${(512 - h) / 2}) scale(${scale})" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <g stroke="#fff" stroke-width="30">
      <path d="M15 132V0H76M15 66H62"/>
      <circle cx="186" cy="66" r="66"/>
      <path d="M408.7 19.3A66 66 0 1 0 428 66H376"/>
    </g>
    <path d="M0 185H428" stroke="#f76707" stroke-width="22"/>
  </g>`;
};

const appIconSvg = ({ rounded, scale }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${rounded ? 104 : 0}" fill="${config.colours.theme}"/>${wordmark(scale)}</svg>`;

export async function writeAppIcons(outDir) {
  const dir = path.join(outDir, 'icons');
  await fs.mkdir(dir, { recursive: true });
  const rounded = Buffer.from(appIconSvg({ rounded: true, scale: 0.78 }));
  const square = Buffer.from(appIconSvg({ rounded: false, scale: 0.78 }));
  const maskable = Buffer.from(appIconSvg({ rounded: false, scale: 0.6 }));
  const png = (svg, size, file) => sharp(svg, { density: 300 }).resize(size, size).png().toFile(path.join(dir, file));
  await Promise.all([
    png(rounded, 192, 'icon-192.png'),
    png(rounded, 512, 'icon-512.png'),
    png(maskable, 512, 'icon-maskable-512.png'),
    png(square, 180, 'apple-touch-icon.png'),
    png(rounded, 48, 'favicon.png'),
    fs.writeFile(path.join(dir, 'favicon.svg'), rounded),
  ]);
}
