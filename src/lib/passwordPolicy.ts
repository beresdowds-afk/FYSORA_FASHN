export const MIN_PASSWORD_LENGTH = 10;

/** k-anonymity breach check (only a 5-char SHA-1 prefix leaves the browser). Fails open on network errors/timeouts. */
export async function isPasswordLeaked(pw: string): Promise<boolean> {
  try {
    const hashBuffer = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(pw));
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return false;
    const text = await res.text();
    return text.split("\n").some((line) => line.startsWith(suffix));
  } catch {
    return false;
  }
}
