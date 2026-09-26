export function shouldEnforceAuthWall(
  nodeEnv: string | undefined,
  configuredValue: string | undefined,
): boolean {
  return nodeEnv === 'production'
    ? configuredValue !== 'false'
    : configuredValue === 'true';
}

export function isLocalDemoEnabled(
  nodeEnv: string | undefined,
  configuredValue: string | undefined,
): boolean {
  return nodeEnv !== 'production' && configuredValue === 'true';
}

/**
 * Route prefixes that hold a role workspace and therefore require a session.
 *
 * `/dashboard` is listed because it is still a mounted surface with its own
 * sidebar and sub-routes. It used to be unprotected *and* unable to resolve an
 * identity, which is how an anonymous visitor got a permanently blank page.
 * When the audit of the legacy `(main)/dashboard/**` tree concludes, either
 * this entry disappears with the routes or it stays and keeps protecting them.
 */
export const PROTECTED_WORKSPACE_PREFIXES = [
  '/student',
  '/teacher',
  '/parent',
  '/head',
  '/dashboard',
] as const;

/**
 * True when `pathname` is a workspace route or lives inside one.
 *
 * Matching is per-segment, so `/studentlife` is not mistaken for `/student`.
 */
export function isProtectedWorkspace(pathname: string): boolean {
  return PROTECTED_WORKSPACE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
