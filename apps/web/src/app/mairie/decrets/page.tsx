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
  TextArea,
  TextInput,
  WorkspaceHeading,
} from "@/components/resource-table";
import { DECREE_STATUS_LABELS, ROLE_ELU, decrees, type DecreeStatus } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import { useResource } from "@/lib/use-resource";

const EMPTY_FORM: { title: string; body: string; status: DecreeStatus } = {
  title: "",
  body: "",
  status: "draft",
};

export default function DecreesPage() {
  const { items, error, isBusy, create, update, remove } = useResource(decrees);
  const [form, setForm] = useState(EMPTY_FORM);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (await create(form)) {
      setForm(EMPTY_FORM);
    }
  }

  return (
    <RequireRole role={ROLE_ELU}>
      <div className="space-y-8">
        <WorkspaceHeading
          title="Décrets"
          lead="Registre des décrets municipaux, réservé au maire et à son adjoint. La référence est attribuée par la mairie à l'enregistrement."
        />

        <ErrorBanner message={error} />

        <ResourceTable
          headers={["Référence", "Décret", "État", "Publié le", "Signé par", ""]}
          isLoading={items === null}
          isEmpty={items?.length === 0}
          emptyLabel="Aucun décret au registre."
        >
          {items?.map((decree) => (
            <tr key={decree.id}>
              <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{decree.reference}</td>
              <td className="px-4 py-3">
                <span className="font-medium">{decree.title}</span>
                <span className="mt-1 block whitespace-pre-line text-muted">{decree.body}</span>
              </td>
              <td className="px-4 py-3">
                <Select
                  value={decree.status}
                  disabled={isBusy}
                  aria-label={`État du décret ${decree.reference}`}
                  onChange={(event) =>
                    void update(decree.id, { status: event.target.value as DecreeStatus })
                  }
                >
                  {Object.entries(DECREE_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(decree.publishedAt)}</td>
              <td className="px-4 py-3 text-muted">{decree.authorName ?? "—"}</td>
              <td className="px-4 py-3 text-right">
                <RowAction label="Supprimer" onClick={() => void remove(decree.id)} />
              </td>
            </tr>
          ))}
        </ResourceTable>

        <ResourceForm
          legend="Rédiger un décret"
          submitLabel="Enregistrer"
          isBusy={isBusy}
          onSubmit={onSubmit}
        >
          <Field label="Intitulé">
            <TextInput
              required
              maxLength={180}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </Field>

          <Field label="État">
            <Select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as DecreeStatus })}
            >
              {Object.entries(DECREE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Texte" wide>
            <TextArea
              required
              rows={8}
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
            />
          </Field>
        </ResourceForm>
      </div>
    </RequireRole>
  );
}
