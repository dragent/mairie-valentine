const AUTH_PREFIX = "/auth/";
const PUBLIC_PAGES = ["/", "/affichage"];

/** Pages a visitor may open before signing in. Everything else returns home. */
export function isPublicPath(pathname: string): boolean {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  return PUBLIC_PAGES.includes(path) || path.startsWith(AUTH_PREFIX);
}
