import Ground from "@/models/Ground";
import Arena from "@/models/Arena";
import { ensureDefaultArena } from "@/lib/arenas";

export const INDOOR_NAME = "Indoor Cricket";

/** The club's one bookable ground: 4 fixed slots a day, the 4th is the priciest. */
export const INDOOR_GROUND = {
  name: INDOOR_NAME,
  groundNumber: "IC1",
  surface: "indoor" as const,
  description: "Floodlit indoor cricket arena with four fixed sessions a day.",
  facilities: ["Flood lights", "Nets", "Air conditioning", "Scoreboard", "Seating area"],
  pricePerHour: 1500,
  openingTime: "14:00",
  closingTime: "22:00",
  status: "active" as const,
  customSlots: [
    { label: "Slot 1", start: "14:00", end: "16:00", price: 3000 },
    { label: "Slot 2", start: "16:00", end: "18:00", price: 3000 },
    { label: "Slot 3", start: "18:00", end: "20:00", price: 3000 },
    { label: "Slot 4", start: "20:00", end: "22:00", price: 5000 },
  ],
};

/**
 * Safety net so the booking pages are never empty: when the club has no bookable ground at all
 * and Indoor Cricket was never created, create it. If staff disabled Indoor Cricket on purpose
 * (or any other ground is active) this does nothing.
 */
export async function ensureDefaultGround() {
  try {
    const bookable = await Ground.countDocuments({ status: { $ne: "disabled" } });
    if (bookable > 0) return;
    if (await Ground.exists({ name: INDOOR_NAME })) return;
    await ensureDefaultArena();
    const first: any = await Arena.findOne().sort({ createdAt: 1 }).select("_id").lean();
    await Ground.updateOne({ name: INDOOR_NAME }, { $setOnInsert: { ...INDOOR_GROUND, ...(first ? { arena: first._id } : {}) } }, { upsert: true });
  } catch (e) {
    console.error("ensureDefaultGround failed:", e);
  }
}
