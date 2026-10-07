"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { useAuth } from "@/lib/auth-context";
import { useLocationHash } from "@/lib/use-location-hash";

const DEFAULT_ERROR = "discord_handshake_failed";

const ERROR_MESSAGES: Record<string, string> = {
  discord_handshake_failed: "La connexion avec Discord a échoué. Merci de réessayer.",
  not_a_guild_member: "Vous devez être membre du serveur Discord de la ville pour vous connecter.",
  discord_unavailable: "Discord est momentanément injoignable. Merci de réessayer plus tard.",
};

export default function AuthCallbackPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  // The API returns the token in the URL fragment so that it never reaches a
  // server access log.
  const hash = useLocationHash();
  const params = useMemo(() => new URLSearchParams((hash ?? "").slice(1)), [hash]);
  const token = params.get("token");

  useEffect(() => {
    if (token === null) {
      return;
    }

    signIn(token);
    router.replace("/");
  }, [token, router, signIn]);

  const error =
    hash === null || token !== null
      ? null
      : (ERROR_MESSAGES[params.get("error") ?? DEFAULT_ERROR] ?? ERROR_MESSAGES[DEFAULT_ERROR]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-heading">Connexion</h1>
      <p className="text-muted">{error ?? "Vérification de votre identité…"}</p>
    </div>
  );
}
