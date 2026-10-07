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
    throw new ApiError(response.status, await readErrorMessage(response, init.method ?? "GET", path));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/**
 * API Platform answers errors with a `detail` worth showing as is, be it a
 * validation message or a Discord refusing a promotion.
 */
async function readErrorMessage(response: Response, method: string, path: string): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: unknown };

    if (typeof payload.detail === "string" && payload.detail !== "") {
      return payload.detail;
    }
  } catch {
    // Not every error comes back as JSON.
  }

  return `${method} ${path} a répondu ${response.status}`;
}

export const ROLE_SECRETAIRE = "ROLE_SECRETAIRE";
export const ROLE_ELU = "ROLE_ELU";
export const ROLE_MAIRE = "ROLE_MAIRE";

export type Job = "maire" | "adjoint" | "secretaire";

export const JOB_LABELS: Record<Job, string> = {
  maire: "Maire",
  adjoint: "Maire adjoint",
  secretaire: "Secrétaire de mairie",
};

export type CurrentUser = {
  id: number;
  discordId: string;
  username: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  job: Job | null;
  jobLabel: string | null;
  roles: string[];
  lastLoginAt: string | null;
};

export function fetchCurrentUser(token: string): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/api/me", { token, cache: "no-store" });
}

/**
 * API Platform leaves null properties out of its payloads, hence the optional
 * fields below on everything that is nullable server-side.
 */
type Authored = {
  createdAt: string;
  updatedAt: string;
  authorName?: string | null;
};

export type AppointmentStatus = "scheduled" | "honored" | "cancelled";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Prévu",
  honored: "Honoré",
  cancelled: "Annulé",
};

export type Appointment = Authored & {
  id: number;
  subject: string;
  citizenName: string;
  scheduledAt: string;
  durationMinutes: number;
  location?: string | null;
  status: AppointmentStatus;
  notes?: string | null;
};

export type AppointmentInput = {
  subject: string;
  citizenName: string;
  scheduledAt: string;
  durationMinutes: number;
  location: string | null;
  status: AppointmentStatus;
  notes: string | null;
};

export type MunicipalEvent = Authored & {
  id: number;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
};

export type MunicipalEventInput = {
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
};

export type Note = Authored & {
  id: number;
  title: string;
  body: string;
};

export type NoteInput = {
  title: string;
  body: string;
};

export type DecreeStatus = "draft" | "published" | "repealed";

export const DECREE_STATUS_LABELS: Record<DecreeStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  repealed: "Abrogé",
};

export type Decree = Authored & {
  id: number;
  reference: string;
  title: string;
  body: string;
  status: DecreeStatus;
  publishedAt?: string | null;
};

export type DecreeInput = {
  title: string;
  body: string;
  status: DecreeStatus;
};

type Resource<TRead, TWrite> = {
  list: (token: string) => Promise<TRead[]>;
  create: (token: string, payload: TWrite) => Promise<TRead>;
  update: (token: string, id: number, payload: Partial<TWrite>) => Promise<TRead>;
  remove: (token: string, id: number) => Promise<void>;
};

function resource<TRead, TWrite>(path: string): Resource<TRead, TWrite> {
  return {
    list: (token) => apiFetch<TRead[]>(path, { token, cache: "no-store" }),
    create: (token, payload) =>
      apiFetch<TRead>(path, {
        token,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    update: (token, id, payload) =>
      apiFetch<TRead>(`${path}/${id}`, {
        token,
        method: "PATCH",
        headers: { "Content-Type": "application/merge-patch+json" },
        body: JSON.stringify(payload),
      }),
    remove: (token, id) => apiFetch<void>(`${path}/${id}`, { token, method: "DELETE" }),
  };
}

export const appointments = resource<Appointment, AppointmentInput>("/api/appointments");
export const municipalEvents = resource<MunicipalEvent, MunicipalEventInput>("/api/municipal_events");
export const notes = resource<Note, NoteInput>("/api/notes");
export const decrees = resource<Decree, DecreeInput>("/api/decrees");

export type StaffMember = {
  id: number;
  discordId: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  job?: Job | null;
  jobLabel?: string | null;
  lastLoginAt?: string | null;
};

export function fetchStaff(token: string): Promise<StaffMember[]> {
  return apiFetch<StaffMember[]>("/api/users", { token, cache: "no-store" });
}

export type GuildMember = {
  discordId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  job: Job | null;
  jobLabel: string | null;
};

export function fetchGuildMembers(token: string): Promise<GuildMember[]> {
  return apiFetch<GuildMember[]>("/api/guild-members", { token, cache: "no-store" });
}

/**
 * Hands a Discord member a position, or takes it back with `null`.
 * `maire` cedes the seat: the successor becomes the only mayor.
 * The API rewrites the Discord roles before answering, so a failure means nothing changed.
 */
export function promoteMember(token: string, discordId: string, job: Job | null): Promise<StaffMember> {
  return apiFetch<StaffMember>("/api/promotions", {
    token,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ discordId, job }),
  });
}
