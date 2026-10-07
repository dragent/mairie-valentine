"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { RequireRole } from "@/components/require-role";
import { ErrorBanner } from "@/components/resource-table";
import { ROLE_ELU, ROLE_SECRETAIRE, appointments, decrees, municipalEvents, type Decree } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { buildMonth, countByKind, filterByKind, townToday, type CalendarEntry } from "@/lib/calendar";
import { describe, useResource } from "@/lib/use-resource";

const WEEKDAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

const ENTRY_KIND: Record<CalendarEntry["kind"], { label: string; filter: string; tone: string }> = {
  event: { label: "Événement", filter: "Événements", tone: "text-foreground" },
  appointment: { label: "Rendez-vous", filter: "Rendez-vous", tone: "text-accent" },
  decree: { label: "Décret en cours", filter: "Décrets en cours", tone: "text-primary" },
};

const ALL_KINDS_ON: Record<CalendarEntry["kind"], boolean> = {
  event: true,
  appointment: true,
  decree: true,
};

export default function CalendarPage() {
  const { user, hasRole } = useAuth();
  const canSeeDecrees = hasRole(ROLE_ELU);
  const events = useResource(municipalEvents);
  const meetings = useResource(appointments);
  const register = useDecrees(canSeeDecrees);
  const today = townToday();
  const [cursor, setCursor] = useState(() => {
    const current = townToday();

    return new Date(current.getFullYear(), current.getMonth(), 1);
  });
  const [shown, setShown] = useState(ALL_KINDS_ON);
  const kinds = (Object.keys(ENTRY_KIND) as CalendarEntry["kind"][]).filter(
    (kind) => kind !== "decree" || canSeeDecrees,
  );

  const pending =
    (events.items === null && events.error === null) ||
    (meetings.items === null && meetings.error === null) ||
    (canSeeDecrees && register.items === null && register.error === null);
  const month = buildMonth(
    cursor.getFullYear(),
    cursor.getMonth(),
    events.items ?? [],
    meetings.items ?? [],
    register.items ?? [],
  );
  const cells = filterByKind(month, shown);
  const counts = countByKind(month);
  const message =
    [events.error, meetings.error, register.error].filter((error) => error !== null).join(" ") || null;
  const title = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const lead = canSeeDecrees
    ? "Événements municipaux, rendez-vous du guichet et décrets en cours, sur le mois."
    : "Événements municipaux et rendez-vous du guichet, sur le mois.";
  const signatory = user?.displayName ?? user?.username;
  const signature = user?.jobLabel && signatory ? `${user.jobLabel} — ${signatory}` : signatory;

  function move(months: number) {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + months, 1));
  }

  function toggle(kind: CalendarEntry["kind"]) {
    setShown((current) => ({ ...current, [kind]: !current[kind] }));
  }

  return (
    <RequireRole role={ROLE_SECRETAIRE}>
      <section className="ledger-frame bg-surface px-8 py-8 sm:px-10">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <Image
            src="/sceau-mairie.png"
            alt=""
            width={112}
            height={112}
            className="size-28 shrink-0 object-contain"
          />
          <div className="space-y-3 text-center sm:text-left">
            <p className="text-xs tracking-[0.28em] text-gold-dark uppercase">Greffe municipal</p>
            <h1 className="font-display text-4xl text-heading">Calendrier</h1>
            {signature && <p className="text-sm text-accent">{signature}</p>}
          </div>
        </div>

        <p className="mt-8 max-w-2xl text-center leading-relaxed sm:text-left">{lead}</p>

        <Ornament />

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-2xl text-heading capitalize">{title}</h2>
              <div className="flex flex-wrap gap-4 text-xs tracking-wide text-muted">
                <button type="button" onClick={() => move(-1)} className="hover:text-foreground">
                  Mois précédent
                </button>
                <button
                  type="button"
                  onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
                  className="hover:text-foreground"
                >
                  Aujourd&apos;hui
                </button>
                <button type="button" onClick={() => move(1)} className="hover:text-foreground">
                  Mois suivant
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              <ErrorBanner message={message} />

              {pending ? (
                <p className="text-muted">Chargement…</p>
              ) : (
                <div className="grid grid-cols-7 border border-line">
                  {WEEKDAYS.map((weekday, index) => (
                    <div
                      key={weekday}
                      className={`px-2 py-2 text-center text-xs tracking-wide text-muted ${index > 0 ? "border-l border-line" : ""}`}
                    >
                      {weekday}
                    </div>
                  ))}
                  {cells.map((cell, index) => {
                    const isToday = sameDay(cell.date, today);

                    return (
                      <div
                        key={cell.key}
                        className={`min-h-24 border-t border-line p-2 ${index % 7 === 0 ? "" : "border-l border-line"} ${cell.inMonth ? "" : "bg-background/40"} ${isToday ? "ring-1 ring-accent ring-inset" : ""}`}
                      >
                        <time
                          dateTime={cell.key}
                          className={`text-xs ${cell.inMonth ? "text-foreground" : "text-muted"}`}
                        >
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
          </div>

          <aside className="h-full bg-background/35 px-6 py-6 lg:border-l lg:border-line lg:pl-8">
            <h2 className="font-display text-2xl text-heading">À afficher</h2>
            <ul className="mt-2 divide-y divide-line">
              {kinds.map((kind) => {
                const on = shown[kind];
                const meta = ENTRY_KIND[kind];

                return (
                  <li key={kind} className="py-5">
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(kind)}
                      className="flex items-baseline gap-2 text-left"
                    >
                      <span className={`font-display text-lg ${on ? meta.tone : "text-muted line-through"}`}>
                        {meta.filter}
                      </span>
                      <span className="text-sm text-muted">{counts[kind]}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </section>
    </RequireRole>
  );
}

function Ornament() {
  return (
    <div className="my-8 flex items-center gap-4" aria-hidden="true">
      <span className="h-px flex-1 bg-gold-dark/70" />
      <span className="size-1.5 rotate-45 bg-gold-dark" />
      <span className="h-px flex-1 bg-gold-dark/70" />
    </div>
  );
}

function EntryLink({ entry }: { entry: CalendarEntry }) {
  const kind = ENTRY_KIND[entry.kind];

  return (
    <Link
      href={entry.href}
      title={kind.label}
      className={`block text-xs leading-snug hover:underline ${entry.muted ? "text-muted line-through" : kind.tone}`}
    >
      {entry.time !== "" && <span className="text-muted">{entry.time} </span>}
      {entry.label}
    </Link>
  );
}

function useDecrees(enabled: boolean): { items: Decree[] | null; error: string | null } {
  const { token } = useAuth();
  const [state, setState] = useState<{ items: Decree[] | null; error: string | null }>({
    items: null,
    error: null,
  });

  useEffect(() => {
    if (!enabled || token === null) {
      return;
    }

    let cancelled = false;

    decrees
      .list(token)
      .then((loaded) => {
        if (!cancelled) {
          setState({ items: loaded, error: null });
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setState({ items: null, error: describe(cause) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, token]);

  if (!enabled) {
    return { items: [], error: null };
  }

  return state;
}

function sameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
