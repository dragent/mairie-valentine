/**
 * Blocks injected scripts. Styles stay inline because the town hall fonts and
 * Tailwind emit them. The API origin is the only place the browser may call.
 */
export function contentSecurityPolicy(nonce: string, apiUrl: string, allowEval: boolean): string {
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (allowEval) {
    scriptSrc.push("'unsafe-eval'");
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://cdn.discordapp.com",
    "font-src 'self'",
    `connect-src 'self' ${apiUrl}${allowEval ? " ws://localhost:3000" : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}
