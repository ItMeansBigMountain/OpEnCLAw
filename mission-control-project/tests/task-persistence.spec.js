const { test, expect } = require('@playwright/test');

async function openTasksTab(page) {
  await page.goto('/');
  await page.locator('.tab-btn[data-tab="dashboard"]').click();
  await expect(page.locator('#dashboard')).toBeVisible();
}

async function readServerState(page) {
  return page.evaluate(async () => {
    const response = await fetch('/mc/data');
    return response.json();
  });
}

async function writeServerState(page, state) {
  await page.evaluate(async (payload) => {
    await fetch('/mc/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }, state);
}

test('task create/edit/delete persists across reload and hydration', async ({ page }) => {
  const unique = `Task persistence ${Date.now()}`;
  const initialDescription = 'Created by Playwright persistence regression test.';
  const updatedDescription = 'Updated by Playwright persistence regression test.';
  let createdTaskId = null;

  try {
    await openTasksTab(page);

    await page.locator('#quickAddProjectBtn').click();
    await page.locator('#taskModalBackdrop').waitFor({ state: 'visible' });
    await page.locator('#taskTitle').fill(unique);
    await page.locator('#taskDescription').fill(initialDescription);
    await page.locator('#taskPriority').selectOption('medium');
    await page.locator('#taskColumn').selectOption('backlog');
    await page.locator('#taskForm').getByRole('button', { name: 'Save Task', exact: true }).click();
    await page.locator('#taskModalBackdrop').waitFor({ state: 'hidden' });

    await expect(page.locator('#taskList-backlog .task-card', { hasText: unique })).toHaveCount(1);

    let serverState = await readServerState(page);
    let createdTask = (serverState.tasks || []).find((task) => task.title === unique);
    expect(createdTask).toBeTruthy();
    createdTaskId = createdTask.id;
    expect(createdTask.description).toBe(initialDescription);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await openTasksTab(page);
    await expect(page.locator('#taskList-backlog .task-card', { hasText: unique })).toHaveCount(1);

    await page.locator('#taskList-backlog .task-card', { hasText: unique }).first().click();
    await page.locator('#taskModalBackdrop').waitFor({ state: 'visible' });
    await expect(page.locator('#taskDescription')).toHaveValue(initialDescription);
    await page.locator('#taskDescription').fill(updatedDescription);
    await page.locator('#taskColumn').selectOption('in-progress');
    await page.locator('#taskForm').getByRole('button', { name: 'Save Task', exact: true }).click();
    await page.locator('#taskModalBackdrop').waitFor({ state: 'hidden' });

    await expect(page.locator('#taskList-in-progress .task-card', { hasText: unique })).toHaveCount(1);
    await expect(page.locator('#taskList-backlog .task-card', { hasText: unique })).toHaveCount(0);

    serverState = await readServerState(page);
    createdTask = (serverState.tasks || []).find((task) => task.id === createdTaskId);
    expect(createdTask).toBeTruthy();
    expect(createdTask.description).toBe(updatedDescription);
    expect(createdTask.column).toBe('in-progress');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await openTasksTab(page);
    await expect(page.locator('#taskList-in-progress .task-card', { hasText: unique })).toHaveCount(1);

    await page.locator('#taskList-in-progress .task-card', { hasText: unique }).first().click();
    await page.locator('#taskModalBackdrop').waitFor({ state: 'visible' });
    await page.locator('#deleteTaskBtn').click();
    await page.locator('#taskModalBackdrop').waitFor({ state: 'hidden' });

    await expect(page.locator('.task-card', { hasText: unique })).toHaveCount(0);

    await page.waitForTimeout(16000);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await openTasksTab(page);
    await expect(page.locator('.task-card', { hasText: unique })).toHaveCount(0);

    serverState = await readServerState(page);
    expect((serverState.tasks || []).some((task) => task.id === createdTaskId)).toBeFalsy();
    expect(serverState.deletedTaskIds || []).toContain(createdTaskId);
  } finally {
    if (createdTaskId) {
      const serverState = await readServerState(page);
      serverState.tasks = Array.isArray(serverState.tasks) ? serverState.tasks.filter((task) => task.id !== createdTaskId) : [];
      serverState.deletedTaskIds = Array.isArray(serverState.deletedTaskIds)
        ? serverState.deletedTaskIds.filter((id) => id !== createdTaskId)
        : [];
      await writeServerState(page, serverState);
    }
  }
});
