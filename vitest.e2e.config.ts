import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { fileURLToPath } from "node:url";

/**
 * End-to-end config: these specs talk to a REAL LLM gateway, so they live apart
 * from the unit suite (`vitest.config.ts`). No jsdom, no coverage gate, and a
 * timeout sized for a reasoning model behind a serializing queue.
 *
 * `loadEnv(mode, cwd, "")` reads .env/.env.local with an empty prefix so plain
 * (non-VITE_) variables reach the test workers.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode ?? "test", process.cwd(), "");

  return {
    test: {
      environment: "node",
      globals: true,
      include: ["tests/e2e/**/*.e2e.spec.ts"],
      env,
      testTimeout: Number(env.E2E_TIMEOUT_MS || 180_000),
      hookTimeout: Number(env.E2E_TIMEOUT_MS || 180_000),
      // The gateway serializes generations; parallel files would just queue up
      // behind each other and blow the timeout.
      fileParallelism: false,
      retry: 1,
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./", import.meta.url)),
      },
    },
  };
});
