import { z } from "zod";
import { socialUrl } from "@/lib/social";
import { FACILITIES } from "@/models/Ground";

const text = (max: number, label = "That field") => z.string().trim().max(max, `${label} is too long (max ${max} characters).`);

/** What an arena may change about its public page. */
export const arenaProfileSchema = z.object({
  name: z.string().trim().min(2, "Please enter the arena's name (at least 2 letters).").max(60, "Arena name is too long.").optional(),
  tagline: text(120, "The tagline").optional(),
  description: text(2000, "The description").optional(),
  coverImage: text(300, "The cover image link").optional(),
  logoUrl: text(300, "The logo link").optional(),
  city: text(60, "The city").optional(),
  address: text(200, "The address").optional(),
  phone: text(30, "The phone number").optional(),
  whatsapp: text(30, "The WhatsApp number").optional(),
  email: text(100, "The email").optional(),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/, "Opening time must look like 08:00.").optional().or(z.literal("")),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/, "Closing time must look like 23:00.").optional().or(z.literal("")),
  facilities: z.array(z.enum(FACILITIES)).optional(),
  socialLinks: z.object({ facebook: text(200).transform((v) => socialUrl(v, "facebook")).optional(), instagram: text(200).transform((v) => socialUrl(v, "instagram")).optional(), twitter: text(200).transform((v) => socialUrl(v, "twitter")).optional() }).optional(),
  paymentInstructions: text(600, "Payment instructions").optional(),
  bookingRules: text(1000, "Booking rules").optional(),
  cancellationPolicy: text(1000, "The cancellation policy").optional(),
});

/** Backyard Manager only: visibility and the web address. */
export const arenaAdminSchema = arenaProfileSchema.extend({
  status: z.enum(["active", "hidden"]).optional(),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "The web address can only use lowercase letters, numbers and dashes.").optional(),
});
