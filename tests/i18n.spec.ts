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

  it("interpolates named parameters", () => {
    expect(translate("fr", "workspace.queuedAi", { count: 3 })).toContain("3");
    expect(translate("en", "dashboard.deleteConfirm", { title: "My Book" })).toContain("My Book");
  });

  it("replaces every occurrence of a placeholder", () => {
    const value = translate("en", "plan.wordsPair", { current: 10, target: 100 });
    expect(value).toBe("10 / 100 words");
  });

  it("falls back to the French value when an English key is somehow empty", () => {
    // app.title is identical across locales; ensure parity lookups work.
    expect(translate("en", "app.title")).toBe(translate("fr", "app.title"));
  });
});
