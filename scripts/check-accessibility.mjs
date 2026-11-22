import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const path of ['/', '/new', '/interiors', '/projects', '/contact']) {
    await page.goto(`http://127.0.0.1:5173${path}`);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    console.log(
      path,
      JSON.stringify(
        violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
      ),
    );
    if (violations.length) process.exitCode = 1;
  }
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('button', { name: 'Home concept', exact: false }).click();
  for (let i = 0; i < 4; i++)
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Create my concept' }).click();
  await page.waitForURL('**/design/**');
  for (const view of ['2D concept', 'Design notes', 'Interior direction', 'Revision dialog']) {
    if (view === 'Revision dialog')
      await page.getByRole('button', { name: 'Edit & regenerate' }).click();
    else await page.getByRole('tab', { name: view, exact: true }).click();
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    console.log(
      view,
      JSON.stringify(
        violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
      ),
    );
    if (violations.length) process.exitCode = 1;
  }
} finally {
  await browser.close();
}
