"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import InfoTooltip from "@/app/components/ui/InfoTooltip";
import { splitMultiValueField } from "@/app/lib/projectIntake";

export default function MultiTagCombobox({
  id,
  className,
  label,
  values,
  onChange,
  suggestions,
  help,
  hint,
  placeholder = "Search or type and press Enter",
  emptyMessage = "No preset match. Press Enter to add your own term.",
}: {
  id: string;
  className?: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  suggestions: string[];
  help?: string;
  hint?: string;
  placeholder?: string;
  emptyMessage?: string;
}) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const normalizedValues = useMemo(() => splitMultiValueField(values.join(", ")), [values]);

  const availableSuggestions = useMemo(() => {
    const selected = new Set(normalizedValues.map((value) => value.toLocaleLowerCase()));
    const loweredQuery = query.trim().toLocaleLowerCase();

    return suggestions
      .filter((suggestion) => !selected.has(suggestion.toLocaleLowerCase()))
      .filter((suggestion) =>
        loweredQuery ? suggestion.toLocaleLowerCase().includes(loweredQuery) : true
      )
      .slice(0, 8);
  }, [normalizedValues, query, suggestions]);

  const canCreate = useMemo(() => {
    const candidates = splitMultiValueField(query);
    if (candidates.length !== 1) return false;
    const candidate = candidates[0].toLocaleLowerCase();

    return !normalizedValues.some((value) => value.toLocaleLowerCase() === candidate);
  }, [normalizedValues, query]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function commitValue(rawValue: string) {
    const additions = splitMultiValueField(rawValue);
    if (additions.length === 0) return;

    const nextValues = splitMultiValueField([...normalizedValues, ...additions].join(", "));
    onChange(nextValues);
    setQuery("");
    setIsOpen(true);
  }

  function removeValue(valueToRemove: string) {
    onChange(
      normalizedValues.filter(
        (value) => value.toLocaleLowerCase() !== valueToRemove.toLocaleLowerCase()
      )
    );
    inputRef.current?.focus();
  }

  return (
    <div className={`multi-tag-combobox${className ? ` ${className}` : ""}`} ref={rootRef}>
      <div className="multi-tag-combobox__label">
        <div className="field-label__main">
          <label htmlFor={id} className="field-label__text">
            {label}
          </label>
          {help && <InfoTooltip text={help} label={`${label} help`} />}
        </div>
        {hint && <p className="multi-tag-combobox__hint">{hint}</p>}
      </div>

      <div
        className="multi-tag-combobox__shell"
        data-open={isOpen}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <div className="multi-tag-combobox__tokens">
          {normalizedValues.map((value) => (
            <span key={value} className="multi-tag-combobox__token">
              <span>{value}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeValue(value);
                }}
                className="multi-tag-combobox__token-remove"
                aria-label={`Remove ${value}`}
              >
                x
              </button>
            </span>
          ))}

          <input
            id={id}
            ref={inputRef}
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                commitValue(query);
                return;
              }

              if (event.key === "Backspace" && !query && normalizedValues.length > 0) {
                removeValue(normalizedValues[normalizedValues.length - 1]);
                return;
              }

              if (event.key === "Escape") {
                setIsOpen(false);
              }
            }}
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            placeholder={normalizedValues.length === 0 ? placeholder : ""}
            className="multi-tag-combobox__input"
          />
        </div>
      </div>

      {isOpen && (
        <div id={listboxId} role="listbox" className="multi-tag-combobox__menu">
          {canCreate && (
            <button
              type="button"
              role="option"
              aria-selected="false"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => commitValue(query)}
              className="multi-tag-combobox__option multi-tag-combobox__option--create"
            >
              Add &quot;{splitMultiValueField(query)[0]}&quot;
            </button>
          )}

          {availableSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              role="option"
              aria-selected="false"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => commitValue(suggestion)}
              className="multi-tag-combobox__option"
            >
              {suggestion}
            </button>
          ))}

          {!canCreate && availableSuggestions.length === 0 && (
            <div className="multi-tag-combobox__empty">{emptyMessage}</div>
          )}
        </div>
      )}
    </div>
  );
}
