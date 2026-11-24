import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { INQUIRY_SOURCES } from "@/models/Inquiry";
import { zodMessage } from "@/lib/validation";
import { PLAY_TIME, isSaturday, upcomingSaturdays } from "@/lib/playRules";

export const inquirySchema = z.object({
  name: z.string({ required_error: "Please enter your name." }).trim().min(2, "Please enter your name (at least 2 letters).").max(60, "Name is too long."),
  phone: z.string({ required_error: "Please enter your phone number." }).trim().min(1, "Please enter your phone number."),
  email: z.string({ required_error: "Please enter your email." }).trim().min(1, "Please enter your email.").max(100).email("Please enter a valid email address."),
  preferredDate: z.string({ required_error: "Please choose a Saturday." }).trim().min(1, "Please choose a Saturday."),
  players: z.number().int("Players must be a whole number.").min(1, "Players must be at least 1.").max(60, "That's a lot of players — please call us for big groups.").optional(),
  source: z.enum(INQUIRY_SOURCES).optional(),
  message: z.string().trim().max(500, "Message must be at most 500 characters.").optional(),
});

export type InquiryInput = { name: string; phone: string; email: string; preferredTime: string; preferredDate: string; players?: number; source?: string; message?: string };

/**
 * Validates the public "Play with us" form and cleans it up (phone normalised, empty fields dropped).
 * The game is always Saturday at 8 AM, so the time is set here and never taken from the visitor.
 */
export function parseInquiry(raw: any): { ok: true; data: InquiryInput } | { ok: false; error: string } {
  const body = {
    ...raw,
    players: raw?.players === "" || raw?.players == null ? undefined : Number(raw.players),
    source: raw?.source || undefined,
    message: raw?.message || undefined,
    preferredDate: raw?.preferredDate || undefined,
  };
  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error, { source: "Where you found us", preferredDate: "Day" }) };
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { ok: false, error: "Please enter a valid phone number, like 0300 1234567." };
  const date = parsed.data.preferredDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Please choose a valid date." };
  if (!isSaturday(date)) return { ok: false, error: "We play on Saturdays only — please choose a Saturday." };
  if (date < upcomingSaturdays(1)[0]) return { ok: false, error: "That Saturday has already passed — please choose the next one." };
  return { ok: true, data: { ...parsed.data, phone, preferredTime: PLAY_TIME } };
}
