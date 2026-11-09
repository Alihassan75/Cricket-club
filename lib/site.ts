import { connectDB } from "@/lib/mongodb";
import ArenaSettings from "@/models/ArenaSettings";
import { BRAND, LEGACY_NAMES } from "@/lib/brand";

/** Plain-object copy so server components can pass data to client components. */
export function plain<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc));
}

export async function getSiteSettings() {
  await connectDB();
  const s = await ArenaSettings.findOne();
  const settings = plain<{
    arenaName: string;
    address?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    currency: string;
    socialLinks?: { facebook?: string; instagram?: string; twitter?: string };
  }>(s ?? { arenaName: BRAND, currency: "PKR" });
  // Older databases still hold the previous default name; show the new club name instead.
  if (LEGACY_NAMES.includes(settings.arenaName)) settings.arenaName = BRAND;
  return settings;
}
