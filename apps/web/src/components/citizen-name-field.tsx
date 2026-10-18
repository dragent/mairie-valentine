"use client";

import { useId, useState } from "react";

import { TextInput } from "@/components/resource-table";

export function CitizenNameField({
  value,
  suggestions,
  onChange,
}: {
  value: string;
  suggestions: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const inputId = useId();
  const listId = useId();
  const visible = open && suggestions.length > 0;

  return (
    <div className="space-y-1 text-sm">
      <label htmlFor={inputId} className="text-muted">
        Citoyen
      </label>
      <TextInput
        id={inputId}
        required
        maxLength={120}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={visible ? listId : undefined}
        value={value}
        onChange={(event) => {
          setOpen(true);
          onChange(event.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      />
      {visible && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Citoyens déjà reçus"
          className="overflow-hidden rounded-md border border-line bg-background"
        >
          {suggestions.map((name) => (
            <li key={name}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="block w-full px-3 py-2 text-left hover:bg-surface"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChange(name)}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
