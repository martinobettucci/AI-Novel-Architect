"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import { useI18n } from "@/app/i18n/I18nProvider";

function navClass(active: boolean): string {
  return active
    ? "rounded-md bg-cyan-100 px-3 py-1.5 text-sm font-semibold text-cyan-900"
    : "rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100";
}

export default function TopNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const dashboardActive = pathname === "/";
  const settingsActive = pathname.startsWith("/settings") || pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-black tracking-tight text-slate-900">
            {t("app.title")}
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <Link href="/" className={navClass(dashboardActive)}>
              {t("nav.dashboard")}
            </Link>
            <Link href="/settings" className={navClass(settingsActive)}>
              {t("nav.settings")}
            </Link>
          </nav>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <LanguageSwitcher mode="ui" />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
