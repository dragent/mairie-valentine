"use client";

import Image from "next/image";
import Link from "next/link";

import { ROLE_ELU } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const SERVICES = [
  {
    title: "Registre des citoyens",
    description:
      "Recensement des habitants de Valentine, état civil et consultation du casier judiciaire.",
  },
  {
    title: "Documents officiels",
    description:
      "Délivrance des actes de propriété, licences de commerce et permis de port d'arme.",
  },
  {
    title: "Arrêtés municipaux",
    description: "Publication des décisions du conseil et affichage légal sur la place du marché.",
  },
];

export default function HomePage() {
  const { user, isLoading, hasRole } = useAuth();

  if (isLoading) {
    return <p className="text-muted">…</p>;
  }

  if (!user) {
    return <SealedBinder />;
  }

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <h1 className="font-display text-4xl text-heading">Mairie de Valentine</h1>
        <p className="max-w-2xl text-lg text-muted">
          Le classeur est ouvert. Les registres et services municipaux sont à votre disposition.
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {hasRole(ROLE_ELU) && (
          <Link
            href="/personnel"
            className="rounded-lg border border-line bg-surface p-6 shadow-sm hover:border-accent"
          >
            <h2 className="font-display text-lg text-heading">Personnel</h2>
            <p className="mt-3 text-sm text-muted">
              Recruter les secrétaires. Le maire y nomme aussi les adjoints et peut céder sa place.
            </p>
          </Link>
        )}
        {SERVICES.map((service) => (
          <article
            key={service.title}
            className="rounded-lg border border-line bg-surface p-6 shadow-sm"
          >
            <h2 className="font-display text-lg text-heading">{service.title}</h2>
            <p className="mt-3 text-sm text-muted">{service.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

function SealedBinder() {
  return (
    <section className="m-auto w-full max-w-xl">
      <article className="rounded-lg border-2 border-gold-dark bg-surface px-8 py-10 text-center shadow-sm">
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
