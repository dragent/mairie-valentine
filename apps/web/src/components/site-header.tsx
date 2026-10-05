"use client";

import Image from "next/image";
import Link from "next/link";

import { ROLE_SECRETAIRE, discordLoginUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

/**
 * Links without `role` are shown only when signed in; `role` restricts staff links.
 */
const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/compte", label: "Mon espace" },
  { href: "/mairie", label: "Mairie", role: ROLE_SECRETAIRE },
];

export function SiteHeader() {
  const { user, isLoading, signOut, hasRole } = useAuth();
  const links = NAV_LINKS.filter((link) => {
    if (link.role !== undefined) {
      return hasRole(link.role);
    }

    return user !== null;
  });

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="font-display text-xl text-primary">
          Mairie de Valentine
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-muted hover:text-foreground">
              {link.label}
            </Link>
          ))}

          {isLoading ? (
            <span className="text-muted">…</span>
          ) : user ? (
            <span className="flex items-center gap-3">
              {user.avatarUrl && (
                <Image
                  src={user.avatarUrl}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-full border border-line"
                />
              )}
              <span className="font-medium">{user.displayName ?? user.username}</span>
              <button type="button" onClick={signOut} className="text-muted underline hover:text-foreground">
                Déconnexion
              </button>
            </span>
          ) : (
            <a
              href={discordLoginUrl}
              className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-accent"
            >
              Se connecter avec Discord
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
