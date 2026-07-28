import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callerKey, consumeToken, resetRateLimits } from "@/app/lib/rateLimit";

const OPTIONS = { ratePerMinute: 60, burst: 3 };

describe("rate limit", () => {
  beforeEach(() => {
    resetRateLimits();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows a burst then denies", () => {
    for (let i = 0; i < OPTIONS.burst; i += 1) {
      expect(consumeToken("a", OPTIONS).allowed).toBe(true);
    }

    const denied = consumeToken("a", OPTIONS);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfter).toBeGreaterThanOrEqual(0);
  });

  it("refills over time", () => {
    for (let i = 0; i < OPTIONS.burst; i += 1) consumeToken("b", OPTIONS);
    expect(consumeToken("b", OPTIONS).allowed).toBe(false);

    // 60/minute means one token per second.
    vi.advanceTimersByTime(1_100);
    expect(consumeToken("b", OPTIONS).allowed).toBe(true);
  });

  it("never refills beyond the burst ceiling", () => {
    consumeToken("c", OPTIONS);
    vi.advanceTimersByTime(600_000);

    for (let i = 0; i < OPTIONS.burst; i += 1) {
      expect(consumeToken("c", OPTIONS).allowed).toBe(true);
    }
    expect(consumeToken("c", OPTIONS).allowed).toBe(false);
  });

  it("tracks callers independently", () => {
    for (let i = 0; i < OPTIONS.burst; i += 1) consumeToken("d", OPTIONS);
    expect(consumeToken("d", OPTIONS).allowed).toBe(false);
    expect(consumeToken("e", OPTIONS).allowed).toBe(true);
  });

  it("evicts idle callers instead of growing without bound", () => {
    // The sweep only engages past a threshold, so fill well beyond it.
    for (let i = 0; i < 1100; i += 1) consumeToken(`k${i}`, OPTIONS);

    // Idle them out, then touch one key to trigger a sweep.
    vi.advanceTimersByTime(700_000);
    expect(consumeToken("trigger", OPTIONS).allowed).toBe(true);

    // Evicted keys start from a full burst again.
    for (let i = 0; i < OPTIONS.burst; i += 1) {
      expect(consumeToken("k0", OPTIONS).allowed).toBe(true);
    }
  });

  it("identifies callers from proxy headers, preferring the original client", () => {
    expect(callerKey(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe(
      "203.0.113.7"
    );
    expect(callerKey(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(callerKey(new Headers())).toBe("local");
  });
});
