// End-to-end checks: phone layouts, offline crawl, search, install and update.
// Usage: NODE_PATH=<folder with playwright> node test/e2e.cjs <sample content folder>
const { chromium, devices } = require('playwright');
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const JSZip = require('jszip');

const appDir = path.resolve(__dirname, '..');
const sample = path.resolve(process.argv[2] || '../fog-sample/sample-content');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'fog-test-'));
const content = path.join(work, 'content');
const dist = path.join(work, 'dist');
const PORT = 8047;
const base = `http://localhost:${PORT}/`;
const FONT = 'body,input,button{font-family:"Liberation Sans",sans-serif !important}';

let failures = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ` (${detail})` : ''}`);
};
const build = () => execFileSync('node', [path.join(appDir, 'build/build.mjs'), content, dist], { stdio: 'pipe' }).toString();

async function editDocx(file, from, to) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const xml = await zip.file('word/document.xml').async('string');
  if (!xml.includes(from)) throw new Error(`"${from}" not found in ${file}`);
  zip.file('word/document.xml', xml.replace(from, to));
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer' }));
}

const openSearch = async (page) => {
  if (!(await page.locator('#q').isVisible())) await page.click('#search-toggle');
};
const saved = (page) => page.waitForFunction(() => /now works without/.test(document.getElementById('toast').textContent), null, { timeout: 60000 });

(async () => {
  // ----- Test content: the sample plus awkward cases -----
  fs.cpSync(sample, content, { recursive: true });
  const anyDoc = path.join(content, '01 Safety/01 Fatigue/Fatigue.docx');
  const deep = path.join(content, '27 Deep ∕ Nested꞉ a very long section name to check wrapping/01 Level two/01 Level three');
  fs.mkdirSync(deep, { recursive: true });
  fs.copyFileSync(anyDoc, path.join(deep, '01 First document.docx'));
  fs.copyFileSync(anyDoc, path.join(deep, '02 Second document.docx'));
  fs.writeFileSync(path.join(deep, '03 Broken document.docx'), 'not a real document');
  fs.writeFileSync(path.join(deep, 'broken picture.png'), 'not a picture');
  fs.writeFileSync(path.join(deep, '~$First document.docx'), 'lock file');
  fs.writeFileSync(path.join(deep, 'cover.jpg'), 'old cover');
  fs.writeFileSync(
    path.join(content, '27 Deep ∕ Nested꞉ a very long section name to check wrapping/icon.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" onload="alert(1)"><script>alert(1)</script><foreignObject><b>x</b></foreignObject><a href="javascript:alert(1)"><circle cx="12" cy="12" r="9" fill="red"/></a></svg>',
  );
  {
    const file = path.join(content, '02 First Aid/08 Asthma/Asthma.docx');
    const zip = await JSZip.loadAsync(fs.readFileSync(file));
    const xml = await zip.file('word/document.xml').async('string');
    zip.file('word/document.xml', xml.replace(/<w:body>/, '<w:body><w:p><w:r><w:t xml:space="preserve">Editor note: EDNOTECHECK keep this short.</w:t></w:r></w:p><w:p><w:r><w:rPr><w:vanish/></w:rPr><w:t>HIDDENCHECK</w:t></w:r><w:r><w:t>Visible after hidden.</w:t></w:r></w:p>'));
    fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer' }));
  }
  const report = build();
  {
    const page = fs.readFileSync(path.join(dist, 'first-aid/asthma/index.html'), 'utf8');
    const search = fs.readFileSync(path.join(dist, 'search.json'), 'utf8');
    check(!/EDNOTECHECK|HIDDENCHECK/.test(page + search) && page.includes('Visible after hidden.'), 'editor notes and hidden text stay out of the site and search');
  }
  check(/3 warnings|[1-9] warning/.test(report), 'bad files are skipped with warnings', report.trim().split('\n').pop());
  const icon = fs.readdirSync(path.join(dist, 'icons')).find((f) => /^s-.*\.svg$/.test(f));
  const iconText = icon ? fs.readFileSync(path.join(dist, 'icons', icon), 'utf8') : '';
  check(icon && !/script|foreignObject|onload|javascript:/i.test(iconText), 'unsafe SVG content is removed from icons');

  const server = spawn('node', [path.join(appDir, 'server/serve.mjs'), dist, String(PORT), '127.0.0.1'], { env: { ...process.env, FOG_LOG: '1' } });
  let log = [];
  server.stdout.on('data', (d) => log.push(...d.toString().split('\n').filter((l) => l.startsWith('GET'))));
  await new Promise((r) => setTimeout(r, 600));

  const browser = await chromium.launch();
  const files = Object.keys(JSON.parse(fs.readFileSync(path.join(dist, 'sw.js'), 'utf8').match(/const FILES = (\{.*?\});/s)[1]));
  const pages = files.filter((f) => f.endsWith('index.html')).map((f) => f.replace(/index\.html$/, ''));

  // ----- Phones: offline crawl, layout, search -----
  for (const name of ['iPhone 13', 'Pixel 7']) {
    const context = await browser.newContext({ ...devices[name] });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base);
    await saved(page);
    check(await page.locator('#install').isVisible(), `${name}: download icon is shown in the browser`);
    const sizes = await page.evaluate(() => [...document.querySelectorAll('.entries > li')].map((li) => li.className.match(/entry-(md|lg|xl)/)[1]).join(''));
    check(/xl/.test(sizes) && /lg/.test(sizes) && /md/.test(sizes), `${name}: home entries have three sizes`);

    await context.setOffline(true);
    let bad = [];
    for (const p of pages) {
      const response = await page.goto(base + p);
      const state = await page.evaluate(async () => {
        const images = [...document.images];
        images.forEach((img) => (img.loading = 'eager'));
        await Promise.all(images.map((img) => img.decode().catch(() => {})));
        return {
          h1: !!document.querySelector('h1'),
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          brokenImages: images.filter((img) => !img.naturalWidth).length,
          back: document.querySelector('.bar-back, .brand') !== null,
          home: document.body.classList.contains('home') || !!document.querySelector('.bar a[aria-label="Home"]'),
          notice: !document.getElementById('offline').hidden,
        };
      });
      if (response.status() !== 200 || !state.h1 || state.overflow > 0 || state.brokenImages || !state.back || !state.home || !state.notice) bad.push(`${p} ${response.status()} ${JSON.stringify(state)}`);
    }
    check(bad.length === 0, `${name}: all ${pages.length} pages load offline, fit the screen and show the offline notice`, bad.slice(0, 3).join(' | '));

    // Every link on a deep page resolves
    await page.goto(base + pages.find((p) => p.split('/').length > 4));
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => h.startsWith(location.origin)));
    let broken = [];
    for (const link of new Set(links.map((l) => l.split('#')[0]))) {
      const r = await page.request.fetch(link).catch(() => null); // direct request is offline too; use navigation instead
      if (r) continue;
      const nav = await page.goto(link);
      if (nav.status() !== 200) broken.push(link);
    }
    check(broken.length === 0, `${name}: links on a nested page work offline`, broken.join(' '));

    // Search
    await page.goto(base);
    check(await page.locator('#search-toggle').isVisible(), `${name}: search icon in the header`);
    check(await page.locator('#q').isHidden(), `${name}: search bar stays hidden until the icon is tapped`);
    const titles = await page.$$eval('.entry-title', (els) => els.map((e) => e.textContent));
    check(titles.join('|') === [...titles].sort((a, b) => a.localeCompare(b, 'en-AU', { numeric: true, sensitivity: 'base' })).join('|'), `${name}: home entries in alphabetical order`);
    const search = async (q) => {
      await openSearch(page);
      await page.fill('#q', q);
      await page.waitForFunction((q) => !document.getElementById('results').hidden && location.hash === '#q=' + encodeURIComponent(q), q);
      await page.waitForTimeout(250);
      return page.evaluate(() => ({
        count: document.querySelectorAll('.result').length,
        first: document.querySelector('.result-title')?.textContent || '',
        where: document.querySelector('.result-where')?.textContent || '',
        marks: document.querySelectorAll('.result mark').length,
        text: document.querySelector('.result-text')?.textContent || '',
      }));
    };
    const exact = await search('tourniquet');
    check(exact.count > 0 && exact.marks > 0 && exact.text.length > 20, `${name}: offline full-text search with highlighted snippet`, `${exact.count} results, first "${exact.first}"`);
    const fuzzy = await search('anaphylaxsis');
    check(/Anaphylaxis/.test(fuzzy.first) && /First Aid/.test(fuzzy.where), `${name}: fuzzy search finds Anaphylaxis with its location`, `${fuzzy.first} | ${fuzzy.where}`);
    const prefix = await search('hypoth');
    check(/Hypothermia/.test(prefix.first), `${name}: prefix search`, prefix.first);
    await page.locator('.result').first().click();
    await page.waitForLoadState();
    check((await page.locator('h1').textContent()).includes('Hypothermia'), `${name}: a search result opens its page`);
    await page.goBack();
    await page.waitForFunction(() => document.querySelectorAll('.result').length > 0);
    check(true, `${name}: going back restores the search`);

    // Search from an inner page
    await page.goto(base + 'safety/');
    await page.click('#search-toggle');
    await page.fill('#q', 'hypoth');
    await page.waitForFunction(() => document.querySelectorAll('.result').length > 0);
    check(await page.locator('#content').isHidden(), `${name}: search works from inside a section`);

    // Section filter
    await page.goto(base + 'first-aid/');
    await page.fill('#filter', 'cardio');
    const shown = await page.locator('#topics > li:visible').count();
    await page.fill('#filter', '');
    const topicTitles = await page.$$eval('.topic-title', (els) => els.map((e) => e.textContent));
    check(topicTitles.join('|') === [...topicTitles].sort((a, b) => a.localeCompare(b, 'en-AU', { numeric: true, sensitivity: 'base' })).join('|'), `${name}: topics inside a section in alphabetical order`);
    check(shown === 4, `${name}: section filter narrows 45 topics`, `${shown} shown`);
    check((await page.locator('#filter').count()) === 1 && (await page.goto(base + 'safety/')) && (await page.locator('#filter').count()) === 0, `${name}: filter only on long sections`);

    // Contents list, colours, full-screen picture
    await page.goto(base + 'map-reading-and-navigation/navigation/');
    await page.locator('.prose img').first().click();
    check(await page.locator('dialog.viewer[open] img').isVisible(), `${name}: tapping a picture shows it full screen`);
    await page.locator('.viewer-close').click();
    check((await page.locator('.gallery img').count()) === 1, `${name}: folder pictures are shown below a single document`);
    await page.goto(base + 'safety/bushfire-safety/');
    const colours = await page.evaluate(() => ({
      cell: getComputedStyle(document.querySelector('td[style]')).backgroundColor,
      text: getComputedStyle(document.querySelector('.prose span[style*="color"]')).color,
      scroll: !!document.querySelector('.table-scroll > table'),
    }));
    check(colours.cell === 'rgb(183, 228, 168)' && colours.text === 'rgb(192, 0, 0)' && colours.scroll, `${name}: text colour and cell shading are kept`, JSON.stringify(colours));

    // Unknown address
    const missing = await page.goto(base + 'no/such/page/');
    check(missing.status() === 404 && /Page not found/.test(await page.content()), `${name}: unknown address shows "Page not found" offline`);
    await page.click('#home');
    await page.waitForLoadState();
    check(page.url() === base, `${name}: the link on that page goes home`);
    await page.goto(base + 'first-aid');
    check(page.url() === base + 'first-aid/', `${name}: address without a trailing slash still opens`);

    // Broken document
    const brokenDoc = pages.find((p) => p.includes('broken-document'));
    await page.goto(base + brokenDoc);
    check(/could not be displayed/.test(await page.locator('.prose').textContent()), `${name}: a broken document shows a short message`);

    if (name === 'iPhone 13') {
      await page.goto(base);
      await page.click('#install');
      check(/Add to Home Screen/.test(await page.locator('dialog.sheet').textContent()), `${name}: download icon shows the Add to Home Screen steps`);
    }
    check(errors.length === 0, `${name}: no script errors`, errors.join('; '));
    await context.setOffline(false);
    await context.close();
  }

  // ----- Online 404 -----
  {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    const r = await page.goto(base + 'no/such/page/');
    check(r.status() === 404 && /Page not found/.test(await page.content()), 'unknown address shows "Page not found" online');
    check(await page.locator('#home').isVisible(), 'the page has a link home');
    await context.close();
  }

  // ----- Install -----
  {
    const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const dpage = await desktop.newPage();
    await dpage.goto(base);
    await saved(dpage);
    check(await dpage.locator('#install').isHidden(), 'download icon is hidden on desktop');
    await dpage.goto(base + 'first-aid/burns/');
    const pos = await dpage.evaluate(() => ({ bar: document.querySelector('.bar-in').getBoundingClientRect().bottom, search: document.getElementById('q').getBoundingClientRect().top }));
    check((await dpage.locator('#q').isVisible()) && (await dpage.locator('#search-toggle').isHidden()) && pos.search > pos.bar, 'desktop: search bar below the header on every page, no search icon', JSON.stringify(pos));
    await dpage.goto(base);
    const cdp = await desktop.newCDPSession(dpage);
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
    check(installabilityErrors.length === 0, 'no installability errors', JSON.stringify(installabilityErrors));
    const manifest = await cdp.send('Page.getAppManifest');
    check(manifest.errors.length === 0 && /"short_name": "FOG"/.test(manifest.data), 'manifest is valid');
    await desktop.close();

    const phone = await browser.newContext({ ...devices['Pixel 7'] });
    const ppage = await phone.newPage();
    await ppage.addInitScript(() => {
      const real = window.matchMedia.bind(window);
      window.matchMedia = (q) => (q.includes('display-mode: standalone') ? { matches: true, addEventListener() {} } : real(q));
    });
    await ppage.goto(base);
    check(await ppage.locator('#install').isHidden(), 'download icon is hidden inside the installed app');
    await phone.close();
  }

  // ----- Update -----
  {
    const context = await browser.newContext({ ...devices['Pixel 7'] });
    const page = await context.newPage();
    await page.goto(base);
    await saved(page);
    await page.goto(base + 'first-aid/burns/');
    const before = await page.locator('.prose').textContent();
    const word = before.match(/[A-Z][a-z]{5,}/)[0];
    await context.close();

    // Same device comes back later: keep storage by reusing a persistent profile
    const profile = path.join(work, 'profile');
    const persistent = await chromium.launchPersistentContext(profile, { ...devices['Pixel 7'] });
    const p2 = persistent.pages()[0] || (await persistent.newPage());
    await p2.goto(base);
    await saved(p2);
    await p2.goto(base + 'first-aid/burns/');

    await editDocx(path.join(content, '02 First Aid/11 Burns/Burns.docx'), word, 'Zebracrossing');
    build();
    log = [];
    await p2.goto(base + 'first-aid/burns/'); // reopen while online
    await p2.waitForFunction(() => /has been updated/.test(document.getElementById('toast').textContent), null, { timeout: 30000 });
    check(true, 'update: the user is told the guide has been updated');
    check((await p2.locator('.prose').textContent()).includes('Zebracrossing'), 'update: the new text appears');
    const fetched = [...new Set(log.map((l) => l.slice(4)))].filter((u) => u !== '/sw.js');
    check(fetched.length > 0 && fetched.length <= 4 && fetched.includes('/first-aid/burns/'), 'update: only changed files are downloaded', fetched.join(' '));
    await persistent.setOffline(true);
    await p2.goto(base);
    await p2.goto(base + 'first-aid/burns/');
    check((await p2.locator('.prose').textContent()).includes('Zebracrossing'), 'update: the new text stays available offline');
    await p2.goto(base);
    await openSearch(p2);
    await p2.fill('#q', 'zebracrossing');
    await p2.waitForFunction(() => document.querySelectorAll('.result').length > 0);
    check(true, 'update: offline search finds the new text');
    await persistent.close();
  }

  await browser.close();
  server.kill();
  fs.rmSync(work, { recursive: true, force: true });
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
