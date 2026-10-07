"use client";

import Link from "next/link";
import { useState } from "react";

import { RequireRole } from "@/components/require-role";
import { ErrorBanner, WorkspaceHeading } from "@/components/resource-table";
import { ROLE_SECRETAIRE, appointments, municipalEvents } from "@/lib/api";
import { buildMonth, type CalendarEntry } from "@/lib/calendar";
import { useResource } from "@/lib/use-resource";

const WEEKDAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

export default function CalendarPage() {
  const events = useResource(municipalEvents);
  const meetings = useResource(appointments);
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const pending =
    (events.items === null && events.error === null) ||
    (meetings.items === null && meetings.error === null);
  const cells = buildMonth(cursor.getFullYear(), cursor.getMonth(), events.items ?? [], meetings.items ?? []);
  const message = [events.error, meetings.error].filter((error) => error !== null).join(" ") || null;
  const title = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  function move(months: number) {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + months, 1));
  }

  return (
    <RequireRole role={ROLE_SECRETAIRE}>
      <div className="space-y-8">
        <WorkspaceHeading
          title="Calendrier"
          lead="Événements municipaux et rendez-vous du guichet, sur le mois."
        />

        <ErrorBanner message={message} />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-xl text-heading capitalize">{title}</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <button type="button" onClick={() => move(-1)} className="text-muted hover:text-foreground">
              Mois précédent
            </button>
            <button
              type="button"
              onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="text-muted hover:text-foreground"
            >
              Aujourd&apos;hui
            </button>
            <button type="button" onClick={() => move(1)} className="text-muted hover:text-foreground">
              Mois suivant
            </button>
          </div>
        </div>

        {pending ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : (
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-line bg-line">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="bg-surface px-2 py-2 text-center text-xs text-muted">
                {weekday}
              </div>
            ))}
            {cells.map((cell) => {
              const isToday = sameDay(cell.date, today);

              return (
                <div
                  key={cell.key}
                  className={`min-h-24 p-2 ${cell.inMonth ? "bg-surface" : "bg-background"} ${isToday ? "ring-1 ring-accent ring-inset" : ""}`}
                >
                  <time dateTime={cell.key} className={`text-xs ${cell.inMonth ? "text-foreground" : "text-muted"}`}>
                    {cell.day}
                  </time>
                  <ul className="mt-1 space-y-1">
                    {cell.entries.map((entry) => (
                      <li key={entry.id}>
                        <EntryLink entry={entry} />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RequireRole>
  );
}

function EntryLink({ entry }: { entry: CalendarEntry }) {
  const kind = entry.kind === "event" ? "Événement" : "Rendez-vous";

  return (
    <Link
      href={entry.href}
      title={kind}
      className={`block text-xs leading-snug hover:text-accent ${entry.muted ? "text-muted line-through" : "text-foreground"}`}
    >
      {entry.time !== "" && <span className="text-muted">{entry.time} </span>}
      {entry.label}
    </Link>
  );
}

function sameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
