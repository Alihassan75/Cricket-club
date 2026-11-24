/** Remembers where a visitor was heading (e.g. an hour they tapped) so we can take them there after sign-up / sign-in. */
const KEY = "postLoginNext";
const TTL = 2 * 60 * 60 * 1000; // keep for 2 hours (long enough to open the verification email in another tab)
const safe = (n: string | null | undefined) => (n && n.startsWith("/") && !n.startsWith("//") && !n.includes("\\") ? n : null);

export function rememberNext() {
  try {
    const n = safe(new URLSearchParams(window.location.search).get("next"));
    if (n) localStorage.setItem(KEY, JSON.stringify({ n, t: Date.now() }));
  } catch {}
}

/** Returns the remembered destination (and forgets it). */
export function takeNext(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return null;
    const { n, t } = JSON.parse(raw);
    return Date.now() - t < TTL ? safe(n) : null;
  } catch { return null; }
}
