"use client";

import Link from "next/link";

import { RequireRole } from "@/components/require-role";
import { ROLE_ELU, ROLE_MAIRE, ROLE_SECRETAIRE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const SPACES = [
  {
    href: "/mairie/rendez-vous",
    title: "Rendez-vous",
    description: "Tenue du registre des rendez-vous pris au guichet.",
    role: ROLE_SECRETAIRE,
  },
  {
    href: "/mairie/evenements",
    title: "Événements",
    description: "Conseils municipaux, foires et audiences publiques à venir.",
    role: ROLE_SECRETAIRE,
  },
  {
    href: "/mairie/notes",
    title: "Notes",
    description: "Mémos du secrétariat, consultables par toute la mairie.",
    role: ROLE_SECRETAIRE,
  },
  {
    href: "/mairie/decrets",
    title: "Décrets",
    description: "Rédaction et publication des décrets municipaux.",
    role: ROLE_ELU,
  },
  {
    href: "/mairie/personnel",
    title: "Personnel",
    description: "Attribution des fonctions aux agents de la mairie.",
    role: ROLE_MAIRE,
  },
];

export default function WorkspacePage() {
  const { user, hasRole } = useAuth();

  return (
    <RequireRole role={ROLE_SECRETAIRE}>
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="font-display text-2xl text-primary">Espace de travail</h1>
          <p className="text-sm text-muted">
            {user?.jobLabel ?? "Personnel de la mairie"} — {user?.displayName ?? user?.username}
          </p>
        </header>

        <section className="grid gap-6 sm:grid-cols-2">
          {SPACES.filter((space) => hasRole(space.role)).map((space) => (
            <Link
              key={space.href}
              href={space.href}
              className="rounded-lg border border-line bg-surface p-6 shadow-sm hover:border-accent"
            >
              <h2 className="font-display text-lg text-primary">{space.title}</h2>
              <p className="mt-3 text-sm text-muted">{space.description}</p>
            </Link>
          ))}
        </section>
      </div>
    </RequireRole>
  );
}
