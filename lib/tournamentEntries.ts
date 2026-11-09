import { z } from "zod";
import TournamentEntry, { ACTIVE_ENTRY_STATUSES } from "@/models/TournamentEntry";
import { normalizePhone } from "@/lib/phone";

const name = (label: string) =>
  z.string({ required_error: `${label} is required.` }).trim().min(2, `${label} must be at least 2 characters.`).max(40, `${label} must be at most 40 characters.`);

export const entrySchema = z.object({
  teamName: name("Team name"),
  captainName: name("Captain's name"),
  captainPhone: z.string({ required_error: "Captain's phone number is required." }).trim().min(1, "Captain's phone number is required."),
  viceCaptainName: name("Vice captain's name"),
  viceCaptainPhone: z.string({ required_error: "Vice captain's phone number is required." }).trim().min(1, "Vice captain's phone number is required."),
  members: z
    .array(name("Player name"))
    .min(2, "Add at least 2 more players besides the captain and vice captain.")
    .max(15, "You can list at most 15 players."),
  notes: z.string().trim().max(300, "Notes must be at most 300 characters.").optional(),
});

export type EntryInput = {
  teamName: string; captainName: string; captainPhone: string; viceCaptainName: string; viceCaptainPhone: string; members: string[]; notes?: string;
};

/** Validates a team entry and cleans it up (phones normalised, empty player rows dropped). */
export function parseEntry(raw: any): { ok: true; data: EntryInput } | { ok: false; error: string } {
  const body = { ...(raw || {}), members: Array.isArray(raw?.members) ? raw.members.map((m: any) => String(m ?? "").trim()).filter(Boolean) : raw?.members };
  const parsed = entrySchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "Please check the team details." };
  const cap = normalizePhone(parsed.data.captainPhone);
  if (!cap) return { ok: false, error: "Captain's phone number isn't valid — use a number like 0300 1234567." };
  const vice = normalizePhone(parsed.data.viceCaptainPhone);
  if (!vice) return { ok: false, error: "Vice captain's phone number isn't valid — use a number like 0300 1234567." };
  if (cap === vice) return { ok: false, error: "The captain and vice captain need different phone numbers." };
  return { ok: true, data: { ...parsed.data, captainPhone: cap, viceCaptainPhone: vice, notes: parsed.data.notes || undefined } };
}

export const teamKey = (n: string) => n.trim().toLowerCase().replace(/\s+/g, " ");

/** How many team entries (waiting or approved) each tournament has. */
export async function entryCounts(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  const rows: any[] = await TournamentEntry.aggregate([
    { $match: { tournament: { $in: ids }, status: { $in: ACTIVE_ENTRY_STATUSES } } },
    { $group: { _id: "$tournament", n: { $sum: 1 } } },
  ]);
  const out: Record<string, number> = {};
  for (const r of rows) out[String(r._id)] = r.n;
  return out;
}

/** Adds `entryCount` and `teamsTaken` (old-style registered teams + entries) to plain tournament objects. */
export async function attachEntryCounts<T extends { _id: any; registeredTeams?: any[] }>(list: T[]): Promise<(T & { entryCount: number; teamsTaken: number })[]> {
  const mongoose = (await import("mongoose")).default;
  const counts = await entryCounts(list.map((t) => new mongoose.Types.ObjectId(String(t._id)) as any));
  return list.map((t) => {
    const entryCount = counts[String(t._id)] || 0;
    return { ...t, entryCount, teamsTaken: (t.registeredTeams?.length || 0) + entryCount };
  });
}
