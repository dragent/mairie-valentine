"use client";

import { useState, type ReactNode, type SyntheticEvent } from "react";

/** A ledger panel: the heading opens and closes the whole container. */
export function Fold({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(true);

  function onToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    setOpen(event.currentTarget.open);
  }

  return (
    <details
      className={`group border border-line bg-background/30 ${className}`}
      open={open}
      onToggle={onToggle}
    >
      <summary className="grid cursor-pointer list-none grid-cols-[1.5rem_minmax(0,1fr)_1.5rem] items-center px-5 py-4 outline-none focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-gold-dark [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" />
        <h2 className="text-center font-display text-2xl text-heading">{title}</h2>
        <FoldMark />
      </summary>
      <div className="border-t border-line px-6 py-6">{children}</div>
    </details>
  );
}

function FoldMark() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4 justify-self-end text-gold-dark transition-transform group-open:rotate-180"
      fill="currentColor"
    >
      <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" />
    </svg>
  );
}
