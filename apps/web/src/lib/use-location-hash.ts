"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener("hashchange", onStoreChange);

  return () => window.removeEventListener("hashchange", onStoreChange);
}

/**
 * Reads the URL fragment, which the Next.js router does not expose.
 * Returns null while rendering on the server.
 */
export function useLocationHash(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => null,
  );
}
