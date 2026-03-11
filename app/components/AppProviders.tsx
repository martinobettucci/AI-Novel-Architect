"use client";

import { useEffect } from "react";
import { I18nProvider } from "@/app/i18n/I18nProvider";
import { useSettingsStore } from "@/app/stores/settingsStore";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const load = useSettingsStore((state) => state.load);
  const uiLocale = useSettingsStore((state) => state.uiLocale);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    document.documentElement.lang = uiLocale;
  }, [uiLocale]);

  return <I18nProvider locale={uiLocale}>{children}</I18nProvider>;
}
