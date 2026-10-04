/**
 * Browsers must reach the API through the host port, while server components
 * run inside the Docker network and can talk to nginx directly.
 */
export const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || PUBLIC_API_URL;

export function apiBaseUrl(): string {
  return typeof window === "undefined" ? INTERNAL_API_URL : PUBLIC_API_URL;
}

export const discordLoginUrl = `${PUBLIC_API_URL}/auth/discord`;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiFetchOptions = RequestInit & { token?: string | null };

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, headers, ...init } = options;

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `${init.method ?? "GET"} ${path} a répondu ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export type CurrentUser = {
  id: number;
  discordId: string;
  username: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  roles: string[];
  lastLoginAt: string | null;
};

export function fetchCurrentUser(token: string): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/api/me", { token, cache: "no-store" });
}
