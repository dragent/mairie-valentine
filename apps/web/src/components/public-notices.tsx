"use client";

import { useEffect, useState } from "react";

import { PUBLIC_API_URL, fetchPublicBoard, type PublicBoard, type PublicDecree, type PublicEvent } from "@/lib/api";
import { formatDate } from "@/lib/dates";

export function PublicNotices() {
  const [board, setBoard] = useState<PublicBoard | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchPublicBoard()
      .then((loaded) => {
        if (!cancelled) {
          setBoard(loaded);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBoard({ decrees: [], events: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (board === null || (board.decrees.length === 0 && board.events.length === 0)) {
    return null;
  }

  return (
    <section className="ledger-frame bg-surface px-8 py-8 sm:px-10">
      <p className="text-xs tracking-[0.28em] text-gold-dark uppercase">Affichage municipal</p>
      <h2 className="mt-3 font-display text-3xl text-heading">Publications</h2>

      {board.decrees.length > 0 && (
        <ul className="mt-8 divide-y divide-line">
          {board.decrees.map((decree) => (
            <li key={decree.reference} className="py-5">
              <Notice decree={decree} />
            </li>
          ))}
        </ul>
      )}

      {board.events.length > 0 && (
        <ul className="mt-8 divide-y divide-line">
          {board.events.map((municipalEvent) => (
            <li key={`${municipalEvent.title}-${municipalEvent.startsAt}`} className="py-5">
              <Gathering event={municipalEvent} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Notice({ decree }: { decree: PublicDecree }) {
  return (
    <article className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <Poster path={decree.posterPath} alt={decree.title} />
      <div>
        <p className="text-xs tracking-wide text-muted">{decree.reference}</p>
        <h3 className="font-display text-lg text-heading">{decree.title}</h3>
        <p className="text-sm text-muted">
          {formatDate(decree.startsAt)} — {formatDate(decree.endsAt)}
        </p>
      </div>
    </article>
  );
}

function Gathering({ event }: { event: PublicEvent }) {
  return (
    <article className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <Poster path={event.posterPath} alt={event.title} />
      <div>
        <h3 className="font-display text-lg text-heading">{event.title}</h3>
        <p className="text-sm text-muted">
          {formatDate(event.startsAt)}
          {event.location ? ` — ${event.location}` : ""}
        </p>
      </div>
    </article>
  );
}

function Poster({ path, alt }: { path?: string | null; alt: string }) {
  if (!path) {
    return null;
  }

  return (
    // The affiche is a file served by the API, outside the Next image optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${PUBLIC_API_URL}/${path.replace(/^\//, "")}`}
      alt={`Affiche : ${alt}`}
      className="h-28 w-20 shrink-0 object-cover"
    />
  );
}
