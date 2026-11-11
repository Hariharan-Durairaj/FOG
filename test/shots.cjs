// Screenshots for visual checks.  Usage: node test/shots.cjs <base url> <out dir>
const { chromium, devices } = require('playwright');
const base = process.argv[2] || 'http://localhost:8043/';
const out = process.argv[3] || 'shots';
const pages = (process.argv[4] || '').split(',').filter(Boolean);
const list = pages.length ? pages.map((p) => (p === 'home' ? '' : p)) : ['', 'first-aid/', 'safety/bushfire-safety/', 'map-reading-and-navigation/navigation/', 'storm-and-water-damage/sandbag-wall-tables/'];
(async () => {
  const browser = await chromium.launch();
  for (const [name, device] of [['iphone', devices['iPhone 13']], ['pixel', devices['Pixel 7']]]) {
    const context = await browser.newContext({ ...device, serviceWorkers: 'block' });
    const page = await context.newPage();
    for (const p of list) {
      await page.goto(base + p);
      await page.addStyleTag({ content: 'body,input,button{font-family:"Liberation Sans",sans-serif !important}' });
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${out}/${name}-${(p || 'home').replace(/\W+/g, '_')}.png`, fullPage: true });
    }
    await context.close();
  }
  await browser.close();
})();
