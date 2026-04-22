const { test, expect } = require('@playwright/test');

async function openTab(page, panelId, fallbackNamePattern) {
  const clicked = await page.evaluate(({ panelId, pattern }) => {
    const buttons = Array.from(document.querySelectorAll('.tab-nav .tab-btn'));
    const byTarget = buttons.find((button) => button.dataset.tab === panelId);
    if (byTarget) {
      byTarget.click();
      return true;
    }
    const regex = pattern ? new RegExp(pattern, 'i') : null;
    const byText = regex
      ? buttons.find((button) => regex.test((button.textContent || '').trim()))
      : null;
    if (byText) {
      byText.click();
      return true;
    }
    return false;
  }, { panelId, pattern: fallbackNamePattern?.source || null });

  expect(clicked).toBeTruthy();
  await expect(page.locator(`#${panelId}`)).toBeVisible();
}

test('mission control loads key operating surfaces', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Mission Control', exact: true })).toBeVisible();

  await openTab(page, 'stats', /^Stats$/);
  await expect(page.locator('#checkingInCard')).toBeVisible();
  await expect(page.locator('#checkingInCard')).toContainText('mission-control-project');

  await openTab(page, 'dashboard', /^Tasks$/);
  await expect(page.locator('#projectCards')).toBeVisible();
  await expect(page.locator('#projectCards')).toContainText(/mission-control-project|Mission Control/i);

  await openTab(page, 'approvals', /^Approvals/);
  await expect(page.locator('#approvalGateList')).toBeVisible();
  await expect(page.locator('#approvedLogList')).toBeVisible();
  await expect(page.locator('#deniedLogList')).toBeVisible();
  await expect(page.locator('#approvalGateList')).toContainText(/Critical review:|Execution approval substrate|Gateway security review required|Suspicious config audit event requires review|No active approval gates\./);

  await openTab(page, 'office', /^Office$/);
  await expect(page.locator('#officeCanvas')).toBeVisible();
  await expect(page.locator('#liveConsoleList')).toBeVisible();
  await page.locator('#officeCanvas .office-avatar').first().click({ force: true });
  await expect(page.locator('#agentDrawer')).toHaveClass(/open/);
  await page.locator('#agentDrawerBackdrop').click({ force: true });
  await expect(page.locator('#agentDrawer')).not.toHaveClass(/open/);

  await openTab(page, 'context-files', /^Context Files$/);
  await expect(page.locator('#contextFilesList')).toBeVisible();
  await expect(page.locator('#contextFilesDetail')).toBeVisible();
  await expect(page.locator('.tab-nav .tab-btn[data-tab="conversations"]')).toHaveCount(0);

  await openTab(page, 'gitops', /^GitOps$/);
  await expect(page.locator('#gitPushStatus')).toBeVisible();
  await expect(page.locator('#gitLogList')).toBeVisible();
  await expect(page.locator('#gitLogList')).not.toContainText('No git history available.');

  await openTab(page, 'api-inventory', /^API Inventory$/);
  await expect(page.locator('#apiInventoryList')).toBeVisible();
  await expect(page.locator('#apiInventoryList')).toContainText('openai');
  await expect(page.locator('#apiInventoryList')).toContainText('Discord');

  await openTab(page, 'email-ops', /^Email Ops$/);
  await expect(page.locator('#emailWorkflowDetail')).toContainText('sent-mail audit');
});
