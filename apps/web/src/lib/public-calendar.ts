import type { Decree, MunicipalEvent, PublicBoard } from "@/lib/api";

export function calendarSources(board: PublicBoard): {
  events: MunicipalEvent[];
  decrees: Decree[];
} {
  return {
    events: board.events.map((event, index) => ({
      id: index + 1,
      title: event.title,
      description: null,
      startsAt: event.startsAt,
      endsAt: event.endsAt ?? null,
      location: event.location ?? null,
      posterPath: event.posterPath ?? null,
      createdAt: event.startsAt,
      updatedAt: event.startsAt,
    })),
    decrees: board.decrees.map((decree, index) => ({
      id: index + 1,
      reference: decree.reference,
      title: decree.title,
      body: "",
      status: "published",
      startsAt: decree.startsAt,
      endsAt: decree.endsAt,
      posterPath: decree.posterPath ?? null,
      createdAt: decree.startsAt,
      updatedAt: decree.startsAt,
    })),
  };
}
