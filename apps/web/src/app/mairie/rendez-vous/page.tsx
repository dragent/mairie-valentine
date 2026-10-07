"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

import { RequireRole } from "@/components/require-role";
import { ErrorBanner, Field, ResourceForm, TextArea, TextInput } from "@/components/resource-table";
import { ROLE_SECRETAIRE, appointments, municipalEvents } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toApiDate } from "@/lib/dates";
import { knownLocations } from "@/lib/known-locations";
import { describe, useResource } from "@/lib/use-resource";

const EMPTY_FORM = {
  subject: "",
  citizenName: "",
  scheduledAt: "",
  durationMinutes: "30",
  location: "",
  notes: "",
};

export default function AppointmentsPage() {
  const { token, user } = useAuth();
  const meetings = useResource(appointments);
  const events = useResource(municipalEvents);
  const places = knownLocations([
    ...(meetings.items ?? []).map((appointment) => appointment.location),
    ...(events.items ?? []).map((municipalEvent) => municipalEvent.location),
  ]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (token === null) {
      return;
    }

    const scheduledAt = toApiDate(form.scheduledAt);

    if (scheduledAt === null) {
      setError("Indiquez la date et l'heure du rendez-vous.");
      setNotice(null);

      return;
    }

    setIsBusy(true);

    try {
      await appointments.create(token, {
        subject: form.subject,
        citizenName: form.citizenName,
        scheduledAt,
        durationMinutes: Number(form.durationMinutes),
        location: form.location === "" ? null : form.location,
        status: "scheduled",
        notes: form.notes === "" ? null : form.notes,
      });
      setForm(EMPTY_FORM);
      setError(null);
      setNotice("Le rendez-vous est enregistré.");
    } catch (cause: unknown) {
      setNotice(null);
      setError(describe(cause));
    } finally {
      setIsBusy(false);
    }
  }

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
            <h1 className="font-display text-4xl text-heading">Rendez-vous</h1>
            {signature && <p className="text-sm text-accent">{signature}</p>}
          </div>
        </div>

        <p className="mt-8 max-w-2xl text-center leading-relaxed sm:text-left">
          Rendez-vous au guichet : objet, citoyen, date, lieu et notes.
        </p>

        <Ornament />

        <div className="space-y-8">
          <ErrorBanner message={error} />
          {notice !== null && <p className="text-sm text-accent">{notice}</p>}

          <ResourceForm
            className=""
            legend="Noter un rendez-vous"
            submitLabel="Enregistrer"
            isBusy={isBusy}
            onSubmit={onSubmit}
          >
            <Field label="Objet" wide>
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

            <Field label="Lieu">
              <TextInput
                maxLength={180}
                list="known-locations"
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
              />
              <datalist id="known-locations">
                {places.map((place) => (
                  <option key={place} value={place} />
                ))}
              </datalist>
            </Field>

            <Field label="Notes" wide>
              <TextArea
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </Field>
          </ResourceForm>
        </div>
      </section>
    </RequireRole>
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
