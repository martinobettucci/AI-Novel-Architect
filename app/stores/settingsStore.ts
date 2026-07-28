"use client";

import { create } from "zustand";
import { DEFAULT_SETTINGS } from "@/app/domain/defaults";
import type { AppSettings, Locale, ResolvedSettings, SettingScope } from "@/app/domain/models";
import {
  resolveSettings,
  resetSettingsDomain,
  saveSettingsProfile,
} from "@/app/lib/repository";

export interface ServerLlmConfig {
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  configured: boolean;
}

/**
 * The endpoint and model belong to the deployment, not to the browser profile.
 * We fetch them so the UI can display what it is talking to and so audit-log
 * entries record the real provider — they are never sent back upstream.
 */
async function fetchServerConfig(): Promise<ServerLlmConfig | null> {
  try {
    const res = await fetch("/api/ai/config", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ServerLlmConfig;
  } catch {
    return null;
  }
}

function withServerLlm(settings: AppSettings, server: ServerLlmConfig | null): AppSettings {
  // `apiKey` is dropped unconditionally: credentials are server-side now, and
  // profiles saved by an older build may still carry one in localStorage.
  // Clearing it here means the next save writes the key out of existence.
  const llm = { ...settings.llm };
  delete llm.apiKey;

  if (!server) return { ...settings, llm };
  return { ...settings, llm: { ...llm, baseUrl: server.baseUrl, model: server.model } };
}

interface SettingsState {
  uiLocale: Locale;
  globalSettings: AppSettings;
  resolved: ResolvedSettings;
  serverConfig: ServerLlmConfig | null;
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
  serverConfig: null,
  loading: false,
  error: null,
  load: async (projectId?: string, featureKey?: string) => {
    set({ loading: true, error: null });
    try {
      const [resolved, globalResolved, serverConfig] = await Promise.all([
        resolveSettings(projectId, featureKey),
        resolveSettings(),
        fetchServerConfig(),
      ]);
      set({
        loading: false,
        serverConfig,
        resolved: { ...resolved, settings: withServerLlm(resolved.settings, serverConfig) },
        uiLocale: globalResolved.settings.uiLocale,
        globalSettings: withServerLlm(globalResolved.settings, serverConfig),
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load settings",
      });
    }
  },
  saveScope: async (scope, values, projectId, featureKey) => {
    // Optimistic merge: the UI always passes complete domain objects, so a
    // shallow domain-level spread matches what resolution would produce.
    // Reloading on every keystroke made inputs lose characters.
    set((state) => ({
      resolved: {
        ...state.resolved,
        settings: { ...state.resolved.settings, ...values },
      },
      globalSettings:
        scope === "global" ? { ...state.globalSettings, ...values } : state.globalSettings,
      uiLocale: scope === "global" && values.uiLocale ? values.uiLocale : state.uiLocale,
      error: null,
    }));
    try {
      await saveSettingsProfile(scope, values, projectId, featureKey);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to save settings" });
      await get().load(projectId, featureKey);
    }
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
