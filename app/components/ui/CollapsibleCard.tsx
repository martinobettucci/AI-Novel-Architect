"use client";

export default function CollapsibleCard({
  title,
  subtitle,
  collapsed,
  onToggle,
  children,
  className = "",
  collapseLabel = "Collapse",
  expandLabel = "Expand",
}: {
  title: string;
  subtitle?: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  collapseLabel?: string;
  expandLabel?: string;
}) {
  return (
    <article className={`ui-card collapsible-card p-4 sm:p-5 ${className}`}>
      <div className="collapsible-card__header">
        <div>
          <h3 className="collapsible-card__title">{title}</h3>
          {subtitle && <p className="collapsible-card__subtitle">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="collapsible-card__toggle"
        >
          {collapsed ? expandLabel : collapseLabel}
        </button>
      </div>
      {!collapsed && children}
    </article>
  );
}
