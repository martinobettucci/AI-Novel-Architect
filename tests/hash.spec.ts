import { describe, expect, it } from "vitest";
import { sanitizeTextForPreview, simpleChecksum } from "@/app/lib/hash";

describe("hash helpers", () => {
  it("generates deterministic checksums", () => {
    expect(simpleChecksum("abc")).toBe(simpleChecksum("abc"));
    expect(simpleChecksum("abc")).not.toBe(simpleChecksum("abd"));
  });

  it("trims and truncates preview text", () => {
    const preview = sanitizeTextForPreview("   hello    world   ", 8);
    expect(preview).toBe("hello w…");
  });

  it("returns unmodified preview under max length", () => {
    const preview = sanitizeTextForPreview("hello world", 40);
    expect(preview).toBe("hello world");
  });
});
