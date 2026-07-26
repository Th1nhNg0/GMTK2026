import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = resolve("itch-assets/screenshots");
await mkdir(output, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.goto("http://127.0.0.1:5173/");
await page.waitForTimeout(700);
await page.screenshot({ path: resolve(output, "01-title.png") });

await page.getByLabel("Developer seed").fill("2026");
await page.getByRole("button", { name: "Use seed" }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: resolve(output, "02-map.png") });

await page.getByRole("button", { name: "Encounter, available" }).nth(1).click();
await page.waitForTimeout(850);
await page.screenshot({ path: resolve(output, "03-opponent-intro.png") });
await page.getByRole("button", { name: "Start puzzle against Sumslinger" }).click();
await page.getByRole("button", { name: "Toggle developer tools" }).click();
await page.getByRole("button", { name: "Enemy HP 1" }).click();
await page.getByRole("button", { name: "Exact setup" }).click();
await page.getByRole("button", { name: "Toggle developer tools" }).click();
const fifties = page.getByRole("button", { name: "50, available" });
await fifties.nth(0).click();
await page.getByRole("button", { name: "50, available" }).click();
await page.waitForTimeout(250);
await page.screenshot({ path: resolve(output, "03-encounter.png") });

await page.getByRole("button", { name: "add" }).click();
await page.waitForTimeout(1_450);
await page.screenshot({ path: resolve(output, "04-score-sequence.png") });
await page.waitForTimeout(3_100);
await page.screenshot({ path: resolve(output, "05-attack-result.png") });

await browser.close();
