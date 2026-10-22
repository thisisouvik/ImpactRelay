import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    // Never run browser tests against a user's paid provider or hosted database.
    env: {
      IMPACTRELAY_E2E: "1",
      APP_MODE: "rules", DATABASE_URL: "", IMPACTRELAY_DB_PATH: "data/playwright.sqlite",
      UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "", RATE_LIMIT_MODE: "disabled",
      GROQ_API_KEY: "", OG_COMPUTE_API_KEY: "",
      LOCAL_LLM_BASE_URL: "", LOCAL_LLM_MODEL: "",
    },
    timeout: 120_000,
  },
});
