const { test, expect } = require('@playwright/test');

test('mission control loads key operating surfaces', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Mission Control', exact: true })).toBeVisible();

  await page.locator('.tab-nav').getByRole('button', { name: 'Approvals', exact: true }).click();
  await expect(page.locator('#approvalGateList')).toBeVisible();
  await expect(page.locator('#approvalGateList')).toContainText('External email sending');

  await page.locator('.tab-nav').getByRole('button', { name: 'API Inventory', exact: true }).click();
  await expect(page.locator('#apiInventoryList')).toBeVisible();
  await expect(page.locator('#apiInventoryList')).toContainText('Anthropic');
  await expect(page.locator('#apiInventoryList')).toContainText('OpenAI');

  await page.locator('.tab-nav').getByRole('button', { name: 'Agents', exact: true }).click();
  await expect(page.locator('#agentGrid')).toBeVisible();
  await expect(page.locator('#agentGrid')).toContainText('Sosai');
  await expect(page.locator('#agentGrid')).toContainText('Watchtower');

  await page.locator('.tab-nav').getByRole('button', { name: 'Office', exact: true }).click();
  await expect(page.locator('#officeCanvas')).toBeVisible();
  await expect(page.locator('#liveConsoleList')).toBeVisible();
});
