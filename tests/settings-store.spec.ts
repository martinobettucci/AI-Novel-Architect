import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/app/domain/defaults";
import { resetDatabase } from "@/app/lib/db";
import { useSettingsStore } from "@/app/stores/settingsStore";

describe("settings store", () => {
  beforeEach(async () => {
    await resetDatabase();
    useSettingsStore.setState({
      uiLocale: DEFAULT_SETTINGS.uiLocale,
      globalSettings: DEFAULT_SETTINGS,
      resolved: { settings: DEFAULT_SETTINGS, sourceOrder: ["defaults"] },
      loading: false,
      error: null,
    });
  });

  it("loads defaults and allows locale switch", async () => {
    await useSettingsStore.getState().load();
    expect(useSettingsStore.getState().resolved.settings.locale).toBe("fr");
    expect(useSettingsStore.getState().uiLocale).toBe("fr");

    useSettingsStore.getState().setUiLocaleImmediate("en");
    expect(useSettingsStore.getState().uiLocale).toBe("en");
  });

  it("saves and resets scoped settings", async () => {
    await useSettingsStore
      .getState()
      .saveScope("global", { llm: { ...DEFAULT_SETTINGS.llm, model: "store-model" } });

    expect(useSettingsStore.getState().resolved.settings.llm.model).toBe("store-model");

    await useSettingsStore.getState().resetScope("global");
    expect(useSettingsStore.getState().resolved.settings.llm.model).toBe(DEFAULT_SETTINGS.llm.model);
  });
});
