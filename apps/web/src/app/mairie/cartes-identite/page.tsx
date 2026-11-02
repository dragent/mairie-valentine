"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

import { RequireRole } from "@/components/require-role";
import { ErrorBanner, ResourceForm } from "@/components/resource-table";
import { ROLE_ELU, closeIdentityCardRegister, identityCards } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/dates";
import { identityCardTally } from "@/lib/identity-cards";
import { noteByline } from "@/lib/notes";
import { describe, useResource } from "@/lib/use-resource";

const CLOSE_CONFIRM =
  "Clôturer le registre efface l'historique des cartes délivrées depuis la dernière réunion des maires. Confirmer ?";

export default function IdentityCardsPage() {
  const { token, user } = useAuth();
  const register = useResource(identityCards);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const cards = register.items;
  const busy = register.isBusy || closing;
  const signatory = user?.displayName ?? user?.username;
  const signature = user?.jobLabel && signatory ? `${user.jobLabel} — ${signatory}` : signatory;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (await register.create({})) {
      setCloseError(null);
      setNotice("La délivrance est portée au registre.");
    }
  }

  async function closeRegister() {
    if (token === null || busy) {
      return;
    }

    if (!window.confirm(CLOSE_CONFIRM)) {
      return;
    }

    setClosing(true);
    setNotice(null);

    try {
      await closeIdentityCardRegister(token);
      setCloseError(null);
      setNotice("Le registre est clos.");
      register.reload();
    } catch (cause: unknown) {
      setCloseError(describe(cause));
    } finally {
      setClosing(false);
    }
  }

  return (
    <RequireRole role={ROLE_ELU}>
      <section className="ledger-frame bg-surface px-8 py-8 sm:px-10">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <Image
            src="/sceau-mairie.png"
            alt=""
            width={112}
            height={112}
            className="size-28 shrink-0 object-contain"
          />
          <div className="space-y-3 text-center sm:text-left">
            <p className="text-xs tracking-[0.28em] text-gold-dark uppercase">Greffe municipal</p>
            <h1 className="font-display text-4xl text-heading">Cartes d&apos;identité</h1>
            {signature && <p className="text-sm text-accent">{signature}</p>}
          </div>
        </div>

        <p className="mt-8 max-w-2xl text-center leading-relaxed sm:text-left">
          Registre des cartes délivrées depuis la dernière réunion des maires. Le titulaire n&apos;y est pas nommé :
          seule la délivrance est inscrite.
        </p>

        <Ornament />

        <div className="space-y-8">
          <ErrorBanner message={closeError ?? register.error} />
          {notice !== null && <p className="text-sm text-accent">{notice}</p>}

          <ResourceForm
            className=""
            legend="Inscrire une délivrance"
            submitLabel="Enregistrer"
            isBusy={busy}
            onSubmit={onSubmit}
          >
            <p className="text-sm text-muted sm:col-span-2">
              Une ligne de plus au registre, sans le nom du titulaire.
            </p>
          </ResourceForm>

          <section>
            <h2 className="font-display text-2xl text-heading">Depuis la dernière réunion</h2>
            {cards === null ? (
              <p className="mt-4 text-sm text-muted">Chargement…</p>
            ) : (
              <>
                <p className="mt-4 text-sm text-muted">{identityCardTally(cards.length)}</p>
                {cards.length > 0 && (
                  <ul className="mt-2 divide-y divide-line">
                    {cards.map((card) => (
                      <li key={card.id} className="py-4">
                        <span className="block font-display text-lg text-heading">
                          {formatDateTime(card.createdAt)}
                        </span>
                        <span className="text-sm text-muted">{noteByline(card)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>

          <section>
            <h2 className="font-display text-2xl text-heading">Réunion des maires</h2>
            <p className="mt-4 max-w-2xl text-sm text-muted">
              À l&apos;issue de la réunion, le maire ou le maire adjoint clôt le registre. L&apos;historique est alors
              effacé.
            </p>
            <button
              type="button"
              disabled={busy || cards === null}
              onClick={() => void closeRegister()}
              className="mt-4 rounded-md border border-gold-dark bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-accent disabled:opacity-60"
            >
              Clôturer le registre
            </button>
          </section>
        </div>
      </section>
    </RequireRole>
  );
}

function Ornament() {
  return (
    <div className="my-8 flex items-center gap-4" aria-hidden="true">
      <span className="h-px flex-1 bg-gold-dark/70" />
      <span className="size-1.5 rotate-45 bg-gold-dark" />
      <span className="h-px flex-1 bg-gold-dark/70" />
    </div>
  );
}
