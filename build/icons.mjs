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

// ---------- App icons and logo ----------

// Brand files in src/brand:
//   fog-tab.svg            browser tab icon
//   fog-app.svg            app icon (rounded)
//   fog-app-square.svg     app icon for iPhone (the phone rounds the corners)
//   fog-app-maskable.svg   app icon for Android icon shapes (content inside the safe circle)
//   ses-logo-white.svg     SES logo, white, for the navy header and footer
//                          (its viewBox already includes the clear space of one checker square)
//   gov-sa-logo-white.svg  Government of South Australia logo, white, for the navy footer (optional)
const brand = (name) => new URL(`../src/brand/${name}`, import.meta.url);

// Copies an SVG logo to assets/ and returns its address and size at the given height.
async function svgLogo(outDir, name, file, height) {
  const svg = await fs.readFile(brand(name), 'utf8');
  await fs.writeFile(path.join(outDir, 'assets', file), svg);
  const [, w, h] = svg.match(/viewBox="[\d.-]+ [\d.-]+ ([\d.]+) ([\d.]+)"/);
  return { src: `assets/${file}`, width: Math.round((w / h) * height), height };
}

export async function writeAppIcons(outDir) {
  const dir = path.join(outDir, 'icons');
  await fs.mkdir(dir, { recursive: true });
  const png = async (name, size, file) =>
    sharp(await fs.readFile(brand(name)), { density: Math.ceil((72 * size) / 508) * 2 })
      .resize(size, size)
      .png()
      .toFile(path.join(dir, file));
  await Promise.all([
    png('fog-tab.svg', 32, 'favicon-32.png'),
    png('fog-tab.svg', 48, 'favicon.png'),
    fs.copyFile(brand('fog-tab.svg'), path.join(dir, 'favicon.svg')),
    png('fog-app.svg', 192, 'icon-192.png'),
    png('fog-app.svg', 512, 'icon-512.png'),
    png('fog-app-maskable.svg', 512, 'icon-maskable-512.png'),
    png('fog-app-square.svg', 180, 'apple-touch-icon.png'),
  ]);

  await fs.mkdir(path.join(outDir, 'assets'), { recursive: true });
  const logo = await svgLogo(outDir, 'ses-logo-white.svg', 'logo.svg', 56);
  const hasGov = await fs.access(brand('gov-sa-logo-white.svg')).then(() => true, () => false);
  const govLogo = hasGov ? await svgLogo(outDir, 'gov-sa-logo-white.svg', 'gov-sa-logo.svg', 84) : null;
  return { logo, govLogo };
}
