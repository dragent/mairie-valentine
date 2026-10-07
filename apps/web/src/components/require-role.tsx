"use client";

import type { ReactNode } from "react";

import { discordLoginUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

/**
 * Client-side gate for the workspace pages. The API checks the same role on
 * every call, so this only spares the visitor a wall of failed requests.
 */
export function RequireRole({ role, children }: { role: string; children: ReactNode }) {
  const { user, isLoading, hasRole } = useAuth();

  if (isLoading) {
    return <p className="text-muted">Chargement…</p>;
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-heading">Accès réservé</h1>
        <p className="text-muted">Connectez-vous pour accéder à l&apos;espace de travail de la mairie.</p>
        <a
          href={discordLoginUrl}
          className="inline-block rounded-md border border-gold-dark bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-accent"
        >
          Se connecter avec Discord
        </a>
      </div>
    );
  }

  if (!hasRole(role)) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-heading">Accès réservé</h1>
        <p className="text-muted">
          Cette page est réservée au personnel de la mairie. Votre fonction actuelle ne vous y donne
          pas accès.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
