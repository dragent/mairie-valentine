"use client";

import Image from "next/image";
import Link from "next/link";

import { discordLoginUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/compte", label: "Mon espace" },
];

export function SiteHeader() {
  const { user, isLoading, signOut } = useAuth();

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="font-display text-xl text-heading">
          Mairie de Valentine
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          {NAV_LINKS.map((link) => (
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
              className="rounded-md border border-gold-dark bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-accent"
            >
              Se connecter avec Discord
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
