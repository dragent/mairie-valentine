"use client";

import { discordLoginUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function AccountPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <p className="text-muted">Chargement…</p>;
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-primary">Mon espace</h1>
        <p className="text-muted">Cet espace est réservé aux citoyens enregistrés.</p>
        <a
          href={discordLoginUrl}
          className="inline-block rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-accent"
        >
          Se connecter avec Discord
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-primary">
        Bonjour {user.displayName ?? user.username}
      </h1>

      <dl className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">Identifiant Discord</dt>
          <dd className="font-mono text-sm">{user.discordId}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Adresse de courriel</dt>
          <dd className="text-sm">{user.email ?? "non communiquée"}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Fonction</dt>
          <dd className="text-sm">{user.jobLabel ?? "Citoyen de Valentine"}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Dernière connexion</dt>
          <dd className="text-sm">
            {user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleString("fr-FR")
              : "première visite"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
