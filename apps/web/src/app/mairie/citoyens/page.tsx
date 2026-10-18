"use client";

import { RequireRole } from "@/components/require-role";
import { ErrorBanner, WorkspaceHeading } from "@/components/resource-table";
import { ROLE_SECRETAIRE, appointments } from "@/lib/api";
import { citizenRegister } from "@/lib/citizen-register";
import { formatDateTime } from "@/lib/dates";
import { useResource } from "@/lib/use-resource";

export default function CitizensPage() {
  const register = useResource(appointments);
  const citizens = citizenRegister(register.items ?? []);

  return (
    <RequireRole role={ROLE_SECRETAIRE}>
      <div className="space-y-8">
        <WorkspaceHeading
          title="Citoyens"
          lead="Visites regroupées par le nom écrit au guichet. Deux orthographes restent deux personnes."
        />
        <ErrorBanner message={register.error} />
        {register.items === null ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : citizens.length === 0 ? (
          <p className="text-sm text-muted">Aucun citoyen n&apos;a encore été reçu.</p>
        ) : (
          <ul className="divide-y divide-line">
            {citizens.map((citizen) => (
              <li key={citizen.name.toLocaleLowerCase("fr")} className="py-4">
                <p className="font-display text-lg text-heading">{citizen.name}</p>
                <p className="text-sm text-muted">
                  {citizen.visits} visite{citizen.visits === 1 ? "" : "s"} · {citizen.honored} honorée
                  {citizen.honored === 1 ? "" : "s"} · {citizen.cancelled} annulée{citizen.cancelled === 1 ? "" : "s"} ·{" "}
                  {citizen.scheduled} prévue{citizen.scheduled === 1 ? "" : "s"}
                </p>
                <p className="text-sm text-muted">Dernière visite : {formatDateTime(citizen.lastVisit)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </RequireRole>
  );
}
