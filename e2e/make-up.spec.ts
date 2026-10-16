import { expect, test } from "@playwright/test";
import { awaken } from "./helpers";
import { toKey } from "../src/lib/engine/dates";

/* A rest day far enough ahead that the training days behind it, in the same
   week, are inside the arc and missed. The clock is moved rather than the
   data: a day is missed by letting it go by, which is exactly what this
   does. */
function saturdayAhead(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 8);
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

test("a gate missed earlier in the week can be finished on a rest day", async ({ page }) => {
  await awaken(page);

  const sat = saturdayAhead();
  await page.clock.setFixedTime(sat);
  await page.goto(`/app/quest/${toKey(sat)}`);
  await page.waitForTimeout(800);
  await expect(page.getByRole("heading", { name: "Rest day" })).toBeVisible();

  const panel = page.getByRole("button", { name: /^Bonus quest/ });
  if ((await panel.getAttribute("aria-expanded")) !== "true") await panel.click();

  // The week's missed gates are offered, and taking one on brings its
  // exercises onto the rest day.
  await expect(page.getByText("MISSED GATES / THIS WEEK")).toBeVisible();
  const offer = page.getByRole("button", { name: /^Finish / }).first();
  // The button is "Make up <day>" with the date beside it, in its own span.
  const label = ((await offer.locator("span").first().textContent()) ?? "").replace("Finish ", "").trim();
  await offer.click();
  await expect(page.getByText(/^FINISHING /)).toBeVisible();
  await expect(page.getByText(new RegExp(`0 OF \\d+ DONE`))).toBeVisible();

  // It is part of the day, not of this screen.
  await page.reload();
  await page.waitForTimeout(800);
  const again = page.getByRole("button", { name: /^Bonus quest/ });
  if ((await again.getAttribute("aria-expanded")) !== "true") await again.click();
  await expect(page.getByText(new RegExp(`^FINISHING ${label.toUpperCase()}`))).toBeVisible();

  // And it can be handed back, which puts the offer in front of the offer list.
  await page.getByRole("button", { name: "DROP IT" }).click();
  await expect(page.getByText("MISSED GATES / THIS WEEK")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rest day" })).toBeVisible();
});
