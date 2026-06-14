"use client";

import { useSettingsStore } from "@/app/stores/settingsStore";
import { useI18n } from "@/app/i18n/I18nProvider";

export default function LanguageSwitcher({
  projectId,
  mode = "writing",
  compact = false,
}: {
  projectId?: string;
  mode?: "writing" | "ui";
  compact?: boolean;
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
    <label
      className={`language-switcher ${
        compact ? "language-switcher--compact" : "language-switcher--inline"
      }`}
    >
      <span className="language-switcher__label">{label}</span>
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
        className="language-switcher__select"
      >
        <option value="fr">{t("common.french")}</option>
        <option value="en">{t("common.english")}</option>
      </select>
    </label>
  );
}
