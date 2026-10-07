"use client";

import Link from "next/link";

import { RequireRole } from "@/components/require-role";
import { ErrorBanner, WorkspaceHeading } from "@/components/resource-table";
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
  const { hasRole } = useAuth();

  return (
    <RequireRole role={ROLE_SECRETAIRE}>
      <div className="space-y-8">
        <WorkspaceHeading
          title="Journal"
          lead="Dernière touche sur chaque note, événement et rendez-vous. Les décrets apparaissent pour les élus."
        />
        {hasRole(ROLE_ELU) ? <JournalWithDecrees /> : <JournalList decrees={[]} />}
      </div>
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
