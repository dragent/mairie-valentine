"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { PUBLIC_API_URL, fetchPublicBoard, type Decree, type MunicipalEvent } from "@/lib/api";
import { buildMonth, townLayoutYear, townToday, type CalendarEntry } from "@/lib/calendar";
import { formatTownWhen } from "@/lib/calendar-sheet";
import { calendarSources } from "@/lib/public-calendar";

const WEEKDAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

const TONE: Record<"decree" | "event", string> = {
  decree: "text-primary",
  event: "text-foreground",
};

type Notice =
  | { kind: "event"; title: string; posterUrl: string | null }
  | { kind: "decree"; reference: string; title: string; period: string };

export function PublicCalendar() {
  const today = townToday();
  const [cursor, setCursor] = useState(() => {
    const current = townToday();

    return new Date(current.getFullYear(), current.getMonth(), 1);
  });
  const [events, setEvents] = useState<MunicipalEvent[] | null>(null);
  const [decrees, setDecrees] = useState<Decree[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [opened, setOpened] = useState<Notice | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchPublicBoard()
      .then((board) => {
        if (cancelled) {
          return;
        }

        const sources = calendarSources(board);
        setEvents(sources.events);
        setDecrees(sources.decrees);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setEvents([]);
          setDecrees([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const month = buildMonth(
    cursor.getFullYear(),
    cursor.getMonth(),
    events ?? [],
    [],
    decrees ?? [],
    townLayoutYear(cursor.getFullYear()),
  );
  const title = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const pending = events === null || decrees === null;

  function move(months: number) {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + months, 1));
  }

  function open(entry: CalendarEntry) {
    const notice = noticeFor(entry, events ?? [], decrees ?? []);

    if (notice !== null) {
      setOpened(notice);
    }
  }

  return (
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
        </div>
      </div>

      <p className="mt-8 max-w-2xl text-center leading-relaxed sm:text-left">
        Les arrêtés en vigueur et les événements municipaux, sur le mois.
      </p>

      <Ornament />

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

      <div className="mt-6">
        {failed ? (
          <p className="text-muted">L&apos;affichage n&apos;a pas pu être chargé.</p>
        ) : pending ? (
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
            {month.map((cell, index) => {
              const isToday = sameDay(cell.date, today);

              return (
                <div
                  key={cell.key}
                  className={`min-h-24 border-t border-line p-2 ${index % 7 === 0 ? "" : "border-l border-line"} ${cell.inMonth ? "" : "bg-background/40"} ${isToday ? "ring-1 ring-accent ring-inset" : ""}`}
                >
                  <time dateTime={cell.key} className={`text-xs ${cell.inMonth ? "text-foreground" : "text-muted"}`}>
                    {cell.day}
                  </time>
                  <ul className="mt-1 space-y-1">
                    {cell.entries.map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => open(entry)}
                          className={`block text-left text-xs leading-snug hover:underline ${TONE[entry.kind === "decree" ? "decree" : "event"]}`}
                        >
                          {entry.time !== "" && <span className="text-muted">{entry.time} </span>}
                          {entry.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <NoticeDialog notice={opened} onClose={() => setOpened(null)} />
    </section>
  );
}

function NoticeDialog({ notice, onClose }: { notice: Notice | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = dialog.current;

    if (node === null) {
      return;
    }

    if (notice !== null && !node.open) {
      node.showModal();
    }

    if (notice === null && node.open) {
      node.close();
    }
  }, [notice]);

  return (
    <dialog
      ref={dialog}
      className="calendar-sheet ledger-frame bg-surface text-foreground"
      aria-labelledby="public-notice-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {notice?.kind === "event" && <EventPoster notice={notice} onClose={onClose} />}
      {notice?.kind === "decree" && <DecreeNotice notice={notice} onClose={onClose} />}
    </dialog>
  );
}

function EventPoster({
  notice,
  onClose,
}: {
  notice: Extract<Notice, { kind: "event" }>;
  onClose: () => void;
}) {
  return (
    <div className="relative bg-background/45 p-6 sm:p-8">
      <CloseButton onClose={onClose} />
      <h2 id="public-notice-title" className="sr-only">
        {notice.title}
      </h2>
      {notice.posterUrl !== null ? (
        // The affiche is a file served by the API, outside the Next image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={notice.posterUrl} alt={notice.title} className="mx-auto max-h-[70vh] w-full object-contain" />
      ) : (
        <p className="py-16 text-center text-sm text-muted">Pas d&apos;affiche pour {notice.title}.</p>
      )}
    </div>
  );
}

function DecreeNotice({
  notice,
  onClose,
}: {
  notice: Extract<Notice, { kind: "decree" }>;
  onClose: () => void;
}) {
  return (
    <div className="px-8 py-8 sm:px-10">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs tracking-[0.22em] text-gold-dark uppercase">{notice.reference}</p>
        <CloseButton onClose={onClose} />
      </div>
      <h2 id="public-notice-title" className="mt-3 font-display text-3xl text-heading">
        {notice.title}
      </h2>
      <p className="mt-6 text-sm text-muted">{notice.period}</p>
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} className="text-xs tracking-wide text-muted hover:text-foreground">
      Fermer
    </button>
  );
}

function noticeFor(entry: CalendarEntry, events: MunicipalEvent[], decrees: Decree[]): Notice | null {
  const match = /^(event|decree)-(\d+)-/.exec(entry.id);

  if (match === null) {
    return null;
  }

  const id = Number(match[2]);

  if (match[1] === "event") {
    const event = events.find((item) => item.id === id);

    if (event === undefined) {
      return null;
    }

    return { kind: "event", title: event.title, posterUrl: posterUrl(event.posterPath) };
  }

  const decree = decrees.find((item) => item.id === id);

  if (decree?.startsAt == null || decree.endsAt == null) {
    return null;
  }

  return {
    kind: "decree",
    reference: decree.reference,
    title: decree.title,
    period: `Du ${formatTownWhen(decree.startsAt)} au ${formatTownWhen(decree.endsAt)}`,
  };
}

function posterUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  return `${PUBLIC_API_URL}/${path.replace(/^\//, "")}`;
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

function sameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
