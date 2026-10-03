import { expect, test } from "@playwright/test";
import { awaken } from "./helpers";
import { buildLevel5Backup } from "./level5-backup";
import { addDays, toKey, weekStart } from "../src/lib/engine/dates";

/** The backup, with the two given dates missing from its logs. */
function withGaps(dates: string[]) {
  const file = JSON.parse(buildLevel5Backup().json);
  file.data.dayLogs = file.data.dayLogs.filter((l: { date: string }) => !dates.includes(l.date));
  return JSON.stringify(file);
}

test("a missed day costs XP, and the week's first miss is free", async ({ page }) => {
  // Two misses inside one ISO week, a fortnight back so both are long over.
  const monday = weekStart(addDays(toKey(new Date()), -14));
  const first = addDays(monday, 1);
  const second = addDays(monday, 2);

  await awaken(page);
  await page.goto("/app/system");
  await page.locator('input[type="file"]').setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(withGaps([first, second])),
  });
  await page.getByRole("button", { name: "Replace", exact: true }).click();
  await page.waitForTimeout(1200);

  // The first miss of that week is covered.
  await page.goto(`/app/quest/${first}`);
  await expect(page.getByText("MISSED. FREE MISS USED.")).toBeVisible();

  // The second is charged.
  await page.goto(`/app/quest/${second}`);
  await expect(page.getByText("-50 XP MISSED GATE")).toBeVisible();
});
