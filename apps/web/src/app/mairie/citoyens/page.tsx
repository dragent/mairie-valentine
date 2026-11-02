"use client";

import Image from "next/image";

import { RequireRole } from "@/components/require-role";
import { ErrorBanner } from "@/components/resource-table";
import { ROLE_SECRETAIRE, appointments } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { citizenRegister } from "@/lib/citizen-register";
import { formatDateTime } from "@/lib/dates";
import { useResource } from "@/lib/use-resource";

export default function CitizensPage() {
  const { user } = useAuth();
  const register = useResource(appointments);
  const citizens = citizenRegister(register.items ?? []);
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
            <h1 className="font-display text-4xl text-heading">Citoyens</h1>
            {signature && <p className="text-sm text-accent">{signature}</p>}
          </div>
        </div>

        <p className="mt-8 max-w-2xl text-center leading-relaxed sm:text-left">
          Visites regroupées par le nom écrit au guichet. Deux orthographes restent deux personnes.
        </p>

        <Ornament />

        <div className="space-y-8">
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
