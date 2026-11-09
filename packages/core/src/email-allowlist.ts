/**
 * Parses a comma-separated domain list, e.g. "vilore.com, bloomteq.com".
 * An empty list means "anyone may register" (local development).
 */
export function parseAllowedDomains(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
}

/** True when the email's domain is on the list, or the list is empty. */
export function isEmailAllowed(email: string, allowedDomains: readonly string[]): boolean {
  if (allowedDomains.length === 0) return true;
  const at = email.lastIndexOf('@');
  if (at < 1) return false;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  return allowedDomains.includes(domain);
}
