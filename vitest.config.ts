import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Live credentials belong to explicit diagnostic commands, never offline tests.
  envDir: false,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**"],
    globals: false,
  },
});
