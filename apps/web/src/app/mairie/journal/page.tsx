"use client";

import Image from "next/image";
import Link from "next/link";

import { RequireRole } from "@/components/require-role";
import { ErrorBanner } from "@/components/resource-table";
import {
  ROLE_ELU,
  ROLE_SECRETAIRE,
  appointments,
  decrees,
  municipalEvents,
  notes,
  type Decree,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/dates";
import { JOURNAL_KIND_LABELS, greffeJournal } from "@/lib/greffe-journal";
import { useResource } from "@/lib/use-resource";

export default function JournalPage() {
  const { user, hasRole } = useAuth();
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
            <h1 className="font-display text-4xl text-heading">Journal</h1>
            {signature && <p className="text-sm text-accent">{signature}</p>}
          </div>
        </div>

        <p className="mt-8 max-w-2xl text-center leading-relaxed sm:text-left">
          Dernière touche sur chaque note, événement et rendez-vous. Les décrets apparaissent pour les élus.
        </p>

        <Ornament />

        <div className="space-y-8">
          {hasRole(ROLE_ELU) ? <JournalWithDecrees /> : <JournalList decrees={[]} />}
        </div>
      </section>
    </RequireRole>
  );
}

function JournalWithDecrees() {
  const register = useResource(decrees);

  return <JournalList decrees={register.items ?? []} decreeError={register.error} decreesPending={register.items === null} />;
}

function JournalList({
  decrees: register,
  decreeError = null,
  decreesPending = false,
}: {
  decrees: Decree[];
  decreeError?: string | null;
  decreesPending?: boolean;
}) {
  const memos = useResource(notes);
  const events = useResource(municipalEvents);
  const meetings = useResource(appointments);
  const pending = decreesPending || memos.items === null || events.items === null || meetings.items === null;
  const error = decreeError ?? memos.error ?? events.error ?? meetings.error;
  const entries = greffeJournal({
    notes: memos.items ?? [],
    decrees: register,
    events: events.items ?? [],
    appointments: meetings.items ?? [],
  });

  return (
    <div>
      <ErrorBanner message={error} />
      {pending ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted">Le greffe n&apos;a encore rien enregistré.</p>
      ) : (
        <ul className="divide-y divide-line">
          {entries.map((entry) => (
            <li key={entry.id} className="py-4">
              <p className="text-xs tracking-[0.2em] text-gold-dark uppercase">{JOURNAL_KIND_LABELS[entry.kind]}</p>
              <Link href={entry.href} className="font-display text-lg text-heading hover:text-accent">
                {entry.label}
              </Link>
              <p className="text-sm text-muted">
                {entry.author}
                <span className="mx-2">·</span>
                {formatDateTime(entry.at)}
              </p>
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
