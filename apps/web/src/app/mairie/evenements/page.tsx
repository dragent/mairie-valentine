"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";

import { RequireRole } from "@/components/require-role";
import { ErrorBanner, Field, ResourceForm, TextArea, TextInput } from "@/components/resource-table";
import { ROLE_SECRETAIRE, appointments, municipalEvents } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toApiDate } from "@/lib/dates";
import { announceMunicipalEvent, posterRejection } from "@/lib/event-poster";
import { knownLocations } from "@/lib/known-locations";
import { describe, useResource } from "@/lib/use-resource";

const EMPTY_FORM = {
  title: "",
  startsAt: "",
  endsAt: "",
  location: "",
  description: "",
};

export default function EventsPage() {
  const { token, user } = useAuth();
  const meetings = useResource(appointments);
  const events = useResource(municipalEvents);
  const places = knownLocations([
    ...(meetings.items ?? []).map((appointment) => appointment.location),
    ...(events.items ?? []).map((municipalEvent) => municipalEvent.location),
  ]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [poster, setPoster] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewUrl = useRef<string | null>(null);
  const [posterKey, setPosterKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl.current !== null) {
        URL.revokeObjectURL(previewUrl.current);
      }
    };
  }, []);

  function choosePoster(file: File | null) {
    if (previewUrl.current !== null) {
      URL.revokeObjectURL(previewUrl.current);
    }

    const next = file === null ? null : URL.createObjectURL(file);
    previewUrl.current = next;
    setPreview(next);
    setPoster(file);
  }

  function takePoster(file: File | undefined) {
    if (file === undefined || isBusy) {
      return;
    }

    const rejection = posterRejection(file);

    if (rejection !== null) {
      setNotice(null);
      setError(rejection);

      return;
    }

    setError(null);
    choosePoster(file);
  }

  function onPosterDragLeave(event: DragEvent<HTMLLabelElement>) {
    const next = event.relatedTarget;

    if (next instanceof Node && event.currentTarget.contains(next)) {
      return;
    }

    setDragging(false);
  }

  function onPosterDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    takePoster(event.dataTransfer?.files?.[0]);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (token === null) {
      return;
    }

    const startsAt = toApiDate(form.startsAt);

    if (startsAt === null) {
      setError("Indiquez la date et l'heure de début.");
      setNotice(null);

      return;
    }

    setIsBusy(true);

    try {
      await announceMunicipalEvent(
        token,
        {
          title: form.title,
          description: form.description === "" ? null : form.description,
          startsAt,
          endsAt: toApiDate(form.endsAt),
          location: form.location === "" ? null : form.location,
        },
        poster,
      );
      setForm(EMPTY_FORM);
      choosePoster(null);
      setPosterKey((key) => key + 1);
      setError(null);
      setNotice("L'événement est enregistré.");
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
            <h1 className="font-display text-4xl text-heading">Événements</h1>
            {signature && <p className="text-sm text-accent">{signature}</p>}
          </div>
        </div>

        <p className="mt-8 max-w-2xl text-center leading-relaxed sm:text-left">
          Annonce municipale : intitulé, dates, lieu, description et affiche.
        </p>

        <Ornament />

        <div className="space-y-8">
          <ErrorBanner message={error} />
          {notice !== null && <p className="text-sm text-accent">{notice}</p>}

          <ResourceForm
            className=""
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
              <span className="text-xs text-muted">Sans date de fin, l&apos;événement tient sur un seul jour.</span>
            </Field>

            <Field label="Lieu" wide>
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

            <Field label="Description" wide>
              <TextArea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </Field>

            <label
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed px-6 py-8 text-center sm:col-span-2 ${dragging ? "border-accent bg-background/50" : "border-gold-dark"}`}
              onDragEnter={(event) => {
                event.preventDefault();
                if (!isBusy) {
                  setDragging(true);
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (!isBusy) {
                  setDragging(true);
                }
              }}
              onDragLeave={onPosterDragLeave}
              onDrop={onPosterDrop}
            >
              <span className="text-xs tracking-[0.2em] text-gold-dark uppercase">Affiche</span>
              <input
                key={posterKey}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => takePoster(event.target.files?.[0])}
              />
              {preview !== null ? (
                <>
                  {/* A local blob preview: next/image only optimizes remote or static files. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Aperçu de l'affiche" className="max-h-72 object-contain" />
                  {poster !== null && <span className="text-xs tracking-wide text-muted">{poster.name}</span>}
                  <span className="text-sm text-muted">Glissez une autre affiche, ou choisissez un fichier.</span>
                </>
              ) : (
                <>
                  <span className="font-display text-xl text-heading">
                    {dragging ? "Déposez l'affiche" : "Glissez l'affiche ici"}
                  </span>
                  <span className="text-sm text-muted">ou choisissez un fichier</span>
                  <span className="text-xs text-muted">JPEG, PNG ou WebP, 5 Mo maximum.</span>
                </>
              )}
            </label>
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
