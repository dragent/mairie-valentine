/**
 * `datetime-local` inputs carry no time zone: the browser reads them in local
 * time, and the API wants an absolute instant, so everything crossing the wire
 * goes through here.
 */
export function toApiDate(localValue: string): string | null {
  if (localValue === "") {
    return null;
  }

  const parsed = new Date(localValue);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }

  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }

  return new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "medium" });
}
