import { ApiError, municipalEvents, uploadEventPoster, type MunicipalEventInput } from "@/lib/api";

const POSTER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const POSTER_MAX_BYTES = 5 * 1024 * 1024;

export function posterRejection(file: File): string | null {
  if (!POSTER_TYPES.has(file.type)) {
    return "L'affiche doit être une image JPEG, PNG ou WebP.";
  }

  if (file.size > POSTER_MAX_BYTES) {
    return "L'affiche ne peut dépasser 5 Mo.";
  }

  return null;
}

/**
 * Creates the announcement, then attaches the poster. A refused poster
 * removes the event that was just written, so the register never keeps
 * an announcement whose affiche did not land.
 */
export async function announceMunicipalEvent(
  token: string,
  input: MunicipalEventInput,
  poster: File | null,
): Promise<void> {
  if (poster !== null) {
    const rejection = posterRejection(poster);

    if (rejection !== null) {
      throw new ApiError(422, rejection);
    }
  }

  const created = await municipalEvents.create(token, input);

  if (poster === null) {
    return;
  }

  try {
    await uploadEventPoster(token, created.id, poster);
  } catch (error) {
    try {
      await municipalEvents.remove(token, created.id);
    } catch {
      // The poster error is the one the clerk can act on.
    }

    throw error;
  }
}
