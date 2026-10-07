"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import { useAuth } from "@/lib/auth-context";
import { isPublicPath } from "@/lib/public-routes";

function subscribe(): () => void {
  return () => {};
}

/**
 * The server cannot see the token in localStorage. Wait until the client has
 * read it before deciding, so a signed-in refresh is not sent home.
 */
function useHasMounted(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const hasMounted = useHasMounted();
  const isPublic = isPublicPath(pathname);
  const mustRedirect = hasMounted && !isLoading && !isPublic && user === null;

  useEffect(() => {
    if (mustRedirect) {
      router.replace("/");
    }
  }, [mustRedirect, router]);

  if (isPublic || (hasMounted && !isLoading && user)) {
    return children;
  }

  return <p className="text-muted">Chargement…</p>;
}
