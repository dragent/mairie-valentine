"use client";

import type { FormEvent, ReactNode } from "react";

const INPUT_CLASS =
  "w-full rounded-md border border-line bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent";

export function WorkspaceHeading({ title, lead }: { title: string; lead: string }) {
  return (
    <header className="space-y-2">
      <h1 className="font-display text-2xl text-heading">{title}</h1>
      <p className="max-w-2xl text-sm text-muted">{lead}</p>
    </header>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (message === null) {
    return null;
  }

  return (
    <p role="alert" className="rounded-md border border-primary bg-surface px-4 py-3 text-sm text-primary">
      {message}
    </p>
  );
}

/**
 * The register itself. Rows are laid out by the page, which knows what its own
 * columns mean; everything around them is shared.
 */
export function ResourceTable({
  headers,
  isLoading,
  isEmpty,
  emptyLabel,
  children,
}: {
  headers: string[];
  isLoading: boolean;
  isEmpty: boolean;
  emptyLabel: string;
  children: ReactNode;
}) {
  if (isLoading) {
    return <p className="text-muted">Chargement…</p>;
  }

  if (isEmpty) {
    return <p className="rounded-lg border border-line bg-surface p-6 text-sm text-muted">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col" className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function ResourceForm({
  legend,
  submitLabel,
  isBusy,
  onSubmit,
  children,
}: {
  legend: string;
  submitLabel: string;
  isBusy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-line bg-surface p-6">
      <fieldset disabled={isBusy} className="space-y-4">
        <legend className="font-display text-lg text-heading">{legend}</legend>

        <div className="grid gap-4 sm:grid-cols-2">{children}</div>

        <button
          type="submit"
          className="rounded-md border border-gold-dark bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-accent disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </fieldset>
    </form>
  );
}

export function Field({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`space-y-1 text-sm ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-muted">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: React.ComponentProps<"input">) {
  return <input {...props} className={INPUT_CLASS} />;
}

export function TextArea(props: React.ComponentProps<"textarea">) {
  return <textarea rows={4} {...props} className={INPUT_CLASS} />;
}

export function Select(props: React.ComponentProps<"select">) {
  // The minimum width keeps the labels readable in the narrow table cells.
  return <select {...props} className={`${INPUT_CLASS} min-w-32`} />;
}

export function RowAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-muted underline hover:text-foreground">
      {label}
    </button>
  );
}
