"use client";

import InfoTooltip from "@/app/components/ui/InfoTooltip";

export default function FieldLabel({
  htmlFor,
  label,
  help,
  hint,
}: {
  htmlFor?: string;
  label: string;
  help?: string;
  hint?: string;
}) {
  return (
    <div className="field-label">
      <div className="field-label__main">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="field-label__text">
            {label}
          </label>
        ) : (
          <span className="field-label__text">{label}</span>
        )}
        {help && <InfoTooltip text={help} label={`${label} help`} />}
      </div>
      {hint && <span className="field-label__hint">{hint}</span>}
    </div>
  );
}
