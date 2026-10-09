"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { ErrorBanner, Field, Select, TextArea, TextInput } from "@/components/resource-table";
import {
  APPOINTMENT_STATUS_LABELS,
  appointments,
  decrees,
  municipalEvents,
  type Appointment,
  type AppointmentInput,
  type AppointmentStatus,
  type Decree,
  type MunicipalEvent,
} from "@/lib/api";
import { type CalendarSheet } from "@/lib/calendar-sheet";
import { savePublication } from "@/lib/publication-poster";
import { decreeSubmission } from "@/lib/decree";
import { toApiDate, toLocalInput } from "@/lib/dates";
import { useAuth } from "@/lib/auth-context";
import { describe } from "@/lib/use-resource";

const PRIMARY_BUTTON =
  "rounded-md border border-gold-dark bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-accent disabled:opacity-60";
const QUIET_BUTTON = "rounded-md border border-gold-dark px-4 py-2 text-sm text-heading hover:text-foreground";
const DANGER_BUTTON =
  "rounded-md border border-[#8f4d42] px-4 py-2 text-sm text-[#c17b6e] hover:border-[#a85c50] hover:text-[#d49286] disabled:opacity-60";

export function CalendarSheetDialog({
  sheet,
  onClose,
  onChanged,
}: {
  sheet: CalendarSheet | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = dialog.current;

    if (node === null) {
      return;
    }

    if (sheet !== null && !node.open) {
      node.showModal();
    }

    if (sheet === null && node.open) {
      node.close();
    }
  }, [sheet]);

  function close() {
    onClose();
  }

  return (
    <dialog
      ref={dialog}
      className={`calendar-sheet ledger-frame bg-surface text-foreground${sheet?.kind === "appointment" ? " calendar-sheet-note" : ""}`}
      aria-labelledby="calendar-sheet-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      {sheet !== null && (
        <SheetBody key={`${sheet.kind}-${sheet.recordId}`} sheet={sheet} onClose={close} onChanged={onChanged} />
      )}
    </dialog>
  );
}

function SheetBody({
  sheet,
  onClose,
  onChanged,
}: {
  sheet: CalendarSheet;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { token } = useAuth();
  const [editing, setEditing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function remove() {
    if (token === null) {
      return;
    }

    const client = sheet.kind === "event" ? municipalEvents : sheet.kind === "appointment" ? appointments : decrees;

    setRemoving(true);
    setError(null);

    try {
      await client.remove(token, sheet.recordId);
      onChanged();
      onClose();
    } catch (cause: unknown) {
      setError(describe(cause));
      setRemoving(false);
    }
  }

  const showsPoster = sheet.kind !== "appointment";

  return (
    <div className={showsPoster ? "grid max-h-[calc(100vh-4rem)] sm:grid-cols-2" : "max-h-[calc(100vh-4rem)]"}>
      {showsPoster && <Poster posterUrl={sheet.posterUrl} title={sheet.title} />}
      <div className="flex min-h-0 flex-col overflow-y-auto px-6 py-6 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs tracking-[0.22em] text-gold-dark uppercase">{sheet.kindLabel}</p>
          <button
            type="button"
            onClick={onClose}
            className="calendar-sheet-close text-xs tracking-wide text-muted hover:text-foreground"
          >
            Fermer
          </button>
        </div>
        <h2 id="calendar-sheet-title" className="mt-3 font-display text-3xl text-heading">
          {sheet.title}
        </h2>
        <ErrorBanner message={error} />
        {editing ? (
          <SheetEditor
            sheet={sheet}
            isBusy={isBusy}
            onCancel={() => {
              setEditing(false);
              setError(null);
            }}
            onSave={async (save) => {
              setIsBusy(true);
              setError(null);

              try {
                const failure = await save();

                if (failure !== null) {
                  setError(failure);

                  return;
                }

                setEditing(false);
                onChanged();
              } finally {
                setIsBusy(false);
              }
            }}
          />
        ) : (
          <>
            <dl className="mt-6 space-y-4">
              {sheet.fields.map((field) => (
                <div key={field.label}>
                  <dt className="text-xs tracking-wide text-muted uppercase">{field.label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap leading-relaxed">{field.value}</dd>
                </div>
              ))}
            </dl>
            <div className="calendar-sheet-actions mt-8 flex flex-wrap gap-3">
              <button type="button" className={PRIMARY_BUTTON} disabled={removing} onClick={() => setEditing(true)}>
                Modifier
              </button>
              {sheet.kind !== "appointment" && (
                <button
                  type="button"
                  className={QUIET_BUTTON}
                  disabled={publishing || removing}
                  onClick={() => {
                    setPublishing(true);
                    setError(null);
                    savePublication(sheet)
                      .catch(() => setError("L'image n'a pas pu être enregistrée."))
                      .finally(() => setPublishing(false));
                  }}
                >
                  {publishing ? "Enregistrement…" : "Publier"}
                </button>
              )}
              <button type="button" className={DANGER_BUTTON} disabled={removing || publishing} onClick={() => void remove()}>
                {removing ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Poster({ posterUrl, title }: { posterUrl: string | null; title: string }) {
  return (
    <div className="flex items-center justify-center bg-background/45 p-6 sm:p-8">
      {posterUrl !== null ? (
        // The affiche is a file served by the API, outside the Next image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={posterUrl} alt={`Affiche : ${title}`} className="max-h-[70vh] w-full object-contain" />
      ) : (
        <p className="text-sm text-muted">Pas d&apos;affiche.</p>
      )}
    </div>
  );
}

function SheetEditor({
  sheet,
  isBusy,
  onCancel,
  onSave,
}: {
  sheet: CalendarSheet;
  isBusy: boolean;
  onCancel: () => void;
  onSave: (save: () => Promise<string | null>) => Promise<void>;
}) {
  if (sheet.kind === "event") {
    return <EventEditor record={sheet.record as MunicipalEvent} isBusy={isBusy} onCancel={onCancel} onSave={onSave} />;
  }

  if (sheet.kind === "appointment") {
    return (
      <AppointmentEditor record={sheet.record as Appointment} isBusy={isBusy} onCancel={onCancel} onSave={onSave} />
    );
  }

  return <DecreeEditor record={sheet.record as Decree} isBusy={isBusy} onCancel={onCancel} onSave={onSave} />;
}

function EventEditor({
  record,
  isBusy,
  onCancel,
  onSave,
}: {
  record: MunicipalEvent;
  isBusy: boolean;
  onCancel: () => void;
  onSave: (save: () => Promise<string | null>) => Promise<void>;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState({
    title: record.title,
    startsAt: toLocalInput(record.startsAt),
    endsAt: toLocalInput(record.endsAt),
    location: record.location ?? "",
    description: record.description ?? "",
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const startsAt = toApiDate(form.startsAt);

    if (token === null) {
      return;
    }

    if (startsAt === null) {
      await onSave(async () => "Indiquez la date et l'heure de début.");

      return;
    }

    await onSave(async () => {
      try {
        await municipalEvents.update(token, record.id, {
          title: form.title,
          description: form.description === "" ? null : form.description,
          startsAt,
          endsAt: toApiDate(form.endsAt),
          location: form.location === "" ? null : form.location,
        });

        return null;
      } catch (cause: unknown) {
        return describe(cause);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <Field label="Intitulé">
        <TextInput required maxLength={180} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
      </Field>
      <Field label="Début">
        <TextInput required type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
      </Field>
      <Field label="Fin (facultative)">
        <TextInput type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} />
        <span className="text-xs text-muted">Sans date de fin, l&apos;événement tient sur un seul jour.</span>
      </Field>
      <Field label="Lieu">
        <TextInput maxLength={180} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
      </Field>
      <Field label="Description">
        <TextArea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </Field>
      <EditorActions isBusy={isBusy} onCancel={onCancel} />
    </form>
  );
}

function AppointmentEditor({
  record,
  isBusy,
  onCancel,
  onSave,
}: {
  record: Appointment;
  isBusy: boolean;
  onCancel: () => void;
  onSave: (save: () => Promise<string | null>) => Promise<void>;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState({
    subject: record.subject,
    citizenName: record.citizenName,
    scheduledAt: toLocalInput(record.scheduledAt),
    durationMinutes: String(record.durationMinutes),
    location: record.location ?? "",
    status: record.status,
    notes: record.notes ?? "",
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const scheduledAt = toApiDate(form.scheduledAt);
    const durationMinutes = Number(form.durationMinutes);

    if (token === null) {
      return;
    }

    if (scheduledAt === null || !Number.isFinite(durationMinutes)) {
      await onSave(async () => "Indiquez la date et l'heure du rendez-vous.");

      return;
    }

    const input: AppointmentInput = {
      subject: form.subject,
      citizenName: form.citizenName,
      scheduledAt,
      durationMinutes,
      location: form.location === "" ? null : form.location,
      status: form.status,
      notes: form.notes === "" ? null : form.notes,
    };

    await onSave(async () => {
      try {
        await appointments.update(token, record.id, input);

        return null;
      } catch (cause: unknown) {
        return describe(cause);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <Field label="Objet">
        <TextInput required maxLength={180} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
      </Field>
      <Field label="Citoyen">
        <TextInput required maxLength={120} value={form.citizenName} onChange={(event) => setForm({ ...form, citizenName: event.target.value })} />
      </Field>
      <Field label="Date et heure">
        <TextInput required type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} />
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
      <Field label="Lieu">
        <TextInput maxLength={180} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
      </Field>
      <Field label="État">
        <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AppointmentStatus })}>
          {(Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[]).map((status) => (
            <option key={status} value={status}>
              {APPOINTMENT_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Notes">
        <TextArea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      </Field>
      <EditorActions isBusy={isBusy} onCancel={onCancel} />
    </form>
  );
}

function DecreeEditor({
  record,
  isBusy,
  onCancel,
  onSave,
}: {
  record: Decree;
  isBusy: boolean;
  onCancel: () => void;
  onSave: (save: () => Promise<string | null>) => Promise<void>;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState({
    title: record.title,
    body: record.body,
    status: record.status,
    startsOn: toLocalInput(record.startsAt, false),
    endsOn: toLocalInput(record.endsAt, false),
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const submission = decreeSubmission(form);

    if (token === null) {
      return;
    }

    if ("error" in submission) {
      await onSave(async () => submission.error);

      return;
    }

    await onSave(async () => {
      try {
        await decrees.update(token, record.id, submission.input);

        return null;
      } catch (cause: unknown) {
        return describe(cause);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <Field label="Intitulé">
        <TextInput required maxLength={180} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
      </Field>
      <Field label="Date de début">
        <TextInput required type="date" value={form.startsOn} onChange={(event) => setForm({ ...form, startsOn: event.target.value })} />
      </Field>
      <Field label="Date de fin">
        <TextInput required type="date" value={form.endsOn} onChange={(event) => setForm({ ...form, endsOn: event.target.value })} />
      </Field>
      <Field label="Texte">
        <TextArea required rows={8} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} />
      </Field>
      <EditorActions isBusy={isBusy} onCancel={onCancel} />
    </form>
  );
}

function EditorActions({ isBusy, onCancel }: { isBusy: boolean; onCancel: () => void }) {
  return (
    <div className="calendar-sheet-actions flex flex-wrap gap-3 pt-2">
      <button type="submit" className={PRIMARY_BUTTON} disabled={isBusy}>
        Enregistrer
      </button>
      <button type="button" className={QUIET_BUTTON} onClick={onCancel} disabled={isBusy}>
        Annuler
      </button>
    </div>
  );
}
