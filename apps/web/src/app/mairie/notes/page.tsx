"use client";

import { useState, type FormEvent } from "react";

import { RequireRole } from "@/components/require-role";
import {
  ErrorBanner,
  Field,
  ResourceForm,
  ResourceTable,
  RowAction,
  TextArea,
  TextInput,
  WorkspaceHeading,
} from "@/components/resource-table";
import { ROLE_SECRETAIRE, notes, type Note, type NoteStatus } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { noteByline, splitNotes } from "@/lib/notes";
import { useResource } from "@/lib/use-resource";

const EMPTY_FORM = { title: "", body: "" };

export default function NotesPage() {
  const { items, error, isBusy, create, update, remove } = useResource(notes);
  const [form, setForm] = useState(EMPTY_FORM);
  const { current, archived } = splitNotes(items ?? []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (await create(form)) {
      setForm(EMPTY_FORM);
    }
  }

  return (
    <RequireRole role={ROLE_SECRETAIRE}>
      <div className="space-y-8">
        <WorkspaceHeading
          title="Notes"
          lead="Mémos du secrétariat, au greffe ou déjà classés aux archives."
        />

        <ErrorBanner message={error} />

        <NotesTable
          caption="Au greffe"
          notes={items === null ? null : current}
          emptyLabel="Aucune note au greffe."
          toggleLabel="Archiver"
          nextStatus="archived"
          isBusy={isBusy}
          onToggle={(id, status) => void update(id, { status })}
          onRemove={(id) => void remove(id)}
        />

        <NotesTable
          caption="Archives"
          notes={items === null ? null : archived}
          emptyLabel="Aucune note archivée."
          toggleLabel="Remettre au greffe"
          nextStatus="current"
          isBusy={isBusy}
          onToggle={(id, status) => void update(id, { status })}
          onRemove={(id) => void remove(id)}
        />

        <ResourceForm
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
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
            />
          </Field>
        </ResourceForm>
      </div>
    </RequireRole>
  );
}

function NotesTable({
  caption,
  notes: rows,
  emptyLabel,
  toggleLabel,
  nextStatus,
  isBusy,
  onToggle,
  onRemove,
}: {
  caption: string;
  notes: Note[] | null;
  emptyLabel: string;
  toggleLabel: string;
  nextStatus: NoteStatus;
  isBusy: boolean;
  onToggle: (id: number, status: NoteStatus) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg text-heading">{caption}</h2>
      <ResourceTable
        headers={["Note", "Modifiée le", "Écrite par", ""]}
        isLoading={rows === null}
        isEmpty={rows?.length === 0}
        emptyLabel={emptyLabel}
      >
        {rows?.map((note) => (
          <tr key={note.id}>
            <td className="px-4 py-3">
              <span className="font-medium">{note.title}</span>
              <span className="mt-1 block whitespace-pre-line text-muted">{note.body}</span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDateTime(note.updatedAt)}</td>
            <td className="px-4 py-3 text-muted">{noteByline(note)}</td>
            <td className="px-4 py-3 text-right">
              <span className="flex justify-end gap-3">
                <RowAction
                  label={toggleLabel}
                  onClick={() => !isBusy && onToggle(note.id, nextStatus)}
                />
                <RowAction label="Supprimer" onClick={() => !isBusy && onRemove(note.id)} />
              </span>
            </td>
          </tr>
        ))}
      </ResourceTable>
    </section>
  );
}
