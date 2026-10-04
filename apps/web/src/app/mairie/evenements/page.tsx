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
import { ROLE_SECRETAIRE, municipalEvents } from "@/lib/api";
import { formatDateTime, toApiDate } from "@/lib/dates";
import { useResource } from "@/lib/use-resource";

const EMPTY_FORM = {
  title: "",
  startsAt: "",
  endsAt: "",
  location: "",
  description: "",
};

export default function EventsPage() {
  const { items, error, isBusy, create, remove } = useResource(municipalEvents);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const startsAt = toApiDate(form.startsAt);

    if (startsAt === null) {
      setFormError("Indiquez la date et l'heure de début.");

      return;
    }

    setFormError(null);

    const created = await create({
      title: form.title,
      description: form.description === "" ? null : form.description,
      startsAt,
      endsAt: toApiDate(form.endsAt),
      location: form.location === "" ? null : form.location,
    });

    if (created) {
      setForm(EMPTY_FORM);
    }
  }

  return (
    <RequireRole role={ROLE_SECRETAIRE}>
      <div className="space-y-8">
        <WorkspaceHeading
          title="Événements"
          lead="Conseils municipaux, foires et audiences publiques annoncés par la mairie."
        />

        <ErrorBanner message={formError ?? error} />

        <ResourceTable
          headers={["Début", "Fin", "Intitulé", "Lieu", "Noté par", ""]}
          isLoading={items === null}
          isEmpty={items?.length === 0}
          emptyLabel="Aucun événement prévu."
        >
          {items?.map((municipalEvent) => (
            <tr key={municipalEvent.id}>
              <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(municipalEvent.startsAt)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-muted">
                {formatDateTime(municipalEvent.endsAt)}
              </td>
              <td className="px-4 py-3">
                {municipalEvent.title}
                {municipalEvent.description && (
                  <span className="mt-1 block whitespace-pre-line text-xs text-muted">
                    {municipalEvent.description}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-muted">{municipalEvent.location ?? "—"}</td>
              <td className="px-4 py-3 text-muted">{municipalEvent.authorName ?? "—"}</td>
              <td className="px-4 py-3 text-right">
                <RowAction label="Supprimer" onClick={() => void remove(municipalEvent.id)} />
              </td>
            </tr>
          ))}
        </ResourceTable>

        <ResourceForm
          legend="Annoncer un événement"
          submitLabel="Enregistrer"
          isBusy={isBusy}
          onSubmit={onSubmit}
        >
          <Field label="Intitulé" wide>
            <TextInput
              required
              maxLength={180}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </Field>

          <Field label="Début">
            <TextInput
              required
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
            />
          </Field>

          <Field label="Fin (facultative)">
            <TextInput
              type="datetime-local"
              value={form.endsAt}
              onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
            />
          </Field>

          <Field label="Lieu" wide>
            <TextInput
              maxLength={180}
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
            />
          </Field>

          <Field label="Description" wide>
            <TextArea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </Field>
        </ResourceForm>
      </div>
    </RequireRole>
  );
}
