import { ROLE_SECRETAIRE } from "@/lib/api";

const AUTH_PREFIX = "/auth/";
const PUBLIC_PAGES = ["/", "/affichage"];

/**
 * The public board is for visitors and plain citizens. Mayor, deputy and
 * secretary already carry ROLE_SECRETAIRE once /api/me flattens the hierarchy.
 */
export function showsPublicBoard(roles: readonly string[]): boolean {
  return !roles.includes(ROLE_SECRETAIRE);
}

/** Pages a visitor may open before signing in. Everything else returns home. */
export function isPublicPath(pathname: string): boolean {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  return PUBLIC_PAGES.includes(path) || path.startsWith(AUTH_PREFIX);
}
