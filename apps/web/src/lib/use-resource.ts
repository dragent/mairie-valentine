"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type ResourceClient<TRead, TWrite> = {
  list: (token: string) => Promise<TRead[]>;
  create: (token: string, payload: TWrite) => Promise<TRead>;
  update: (token: string, id: number, payload: Partial<TWrite>) => Promise<TRead>;
  remove: (token: string, id: number) => Promise<void>;
};

export type ResourceState<TRead, TWrite> = {
  items: TRead[] | null;
  error: string | null;
  isBusy: boolean;
  create: (payload: TWrite) => Promise<boolean>;
  update: (id: number, payload: Partial<TWrite>) => Promise<boolean>;
  remove: (id: number) => Promise<boolean>;
};

/**
 * Loading, writing and reloading one of the workspace collections. Every write
 * bumps the revision, which reloads the list: the API fills in references,
 * dates and authors that the form has no way of knowing.
 */
export function useResource<TRead, TWrite>(
  client: ResourceClient<TRead, TWrite>,
): ResourceState<TRead, TWrite> {
  const { token } = useAuth();
  const [items, setItems] = useState<TRead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (token === null) {
      return;
    }

    let cancelled = false;

    client
      .list(token)
      .then((loaded) => {
        if (!cancelled) {
          setItems(loaded);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(describe(cause));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, token, revision]);

  const write = useCallback(
    async (action: (authenticated: string) => Promise<unknown>): Promise<boolean> => {
      if (token === null) {
        return false;
      }

      setIsBusy(true);

      try {
        await action(token);
        setError(null);
        setRevision((previous) => previous + 1);

        return true;
      } catch (cause: unknown) {
        setError(describe(cause));

        return false;
      } finally {
        setIsBusy(false);
      }
    },
    [token],
  );

  return {
    items,
    error,
    isBusy,
    create: (payload) => write((authenticated) => client.create(authenticated, payload)),
    update: (id, payload) => write((authenticated) => client.update(authenticated, id, payload)),
    remove: (id) => write((authenticated) => client.remove(authenticated, id)),
  };
}

export function describe(cause: unknown): string {
  return cause instanceof ApiError ? cause.message : "Une erreur inattendue est survenue.";
}
