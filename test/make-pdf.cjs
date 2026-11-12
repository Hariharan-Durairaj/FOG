// Writes a small 3-page PDF for tests.  Usage: node test/make-pdf.cjs <out.pdf>
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`<style>body{font:14pt Arial;margin:0}section{page-break-after:always;padding:20mm}h1{color:#14213d}td,th{border:1px solid #888;padding:6px}</style>
<section><h1>Flood Response Card</h1><p>PDFCHECKWORD Check the river height before deploying crews.</p>
<table><tr><th>Level</th><th>Action</th></tr><tr><td style="background:#b7e4a8">Minor</td><td>Monitor</td></tr><tr><td style="background:#f8a13f">Major</td><td>Evacuate low areas</td></tr></table></section>
<section><h1>Page two</h1><svg width="300" height="160"><rect width="300" height="160" fill="#f76707"/><circle cx="150" cy="80" r="50" fill="#14213d"/></svg><p>Second page text.</p></section>
<section><h1>Page three</h1><p>LASTPAGEWORD End of card.</p></section>`);
  await page.pdf({ path: process.argv[2], format: 'A4', printBackground: true });
  await browser.close();
})();
