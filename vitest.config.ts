import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["tests/setup/vitest.setup.ts"],
    include: ["tests/**/*.spec.ts", "tests/**/*.spec.tsx"],
    // The e2e specs hit a real gateway and run under vitest.e2e.config.ts.
    exclude: ["tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Scoped to the pure, directly-tested modules. The threshold below is only
      // meaningful for what is listed here, so add a module when it gains real
      // coverage rather than leaving the gate silently vacuous.
      include: [
        "app/domain/defaults.ts",
        "app/domain/userStories.ts",
        "app/i18n/messages.ts",
        "app/lib/hash.ts",
        "app/lib/rateLimit.ts",
        "app/lib/openaiClient.ts",
        "app/lib/ai/agentPool.ts",
        "app/lib/ai/diff.ts",
        "app/lib/ai/prompts.ts",
      ],
      exclude: ["**/*.d.ts"],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
