/**
 * One source for identifiers that leave the browser.
 *
 * The studio app used to mint session ids, device ids, message ids, quiz ids and
 * shareable join codes with
 * `Math.random().toString(36).substr(2, 9)`. `Math.random()` is a predictable
 * xorshift128+ whose state can be recovered from a handful of observed outputs,
 * and nine base36 characters is well under the 53 bits it actually prints. When
 * the value names a session or a code that grants access, predictability is the
 * bug.
 *
 * Why not `crypto.randomUUID()`: it is a secure-context API. On a plain-HTTP
 * school network (`http://192.168.x.x`) it is `undefined`, and that is precisely
 * how `lib/session/session-manager.ts` ended up with a Math.random fallback.
 * `crypto.getRandomValues` is available in insecure contexts too, so everything
 * here is built on it.
 *
 * There is deliberately no fallback path. If `getRandomValues` is missing, this
 * throws `SecureRandomUnavailable` instead of quietly handing out a guessable id
 * — a loud failure in a generator nobody can see is cheaper than a session id an
 * attacker can.
 */

/** 32 symbols with the read-aloud collisions removed: no I, O, 0, 1. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomBytes(count: number): Uint8Array {
  const webCrypto = globalThis.crypto;
  if (!webCrypto || typeof webCrypto.getRandomValues !== 'function') {
    throw new Error(
      'SecureRandomUnavailable: this environment has no crypto.getRandomValues, '
      + 'and a guessable id is not an acceptable substitute.',
    );
  }
  const bytes = new Uint8Array(count);
  webCrypto.getRandomValues(bytes);
  return bytes;
}

/** `byteLength` bytes of entropy, printed as lowercase hex (2 chars per byte). */
export function randomHex(byteLength = 8): string {
  let out = '';
  for (const byte of randomBytes(byteLength)) {
    out += byte.toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * A prefixed id: sortable by time, unique within the millisecond.
 * Use for anything stored, sent, or compared — sessions, devices, messages, rows.
 */
export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${randomHex(9)}`;
}

/** RFC 4122 v4 from the CSPRNG, so the `session-manager` format checks still pass. */
export function newUuid(): string {
  const b = randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx
  const hex = Array.from(b, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * A shareable join code. Seven unambiguous symbols is ~34 billion values, which
 * is only safe because the underlying draw is unbiased; the old code got seven
 * characters from `Math.random()` and a caller could enumerate them.
 */
export function newJoinCode(length = 7): string {
  const bytes = randomBytes(length);
  let out = '';
  for (const byte of bytes) {
    // Rejection-free enough here: 256 mod 32 == 0, so no modulo bias.
    out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return out;
}
