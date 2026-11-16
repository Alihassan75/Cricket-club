// When the Backyard Manager switches someone off or changes their role, sign-ins made before that moment stop working.
// Kept in memory (so it covers a single running server); the Backyard-only actions also re-check the database live.
const g = globalThis as unknown as { __revoked?: Map<string, number> };
const revoked = (g.__revoked ||= new Map<string, number>());

export function revokeSessions(userId: string) {
  revoked.set(String(userId), Math.floor(Date.now() / 1000));
}
/** True if this token was issued before the account was switched off / re-roled. */
export function isRevoked(userId: string, issuedAt?: number) {
  const at = revoked.get(String(userId));
  return at !== undefined && (issuedAt === undefined || issuedAt <= at);
}
