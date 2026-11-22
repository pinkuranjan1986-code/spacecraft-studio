import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
async function create(page: Page, type = 'Home') {
  await page.goto('/new');
  await page.getByRole('button', { name: new RegExp(`^${type} `) }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('City', { exact: true }).fill('Bengaluru');
  await page.getByLabel('Locality', { exact: true }).fill('Whitefield');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('How should we consider').selectOption('prioritize');
  await page.getByLabel('Kitchen toward east').check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Create my concept' }).click();
  await expect(page).toHaveURL(/\/design\//);
}
for (const type of [
  'Home',
  'Office',
  'Warehouse',
  'Shop & commercial',
  'Custom space',
  'Interior only',
])
  test(`complete ${type} brief and view concept`, async ({ page }) => {
    await create(page, type);
    await expect(page.getByRole('img', { name: /draft concept layout/ }).first()).toBeVisible();
    await expect(page.getByText('Requested & allocated space')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
test('edit, version, export, consultation and project lifecycle', async ({ page }) => {
  await create(page);
  await page.getByRole('button', { name: 'Edit & regenerate' }).click();
  await page.getByLabel('Space 1 name', { exact: true }).fill('Family lounge');
  await page.getByRole('button', { name: 'Save revised concept' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('cell', { name: 'Family lounge' })).toBeVisible();
  await expect(page.getByLabel('Concept version')).toHaveValue('1');
  const svg = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export SVG' }).click();
  expect((await svg).suggestedFilename()).toMatch(/\.svg$/);
  const json = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON', exact: true }).click();
  expect((await json).suggestedFilename()).toMatch(/\.json$/);
  await page.getByRole('tab', { name: 'Design notes' }).click();
  await expect(page.getByRole('heading', { name: 'Vastu preference check' })).toBeVisible();
  await page.getByRole('tab', { name: 'Interior direction' }).click();
  await expect(page.getByText('Furniture direction', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Request consultation', exact: true }).click();
  await page.getByLabel('Your name').fill('Demo Customer');
  await page.getByLabel('Email address').fill('customer@example.com');
  await page.getByLabel('I consent').check();
  await page.getByRole('button', { name: 'Save demo request' }).click();
  await expect(page.getByText('No designer was notified.', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Back to projects' }).click();
  await page.getByRole('button', { name: /Rename My home/ }).click();
  await page.getByLabel('New project name').fill('My renamed home');
  await page.getByRole('button', { name: 'Save name' }).click();
  await expect(page.getByRole('heading', { name: 'My renamed home' })).toBeVisible();
  await page.reload();
  await page.getByRole('link', { name: 'Open My renamed home' }).click();
  await expect(page.getByRole('heading', { name: 'My renamed home' })).toBeVisible();
  await page.goto('/projects');
  await page.getByRole('button', { name: 'Delete My renamed home', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page.getByText('Your next space starts here.')).toBeVisible();
});
test('validation, draft recovery, interiors and navigation', async ({ page, isMobile }) => {
  await page.goto('/new');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText('Enter a city', { exact: true })).toBeVisible();
  await page.getByLabel('City', { exact: true }).fill('Pune');
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('City', { exact: true })).toHaveValue('Pune');
  await page.goto('/interiors');
  await page.getByLabel('Room type').selectOption('office');
  await page.getByRole('button', { name: 'Earth & texture' }).click();
  await expect(page.getByText('Timber-look desks')).toBeVisible();
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'My projects' }).click();
  await expect(page).toHaveURL('/projects');
});
test('public service metadata and print view', async ({ page }) => {
  await page.goto('/services/bengaluru/whitefield');
  await expect(page).toHaveTitle(/Whitefield/);
  await expect(page.getByText(/availability is not confirmed/)).toBeVisible();
  await create(page);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(page.locator('.print-notes')).toBeVisible();
});

test('irregular envelope, local reference, multiple floors and keyboard editing', async ({
  page,
}) => {
  await page.goto('/new');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('City', { exact: true }).fill('Pune');
  await page.getByLabel('Locality', { exact: true }).fill('Wagholi');
  await page.getByLabel('Plot / room shape').selectOption('irregular');
  await page.getByLabel('Number of floors').fill('2');
  await page.getByLabel('I confirm these dimensions').check();
  await page.getByLabel('Reference plan or plot image').setInputFiles({
    name: 'reference.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aLs8AAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(
    page.getByAltText('Your reference, preview only; not used to calculate geometry'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Floor', { exact: true }).nth(2).selectOption('1');
  await page.getByLabel('Floor', { exact: true }).nth(3).selectOption('1');
  await page.getByLabel('Floor', { exact: true }).nth(4).selectOption('1');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Quiet minimal' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Create my concept' }).click();
  await expect(page).toHaveURL(/\/design\//);
  await page.getByLabel('Viewing').selectOption('1');
  await expect(page.getByRole('img', { name: /floor 2, draft/ })).toBeVisible();
  await page.getByRole('button', { name: 'Zoom in plan' }).click();
  await expect(page.getByText('125%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit & regenerate' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit & regenerate' })).toBeFocused();
  await page.getByRole('tab', { name: '2D concept' }).focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Design notes' })).toBeFocused();
  await expect(
    page
      .getByRole('tabpanel', { name: 'Design notes' })
      .getByText(/actual irregular boundary has not been surveyed/),
  ).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.print-floors section')).toHaveCount(2);
});

test('exported JSON imports as a separate project', async ({ page }) => {
  await create(page);
  const original = page.url();
  const backup = await page.evaluate(
    () => JSON.parse(localStorage.getItem('spacecraft-studio:v1')!).projects[0],
  );
  await page.goto('/projects');
  await page.getByLabel('Import project JSON file').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ project: backup })),
  });
  await expect(page.getByRole('heading', { name: /\(imported\)/ })).toBeVisible();
  expect(await page.locator('.project-card').count()).toBe(2);
  await page.getByRole('link', { name: /Open .*\(imported\)/ }).click();
  expect(page.url()).not.toBe(original);
});
