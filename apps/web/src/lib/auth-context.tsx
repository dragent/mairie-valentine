"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { ApiError, fetchCurrentUser, type CurrentUser } from "@/lib/api";

const TOKEN_STORAGE_KEY = "mairie-valentine.token";

/**
 * localStorage is an external store: going through useSyncExternalStore keeps
 * React in sync with it (including across tabs) without the hydration mismatch
 * that reading it during render would cause.
 */
const listeners = new Set<() => void>();

function subscribeToToken(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readToken(): string | null {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function writeToken(token: string | null): void {
  if (token === null) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } else {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  // The `storage` event is not fired in the tab that wrote the value.
  for (const listener of listeners) {
    listener();
  }
}

type AuthState = {
  user: CurrentUser | null;
  token: string | null;
  isLoading: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
  reload: () => Promise<void>;
  hasRole: (role: string) => boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const token = useSyncExternalStore(subscribeToToken, readToken, () => null);
  const [profile, setProfile] = useState<{ token: string; user: CurrentUser | null } | null>(null);

  useEffect(() => {
    if (token === null) {
      return;
    }

    let cancelled = false;

    fetchCurrentUser(token)
      .then((user) => {
        if (!cancelled) {
          setProfile({ token, user });
        }
      })
      .catch((error: unknown) => {
        // An expired or revoked token is worthless, drop it.
        if (error instanceof ApiError && error.status === 401) {
          writeToken(null);
          return;
        }

        if (!cancelled) {
          setProfile({ token, user: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const signIn = useCallback((newToken: string) => writeToken(newToken), []);
  const signOut = useCallback(() => writeToken(null), []);
  const reload = useCallback(() => {
    if (token === null) {
      return Promise.resolve();
    }

    return fetchCurrentUser(token).then((nextUser) => {
      setProfile({ token, user: nextUser });
    });
  }, [token]);

  const value = useMemo<AuthState>(() => {
    const isResolved = profile?.token === token;
    const user = isResolved ? profile.user : null;

    return {
      user,
      token,
      isLoading: token !== null && !isResolved,
      signIn,
      signOut,
      reload,
      hasRole: (role) => user?.roles.includes(role) ?? false,
    };
  }, [profile, token, signIn, signOut, reload]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un <AuthProvider>.");
  }

  return context;
}
