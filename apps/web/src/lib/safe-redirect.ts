/** Only same-site paths are allowed as a post-login destination. */
export function safeRedirect(path: string | null | undefined, fallback = '/'): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
    return fallback;
  }
  return path;
}
