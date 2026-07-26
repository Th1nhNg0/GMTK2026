import { expect, test, type Page } from "@playwright/test";

async function startRun(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Developer seed").fill("2026");
  await page.getByRole("button", { name: "Use seed" }).click();
  await expect(page.getByRole("heading", { name: "Choose your route" })).toBeVisible();
  await expect(page.getByText(/^Bag \d+$/)).toHaveCount(0);
}

async function enterNormalEncounter(page: Page): Promise<void> {
  const routes = page.getByRole("button", { name: "Encounter, available" });
  await expect(routes).toHaveCount(3);
  await routes.nth(1).click();
  const intro = page.getByLabel("Opponent introduction");
  await expect(intro).toBeVisible();
  await expect(intro.getByRole("img", { name: "Sumslinger enters battle" })).toBeVisible();
  await expect(intro.getByText("Quick Sum", { exact: true })).toBeVisible();
  await expectPageToFitViewport(page);
  await page.getByRole("button", { name: "Start puzzle against Sumslinger" }).click();
  await expect(page.getByLabel("Puzzle 1 of 4")).toBeVisible();
  await expect(page.getByText("0 exact", { exact: false })).toBeVisible();
}

async function openDebugTools(page: Page): Promise<void> {
  const autoExact = page.getByRole("button", { name: "Auto exact" });
  if (!(await autoExact.isVisible())) {
    await page.getByRole("button", { name: "Toggle developer tools" }).click();
  }
  await expect(autoExact).toBeVisible();
}

async function closeDebugTools(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Toggle developer tools" }).click();
}

async function jumpToNodeType(page: Page, nodeType: string): Promise<void> {
  await openDebugTools(page);
  const options = page.locator("select option").filter({ hasText: nodeType });
  const count = await options.count();
  expect(count).toBeGreaterThan(0);
  const nodeId = await options.nth(0).getAttribute("value");
  expect(nodeId).toBeTruthy();
  await page.locator("select").selectOption(nodeId!);
  await page.getByRole("button", { name: "Jump" }).click();
  await closeDebugTools(page);
}

async function expectPageToFitViewport(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    vertical: document.documentElement.scrollHeight > document.documentElement.clientHeight,
  }));
  expect(overflow).toEqual({ horizontal: false, vertical: false });
}

test("contains scrolling inside the branching route map", async ({ page }) => {
  await startRun(page);
  await expectPageToFitViewport(page);

  const map = page.getByLabel("Branching run map");
  await expect(map).toBeVisible();
  const mapOverflow = await map.evaluate((element) => ({
    clientHeight: element.clientHeight,
    connectorCount: element.querySelectorAll("svg path").length,
    scrollHeight: element.scrollHeight,
  }));
  expect(mapOverflow.scrollHeight).toBeGreaterThan(mapOverflow.clientHeight);
  expect(mapOverflow.connectorCount).toBeGreaterThan(0);
});

test("starts a run, performs an exact operation, and claims a reward", async ({ page }) => {
  await startRun(page);
  await enterNormalEncounter(page);
  await openDebugTools(page);
  await page.getByRole("button", { name: "Enemy HP 1" }).click();
  await page.getByRole("button", { name: "Exact setup" }).click();
  await closeDebugTools(page);

  await expectPageToFitViewport(page);
  await expect(page.getByRole("region", { name: "Damage guide" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Sumslinger monster" })).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    const consumablesBox = await page.getByLabel("Consumables and damage guide").boundingBox();
    const enemyBox = await page.getByLabel("Enemy").boundingBox();
    expect(consumablesBox).not.toBeNull();
    expect(enemyBox).not.toBeNull();
    expect(consumablesBox!.x).toBeLessThan(enemyBox!.x);
  }

  const fifties = page.getByRole("button", { name: "50, available" });
  await expect(fifties).toHaveCount(2);
  await fifties.nth(0).click();
  await page.getByRole("button", { name: "50, available" }).click();
  await page.getByRole("button", { name: "add" }).click();

  await expect(page.getByLabel("Attack resolving")).toBeVisible();
  await expect(page.getByText("01 · Answer")).toBeVisible();
  await expect(page.getByText("02 · Accuracy")).toBeVisible();
  await expect(page.getByText("03 · Power")).toBeVisible();
  await expect(page.getByText("Enemy defeated")).toBeVisible({ timeout: 7_000 });
  await expect(page.getByText("1 exact", { exact: false })).toBeVisible();
  await expect(page.getByText("Enemy response")).toBeVisible();
  const resolution = page.getByRole("heading", { name: "Enemy defeated" }).locator("..");
  await expect(resolution.getByText("Exact", { exact: true }).first()).toBeVisible();
  const calculation = page.getByLabel("Damage calculation");
  await expect(calculation).toContainText("Exact → 10 base power");
  await expect(calculation).toContainText("10 attack power");
  await expect(calculation).toContainText("1 HP lost (enemy only had 1 HP)");
  await page.getByRole("button", { name: "Claim reward" }).click();
  await expect(page.getByRole("heading", { name: "Choose one reward" })).toBeVisible();
  const rewards = page.locator("section button").filter({ has: page.locator("strong") });
  await expect(rewards).toHaveCount(3);
  await rewards.nth(0).click();
  await expect(page.getByRole("heading", { name: "Choose your route" })).toBeVisible();
});

test("supports keyboard-only number operations", async ({ page }) => {
  await startRun(page);
  await enterNormalEncounter(page);
  await openDebugTools(page);
  await page.getByRole("button", { name: "Exact setup" }).click();
  await closeDebugTools(page);
  await page.keyboard.press("1");
  await page.keyboard.press("2");
  await page.keyboard.press("Shift+=");
  await expect(page.getByLabel("Attack resolving")).toBeVisible();
});

test("keeps the six starting-number slots fixed when a result is created", async ({ page }) => {
  await startRun(page);
  await enterNormalEncounter(page);
  await expectPageToFitViewport(page);
  await expect(page.getByRole("button", { name: "Apply operation" })).toHaveCount(0);

  const numberWorkspace = page.getByLabel("Number workspace");
  await expect(numberWorkspace.getByRole("button")).toHaveCount(6);
  await expect(page.getByText("Pick 2 numbers", { exact: true })).toBeVisible();

  const sourceButtons = numberWorkspace.getByRole("button");
  const firstValue = Number((await sourceButtons.nth(0).getAttribute("aria-label"))?.split(",")[0]);
  const secondValue = Number(
    (await sourceButtons.nth(1).getAttribute("aria-label"))?.split(",")[0],
  );
  await sourceButtons.nth(0).click();
  await sourceButtons.nth(1).click();
  await expect(page.getByText("Pick an operator", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "add" }).click();

  await expect(numberWorkspace.getByRole("button")).toHaveCount(6);
  await expect(
    page
      .getByLabel("Calculation rows")
      .getByRole("button", { name: `${firstValue + secondValue}, available` }),
  ).toBeVisible();
  await expectPageToFitViewport(page);
});

test("pauses for a consumable and submits the timeout result", async ({ page }) => {
  await startRun(page);
  await enterNormalEncounter(page);
  const tonic = page.getByRole("button", { name: "Use Time Tonic" });
  const tonicName = tonic.getByText("Time Tonic", { exact: true });
  await expect(tonicName).toBeVisible();
  const nameLayout = await tonicName.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    text: element.textContent,
    whiteSpace: getComputedStyle(element).whiteSpace,
  }));
  expect(nameLayout.text).toBe("Time Tonic");
  expect(nameLayout.whiteSpace).toBe("normal");
  expect(nameLayout.scrollWidth).toBeLessThanOrEqual(nameLayout.clientWidth);
  await tonic.click();
  await expect(page.getByRole("dialog", { name: "Time Tonic" })).toBeVisible();
  await expect(page.getByText("Timer paused while this dialog is open.")).toBeVisible();
  await page.getByRole("button", { name: "Use now" }).click();
  await expect(page.getByRole("button", { name: "Empty consumable slot 1" })).toBeDisabled();

  await openDebugTools(page);
  await page.getByRole("button", { name: "60×" }).click();
  await closeDebugTools(page);
  await expect(page.getByText("Puzzle 1 resolved")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole("heading", { name: "No damage" })).toBeVisible();
});

test("can purchase an item from the shop", async ({ page }) => {
  await startRun(page);
  await openDebugTools(page);
  await page.getByRole("button", { name: "+50 coins" }).click();
  const shopOptions = page.locator("select option").filter({ hasText: "shop" });
  const shopCount = await shopOptions.count();
  expect(shopCount).toBeGreaterThan(0);
  const shopNodeId = await shopOptions.nth(0).getAttribute("value");
  expect(shopNodeId).toBeTruthy();
  await page.locator("select").selectOption(shopNodeId!);
  await page.getByRole("button", { name: "Jump" }).click();
  await expect(page.getByRole("heading", { name: "The Counting House" })).toBeVisible();
  await closeDebugTools(page);
  const buyRelic = page.getByRole("button", { name: /Buy .* for 38 coins/ });
  expect(await buyRelic.count()).toBeGreaterThan(0);
  await buyRelic.first().click();
  await expect(page.getByRole("button", { name: /Purchased .* for 38 coins/ })).toBeDisabled();
});

test("completes event, rest, and upgrade map nodes", async ({ page }) => {
  await startRun(page);
  await jumpToNodeType(page, "event");
  const eventChoices = page.locator("section button").filter({ has: page.locator("strong") });
  await expect(eventChoices).toHaveCount(2);
  await eventChoices.nth(0).click();
  await expect(page.getByRole("heading", { name: "Choose your route" })).toBeVisible();

  await jumpToNodeType(page, "rest");
  await expect(page.getByRole("heading", { name: "A Quiet Desk" })).toBeVisible();
  await page.getByRole("button", { name: "Rest and continue" }).click();
  await expect(page.getByRole("heading", { name: "Choose your route" })).toBeVisible();

  await jumpToNodeType(page, "upgrade");
  await expect(page.getByRole("heading", { name: "Choose an upgrade" })).toBeVisible();
  await page.getByRole("button", { name: /Clearer Thinking/ }).click();
  await expect(page.getByRole("heading", { name: "Choose your route" })).toBeVisible();
  await expect(page.getByText("+5s", { exact: true })).toBeVisible();
});

test("reaches defeat through a deterministic debug path", async ({ page }) => {
  await startRun(page);
  await enterNormalEncounter(page);
  await openDebugTools(page);
  await page.getByRole("button", { name: "Player HP 1" }).click();
  await page.getByRole("button", { name: "60×" }).click();
  await closeDebugTools(page);
  await expect(page.getByRole("heading", { name: "Time's up" })).toBeVisible({ timeout: 3_000 });
});

test("reaches victory through a deterministic boss path", async ({ page }) => {
  await startRun(page);
  await openDebugTools(page);
  await page.getByRole("button", { name: "boss", exact: true }).click();
  await closeDebugTools(page);
  await expect(page.getByLabel("Opponent introduction")).toBeVisible();
  await page.getByRole("button", { name: "Start puzzle against The Final Examiner" }).click();
  await expect(page.getByText("Show Your Work · Exact answers deal +2 damage.")).toBeVisible();
  await openDebugTools(page);
  await page.getByRole("button", { name: "Enemy HP 1" }).click();
  await page.getByRole("button", { name: "Auto exact" }).click();
  await expect(page.getByText("Enemy defeated")).toBeVisible();
  await closeDebugTools(page);
  const finish = page.getByRole("button", { name: "Finish the run" });
  await expect(finish).toBeVisible();
  await finish.click();
  await expect(page.getByRole("heading", { name: "Clock stopped" })).toBeVisible();
});

test("refreshing destroys all run and session state", async ({ page }) => {
  await startRun(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Last Sum Standing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose your route" })).toHaveCount(0);
});
