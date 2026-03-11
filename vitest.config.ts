import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["tests/setup/vitest.setup.ts"],
    include: ["tests/**/*.spec.ts", "tests/**/*.spec.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "app/domain/defaults.ts",
        "app/domain/userStories.ts",
        "app/i18n/messages.ts",
        "app/lib/hash.ts",
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
