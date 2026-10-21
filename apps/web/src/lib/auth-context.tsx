"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiError, endSession, fetchCurrentUser, type CurrentUser } from "@/lib/api";

type AuthState = {
  user: CurrentUser | null;
  /** Present once the cookie session has been confirmed. It is not a JWT. */
  token: string | null;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => void;
  reload: () => Promise<void>;
  hasRole: (role: string) => boolean;
};

const AuthContext = createContext<AuthState | null>(null);
const SESSION = "session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetchCurrentUser()
      .then((next) => {
        if (!cancelled) {
          setUser(next);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && (error instanceof ApiError || error instanceof Error)) {
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [revision]);

  const signIn = useCallback(() => {
    setRevision((current) => current + 1);
  }, []);

  const signOut = useCallback(() => {
    void endSession()
      .catch(() => undefined)
      .finally(() => setUser(null));
  }, []);

  const reload = useCallback(() => {
    return fetchCurrentUser().then((next) => {
      setUser(next);
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token: user === null ? null : SESSION,
      isLoading,
      signIn,
      signOut,
      reload,
      hasRole: (role) => user?.roles.includes(role) ?? false,
    }),
    [user, isLoading, signIn, signOut, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un <AuthProvider>.");
  }

  return context;
}
