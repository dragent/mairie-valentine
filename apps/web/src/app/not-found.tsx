"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Stay on the client. `redirect()` rejects this render, and Next's dev client
 * then throws in flushComponentPerformance.
 */
export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return <p className="text-muted">Chargement…</p>;
}
