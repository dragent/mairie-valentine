"use client";

import { useState, type FormEvent } from "react";

import { RequireRole } from "@/components/require-role";
import {
  ErrorBanner,
  Field,
  ResourceForm,
  ResourceTable,
  RowAction,
  Select,
  TextInput,
  WorkspaceHeading,
} from "@/components/resource-table";
import {
  APPOINTMENT_STATUS_LABELS,
  ROLE_SECRETAIRE,
  appointments,
  type AppointmentStatus,
} from "@/lib/api";
import { formatDateTime, toApiDate } from "@/lib/dates";
import { useResource } from "@/lib/use-resource";

const EMPTY_FORM = {
  subject: "",
  citizenName: "",
  scheduledAt: "",
  durationMinutes: "30",
  location: "",
};

export default function AppointmentsPage() {
  const { items, error, isBusy, create, update, remove } = useResource(appointments);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const scheduledAt = toApiDate(form.scheduledAt);

    if (scheduledAt === null) {
      setFormError("Indiquez la date et l'heure du rendez-vous.");

      return;
    }

    setFormError(null);

    const created = await create({
      subject: form.subject,
      citizenName: form.citizenName,
      scheduledAt,
      durationMinutes: Number(form.durationMinutes),
      location: form.location === "" ? null : form.location,
      status: "scheduled",
      notes: null,
    });

    if (created) {
      setForm(EMPTY_FORM);
    }
  }

  return (
    <RequireRole role={ROLE_SECRETAIRE}>
      <div className="space-y-8">
        <WorkspaceHeading
          title="Rendez-vous"
          lead="Registre des rendez-vous pris au guichet de la mairie."
        />

        <ErrorBanner message={formError ?? error} />

        <ResourceTable
          headers={["Date", "Objet", "Citoyen", "Lieu", "Statut", "Noté par", ""]}
          isLoading={items === null}
          isEmpty={items?.length === 0}
          emptyLabel="Aucun rendez-vous au registre."
        >
          {items?.map((appointment) => (
            <tr key={appointment.id}>
              <td className="px-4 py-3 whitespace-nowrap">
                {formatDateTime(appointment.scheduledAt)}
                <span className="block text-xs text-muted">{appointment.durationMinutes} min</span>
              </td>
              <td className="px-4 py-3">{appointment.subject}</td>
              <td className="px-4 py-3">{appointment.citizenName}</td>
              <td className="px-4 py-3 text-muted">{appointment.location ?? "—"}</td>
              <td className="px-4 py-3">
                <Select
                  value={appointment.status}
                  disabled={isBusy}
                  aria-label={`Statut du rendez-vous de ${appointment.citizenName}`}
                  onChange={(event) =>
                    void update(appointment.id, {
                      status: event.target.value as AppointmentStatus,
                    })
                  }
                >
                  {Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </td>
              <td className="px-4 py-3 text-muted">{appointment.authorName ?? "—"}</td>
              <td className="px-4 py-3 text-right">
                <RowAction label="Supprimer" onClick={() => void remove(appointment.id)} />
              </td>
            </tr>
          ))}
        </ResourceTable>

        <ResourceForm
          legend="Noter un rendez-vous"
          submitLabel="Enregistrer"
          isBusy={isBusy}
          onSubmit={onSubmit}
        >
          <Field label="Objet">
            <TextInput
              required
              maxLength={180}
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
            />
          </Field>

          <Field label="Citoyen">
            <TextInput
              required
              maxLength={120}
              value={form.citizenName}
              onChange={(event) => setForm({ ...form, citizenName: event.target.value })}
            />
          </Field>

          <Field label="Date et heure">
            <TextInput
              required
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })}
            />
          </Field>

          <Field label="Durée (minutes)">
            <TextInput
              required
              type="number"
              min={5}
              max={480}
              step={5}
              value={form.durationMinutes}
              onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })}
            />
          </Field>

          <Field label="Lieu" wide>
            <TextInput
              maxLength={180}
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
            />
          </Field>
        </ResourceForm>
      </div>
    </RequireRole>
  );
}
