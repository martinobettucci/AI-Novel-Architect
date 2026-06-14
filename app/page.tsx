"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TopNav from "@/app/components/TopNav";
import CollapsibleCard from "@/app/components/ui/CollapsibleCard";
import FieldLabel from "@/app/components/ui/FieldLabel";
import MultiTagCombobox from "@/app/components/ui/MultiTagCombobox";
import { useI18n } from "@/app/i18n/I18nProvider";
import { runAiAction } from "@/app/lib/ai/client";
import { downloadBlob, downloadText } from "@/app/lib/download";
import {
  AUDIENCE_SUGGESTIONS,
  buildProjectSetupSuggestionContext,
  buildProjectSetupSuggestionInput,
  CREATE_MODE_COPY,
  GENRE_SUGGESTIONS,
  getDefaultStarterTemplate,
  getStarterTemplate,
  joinMultiValueField,
  parseProjectSetupSuggestion,
  PROJECT_SETUP_RESPONSE_FORMAT,
  PROJECT_FIELD_HELP,
  splitMultiValueField,
  STARTER_TEMPLATES,
  TONE_SUGGESTIONS,
  type CreateMode,
  type StarterTemplateDefinition,
  type StarterTemplateId,
} from "@/app/lib/projectIntake";
import { useProjectStore } from "@/app/stores/projectStore";
import { useSettingsStore } from "@/app/stores/settingsStore";

const DEFAULT_STARTER_TEMPLATE = getDefaultStarterTemplate();

function countOutlineLines(input: string): number {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
}

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const projects = useProjectStore((state) => state.projects);
  const loading = useProjectStore((state) => state.loading);
  const refreshProjects = useProjectStore((state) => state.refreshProjects);
  const createProject = useProjectStore((state) => state.createProject);
  const duplicateActiveProject = useProjectStore((state) => state.duplicateActiveProject);
  const openProject = useProjectStore((state) => state.openProject);
  const archiveProjectById = useProjectStore((state) => state.archiveProjectById);
  const deleteProjectById = useProjectStore((state) => state.deleteProjectById);
  const importProjectFile = useProjectStore((state) => state.importProjectFile);
  const importBackupFile = useProjectStore((state) => state.importBackupFile);
  const exportActiveProjectBackup = useProjectStore((state) => state.exportActiveProjectBackup);
  const exportActiveProjectJson = useProjectStore((state) => state.exportActiveProjectJson);
  const exportActiveProjectMarkdown = useProjectStore((state) => state.exportActiveProjectMarkdown);
  const defaultWritingLocale = useSettingsStore((state) => state.resolved.settings.locale);
  const resolvedSettings = useSettingsStore((state) => state.resolved.settings);
  const loadSettings = useSettingsStore((state) => state.load);

  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>("idea");
  const [templateId, setTemplateId] = useState<StarterTemplateId>(DEFAULT_STARTER_TEMPLATE.id);
  const [title, setTitle] = useState("");
  const [genreTags, setGenreTags] = useState<string[]>(["Thriller"]);
  const [audienceTags, setAudienceTags] = useState<string[]>(["Adult"]);
  const [toneTags, setToneTags] = useState<string[]>(["Tense"]);
  const [targetWords, setTargetWords] = useState(80000);
  const [initialChapterCount, setInitialChapterCount] = useState(0);
  const [synopsis, setSynopsis] = useState("");
  const [outlineText, setOutlineText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [aiSuggestionNote, setAiSuggestionNote] = useState<string | null>(null);
  const [aiSuggestionError, setAiSuggestionError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [templatePreviewCollapsed, setTemplatePreviewCollapsed] = useState(true);

  useEffect(() => {
    void refreshProjects();
    void loadSettings();
  }, [loadSettings, refreshProjects]);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === "active"),
    [projects]
  );

  const archivedProjects = useMemo(
    () => projects.filter((project) => project.status === "archived").length,
    [projects]
  );

  const totalTargetWords = useMemo(
    () => activeProjects.reduce((sum, project) => sum + project.targetWordCount, 0),
    [activeProjects]
  );

  const languageSpread = useMemo(
    () => new Set(activeProjects.map((project) => project.language.toUpperCase())).size,
    [activeProjects]
  );

  const averageTargetWords = useMemo(
    () => (activeProjects.length > 0 ? Math.round(totalTargetWords / activeProjects.length) : 0),
    [activeProjects.length, totalTargetWords]
  );

  const mostRecentProject = useMemo(
    () =>
      activeProjects
        .slice()
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        )[0] ?? null,
    [activeProjects]
  );

  const selectedTemplate = useMemo(
    () => getStarterTemplate(templateId) ?? DEFAULT_STARTER_TEMPLATE,
    [templateId]
  );

  const outlineLineCount = useMemo(() => countOutlineLines(outlineText), [outlineText]);
  const localeTag = locale === "fr" ? "fr-FR" : "en-US";
  const numberFormatter = useMemo(() => new Intl.NumberFormat(localeTag), [localeTag]);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag, {
        dateStyle: "medium",
      }),
    [localeTag]
  );
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [localeTag]
  );
  const dashboardCopy =
    locale === "fr"
      ? {
          eyebrow: "Poste de commandement",
          overview:
            "Gardez l'intake, les sauvegardes et les manuscrits actifs dans une vue dense, immédiate et exploitable.",
          activeProjects: "Projets actifs",
          archivedProjects: "Archives",
          languageSpread: "Langues",
          averageTarget: "Cible moyenne",
          activeProjectsDetail: "Manuscrits actuellement en production.",
          archivedProjectsDetail: "Branches rangées hors du flux principal.",
          languageSpreadDetail: "Langues d'écriture actives dans le studio.",
          averageTargetDetail: "Volume moyen planifie par manuscrit actif.",
          refreshing: "Actualisation de la bibliotheque locale...",
          localLibrary: "Bibliotheque locale",
          localLibraryDetail:
            "Tous les projets restent dans votre espace d'auteur, sans dependance cloud imposee.",
          lastMovement: "Dernier mouvement",
          lastMovementEmpty: "Aucun manuscrit actif pour le moment.",
          commandDeck: "Pont de commande",
          commandDeckDetail:
            "Importez, restaurez ou lancez un nouveau projet sans quitter l'accueil.",
          focusKicker: "Projet prioritaire",
          focusTitle: "Reprendre la derniere piste",
          focusEmptyTitle: "Aucun projet n'est en mouvement",
          focusEmptyBody:
            "Creez un manuscrit ou importez un existant pour remplir le studio avec des cartes utiles au lieu d'un ecran vide.",
          focusSynopsisFallback:
            "Ajoutez un synopsis pour transformer cette carte en resume editorial directement exploitable.",
          focusAction: "Ouvrir l'espace projet",
          focusSecondary: "Exporter la sauvegarde",
          quickShelfKicker: "Acces rapide",
          quickShelfTitle: "Retours immediats",
          quickShelfEmpty:
            "Quand des projets existeront, cette colonne deviendra votre voie rapide pour reprendre le bon manuscrit.",
          quickShelfUpdated: "Mis a jour",
          shelfKicker: "Etagere projet",
          shelfTitle: "Manuscrits ouverts et branches de production",
          shelfSubtitle:
            "Chaque fiche doit permettre une decision rapide: promesse, positionnement, volume et prochaines actions.",
          shelfSummary: "Vue studio",
          shelfSummaryDetail: "Projets visibles dans le flux principal.",
          emptyState:
            "Aucun projet pour l'instant. Creez-en un pour afficher les parcours de planification, redaction, revision et publication.",
          noRecentProject: "Aucun projet recent",
          audiencePrefix: "Public",
          tonePrefix: "Ton",
          targetSuffix: "mots",
          updatedPrefix: "Mis a jour",
          openWorkspace: "Ouvrir l'espace projet",
          exportBackup: "Export / Sauvegarde",
        }
      : {
          eyebrow: "Command deck",
          overview:
            "Keep intake, backups, and active manuscripts inside one dense view that is actually useful at a glance.",
          activeProjects: "Active projects",
          archivedProjects: "Archived",
          languageSpread: "Languages",
          averageTarget: "Average target",
          activeProjectsDetail: "Manuscripts currently in production.",
          archivedProjectsDetail: "Branches parked outside the main flow.",
          languageSpreadDetail: "Writing languages active in the studio.",
          averageTargetDetail: "Average planned volume per active manuscript.",
          refreshing: "Refreshing the local library...",
          localLibrary: "Local library",
          localLibraryDetail:
            "Every project stays in your author workspace without mandatory cloud dependency.",
          lastMovement: "Latest movement",
          lastMovementEmpty: "No active manuscript yet.",
          commandDeck: "Command deck",
          commandDeckDetail:
            "Import, restore, or launch a new project without leaving the homepage.",
          focusKicker: "Focus project",
          focusTitle: "Resume the latest track",
          focusEmptyTitle: "No project in motion yet",
          focusEmptyBody:
            "Create or import a manuscript to replace empty space with a real working shelf.",
          focusSynopsisFallback:
            "Add a synopsis and this card turns into an editorial brief instead of a placeholder.",
          focusAction: "Open workspace",
          focusSecondary: "Export backup",
          quickShelfKicker: "Quick shelf",
          quickShelfTitle: "Fast returns",
          quickShelfEmpty:
            "When projects exist, this column becomes the shortest path back into the right manuscript.",
          quickShelfUpdated: "Updated",
          shelfKicker: "Project shelf",
          shelfTitle: "Open manuscripts and production branches",
          shelfSubtitle:
            "Each card should support a quick decision: premise, positioning, target volume, and the next actions that matter.",
          shelfSummary: "Studio view",
          shelfSummaryDetail: "Projects visible in the main flow.",
          emptyState:
            "No project yet. Create one to unlock planning, drafting, revision, publishing, and launch workflows.",
          noRecentProject: "No recent project",
          audiencePrefix: "Audience",
          tonePrefix: "Tone",
          targetSuffix: "words",
          updatedPrefix: "Updated",
          openWorkspace: "Open workspace",
          exportBackup: "Export / Backup",
        };

  const chapterCountHint =
    createMode === "template"
      ? `Recommended ${selectedTemplate.recommendedChapterCount}`
      : createMode === "outline" && outlineLineCount > 0
        ? `${outlineLineCount} outline lines detected`
        : PROJECT_FIELD_HELP.initialChapterCount.hint;

  function resetCreateForm() {
    setShowCreate(false);
    setCreateMode("idea");
    setTemplateId(DEFAULT_STARTER_TEMPLATE.id);
    setTitle("");
    setGenreTags(["Thriller"]);
    setAudienceTags(["Adult"]);
    setToneTags(["Tense"]);
    setTargetWords(80000);
    setInitialChapterCount(0);
    setSynopsis("");
    setOutlineText("");
    setActionError(null);
    setAiSuggestionNote(null);
    setAiSuggestionError(null);
    setIsSuggesting(false);
    setTemplatePreviewCollapsed(true);
  }

  function applyTemplateDefaults(template: StarterTemplateDefinition) {
    setCreateMode("template");
    setTemplateId(template.id);
    setGenreTags(splitMultiValueField(template.recommendedGenre));
    setAudienceTags(splitMultiValueField(template.recommendedAudience));
    setToneTags(splitMultiValueField(template.recommendedTone));
    setTargetWords(template.recommendedWordCount);
    setInitialChapterCount(template.recommendedChapterCount);
    setActionError(null);
    setAiSuggestionError(null);
    setAiSuggestionNote(`${template.label} defaults applied. You can still override every field.`);
    setTemplatePreviewCollapsed(true);
  }

  async function handleCreate() {
    if (!title.trim()) {
      setActionError("Project title is required.");
      return;
    }

    setActionError(null);

    const chapterCount =
      createMode === "template"
        ? Math.max(1, initialChapterCount || selectedTemplate.recommendedChapterCount)
        : createMode === "outline" && initialChapterCount === 0 && outlineLineCount > 0
          ? outlineLineCount
          : initialChapterCount;

    const created = await createProject({
      title,
      genre: joinMultiValueField(genreTags),
      audience: joinMultiValueField(audienceTags),
      tone: joinMultiValueField(toneTags),
      targetWordCount: targetWords,
      language: defaultWritingLocale,
      synopsis,
      mode: createMode,
      chapterCount,
      outlineText,
      templateId: createMode === "template" ? templateId : undefined,
    });

    resetCreateForm();
    await openProject(created.project.id);
  }

  async function handleSuggestProjectSetup() {
    if (!title.trim() && !synopsis.trim() && !outlineText.trim()) {
      setAiSuggestionError(
        "Add a working title, synopsis, or outline first so AI has something concrete to shape."
      );
      return;
    }

    setIsSuggesting(true);
    setAiSuggestionError(null);
    setAiSuggestionNote(null);

    try {
      const result = await runAiAction({
        action: "brainstorm",
        input: buildProjectSetupSuggestionInput({
          locale: defaultWritingLocale,
          createMode,
          title,
          genre: joinMultiValueField(genreTags),
          audience: joinMultiValueField(audienceTags),
          tone: joinMultiValueField(toneTags),
          targetWords,
          initialChapterCount,
          synopsis,
          outlineText,
          selectedTemplate: createMode === "template" ? selectedTemplate : null,
        }),
        context: buildProjectSetupSuggestionContext(),
        responseFormat: PROJECT_SETUP_RESPONSE_FORMAT,
        temperature: 0.1,
        maxTokens: 1600,
        settings: resolvedSettings,
      });

      const suggestion = parseProjectSetupSuggestion(result.text);
      const suggestedMode = suggestion.createMode;
      const suggestedTemplate =
        suggestedMode === "template"
          ? getStarterTemplate(suggestion.templateId) ?? selectedTemplate
          : selectedTemplate;

      setCreateMode(suggestedMode);
      if (suggestedMode === "template") {
        setTemplateId(suggestedTemplate.id);
      }

      if (suggestion.title) setTitle(suggestion.title);
      if (suggestion.genre) setGenreTags(splitMultiValueField(suggestion.genre));
      if (suggestion.audience) setAudienceTags(splitMultiValueField(suggestion.audience));
      if (suggestion.tone) setToneTags(splitMultiValueField(suggestion.tone));
      if (suggestion.targetWords) {
        setTargetWords(Math.max(1000, suggestion.targetWords));
      }
      if (suggestion.synopsis) setSynopsis(suggestion.synopsis);

      if (suggestion.initialChapterCount !== null) {
        setInitialChapterCount(Math.max(0, suggestion.initialChapterCount));
      } else if (suggestedMode === "template") {
        setInitialChapterCount(suggestedTemplate.recommendedChapterCount);
      } else if (suggestedMode === "outline" && outlineLineCount > 0) {
        setInitialChapterCount(outlineLineCount);
      }

      setAiSuggestionNote(
        suggestion.rationale
          ? `${suggestion.rationale} Suggested by ${result.model}.`
          : `Project setup suggested by ${result.model}.`
      );
    } catch (error) {
      setAiSuggestionError(error instanceof Error ? error.message : "AI suggestion failed.");
    } finally {
      setIsSuggesting(false);
    }
  }

  async function handleProjectImport(file: File) {
    const text = await file.text();
    const imported = await importProjectFile(file.name, text);
    await openProject(imported.project.id);
  }

  async function handleBackupImport(file: File) {
    const imported = await importBackupFile(file);
    await openProject(imported.project.id);
  }

  async function handleExport(projectId: string) {
    await openProject(projectId);
    const [json, markdown, backup] = await Promise.all([
      exportActiveProjectJson(),
      exportActiveProjectMarkdown(),
      exportActiveProjectBackup(),
    ]);

    if (json) downloadText(`${projectId}.json`, json, "application/json;charset=utf-8");
    if (markdown) downloadText(`${projectId}.md`, markdown, "text/markdown;charset=utf-8");
    if (backup) downloadBlob(`${projectId}.backup.zip`, backup);
  }

  async function handleDuplicate(projectId: string) {
    await openProject(projectId);
    await duplicateActiveProject();
    await refreshProjects();
  }

  return (
    <div className="app-page dashboard-page">
      <TopNav />

      <main className="shell-frame">
        <section className="dashboard-overview">
          <div className="ui-card studio-panel">
            <div className="studio-panel__header">
              <div className="studio-panel__copy">
                <p className="hero-eyebrow">{dashboardCopy.eyebrow}</p>
                <h1 className="hero-title">{t("dashboard.title")}</h1>
                <p className="hero-subtitle">{dashboardCopy.overview}</p>
              </div>

              <div className="studio-metric-grid">
                <article className="metric-card">
                  <p className="metric-label">{dashboardCopy.activeProjects}</p>
                  <p className="metric-value">{activeProjects.length}</p>
                  <p className="metric-detail">
                    {loading ? dashboardCopy.refreshing : dashboardCopy.activeProjectsDetail}
                  </p>
                </article>

                <article className="metric-card">
                  <p className="metric-label">{dashboardCopy.archivedProjects}</p>
                  <p className="metric-value">{archivedProjects}</p>
                  <p className="metric-detail">{dashboardCopy.archivedProjectsDetail}</p>
                </article>

                <article className="metric-card">
                  <p className="metric-label">{dashboardCopy.languageSpread}</p>
                  <p className="metric-value">{languageSpread}</p>
                  <p className="metric-detail">{dashboardCopy.languageSpreadDetail}</p>
                </article>

                <article className="metric-card">
                  <p className="metric-label">{dashboardCopy.averageTarget}</p>
                  <p className="metric-value">
                    {averageTargetWords > 0 ? numberFormatter.format(averageTargetWords) : "0"}
                  </p>
                  <p className="metric-detail">{dashboardCopy.averageTargetDetail}</p>
                </article>
              </div>
            </div>

            <div className="hero-actions studio-panel__actions">
              <button onClick={() => setShowCreate(true)} className="ui-btn ui-btn-primary">
                {t("dashboard.create")}
              </button>

              <label className="ui-btn ui-btn-secondary cursor-pointer">
                Import JSON/MD/TXT
                <input
                  className="hidden"
                  type="file"
                  accept=".json,.md,.markdown,.txt"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void handleProjectImport(file);
                    event.target.value = "";
                  }}
                />
              </label>

              <label className="ui-btn ui-btn-secondary cursor-pointer">
                Restore Backup
                <input
                  className="hidden"
                  type="file"
                  accept=".zip"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void handleBackupImport(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>

            <div className="studio-strip">
              <article className="studio-strip__item">
                <p className="studio-strip__label">{dashboardCopy.localLibrary}</p>
                <p className="studio-strip__value">{dashboardCopy.localLibraryDetail}</p>
              </article>

              <article className="studio-strip__item">
                <p className="studio-strip__label">{dashboardCopy.lastMovement}</p>
                <p className="studio-strip__value">
                  {mostRecentProject
                    ? `${mostRecentProject.title} / ${dateTimeFormatter.format(
                        new Date(mostRecentProject.updatedAt)
                      )}`
                    : dashboardCopy.lastMovementEmpty}
                </p>
              </article>

              <article className="studio-strip__item">
                <p className="studio-strip__label">{dashboardCopy.commandDeck}</p>
                <p className="studio-strip__value">{dashboardCopy.commandDeckDetail}</p>
              </article>
            </div>
          </div>

          <div className="dashboard-sidebar">
            <article className="ui-card focus-card">
              <div className="focus-card__header">
                <div>
                  <p className="section-kicker">{dashboardCopy.focusKicker}</p>
                  <h2 className="focus-card__heading">{dashboardCopy.focusTitle}</h2>
                </div>
                {mostRecentProject && (
                  <span className="meta-pill">
                    {dashboardCopy.updatedPrefix}{" "}
                    {dateFormatter.format(new Date(mostRecentProject.updatedAt))}
                  </span>
                )}
              </div>

              {mostRecentProject ? (
                <>
                  <div className="focus-card__body">
                    <h3 className="focus-card__title">{mostRecentProject.title}</h3>
                    <p className="focus-card__summary">
                      {mostRecentProject.synopsis || dashboardCopy.focusSynopsisFallback}
                    </p>
                  </div>

                  <div className="focus-card__meta">
                    {splitMultiValueField(mostRecentProject.genre)
                      .slice(0, 2)
                      .map((genre) => (
                        <span key={`${mostRecentProject.id}-focus-genre-${genre}`} className="meta-pill">
                          {genre}
                        </span>
                      ))}
                    {splitMultiValueField(mostRecentProject.tone)
                      .slice(0, 1)
                      .map((tone) => (
                        <span key={`${mostRecentProject.id}-focus-tone-${tone}`} className="meta-pill">
                          {dashboardCopy.tonePrefix} {tone}
                        </span>
                      ))}
                    <span className="meta-pill">
                      {numberFormatter.format(mostRecentProject.targetWordCount)}{" "}
                      {dashboardCopy.targetSuffix}
                    </span>
                  </div>

                  <div className="focus-card__actions">
                    <Link
                      href={`/workspace/${mostRecentProject.id}`}
                      className="ui-btn ui-btn-primary"
                    >
                      {dashboardCopy.focusAction}
                    </Link>
                    <button
                      onClick={() => void handleExport(mostRecentProject.id)}
                      className="ui-btn ui-btn-secondary"
                    >
                      {dashboardCopy.focusSecondary}
                    </button>
                  </div>
                </>
              ) : (
                <div className="focus-card__empty">
                  <h3 className="focus-card__title">{dashboardCopy.focusEmptyTitle}</h3>
                  <p className="focus-card__summary">{dashboardCopy.focusEmptyBody}</p>
                </div>
              )}
            </article>

            <article className="ui-card quick-shelf-card">
              <div className="quick-shelf-card__header">
                <div>
                  <p className="section-kicker">{dashboardCopy.quickShelfKicker}</p>
                  <h2 className="quick-shelf-card__title">{dashboardCopy.quickShelfTitle}</h2>
                </div>
                <span className="quick-shelf-card__badge">{projects.length}</span>
              </div>

              {activeProjects.length === 0 ? (
                <p className="quick-shelf-card__empty">{dashboardCopy.quickShelfEmpty}</p>
              ) : (
                <div className="quick-shelf-list">
                  {activeProjects.slice(0, 4).map((project) => (
                    <Link
                      key={project.id}
                      href={`/workspace/${project.id}`}
                      className="quick-shelf-item"
                    >
                      <div className="quick-shelf-item__copy">
                        <span className="quick-shelf-item__title">{project.title}</span>
                        <span className="quick-shelf-item__meta">
                          {splitMultiValueField(project.genre)[0] || dashboardCopy.noRecentProject}
                        </span>
                      </div>
                      <span className="quick-shelf-item__date">
                        {dashboardCopy.quickShelfUpdated}{" "}
                        {dateFormatter.format(new Date(project.updatedAt))}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </article>
          </div>
        </section>

        <section className="section-stack">
          <div className="section-heading">
            <div>
              <p className="section-kicker">{dashboardCopy.shelfKicker}</p>
              <h2 className="section-title">{dashboardCopy.shelfTitle}</h2>
              <p className="section-subtitle">{dashboardCopy.shelfSubtitle}</p>
            </div>

            <div className="section-summary-card">
              <p className="section-summary-card__label">{dashboardCopy.shelfSummary}</p>
              <p className="section-summary-card__value">{activeProjects.length}</p>
              <p className="section-summary-card__detail">{dashboardCopy.shelfSummaryDetail}</p>
            </div>
          </div>

          {loading && <p className="text-sm text-slate-600">Loading projects...</p>}

          {!loading && activeProjects.length === 0 && (
            <div className="empty-state">{dashboardCopy.emptyState}</div>
          )}

          <div className="collection-grid">
            {activeProjects.map((project) => (
              <article key={project.id} className="ui-card project-card p-5 sm:p-6">
                <div className="project-card__header">
                  <div className="project-card__meta">
                    {splitMultiValueField(project.genre).map((genre) => (
                      <span key={`${project.id}-genre-${genre}`} className="meta-pill">
                        {genre}
                      </span>
                    ))}
                    <span className="meta-pill">{project.language.toUpperCase()}</span>
                    <span className="meta-pill">
                      {dashboardCopy.updatedPrefix}{" "}
                      {dateFormatter.format(new Date(project.updatedAt))}
                    </span>
                  </div>
                </div>

                <div className="project-card__body">
                  <h3 className="project-card__title">{project.title}</h3>
                  <p className="project-card__summary">
                    {project.synopsis ||
                      dashboardCopy.focusSynopsisFallback}
                  </p>
                </div>

                <div className="project-card__footer">
                  <div className="project-card__stats">
                    {splitMultiValueField(project.audience).map((audience) => (
                      <span key={`${project.id}-audience-${audience}`} className="meta-pill">
                        {dashboardCopy.audiencePrefix} {audience}
                      </span>
                    ))}
                    {splitMultiValueField(project.tone).map((tone) => (
                      <span key={`${project.id}-tone-${tone}`} className="meta-pill">
                        {dashboardCopy.tonePrefix} {tone}
                      </span>
                    ))}
                    <span className="meta-pill">
                      {numberFormatter.format(project.targetWordCount)}{" "}
                      {dashboardCopy.targetSuffix}
                    </span>
                  </div>

                  <div className="project-card__actions">
                    <Link href={`/workspace/${project.id}`} className="ui-btn ui-btn-primary">
                      {dashboardCopy.openWorkspace}
                    </Link>
                    <button
                      onClick={() => void handleDuplicate(project.id)}
                      className="ui-btn ui-btn-secondary"
                    >
                      {t("common.duplicate")}
                    </button>
                    <button
                      onClick={() => void handleExport(project.id)}
                      className="ui-btn ui-btn-secondary"
                    >
                      {dashboardCopy.exportBackup}
                    </button>
                    <button
                      onClick={() => void archiveProjectById(project.id, "archived")}
                      className="ui-btn ui-btn-secondary"
                    >
                      {t("common.archive")}
                    </button>
                    <button
                      onClick={() => void deleteProjectById(project.id)}
                      className="ui-btn ui-btn-danger"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {showCreate && (
        <div className="modal-shell">
          <div className="modal-panel modal-panel--project-create">
            <div className="create-modal">
              <header className="create-modal__header">
                <div>
                  <p className="hero-eyebrow">New project</p>
                  <h2 className="create-modal__title">Create a new book project.</h2>
                  <p className="create-modal__subtitle">
                    Pick the starting structure first. Then define the book brief that will drive
                    planning, drafting, and AI context.
                  </p>
                </div>
              </header>

              <section className="create-section">
                <div className="create-section__heading">
                  <span className="create-section__step">01</span>
                  <div>
                    <h3 className="create-section__title">Choose how to start</h3>
                    <p className="create-section__body">
                      Each path changes the opening structure only. The workspace and editing tools
                      stay the same after creation.
                    </p>
                  </div>
                </div>

                <div className="mode-grid create-mode-grid">
                  {(Object.keys(CREATE_MODE_COPY) as CreateMode[]).map((mode) => {
                    const copy = CREATE_MODE_COPY[mode];

                    return (
                      <button
                        key={mode}
                        type="button"
                        data-active={createMode === mode}
                        onClick={() => {
                          setCreateMode(mode);
                          setTemplatePreviewCollapsed(true);
                          if (mode === "template" && initialChapterCount === 0) {
                            setInitialChapterCount(selectedTemplate.recommendedChapterCount);
                          }
                        }}
                        className="mode-card"
                      >
                        <span className="mode-card__eyebrow">{copy.eyebrow}</span>
                        <span className="mode-card__title">{copy.title}</span>
                        <span className="mode-card__body">{copy.body}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="create-mode-summary">
                  <div className="create-mode-summary__header">
                    <p className="mode-card__eyebrow">Selected path</p>
                    <p className="create-mode-summary__title">
                      {CREATE_MODE_COPY[createMode].title}
                    </p>
                  </div>
                  <p className="create-mode-summary__text">
                    {CREATE_MODE_COPY[createMode].note}
                  </p>
                  <p className="create-mode-summary__text">
                    {CREATE_MODE_COPY[createMode].outcome}
                  </p>
                </div>
              </section>

              {createMode === "template" && (
                <section className="create-section">
                  <div className="create-section__heading">
                    <span className="create-section__step">02</span>
                    <div>
                      <h3 className="create-section__title">Choose the starter pack</h3>
                      <p className="create-section__body">
                        Select the structural frame. Keep the preview collapsed unless you need to
                        inspect the seeded beats.
                      </p>
                    </div>
                  </div>

                  <div className="template-workbench">
                    <div className="form-card template-workbench__selector">
                      <div className="create-intake__header">
                        <div>
                          <p className="mode-card__eyebrow">Template selector</p>
                          <p className="text-base font-semibold text-slate-900">
                            Pick one starting frame.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => applyTemplateDefaults(selectedTemplate)}
                          className="ui-btn ui-btn-secondary"
                        >
                          Apply defaults
                        </button>
                      </div>

                      <div className="template-grid">
                        {STARTER_TEMPLATES.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            data-active={template.id === templateId}
                            className="template-card"
                            onClick={() => {
                              setTemplateId(template.id);
                              setTemplatePreviewCollapsed(true);
                            }}
                          >
                            <span className="mode-card__eyebrow">{template.eyebrow}</span>
                            <span className="mode-card__title">{template.label}</span>
                            <span className="mode-card__body">{template.summary}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="template-workbench__details">
                      <div className="form-card template-summary">
                        <div className="template-summary__hero">
                          <div>
                            <p className="mode-card__eyebrow">Selected template</p>
                            <p className="template-summary__title">{selectedTemplate.label}</p>
                            <p className="template-summary__body">{selectedTemplate.summary}</p>
                            <p className="template-summary__best-for">
                              Best for {selectedTemplate.bestFor}
                            </p>
                          </div>
                          <div className="template-summary__stats">
                            <div className="template-summary__stat">
                              <span className="template-summary__stat-label">Chapters</span>
                              <span className="template-summary__stat-value">
                                {selectedTemplate.recommendedChapterCount}
                              </span>
                            </div>
                            <div className="template-summary__stat">
                              <span className="template-summary__stat-label">Target</span>
                              <span className="template-summary__stat-value">
                                {selectedTemplate.recommendedWordCount.toLocaleString()}
                              </span>
                            </div>
                            <div className="template-summary__stat">
                              <span className="template-summary__stat-label">Genre</span>
                              <span className="template-summary__stat-value">
                                {selectedTemplate.recommendedGenre}
                              </span>
                            </div>
                            <div className="template-summary__stat">
                              <span className="template-summary__stat-label">Tone</span>
                              <span className="template-summary__stat-value">
                                {selectedTemplate.recommendedTone}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="template-summary__features">
                          {selectedTemplate.whatYouGet.map((item) => (
                            <div key={item} className="template-summary__feature">
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>

                      <CollapsibleCard
                        title="Starter Beat Preview"
                        subtitle={selectedTemplate.note}
                        collapsed={templatePreviewCollapsed}
                        onToggle={() => setTemplatePreviewCollapsed((current) => !current)}
                        className="template-preview-card"
                        collapseLabel="Hide preview"
                        expandLabel="Show preview"
                      >
                        <div className="template-beat-list">
                          {selectedTemplate.chapterBlueprints.slice(0, 3).map((chapter, index) => (
                            <div key={chapter.title} className="template-beat">
                              <span className="template-beat__index">{index + 1}</span>
                              <div>
                                <p className="template-beat__title">{chapter.title}</p>
                                <p className="template-beat__summary">{chapter.summary}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleCard>
                    </div>
                  </div>
                </section>
              )}

              <section className="create-section">
                <div className="create-section__heading">
                  <span className="create-section__step">
                    {createMode === "template" ? "03" : "02"}
                  </span>
                  <div>
                    <h3 className="create-section__title">Define the book brief</h3>
                    <p className="create-section__body">
                      These fields describe the book itself and carry into the shelf, AI prompts,
                      and export surfaces.
                    </p>
                  </div>
                </div>

                <div className="form-card create-form-card">
                  <div className="create-intake__header">
                    <div>
                      <p className="mode-card__eyebrow">Book brief</p>
                      <p className="text-base font-semibold text-slate-900">
                        Fill only what matters now. You can refine the rest in the workspace.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSuggestProjectSetup()}
                      disabled={isSuggesting}
                      className="ui-btn ui-btn-primary"
                    >
                      {isSuggesting ? "Suggesting..." : "Suggest with AI"}
                    </button>
                  </div>

                  {aiSuggestionNote && (
                    <p className="create-intake__status create-intake__status--success">
                      {aiSuggestionNote}
                    </p>
                  )}

                  {aiSuggestionError && (
                    <p className="create-intake__status create-intake__status--error">
                      {aiSuggestionError}
                    </p>
                  )}

                  <div className="create-form-grid">
                    <label className="grid gap-2 text-sm text-slate-700 create-form-grid__title">
                      <FieldLabel
                        htmlFor="project-title"
                        label={PROJECT_FIELD_HELP.title.label}
                        help={PROJECT_FIELD_HELP.title.help}
                        hint={PROJECT_FIELD_HELP.title.hint}
                      />
                      <input
                        id="project-title"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="The Ninth Archive"
                        className="ui-input ui-input-default"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-slate-700">
                      <FieldLabel
                        htmlFor="project-target-words"
                        label={PROJECT_FIELD_HELP.targetWords.label}
                        help={PROJECT_FIELD_HELP.targetWords.help}
                        hint={PROJECT_FIELD_HELP.targetWords.hint}
                      />
                      <input
                        id="project-target-words"
                        type="number"
                        min={1000}
                        step={1000}
                        value={targetWords}
                        onChange={(event) =>
                          setTargetWords(Number(event.target.value) || 80000)
                        }
                        className="ui-input ui-input-default"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-slate-700">
                      <FieldLabel
                        htmlFor="project-initial-chapters"
                        label={PROJECT_FIELD_HELP.initialChapterCount.label}
                        help={PROJECT_FIELD_HELP.initialChapterCount.help}
                        hint={chapterCountHint}
                      />
                      <input
                        id="project-initial-chapters"
                        type="number"
                        min={0}
                        step={1}
                        value={initialChapterCount}
                        onChange={(event) =>
                          setInitialChapterCount(Math.max(0, Number(event.target.value) || 0))
                        }
                        className="ui-input ui-input-default"
                      />
                    </label>

                    <MultiTagCombobox
                      className="create-form-grid__full"
                      id="project-genre"
                      label={PROJECT_FIELD_HELP.genre.label}
                      values={genreTags}
                      onChange={setGenreTags}
                      suggestions={GENRE_SUGGESTIONS}
                      help={PROJECT_FIELD_HELP.genre.help}
                      hint={PROJECT_FIELD_HELP.genre.hint}
                      placeholder="Search genre or type your own"
                    />

                    <MultiTagCombobox
                      className="create-form-grid__full"
                      id="project-audience"
                      label={PROJECT_FIELD_HELP.audience.label}
                      values={audienceTags}
                      onChange={setAudienceTags}
                      suggestions={AUDIENCE_SUGGESTIONS}
                      help={PROJECT_FIELD_HELP.audience.help}
                      hint={PROJECT_FIELD_HELP.audience.hint}
                      placeholder="Search audience or type your own"
                    />

                    <MultiTagCombobox
                      className="create-form-grid__full"
                      id="project-tone"
                      label={PROJECT_FIELD_HELP.tone.label}
                      values={toneTags}
                      onChange={setToneTags}
                      suggestions={TONE_SUGGESTIONS}
                      help={PROJECT_FIELD_HELP.tone.help}
                      hint={PROJECT_FIELD_HELP.tone.hint}
                      placeholder="Search tone or type your own"
                    />

                    <label className="grid gap-2 text-sm text-slate-700 create-form-grid__full">
                      <FieldLabel
                        htmlFor="project-synopsis"
                        label={PROJECT_FIELD_HELP.synopsis.label}
                        help={PROJECT_FIELD_HELP.synopsis.help}
                        hint={PROJECT_FIELD_HELP.synopsis.hint}
                      />
                      <textarea
                        id="project-synopsis"
                        rows={4}
                        value={synopsis}
                        onChange={(event) => setSynopsis(event.target.value)}
                        placeholder="A librarian discovers a sealed archive that rewrites living memories, forcing her to decide which history deserves to survive."
                        className="ui-input ui-input-wide"
                      />
                    </label>

                    {createMode === "outline" && (
                      <label className="grid gap-2 text-sm text-slate-700 create-form-grid__full">
                        <FieldLabel
                          htmlFor="project-outline"
                          label={PROJECT_FIELD_HELP.outlineText.label}
                          help={PROJECT_FIELD_HELP.outlineText.help}
                          hint={
                            outlineLineCount > 0
                              ? `${outlineLineCount} chapter shells ready to create`
                              : PROJECT_FIELD_HELP.outlineText.hint
                          }
                        />
                        <textarea
                          id="project-outline"
                          rows={6}
                          value={outlineText}
                          onChange={(event) => setOutlineText(event.target.value)}
                          placeholder={"1. Discovery in the archive\n2. Memory leak reaches the city\n3. The first betrayal"}
                          className="ui-input ui-input-wide"
                        />
                      </label>
                    )}
                  </div>

                  {actionError && (
                    <p className="create-intake__status create-intake__status--error">
                      {actionError}
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <button onClick={resetCreateForm} className="ui-btn ui-btn-secondary">
                      {t("common.cancel")}
                    </button>
                    <button onClick={() => void handleCreate()} className="ui-btn ui-btn-primary">
                      Create and Open
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
