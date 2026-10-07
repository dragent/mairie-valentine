"use client";

import Link from "next/link";

import { appointments, decrees, municipalEvents, notes, ROLE_ELU } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { dailyBriefing, type BriefingLine } from "@/lib/briefing";
import { useResource } from "@/lib/use-resource";

export function DailyBriefing() {
  const { hasRole } = useAuth();

  return (
    <section className="mb-10 space-y-6">
      <h2 className="font-display text-2xl text-heading">Aujourd&apos;hui</h2>
      <DeskToday />
      {hasRole(ROLE_ELU) && <DecreeHorizon />}
    </section>
  );
}

function DeskToday() {
  const meetings = useResource(appointments);
  const events = useResource(municipalEvents);
  const memos = useResource(notes);
  const pending = meetings.items === null || events.items === null || memos.items === null;

  if (pending) {
    return <p className="text-sm text-muted">Chargement…</p>;
  }

  const briefing = dailyBriefing({
    appointments: meetings.items ?? [],
    events: events.items ?? [],
    notes: memos.items ?? [],
    decrees: [],
  });

  return (
    <div className="space-y-6">
      <LineList title="Rendez-vous" empty="Aucun rendez-vous prévu aujourd'hui." lines={briefing.appointments} />
      <LineList title="Événements" empty="Aucun événement ne commence aujourd'hui." lines={briefing.events} />
      <p className="text-sm text-muted">
        {briefing.notesAtDesk === 0
          ? "Aucune note au greffe."
          : briefing.notesAtDesk === 1
            ? "1 note au greffe."
            : `${briefing.notesAtDesk} notes au greffe.`}
      </p>
    </div>
  );
}

function DecreeHorizon() {
  const register = useResource(decrees);

  if (register.items === null) {
    return null;
  }

  const briefing = dailyBriefing({
    appointments: [],
    events: [],
    notes: [],
    decrees: register.items,
  });

  if (briefing.decrees.length === 0) {
    return null;
  }

  return <LineList title="Décrets qui s'achèvent" empty="" lines={briefing.decrees} />;
}

function LineList({ title, empty, lines }: { title: string; empty: string; lines: BriefingLine[] }) {
  return (
    <div>
      <h3 className="text-xs tracking-[0.2em] text-gold-dark uppercase">{title}</h3>
      {lines.length === 0 ? (
        empty === "" ? null : <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {lines.map((line) => (
            <li key={`${line.href}-${line.id}`} className="py-3">
              <Link href={line.href} className="font-display text-lg text-heading hover:text-accent">
                {line.label}
              </Link>
              <p className="text-sm text-muted">{line.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
