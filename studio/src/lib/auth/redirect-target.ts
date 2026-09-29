/**
 * Validating a redirect target that came from the browser.
 *
 * `?next=/student/math` is the only way a protected route can hand the visitor
 * back to where they were going after they sign in. It arrives from a URL, so
 * it is attacker-controlled, and following it blindly is an open redirect:
 * `//evil.example` is a protocol-relative URL that `router.push()` accepts.
 *
 * `auth/callback/route.ts` and `auth/onboarding/page.tsx` each carried their
 * own three-line version of this check. This is that check, in one place, with
 * the array form Next can hand back for a repeated query parameter.
 */
export function safeRedirectTarget(
  value: string | string[] | null | undefined,
): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return null;
  if (!candidate.startsWith('/')) return null;
  // `/` starts a protocol-relative URL; `/\` is the same trick in disguise.
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return null;
  return candidate;
}
