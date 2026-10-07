import {
  APPOINTMENT_STATUS_LABELS,
  PUBLIC_API_URL,
  type Appointment,
  type Decree,
  type MunicipalEvent,
} from "@/lib/api";
import { townYearOf, type CalendarEntry } from "@/lib/calendar";

export type SheetField = {
  label: string;
  value: string;
};

export type CalendarSheet = {
  kind: CalendarEntry["kind"];
  kindLabel: string;
  recordId: number;
  title: string;
  posterUrl: string | null;
  fields: SheetField[];
  record: MunicipalEvent | Appointment | Decree;
};

const ENTRY_ID = /^(event|appointment|decree)-(\d+)-\d{4}-\d{2}-\d{2}$/;

export function formatTownDateTime(iso: string, now = new Date()): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const year = townYearOf(date.getFullYear(), now);
  const weekday = date.toLocaleDateString("fr-FR", { weekday: "long" });
  const month = date.toLocaleDateString("fr-FR", { month: "long" });
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${weekday} ${date.getDate()} ${month} ${year}, ${hours}:${minutes}`;
}

export function formatTownWhen(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const labeled = formatTownDateTime(iso, now);

  if (!Number.isNaN(date.getTime()) && date.getHours() === 0 && date.getMinutes() === 0) {
    return labeled.replace(/, 00:00$/, "");
  }

  return labeled;
}

export function calendarSheet(
  entry: CalendarEntry,
  events: MunicipalEvent[],
  appointments: Appointment[],
  decrees: Decree[],
  now = new Date(),
): CalendarSheet | null {
  const match = ENTRY_ID.exec(entry.id);

  if (match === null || match[1] !== entry.kind) {
    return null;
  }

  const recordId = Number(match[2]);

  if (entry.kind === "event") {
    const record = events.find((item) => item.id === recordId);

    return record === undefined ? null : eventSheet(record, now);
  }

  if (entry.kind === "appointment") {
    const record = appointments.find((item) => item.id === recordId);

    return record === undefined ? null : appointmentSheet(record, now);
  }

  const record = decrees.find((item) => item.id === recordId);

  return record === undefined ? null : decreeSheet(record, now);
}

function eventSheet(record: MunicipalEvent, now: Date): CalendarSheet {
  return {
    kind: "event",
    kindLabel: "Événement",
    recordId: record.id,
    title: record.title,
    posterUrl: posterUrl(record.posterPath),
    fields: fields([
      record.endsAt
        ? ["Début", formatTownDateTime(record.startsAt, now)]
        : ["Date", formatTownDateTime(record.startsAt, now)],
      record.endsAt ? ["Fin", formatTownDateTime(record.endsAt, now)] : null,
      textField("Lieu", record.location),
      textField("Description", record.description),
    ]),
    record,
  };
}

function appointmentSheet(record: Appointment, now: Date): CalendarSheet {
  return {
    kind: "appointment",
    kindLabel: "Rendez-vous",
    recordId: record.id,
    title: record.subject,
    posterUrl: null,
    fields: fields([
      ["Citoyen", record.citizenName],
      ["Date et heure", formatTownDateTime(record.scheduledAt, now)],
      ["Durée", `${record.durationMinutes} minutes`],
      textField("Lieu", record.location),
      ["État", APPOINTMENT_STATUS_LABELS[record.status]],
      textField("Notes", record.notes),
    ]),
    record,
  };
}

function decreeSheet(record: Decree, now: Date): CalendarSheet {
  return {
    kind: "decree",
    kindLabel: "Décret",
    recordId: record.id,
    title: record.title,
    posterUrl: posterUrl(record.posterPath),
    fields: fields([
      ["Référence", record.reference],
      record.startsAt ? ["Début", formatTownWhen(record.startsAt, now)] : null,
      record.endsAt ? ["Fin", formatTownWhen(record.endsAt, now)] : null,
      ["Texte", record.body],
    ]),
    record,
  };
}

function posterUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  return `${PUBLIC_API_URL}/${path.replace(/^\//, "")}`;
}

function textField(label: string, value: string | null | undefined): [string, string] | null {
  if (value === null || value === undefined || value.trim() === "") {
    return null;
  }

  return [label, value];
}

function fields(rows: ([string, string] | null)[]): SheetField[] {
  return rows.flatMap((row) => (row === null ? [] : [{ label: row[0], value: row[1] }]));
}
