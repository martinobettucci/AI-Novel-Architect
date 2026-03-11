"use client";

import { create } from "zustand";
import { DEFAULT_SETTINGS } from "@/app/domain/defaults";
import type { AppSettings, Locale, ResolvedSettings, SettingScope } from "@/app/domain/models";
import {
  resolveSettings,
  resetSettingsDomain,
  saveSettingsProfile,
} from "@/app/lib/repository";

interface SettingsState {
  uiLocale: Locale;
  globalSettings: AppSettings;
  resolved: ResolvedSettings;
  loading: boolean;
  error: string | null;
  load: (projectId?: string, featureKey?: string) => Promise<void>;
  saveScope: (scope: SettingScope, values: Partial<AppSettings>, projectId?: string, featureKey?: string) => Promise<void>;
  resetScope: (scope: SettingScope, projectId?: string, featureKey?: string) => Promise<void>;
  setUiLocaleImmediate: (locale: Locale) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  uiLocale: DEFAULT_SETTINGS.uiLocale,
  globalSettings: DEFAULT_SETTINGS,
  resolved: {
    settings: DEFAULT_SETTINGS,
    sourceOrder: ["defaults"],
  },
  loading: false,
  error: null,
  load: async (projectId?: string, featureKey?: string) => {
    set({ loading: true, error: null });
    try {
      const [resolved, globalResolved] = await Promise.all([
        resolveSettings(projectId, featureKey),
        resolveSettings(),
      ]);
      set({
        loading: false,
        resolved,
        uiLocale: globalResolved.settings.uiLocale,
        globalSettings: globalResolved.settings,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load settings",
      });
    }
  },
  saveScope: async (scope, values, projectId, featureKey) => {
    await saveSettingsProfile(scope, values, projectId, featureKey);
    await get().load(projectId, featureKey);
  },
  resetScope: async (scope, projectId, featureKey) => {
    await resetSettingsDomain(scope, projectId, featureKey);
    await get().load(projectId, featureKey);
  },
  setUiLocaleImmediate: (locale) => {
    set((state) => ({
      uiLocale: locale,
      globalSettings: {
        ...state.globalSettings,
        uiLocale: locale,
      },
    }));
  },
}));
