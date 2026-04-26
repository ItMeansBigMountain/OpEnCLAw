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
  const projectSummaryMetrics = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('#projectPortfolioSummary .micro-card')).map((card) => {
      const label = (card.querySelector('span')?.textContent || '').trim();
      const value = (card.querySelector('strong')?.textContent || '').trim();
      return { label, value };
    });
  });
  const activeProjectsMetric = projectSummaryMetrics.find((metric) => /active projects/i.test(metric.label));
  expect(activeProjectsMetric).toBeTruthy();
  expect(Number(activeProjectsMetric.value)).toBeGreaterThan(0);

  await expect(page.locator('.tab-nav .tab-btn[data-tab="approvals"]')).toHaveCount(0);

  await openTab(page, 'office', /^Office$/);
  await expect(page.locator('#officeCanvas')).toBeVisible();
  await expect(page.locator('#officeActivityList')).toBeVisible();
  await expect(page.locator('#companyWorkflowPanel')).toBeVisible();
  await expect(page.locator('#companyWorkflowPanel')).toContainText(/Loop work at a glance|No workflow mirror yet|Workflow chart|Org chart/i);
  await expect(page.locator('#openclawManagedRuntimePanel')).toBeVisible();
  await expect(page.locator('#openclawManagedRuntimePanel')).toContainText(/OpenClaw-managed runtime|No managed runtime mirror yet|Runtime software map|Active OpenClaw shells/i);
  await expect(page.locator('#liveConsoleList')).toHaveCount(0);
  await page.locator('#officeCanvas .office-avatar').first().click({ force: true });
  await expect(page.locator('#agentDrawer')).toHaveClass(/open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#agentDrawer')).not.toHaveClass(/open/);

  await openTab(page, 'context-files', /^Context Files$/);
  await expect(page.locator('#contextFilesList')).toBeVisible();
  await expect(page.locator('#contextFilesDetail')).toBeVisible();
  await expect(page.locator('.tab-nav .tab-btn[data-tab="conversations"]')).toHaveCount(0);

  await openTab(page, 'gitops', /^GitOps$/);
  await expect(page.locator('#gitPushStatus')).toBeVisible();
  await expect(page.locator('#gitPushStatus')).toContainText(/Working tree|Changed files|In repo \/ external|Untracked|Local-only commits|Tracking branch|Remote risk|Repo scope|Current worktree|Repo root|Scope mode|Worktree path|Worktrees|Worktree preview|Current in preview|Current position|Preview order|Preview status|Hidden worktrees|Additional worktrees/i);
  await expect(page.locator('#gitLogList')).toBeVisible();
  await expect(page.locator('#gitLogList')).toContainText(/Working tree status/i);
  await expect(page.locator('#gitLogList')).toContainText(/Local-only commits|Pushed history/i);
  await expect(page.locator('#gitPushStatus')).toContainText(/Single reflected worktree in scope|additional reflected worktree/i);
  await expect(page.locator('#gitPushStatus')).toContainText(/Showing \d+ of \d+ reflected worktree|No reflected worktrees available/i);
  await expect(page.locator('#gitPushStatus')).toContainText(/Worktree preview\s*\d+\s*\/\s*\d+/i);
  await expect(page.locator('#gitPushStatus')).toContainText(/Current in preview\s*(Yes|No)/i);
  await expect(page.locator('#gitPushStatus')).toContainText(/Current position\s*(\d+\s*\/\s*\d+|Not shown)/i);
  await expect(page.locator('#gitPushStatus')).toContainText(/Preview order\s*(Current-first|Reflected order)/i);
  await expect(page.locator('#gitPushStatus')).toContainText(/Preview status\s*(Complete|Truncated)/i);
  await expect(page.locator('#gitPushStatus')).toContainText(/Scope mode\s*(Repo root|Linked worktree|Unknown)/i);
  await expect(page.locator('#gitPushStatus')).toContainText(/is linked to repo root|Current scope is the repo root|relationship unavailable from reflected scope/i);
  await expect(page.locator('#gitLogList')).toContainText(/Worktree detail \(\d+\s*\/\s*\d+ shown\): \[current\]|Worktree detail|\[current\]|current reflected worktree included at \d+\s*\/\s*\d+|current reflected worktree not shown|\+\d+ more reflected worktree|all reflected worktrees shown|Staged files|Unstaged files|Untracked files|External changes|No staged, unstaged, or untracked file changes/i);
  await expect(page.locator('#gitLogList')).toContainText(/external changes outside the project path|No staged, unstaged, or untracked file changes/i);
  await expect(page.locator('#gitLogList')).not.toContainText('No git history available.');

  await openTab(page, 'api-inventory', /^API Inventory$/);
  await expect(page.locator('#apiInventoryList')).toBeVisible();
  await expect(page.locator('#apiInventoryList')).toContainText('openai');
  await expect(page.locator('#apiInventoryList')).toContainText('Discord');

  await openTab(page, 'email-ops', /^Email Ops$/);
  await expect(page.locator('#emailWorkflowDetail')).toContainText('sent-mail audit');
});
