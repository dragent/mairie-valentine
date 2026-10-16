"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { ROLE_ELU, ROLE_SECRETAIRE, discordLoginUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

/** Staff links, each limited to the given role. */
const NAV_LINKS = [{ href: "/personnel", label: "Personnel", role: ROLE_ELU }];

const MAIRIE_LINKS = [
  { href: "/mairie/calendrier", label: "Calendrier", role: ROLE_SECRETAIRE },
  { href: "/mairie/decrets", label: "Décrets", role: ROLE_ELU },
  { href: "/mairie/evenements", label: "Événements", role: ROLE_SECRETAIRE },
  { href: "/mairie/rendez-vous", label: "Rendez-vous", role: ROLE_SECRETAIRE },
  { href: "/mairie/citoyens", label: "Citoyens", role: ROLE_SECRETAIRE },
];

export function SiteHeader() {
  const { user, isLoading, signOut, hasRole } = useAuth();
  const links = NAV_LINKS.filter((link) => hasRole(link.role));
  const mairieLinks = MAIRIE_LINKS.filter((link) => hasRole(link.role));

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
        <Link href="/" className="font-display text-xl text-heading">
          Mairie de Valentine
        </Link>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-muted hover:text-foreground">
              {link.label}
            </Link>
          ))}

          {mairieLinks.length > 0 && <MairieMenu links={mairieLinks} />}

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

function MairieMenu({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenPath(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenPath(null);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={() => setOpenPath(open ? null : pathname)}
        className={`flex items-center gap-1 hover:text-foreground ${open ? "text-foreground" : "text-muted"}`}
      >
        Mairie
        <Chevron open={open} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute top-full right-0 z-20 mt-2 min-w-44 rounded-md border border-line bg-surface py-1 shadow-sm"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              className="block px-4 py-2 text-muted hover:bg-background hover:text-foreground"
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`size-4 ${open ? "rotate-180" : ""}`}
      fill="currentColor"
    >
      <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" />
    </svg>
  );
}
