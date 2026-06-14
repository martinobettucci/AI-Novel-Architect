"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import { useI18n } from "@/app/i18n/I18nProvider";

function navClass(active: boolean): string {
  return active
    ? "nav-link nav-link--active"
    : "nav-link";
}

export default function TopNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const dashboardActive = pathname === "/";
  const settingsActive = pathname.startsWith("/settings") || pathname.startsWith("/admin");

  return (
    <header className="nav-shell">
      <div className="nav-inner">
        <div className="nav-brand">
          <Link href="/" className="nav-brand__home">
            <span className="nav-brandmark" aria-hidden>
              A
            </span>
            <span className="nav-brand__copy">
              <span className="nav-title">{t("app.title")}</span>
            </span>
          </Link>
          <nav className="nav-links" aria-label="Primary">
            <Link href="/" className={navClass(dashboardActive)}>
              {t("nav.dashboard")}
            </Link>
            <Link href="/settings" className={navClass(settingsActive)}>
              {t("nav.settings")}
            </Link>
          </nav>
        </div>

        <div className="nav-utility">
          <LanguageSwitcher mode="ui" compact />
        </div>
      </div>
    </header>
  );
}
