import { describe, expect, it } from "vitest";
import { translate } from "@/app/i18n/messages";

describe("i18n messages", () => {
  it("returns french default text", () => {
    expect(translate("fr", "dashboard.title")).toContain("Projets");
  });

  it("returns english fallback", () => {
    expect(translate("en", "dashboard.create")).toContain("project");
  });

  it("falls back to key when missing", () => {
    const unknown = translate("en", "missing.key" as never);
    expect(unknown).toBe("missing.key");
  });
});
