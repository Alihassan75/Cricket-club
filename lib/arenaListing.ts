import { connectDB } from "@/lib/mongodb";
import Arena from "@/models/Arena";
import ArenaSettings from "@/models/ArenaSettings";

/** Mongo filter for arenas visitors may see: switched on, and (when the Backyard requires it) membership paid. */
export async function listedArenaQuery(): Promise<Record<string, unknown>> {
  await connectDB();
  const s: any = await ArenaSettings.findOne().select("requireArenaMembership").lean();
  const q: Record<string, unknown> = { status: "active" };
  if (s?.requireArenaMembership) q.membershipPaidUntil = { $gte: new Date() };
  return q;
}

/** Ids of the arenas visitors may see — use as `{ arena: { $in: ids } }` on grounds, tournaments and photos. */
export async function listedArenaIds() {
  return Arena.find(await listedArenaQuery()).distinct("_id");
}

export type MembershipState = "active" | "expiring" | "expired" | "none";
/** Where an arena's monthly membership stands. "expiring" = ends within 7 days. */
export function membershipState(paidUntil?: Date | string | null, now = new Date()): { state: MembershipState; daysLeft: number } {
  if (!paidUntil) return { state: "none", daysLeft: 0 };
  const days = Math.ceil((new Date(paidUntil).getTime() - now.getTime()) / 86400000);
  if (days < 0) return { state: "expired", daysLeft: days };
  return { state: days <= 7 ? "expiring" : "active", daysLeft: days };
}
