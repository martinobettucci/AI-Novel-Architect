"use client";

import FieldLabel from "@/app/components/ui/FieldLabel";

export default function FilterInput({
  id,
  label,
  value,
  onChange,
  help,
  placeholder = "Search...",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  placeholder?: string;
}) {
  return (
    <label className="filter-input">
      <FieldLabel htmlFor={id} label={label} help={help} hint="Filter" />
      <div className="filter-input__field">
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="ui-input ui-input-compact pr-14"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="filter-input__clear"
          >
            Clear
          </button>
        )}
      </div>
    </label>
  );
}
