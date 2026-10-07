"use client";

import Image from "next/image";
import type { ReactNode } from "react";

import { StaffNotes } from "@/components/staff-notes";
import { ROLE_SECRETAIRE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const { user, isLoading, hasRole } = useAuth();

  if (isLoading) {
    return <p className="text-muted">…</p>;
  }

  if (!user) {
    return <SealedBinder />;
  }

  return (
    <OpenBinder signatory={user.displayName ?? user.username} office={user.jobLabel}>
      {hasRole(ROLE_SECRETAIRE) ? (
        <StaffNotes />
      ) : (
        <p className="text-muted">
          Les notes du maire, des adjoints et des secrétaires sont réservées au personnel de la
          mairie.
        </p>
      )}
    </OpenBinder>
  );
}

function OpenBinder({
  signatory,
  office,
  children,
}: {
  signatory: string;
  office: string | null;
  children: ReactNode;
}) {
  return (
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
          <h1 className="font-display text-4xl text-heading">Classeur ouvert</h1>
          <p className="text-sm text-accent">
            {office ? `${office} — ${signatory}` : signatory}
          </p>
        </div>
      </div>

      <p className="mt-8 max-w-2xl text-center leading-relaxed sm:text-left">
        Le sceau a été rompu. Les registres, les arrêtés et la correspondance de l&apos;administration
        municipale sont à votre disposition.
      </p>

      <Ornament />

      {children}
    </section>
  );
}

function SealedBinder() {
  return (
    <section className="m-auto w-full max-w-xl">
      <article className="ledger-frame bg-surface px-8 py-10 text-center">
        <Image
          src="/sceau-mairie.png"
          alt=""
          width={96}
          height={96}
          className="mx-auto size-24 object-contain"
        />
        <p className="mt-3 text-xs tracking-[0.2em] text-muted uppercase">Sceau municipal</p>
        <h1 className="mt-6 font-display text-3xl text-heading">Classeur scellé</h1>
        <p className="mt-6 leading-relaxed">
          Posé sur le comptoir du greffe, ce classeur porte le sceau de la Mairie de Valentine. Il
          renferme les registres, les arrêtés et la correspondance de l&apos;administration
          municipale.
        </p>
        <p className="mt-4 text-muted">
          Le sceau ne peut être rompu que par les employés de la mairie. Toute personne étrangère
          au service est priée de le laisser fermé.
        </p>
      </article>
    </section>
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
