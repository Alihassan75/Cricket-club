import { cache } from "react";
import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/mongodb";
import ArenaSettings from "@/models/ArenaSettings";
import { BRAND, LEGACY_NAMES } from "@/lib/brand";

/** Plain-object copy so server components can pass data to client components. */
export function plain<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc));
}

export type SiteSettings = {
  arenaName: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  currency: string;
  tagline?: string;
  announcement?: string;
  announcementOn?: boolean;
  announcementLink?: string;
  playRegistrationFee?: number;
  paymentInstructions?: string;
  socialLinks?: { facebook?: string; instagram?: string; twitter?: string };
};

// Cached for 60s (and cleared instantly when staff save anything — see lib/withBust.ts),
// so the layout and the page no longer hit MongoDB on every single visit.
const loadSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    await connectDB();
    const s = await ArenaSettings.findOne().lean();
    const settings = plain<SiteSettings>(s ?? { arenaName: BRAND, currency: "PKR" });
    // Older databases still hold the previous default name; show the new club name instead.
    if (LEGACY_NAMES.includes(settings.arenaName)) settings.arenaName = BRAND;
    return settings;
  },
  ["site-settings"],
  { revalidate: 60, tags: ["public"] }
);

/** React `cache` also de-duplicates the call inside one request (layout + page). */
export const getSiteSettings = cache(loadSettings);
