"use client";

import Link from "next/link";
import { useState } from "react";

import { RequireRole } from "@/components/require-role";
import { ErrorBanner, WorkspaceHeading } from "@/components/resource-table";
import { ROLE_ELU, ROLE_SECRETAIRE, appointments, decrees, municipalEvents, notes } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SEARCH_KIND_LABELS, searchRegisters, type SearchHit } from "@/lib/register-search";
import { useResource } from "@/lib/use-resource";

export default function SearchPage() {
  const { hasRole } = useAuth();
  const [query, setQuery] = useState("");

  return (
    <RequireRole role={ROLE_SECRETAIRE}>
      <div className="space-y-8">
        <WorkspaceHeading
          title="Recherche"
          lead="Un mot dans les notes, les événements, les rendez-vous, et les décrets pour les élus."
        />

        <label className="block max-w-md space-y-2 text-sm">
          <span className="text-xs tracking-wide text-muted">Mot à chercher</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-md border border-line bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>

        {hasRole(ROLE_ELU) ? <ElectedHits query={query} /> : <StaffHits query={query} />}
      </div>
    </RequireRole>
  );
}

function StaffHits({ query }: { query: string }) {
  const sources = useStaffSources();

  return (
    <HitList
      query={query}
      pending={sources.pending}
      error={sources.error}
      hits={searchRegisters(query, { ...sources.items, decrees: [] })}
    />
  );
}

function ElectedHits({ query }: { query: string }) {
  const sources = useStaffSources();
  const register = useResource(decrees);
  const hits = searchRegisters(query, {
    ...sources.items,
    decrees: register.items ?? [],
  });

  return (
    <HitList
      query={query}
      pending={sources.pending || register.items === null}
      error={sources.error ?? register.error}
      hits={hits}
    />
  );
}

function useStaffSources() {
  const memos = useResource(notes);
  const events = useResource(municipalEvents);
  const meetings = useResource(appointments);

  return {
    pending: memos.items === null || events.items === null || meetings.items === null,
    error: memos.error ?? events.error ?? meetings.error,
    items: {
      notes: memos.items ?? [],
      events: events.items ?? [],
      appointments: meetings.items ?? [],
    },
  };
}

function HitList({
  query,
  pending,
  error,
  hits,
}: {
  query: string;
  pending: boolean;
  error: string | null;
  hits: SearchHit[];
}) {
  if (query.trim() === "") {
    return null;
  }

  return (
    <div>
      <ErrorBanner message={error} />
      {pending ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : hits.length === 0 ? (
        <p className="text-sm text-muted">Aucun registre ne contient ce mot.</p>
      ) : (
        <ul className="divide-y divide-line">
          {hits.map((hit) => (
            <li key={hit.id} className="py-4">
              <p className="text-xs tracking-[0.2em] text-gold-dark uppercase">{SEARCH_KIND_LABELS[hit.kind]}</p>
              <Link href={hit.href} className="font-display text-lg text-heading hover:text-accent">
                {hit.label}
              </Link>
              <p className="mt-1 text-sm text-muted">{hit.excerpt}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
