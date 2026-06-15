"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "@/app/domain/models";
import type { MessageKey, MessageParams } from "@/app/i18n/messages";
import { translate } from "@/app/i18n/messages";

interface I18nContextValue {
  locale: Locale;
  t: (key: MessageKey, params?: MessageParams) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: (key, params) => translate(locale, key, params),
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      locale: "fr",
      t: (key, params) => translate("fr", key, params),
    };
  }
  return context;
}
