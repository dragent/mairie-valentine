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
import { ROLE_SECRETAIRE, notes } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { useResource } from "@/lib/use-resource";

const EMPTY_FORM = { title: "", body: "" };

export default function NotesPage() {
  const { items, error, isBusy, create, remove } = useResource(notes);
  const [form, setForm] = useState(EMPTY_FORM);

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
          lead="Mémos du secrétariat, de la plus récemment modifiée à la plus ancienne."
        />

        <ErrorBanner message={error} />

        <ResourceTable
          headers={["Note", "Modifiée le", "Écrite par", ""]}
          isLoading={items === null}
          isEmpty={items?.length === 0}
          emptyLabel="Aucune note pour le moment."
        >
          {items?.map((note) => (
            <tr key={note.id}>
              <td className="px-4 py-3">
                <span className="font-medium">{note.title}</span>
                <span className="mt-1 block whitespace-pre-line text-muted">{note.body}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDateTime(note.updatedAt)}</td>
              <td className="px-4 py-3 text-muted">{note.authorName ?? "—"}</td>
              <td className="px-4 py-3 text-right">
                <RowAction label="Supprimer" onClick={() => void remove(note.id)} />
              </td>
            </tr>
          ))}
        </ResourceTable>

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
