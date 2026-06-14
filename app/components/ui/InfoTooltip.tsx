"use client";

import { useId } from "react";

export default function InfoTooltip({
  text,
  label = "Field help",
}: {
  text: string;
  label?: string;
}) {
  const tooltipId = useId();

  return (
    <span className="info-tooltip">
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        className="info-tooltip__trigger"
      >
        ?
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="info-tooltip__bubble"
      >
        {text}
      </span>
    </span>
  );
}
