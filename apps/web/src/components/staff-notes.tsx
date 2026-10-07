"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import {
  ErrorBanner,
  Field,
  ResourceForm,
  RowAction,
  TextArea,
  TextInput,
} from "@/components/resource-table";
import { ROLE_ELU, appointments, decrees, notes, type Decree, type Note } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/dates";
import { noteMentions } from "@/lib/note-links";
import { noteByline, splitNotes } from "@/lib/notes";
import { useResource } from "@/lib/use-resource";

const EMPTY_FORM = { title: "", body: "" };

export function StaffNotes() {
  const { hasRole } = useAuth();

  return hasRole(ROLE_ELU) ? <NotesWithDecrees /> : <NotesDesk decrees={[]} />;
}

function NotesWithDecrees() {
  const register = useResource(decrees);

  return <NotesDesk decrees={register.items ?? []} />;
}

function NotesDesk({ decrees: register }: { decrees: Pick<Decree, "reference">[] }) {
  const { items, error, isBusy, create, update } = useResource(notes);
  const meetings = useResource(appointments);
  const [form, setForm] = useState(EMPTY_FORM);
  const { current, archived } = splitNotes(items ?? []);
  const citizens = [...new Set((meetings.items ?? []).map((appointment) => appointment.citizenName))];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (await create(form)) {
      setForm(EMPTY_FORM);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
      <div className="space-y-10">
        <ErrorBanner message={error} />

        <NoteFolio
          title="Au greffe"
          empty="Le greffe n'a pas encore de note."
          notes={items === null ? null : current}
          actionLabel="Archiver"
          onAction={(note) => void update(note.id, { status: "archived" })}
          isBusy={isBusy}
          decrees={register}
          citizens={citizens}
        />

        <ResourceForm
          className="border-t border-line pt-8"
          legend="Écrire une note"
          submitLabel="Enregistrer"
          isBusy={isBusy}
          onSubmit={onSubmit}
        >
          <Field label="Titre" wide>
            <TextInput
              required
              maxLength={180}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </Field>

          <Field label="Contenu" wide>
            <TextArea
              required
              rows={5}
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
            />
          </Field>
        </ResourceForm>
      </div>

      <aside className="h-full bg-background/35 px-6 py-6 lg:border-l lg:border-line lg:pl-8">
        <NoteFolio
          title="Archives"
          empty="Rien n'a encore été classé."
          notes={items === null ? null : archived}
          actionLabel="Remettre au greffe"
          onAction={(note) => void update(note.id, { status: "current" })}
          isBusy={isBusy}
          archived
        />
      </aside>
    </div>
  );
}

function NoteFolio({
  title,
  empty,
  notes: folio,
  actionLabel,
  onAction,
  isBusy,
  decrees = [],
  citizens = [],
  archived = false,
}: {
  title: string;
  empty: string;
  notes: Note[] | null;
  actionLabel: string;
  onAction: (note: Note) => void;
  isBusy: boolean;
  decrees?: Pick<Decree, "reference">[];
  citizens?: string[];
  archived?: boolean;
}) {
  return (
    <div>
      <h2 className={`font-display text-2xl ${archived ? "text-muted" : "text-heading"}`}>{title}</h2>

      {folio === null ? (
        <p className="mt-4 text-muted">Chargement…</p>
      ) : folio.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {folio.map((note) => (
            <li key={note.id} className="py-5">
              <h3 className={`font-display text-lg ${archived ? "text-muted" : "text-heading"}`}>
                {note.title}
              </h3>
              {!archived && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{note.body}</p>}
              {!archived && <Mentions body={note.body} decrees={decrees} citizens={citizens} />}
              <p className="mt-3 text-xs tracking-wide text-muted">
                {noteByline(note)}
                <span className="mx-2">·</span>
                {formatDateTime(note.updatedAt)}
              </p>
              <div className="mt-2">
                <RowAction label={actionLabel} onClick={() => !isBusy && onAction(note)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Mentions({
  body,
  decrees,
  citizens,
}: {
  body: string;
  decrees: Pick<Decree, "reference">[];
  citizens: string[];
}) {
  const mentions = noteMentions(body, { decrees, citizens });

  if (mentions.length === 0) {
    return null;
  }

  return (
    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
      {mentions.map((mention) => (
        <Link key={`${mention.kind}-${mention.label}`} href={mention.href} className="text-accent underline">
          {mention.label}
        </Link>
      ))}
    </p>
  );
}
