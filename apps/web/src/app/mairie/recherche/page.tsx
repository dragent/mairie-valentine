"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { RequireRole } from "@/components/require-role";
import { ErrorBanner, Field, TextInput } from "@/components/resource-table";
import { ROLE_ELU, ROLE_SECRETAIRE, appointments, decrees, municipalEvents, notes } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SEARCH_KIND_LABELS, searchRegisters, type SearchHit } from "@/lib/register-search";
import { useResource } from "@/lib/use-resource";

export default function SearchPage() {
  const { user, hasRole } = useAuth();
  const [query, setQuery] = useState("");
  const signatory = user?.displayName ?? user?.username;
  const signature = user?.jobLabel && signatory ? `${user.jobLabel} — ${signatory}` : signatory;

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
            <h1 className="font-display text-4xl text-heading">Recherche</h1>
            {signature && <p className="text-sm text-accent">{signature}</p>}
          </div>
        </div>

        <p className="mt-8 max-w-2xl text-center leading-relaxed sm:text-left">
          Un mot dans les notes, les événements, les rendez-vous, et les décrets pour les élus.
        </p>

        <Ornament />

        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mot à chercher" wide>
              <TextInput value={query} onChange={(event) => setQuery(event.target.value)} />
            </Field>
          </div>

          {hasRole(ROLE_ELU) ? <ElectedHits query={query} /> : <StaffHits query={query} />}
        </div>
      </section>
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

function Ornament() {
  return (
    <div className="my-8 flex items-center gap-4" aria-hidden="true">
      <span className="h-px flex-1 bg-gold-dark/70" />
      <span className="size-1.5 rotate-45 bg-gold-dark" />
      <span className="h-px flex-1 bg-gold-dark/70" />
    </div>
  );
}
