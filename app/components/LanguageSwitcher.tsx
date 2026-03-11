"use client";

import { useSettingsStore } from "@/app/stores/settingsStore";
import { useI18n } from "@/app/i18n/I18nProvider";

export default function LanguageSwitcher({
  projectId,
  mode = "writing",
}: {
  projectId?: string;
  mode?: "writing" | "ui";
}) {
  const { t } = useI18n();
  const uiLocale = useSettingsStore((state) => state.uiLocale);
  const resolvedSettings = useSettingsStore((state) => state.resolved.settings);
  const saveScope = useSettingsStore((state) => state.saveScope);
  const setUiLocaleImmediate = useSettingsStore((state) => state.setUiLocaleImmediate);

  const isUiSwitcher = mode === "ui";
  const value = isUiSwitcher ? uiLocale : resolvedSettings.locale;
  const label = isUiSwitcher ? t("common.uiLanguage") : t("common.writingLanguage");
  const ariaLabel = isUiSwitcher ? "UI language selector" : "Writing language selector";

  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
      <span>{label}</span>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => {
          const next = event.target.value as "fr" | "en";
          if (isUiSwitcher) {
            setUiLocaleImmediate(next);
            void saveScope("global", { uiLocale: next });
            return;
          }

          void saveScope(projectId ? "project" : "global", { locale: next }, projectId);
        }}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
      >
        <option value="fr">{t("common.french")}</option>
        <option value="en">{t("common.english")}</option>
      </select>
    </label>
  );
}
