import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Ground from "@/models/Ground";
import Booking from "@/models/Booking";
import type { TokenPayload } from "@/lib/auth";

/**
 * Which arena the signed-in person is working inside.
 *  - arena manager / staff: always their own arena (locked, can't be changed)
 *  - Backyard Manager: whichever arena they picked in the menu, or "all arenas"
 */
export const SCOPE_COOKIE = "arena_scope";

export type Scope = {
  arenaId: string | null; // set when working inside one arena
  all: boolean; // Backyard Manager looking at every arena
  none: boolean; // arena account that isn't linked to an arena yet → sees nothing
};

export async function getScope(auth: TokenPayload): Promise<Scope> {
  if (auth.role === "super_admin") {
    const picked = cookies().get(SCOPE_COOKIE)?.value;
    if (picked && mongoose.isValidObjectId(picked)) return { arenaId: picked, all: false, none: false };
    return { arenaId: null, all: true, none: false };
  }
  await connectDB();
  const u: any = await User.findById(auth.userId).select("arena").lean();
  if (u?.arena) return { arenaId: String(u.arena), all: false, none: false };
  return { arenaId: null, all: false, none: true };
}

const NOTHING = () => new mongoose.Types.ObjectId(); // an id that matches no document

/** Mongo filter for documents that carry an `arena` field. */
export function arenaFilter(scope: Scope, field = "arena"): Record<string, unknown> {
  if (scope.all) return {};
  if (scope.none || !scope.arenaId) return { [field]: NOTHING() };
  return { [field]: scope.arenaId };
}

/** Ids of the grounds inside the scope, or null when nothing needs filtering (all arenas). */
export async function groundIdsOf(scope: Scope): Promise<mongoose.Types.ObjectId[] | null> {
  if (scope.all) return null;
  if (scope.none || !scope.arenaId) return [];
  return Ground.find({ arena: scope.arenaId }).distinct("_id");
}

/** Mongo filter for documents that point at a ground (bookings, matches). */
export async function groundRefFilter(scope: Scope, field = "ground"): Promise<Record<string, unknown>> {
  const ids = await groundIdsOf(scope);
  return ids === null ? {} : { [field]: { $in: ids } };
}

/** Ids of the bookings inside the scope, or null when nothing needs filtering. */
export async function bookingIdsOf(scope: Scope): Promise<mongoose.Types.ObjectId[] | null> {
  const ids = await groundIdsOf(scope);
  if (ids === null) return null;
  return Booking.find({ ground: { $in: ids } }).distinct("_id");
}

/** Ids of the customers who belong to this arena (booked here, or were added by its team). */
export async function customerIdsOf(scope: Scope): Promise<mongoose.Types.ObjectId[] | null> {
  const ids = await groundIdsOf(scope);
  if (ids === null) return null;
  const Customer = (await import("@/models/Customer")).default;
  const [booked, added] = await Promise.all([
    Booking.find({ ground: { $in: ids }, customer: { $exists: true } }).distinct("customer"),
    scope.arenaId ? Customer.find({ arenas: scope.arenaId }).distinct("_id") : Promise.resolve([]),
  ]);
  return [...booked, ...added];
}

/** Does a document that belongs to `docArena` sit inside this scope? */
export function inScope(scope: Scope, docArena?: unknown): boolean {
  if (scope.all) return true;
  if (scope.none || !scope.arenaId) return false;
  return !!docArena && String(docArena) === scope.arenaId;
}

export const outOfScope = (what = "That") => NextResponse.json({ error: `${what} belongs to another arena.` }, { status: 403 });

/** For creating things: returns the arena to put them in, or a ready-made error response. */
export function arenaForCreate(scope: Scope): { arenaId: string } | { error: NextResponse } {
  if (scope.none) return { error: NextResponse.json({ error: "Your account isn't linked to an arena yet — please ask the Backyard team to link it." }, { status: 403 }) };
  if (scope.all || !scope.arenaId) return { error: NextResponse.json({ error: "Choose an arena first — use the arena picker at the top of the menu." }, { status: 400 }) };
  return { arenaId: scope.arenaId };
}

// ---- "may this person touch that one thing?" checks used by the detail routes ----
// Each returns a ready-made error response, or null when everything is fine.

export async function tournamentGuard(auth: TokenPayload, tournamentId: string): Promise<NextResponse | null> {
  if (!mongoose.isValidObjectId(tournamentId)) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  const Tournament = (await import("@/models/Tournament")).default;
  await connectDB();
  const t: any = await Tournament.findById(tournamentId).select("arena").lean();
  if (!t) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  return inScope(await getScope(auth), t.arena) ? null : outOfScope("That tournament");
}

export async function groundGuard(auth: TokenPayload, groundId: string): Promise<NextResponse | null> {
  if (!mongoose.isValidObjectId(groundId)) return NextResponse.json({ error: "Ground not found." }, { status: 404 });
  await connectDB();
  const g: any = await Ground.findById(groundId).select("arena").lean();
  if (!g) return NextResponse.json({ error: "Ground not found." }, { status: 404 });
  return inScope(await getScope(auth), g.arena) ? null : outOfScope("That ground");
}

/** A booking is inside the scope when its ground is. */
export async function bookingGuard(auth: TokenPayload, bookingId: string): Promise<NextResponse | null> {
  if (!mongoose.isValidObjectId(bookingId)) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  await connectDB();
  const b: any = await Booking.findById(bookingId).select("ground").lean();
  if (!b) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  const g: any = await Ground.findById(b.ground).select("arena").lean();
  return inScope(await getScope(auth), g?.arena) ? null : outOfScope("That booking");
}

/** Ids of the teams that belong to this arena (added by its team, or entered in one of its tournaments). */
export async function teamIdsOf(scope: Scope): Promise<mongoose.Types.ObjectId[] | null> {
  if (scope.all) return null;
  if (scope.none || !scope.arenaId) return [];
  const [Team, Tournament] = await Promise.all([import("@/models/Team"), import("@/models/Tournament")]);
  const [added, entered] = await Promise.all([
    Team.default.find({ arenas: scope.arenaId }).distinct("_id"),
    Tournament.default.find({ arena: scope.arenaId }).distinct("registeredTeams"),
  ]);
  return [...added, ...entered];
}

export async function teamGuard(auth: TokenPayload, teamId: string): Promise<NextResponse | null> {
  if (!mongoose.isValidObjectId(teamId)) return NextResponse.json({ error: "Team not found." }, { status: 404 });
  const scope = await getScope(auth);
  if (scope.all) return null;
  const ids = await teamIdsOf(scope);
  return ids!.some((i) => String(i) === teamId) ? null : outOfScope("That team");
}

export async function matchGuard(auth: TokenPayload, matchId: string): Promise<NextResponse | null> {
  if (!mongoose.isValidObjectId(matchId)) return NextResponse.json({ error: "Match not found." }, { status: 404 });
  await connectDB();
  const Match = (await import("@/models/Match")).default;
  const m: any = await Match.findById(matchId).select("ground").lean();
  if (!m) return NextResponse.json({ error: "Match not found." }, { status: 404 });
  const g: any = await Ground.findById(m.ground).select("arena").lean();
  return inScope(await getScope(auth), g?.arena) ? null : outOfScope("That match");
}

export async function customerGuard(auth: TokenPayload, customerId: string): Promise<NextResponse | null> {
  if (!mongoose.isValidObjectId(customerId)) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  const scope = await getScope(auth);
  if (scope.all) return null;
  const ids = await customerIdsOf(scope);
  return ids!.some((i) => String(i) === customerId) ? null : outOfScope("That customer");
}
