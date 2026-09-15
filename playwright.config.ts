import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    // Its own server, not the dev one: with accounts on, every page past the
    // landing needs a real sign-in, and the suite should never create accounts
    // in the live database. This one runs local-only, as its own build.
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    colorScheme: "dark",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "next dev -p 3100",
    url: "http://localhost:3100",
    env: { NEXT_PUBLIC_ARISE_LOCAL_ONLY: "1", ARISE_DIST_DIR: ".next-e2e" },
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
