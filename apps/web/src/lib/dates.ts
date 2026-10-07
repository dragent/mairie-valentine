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

export function toLocalInput(iso: string | null | undefined, withTime = true): string {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const datePart = `${date.getFullYear()}-${month}-${day}`;

  if (!withTime) {
    return datePart;
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${datePart}T${hours}:${minutes}`;
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
