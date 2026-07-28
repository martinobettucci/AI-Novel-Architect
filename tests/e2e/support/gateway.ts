/**
 * Shared plumbing for the end-to-end specs.
 *
 * The e2e suite exercises the real API route handlers against a real gateway.
 * Credentials come from E2E_* variables (see .env.example); when they are absent
 * the specs skip rather than fail, so a fresh clone with no gateway access still
 * gets a green `npm test` and an honest "skipped" on `npm run test:e2e`.
 */

export interface GatewayConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export function readGatewayConfig(): GatewayConfig | null {
  const baseUrl = (process.env.E2E_BASE_URL || process.env.OPENAI_BASE_URL || "").trim();
  const model = (process.env.E2E_MODEL || process.env.OPENAI_MODEL || "").trim();
  const apiKey = (process.env.E2E_API_KEY || process.env.OPENAI_API_KEY || "").trim();

  if (!baseUrl || !model) return null;
  return { baseUrl, model, apiKey };
}

export const gateway = readGatewayConfig();

/** `describe.skipIf(skipE2e)` — true when no gateway is configured. */
export const skipE2e = gateway === null;

/**
 * The route handlers read their upstream from the server environment, so the
 * specs must make E2E_* visible as OPENAI_* before importing them. Call once
 * from a spec's top level.
 */
export function applyServerEnv(config: GatewayConfig): void {
  process.env.OPENAI_BASE_URL = config.baseUrl;
  process.env.OPENAI_MODEL = config.model;
  if (config.apiKey) process.env.OPENAI_API_KEY = config.apiKey;
}

/**
 * Headers the gateway itself expects: standard bearer auth. Used by the specs
 * that talk to the endpoint directly, bypassing the app.
 */
export function upstreamHeaders(config: GatewayConfig): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
  return headers;
}

/**
 * Build a Request the way the browser client does. Deliberately carries no
 * endpoint/model/key headers — the browser has no say in those, and a spec that
 * sent them would hide a regression that reintroduced client-controlled routing.
 */
export function aiRequest(path: string, body?: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
