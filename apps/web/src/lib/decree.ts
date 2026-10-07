import { ApiError, decrees, uploadDecreePoster, type Decree, type DecreeInput, type DecreeStatus } from "@/lib/api";
import { toApiDate } from "@/lib/dates";
import { posterRejection } from "@/lib/event-poster";

export type DecreeForm = {
  title: string;
  body: string;
  status: DecreeStatus;
  startsOn: string;
  endsOn: string;
};

export function decreeSubmission(form: DecreeForm): { input: DecreeInput } | { error: string } {
  if (form.status !== "published") {
    return {
      input: {
        title: form.title,
        body: form.body,
        status: form.status,
        startsAt: null,
        endsAt: null,
      },
    };
  }

  if (form.startsOn === "" || form.endsOn === "") {
    return { error: "Indiquez la date de début et la date de fin." };
  }

  if (form.endsOn < form.startsOn) {
    return { error: "La date de fin ne peut précéder la date de début." };
  }

  const startsAt = toApiDate(`${form.startsOn}T00:00`);
  const endsAt = toApiDate(`${form.endsOn}T00:00`);

  if (startsAt === null || endsAt === null) {
    return { error: "Indiquez la date de début et la date de fin." };
  }

  return {
    input: {
      title: form.title,
      body: form.body,
      status: "published",
      startsAt,
      endsAt,
    },
  };
}

/**
 * Creates the decree, then attaches the poster. A refused poster removes the
 * decree that was just written, so the register never keeps one whose affiche
 * did not land.
 */
export async function recordDecree(token: string, input: DecreeInput, poster: File | null): Promise<Decree> {
  if (poster !== null) {
    const rejection = posterRejection(poster);

    if (rejection !== null) {
      throw new ApiError(422, rejection);
    }
  }

  const created = await decrees.create(token, input);

  if (poster === null) {
    return created;
  }

  try {
    await uploadDecreePoster(token, created.id, poster);
  } catch (error) {
    try {
      await decrees.remove(token, created.id);
    } catch {
      // The poster error is the one the clerk can act on.
    }

    throw error;
  }

  return created;
}
