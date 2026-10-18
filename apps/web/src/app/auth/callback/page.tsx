"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { LoadingSeal } from "@/components/loading-seal";
import { useAuth } from "@/lib/auth-context";

const DEFAULT_ERROR = "discord_handshake_failed";

const ERROR_MESSAGES: Record<string, string> = {
  discord_handshake_failed: "La connexion avec Discord a échoué. Merci de réessayer.",
  not_a_guild_member: "Vous devez être membre du serveur Discord de la ville pour vous connecter.",
  discord_unavailable: "Discord est momentanément injoignable. Merci de réessayer plus tard.",
  invalid_discord_account: "Ce compte Discord ne peut pas être utilisé.",
};

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingSeal label="Vérification de votre identité…" />}>
      <CallbackResult />
    </Suspense>
  );
}

function CallbackResult() {
  const router = useRouter();
  const { signIn } = useAuth();
  const code = useSearchParams().get("error");
  const error = code === null ? null : (ERROR_MESSAGES[code] ?? ERROR_MESSAGES[DEFAULT_ERROR]);

  useEffect(() => {
    if (error !== null) {
      return;
    }

    signIn();
    router.replace("/");
  }, [error, router, signIn]);

  if (error === null) {
    return <LoadingSeal label="Vérification de votre identité…" />;
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl text-heading">Connexion</h1>
      <p className="text-muted">{error}</p>
    </div>
  );
}
