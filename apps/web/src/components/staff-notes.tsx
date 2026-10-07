"use client";

import { useState, type FormEvent } from "react";

import { Fold } from "@/components/fold";
import {
  ErrorBanner,
  Field,
  ResourceForm,
  RowAction,
  TextArea,
  TextInput,
} from "@/components/resource-table";
import { notes, type Note } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { noteByline, splitNotes } from "@/lib/notes";
import { useResource } from "@/lib/use-resource";

const EMPTY_FORM = { title: "", body: "" };

export function StaffNotes() {
  const { items, error, isBusy, create, update } = useResource(notes);
  const [form, setForm] = useState(EMPTY_FORM);
  const { current, archived } = splitNotes(items ?? []);

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

        <Fold title="Au greffe">
          <div className="space-y-10">
            <NoteFolio
              empty="Le greffe n'a pas encore de note."
              notes={items === null ? null : current}
              actionLabel="Archiver"
              onAction={(note) => void update(note.id, { status: "archived" })}
              isBusy={isBusy}
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
        </Fold>
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
  archived = false,
}: {
  title?: string;
  empty: string;
  notes: Note[] | null;
  actionLabel: string;
  onAction: (note: Note) => void;
  isBusy: boolean;
  archived?: boolean;
}) {
  return (
    <div>
      {title && (
        <h2 className={`font-display text-2xl ${archived ? "text-muted" : "text-heading"}`}>{title}</h2>
      )}

      {folio === null ? (
        <p className={title ? "mt-4 text-muted" : "text-muted"}>Chargement…</p>
      ) : folio.length === 0 ? (
        <p className={title ? "mt-4 text-sm text-muted" : "text-sm text-muted"}>{empty}</p>
      ) : (
        <ul className={title ? "mt-2 divide-y divide-line" : "divide-y divide-line"}>
          {folio.map((note) => (
            <li key={note.id} className="py-5 first:pt-0">
              <h3 className={`font-display text-lg ${archived ? "text-muted" : "text-heading"}`}>
                {note.title}
              </h3>
              {!archived && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{note.body}</p>}
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
