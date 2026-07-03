import { defineConfig, devices } from "@playwright/test";

/**
 * E2E + security tests.
 *
 * Functionality tests run against a *production build* served by `astro preview`.
 * Building first mirrors the deployed GitHub Pages site and gives fast, reliable
 * island hydration (the dev server's on-demand module loading can let a test
 * interact with an input before React has hydrated it). The build stays in
 * "demo mode" (no PUBLIC_API_BASE) so RSVP/playlist data lives in localStorage
 * and never touches the private data repo.
 *
 * Security tests additionally probe the deployed Worker and Pages bundle over
 * the network (read-only / rejected requests only — no writes).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run build && npm run preview -- --port 4321 --host",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
