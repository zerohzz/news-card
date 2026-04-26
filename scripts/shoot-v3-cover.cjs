const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const htmlPath = path.resolve('output/2026-04-21_20-53-06/slides/page-0-v3-cover.html');
  await page.goto('file:///' + htmlPath.split(path.sep).join('/'));
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  const lineHeights = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.ct-line')).map((el) => el.offsetHeight)
  );
  console.log('ct-line heights:', lineHeights);

  const screenshotPath = path.resolve('output/2026-04-21_20-53-06/images/page-0-v3-cover.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Saved', screenshotPath);

  await browser.close();

  const wrapped = lineHeights.some((h) => h > 83);
  if (wrapped) {
    console.error('LINE WRAP DETECTED');
    process.exit(1);
  }
})();
