import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import config from '../config.mjs';
import { convertPdf } from './pdf.mjs';
import { esc } from './util.mjs';

/** Reads the address from a Windows web shortcut (.url file). */
export async function readShortcut(file) {
  const text = (await fs.readFile(file, 'utf8')).replace(/^﻿/, '');
  const url = text.match(/^\s*URL\s*=\s*(\S+)\s*$/im)?.[1];
  if (!url || !/^https?:\/\//i.test(url)) throw new Error('no web address (http or https) found in the shortcut');
  return new URL(url).href;
}

const openLink = (url, label) =>
  `<p class="pdf-open"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}</a> <span>Needs an internet connection</span></p>`;

async function download(url) {
  const { timeoutSeconds, maxMegabytes } = config.links;
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutSeconds * 1000), headers: { 'User-Agent': 'FOG-site-builder' } });
  if (!response.ok) throw new Error(`the address answered ${response.status}`);
  const length = Number(response.headers.get('content-length') || 0);
  if (length > maxMegabytes * 1048576) throw new Error(`the file is larger than ${maxMegabytes} MB`);
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length > maxMegabytes * 1048576) throw new Error(`the file is larger than ${maxMegabytes} MB`);
  const modified = response.headers.get('last-modified');
  return { data, type: response.headers.get('content-type') || '', modified: modified ? new Date(modified) : null };
}

/**
 * A web shortcut becomes a page. If it points to a PDF, the PDF is downloaded and shown
 * (and saved for offline use); otherwise the page offers a button to open the website.
 */
export async function convertLink(doc, { outDir, mediaDir }) {
  const url = await readShortcut(doc.file);
  let got;
  try {
    got = await download(url);
  } catch (error) {
    return {
      html: `<p class="empty">This document could not be downloaded when the guide was last updated.</p>${openLink(url, 'Open the original')}`,
      text: '',
      headings: [],
      warnings: [`could not download ${url} (${error.message})`],
    };
  }
  const isPdf = /application\/pdf/i.test(got.type) || got.data.subarray(0, 5).toString('latin1') === '%PDF-';
  if (!isPdf) return { html: openLink(url, 'Open the website'), text: '', headings: [], warnings: [] };

  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'fog-link-'));
  try {
    const file = path.join(temp, 'linked.pdf');
    await fs.writeFile(file, got.data);
    const result = await convertPdf(file, { outDir, mediaDir, title: doc.title });
    if (got.modified && !Number.isNaN(got.modified.getTime())) doc.mtime = got.modified;
    const source = `<p class="meta pdf-source">Source: <a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(new URL(url).hostname)}</a></p>`;
    return { ...result, html: source + result.html };
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}
