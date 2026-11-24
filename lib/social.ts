/**
 * Turns whatever an admin typed into a link that really opens the page:
 *  "@club"                  -> https://instagram.com/club   (for the given platform)
 *  "instagram.com/club"     -> https://instagram.com/club
 *  "www.facebook.com/club"  -> https://www.facebook.com/club
 *  "https://…"              -> unchanged
 * Without this, a link saved as "instagram.com/club" is treated as a *relative* link and breaks.
 */
export type SocialPlatform = "facebook" | "instagram" | "twitter";
const HOST: Record<SocialPlatform, string> = { facebook: "facebook.com", instagram: "instagram.com", twitter: "x.com" };

export function socialUrl(value: string | undefined | null, platform: SocialPlatform): string {
  const v = (value || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("//")) return `https:${v}`;
  if (/^(javascript|data|vbscript):/i.test(v)) return "";
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(v)) return `https://${v}`; // domain with no scheme
  const handle = v.replace(/^@/, "").replace(/^\/+/, "");
  return handle ? `https://${HOST[platform]}/${handle}` : "";
}
