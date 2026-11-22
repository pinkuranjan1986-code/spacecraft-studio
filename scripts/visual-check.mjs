import { chromium, devices } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('test-results/visual', { recursive: true });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/');
  await page.screenshot({ path: 'test-results/visual/landing-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Home concept', exact: false }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Create my concept' }).click();
  await page.waitForURL('**/design/**');
  await page.screenshot({ path: 'test-results/visual/concept-desktop.png', fullPage: true });
  await page.pdf({
    path: 'test-results/visual/concept-print.pdf',
    format: 'A4',
    printBackground: true,
  });
  const mobile = await browser.newPage({ ...devices['iPhone 13'] });
  await mobile.goto('http://127.0.0.1:5173/');
  await mobile.screenshot({ path: 'test-results/visual/landing-mobile.png', fullPage: true });
  console.log(
    JSON.stringify({
      pageErrors: errors,
      desktopOverflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      mobileOverflow: await mobile.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    }),
  );
} finally {
  await browser.close();
}
