import type { Locale } from "@/app/domain/models";

export type MessageKey =
  | "app.title"
  | "nav.dashboard"
  | "nav.settings"
  | "nav.workspace"
  | "dashboard.title"
  | "dashboard.subtitle"
  | "dashboard.create"
  | "workspace.plan"
  | "workspace.bible"
  | "workspace.drafting"
  | "workspace.revision"
  | "workspace.publish"
  | "workspace.marketing"
  | "workspace.settings"
  | "common.save"
  | "common.cancel"
  | "common.delete"
  | "common.duplicate"
  | "common.archive"
  | "common.restore"
  | "common.language"
  | "common.uiLanguage"
  | "common.writingLanguage"
  | "common.french"
  | "common.english"
  | "settings.title";

const fr: Record<MessageKey, string> = {
  "app.title": "AI Novel Architect",
  "nav.dashboard": "Tableau de bord",
  "nav.settings": "Paramètres",
  "nav.workspace": "Espace projet",
  "dashboard.title": "Projets d'écriture",
  "dashboard.subtitle": "Créez, rédigez, révisez, publiez et lancez vos romans en local.",
  "dashboard.create": "Nouveau projet",
  "workspace.plan": "Plan",
  "workspace.bible": "Story Bible",
  "workspace.drafting": "Rédaction",
  "workspace.revision": "Révision",
  "workspace.publish": "Publication",
  "workspace.marketing": "Marketing",
  "workspace.settings": "Réglages",
  "common.save": "Sauvegarder",
  "common.cancel": "Annuler",
  "common.delete": "Supprimer",
  "common.duplicate": "Dupliquer",
  "common.archive": "Archiver",
  "common.restore": "Restaurer",
  "common.language": "Langue",
  "common.uiLanguage": "Langue de l'interface",
  "common.writingLanguage": "Langue d'écriture",
  "common.french": "Français",
  "common.english": "Anglais",
  "settings.title": "Paramètres globaux",
};

const en: Record<MessageKey, string> = {
  "app.title": "AI Novel Architect",
  "nav.dashboard": "Dashboard",
  "nav.settings": "Settings",
  "nav.workspace": "Workspace",
  "dashboard.title": "Writing Projects",
  "dashboard.subtitle": "Create, draft, revise, publish, and launch your novels locally.",
  "dashboard.create": "New project",
  "workspace.plan": "Plan",
  "workspace.bible": "Story Bible",
  "workspace.drafting": "Drafting",
  "workspace.revision": "Revision",
  "workspace.publish": "Publishing",
  "workspace.marketing": "Marketing",
  "workspace.settings": "Settings",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.duplicate": "Duplicate",
  "common.archive": "Archive",
  "common.restore": "Restore",
  "common.language": "Language",
  "common.uiLanguage": "UI language",
  "common.writingLanguage": "Writing language",
  "common.french": "French",
  "common.english": "English",
  "settings.title": "Global settings",
};

export function translate(locale: Locale, key: MessageKey): string {
  const dict = locale === "fr" ? fr : en;
  return dict[key] ?? fr[key] ?? key;
}
