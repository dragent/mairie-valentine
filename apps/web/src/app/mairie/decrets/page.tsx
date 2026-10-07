"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";

import { RequireRole } from "@/components/require-role";
import { ErrorBanner, Field, ResourceForm, Select, TextArea, TextInput } from "@/components/resource-table";
import { DECREE_STATUS_LABELS, ROLE_ELU, type DecreeStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { decreeSubmission, recordDecree, type DecreeForm } from "@/lib/decree";
import { posterRejection } from "@/lib/event-poster";
import { describe } from "@/lib/use-resource";

const EMPTY_FORM: DecreeForm = {
  title: "",
  body: "",
  status: "draft",
  startsOn: "",
  endsOn: "",
};

export default function DecreesPage() {
  const { token, user } = useAuth();
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

    const submission = decreeSubmission(form);

    if ("error" in submission) {
      setNotice(null);
      setError(submission.error);

      return;
    }

    setIsBusy(true);

    try {
      const created = await recordDecree(token, submission.input, poster);
      setForm(EMPTY_FORM);
      choosePoster(null);
      setPosterKey((key) => key + 1);
      setError(null);
      setNotice(
        created.reference ? `Le décret ${created.reference} est enregistré.` : "Le décret est enregistré.",
      );
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
    <RequireRole role={ROLE_ELU}>
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
            <h1 className="font-display text-4xl text-heading">Décrets</h1>
            {signature && <p className="text-sm text-accent">{signature}</p>}
          </div>
        </div>

        <p className="mt-8 max-w-2xl text-center leading-relaxed sm:text-left">
          Brouillon sans date. La publication indique le début et la fin. L&apos;affiche se joint à
          l&apos;enregistrement, et la référence est attribuée à ce moment-là.
        </p>

        <Ornament />

        <div className="space-y-8">
          <ErrorBanner message={error} />
          {notice !== null && <p className="text-sm text-accent">{notice}</p>}

          <ResourceForm
            className=""
            legend="Rédiger un décret"
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

            <Field label="État" wide>
              <Select
                value={form.status}
                onChange={(event) => {
                  const status = event.target.value as DecreeStatus;

                  setForm({
                    ...form,
                    status,
                    startsOn: status === "published" ? form.startsOn : "",
                    endsOn: status === "published" ? form.endsOn : "",
                  });
                }}
              >
                {(["draft", "published"] as const).map((value) => (
                  <option key={value} value={value}>
                    {DECREE_STATUS_LABELS[value]}
                  </option>
                ))}
              </Select>
            </Field>

            {form.status === "published" && (
              <>
                <Field label="Date de début">
                  <TextInput
                    required
                    type="date"
                    value={form.startsOn}
                    onChange={(event) => setForm({ ...form, startsOn: event.target.value })}
                  />
                </Field>

                <Field label="Date de fin">
                  <TextInput
                    required
                    type="date"
                    value={form.endsOn}
                    onChange={(event) => setForm({ ...form, endsOn: event.target.value })}
                  />
                </Field>
              </>
            )}

            <Field label="Texte" wide>
              <TextArea
                required
                rows={8}
                value={form.body}
                onChange={(event) => setForm({ ...form, body: event.target.value })}
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
