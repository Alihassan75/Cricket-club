import { Schema, models, model } from "mongoose";

export interface IArenaSettings {
  _id: string;
  arenaName: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  currency: string;
  taxPercent: number;
  openingTime: string; // HH:mm
  closingTime: string; // HH:mm
  bookingRules?: string;
  cancellationPolicy?: string;
  advancePaymentPercent: number;
  paymentInstructions?: string; // where customers send money (JazzCash number, bank account…)
  holdMinutes: number; // how long an unpaid booking holds its slot
  playRegistrationFee: number; // fee for the Saturday 8 AM "Play with us" game
  tagline?: string; // line under the big heading on the home page
  announcement?: string; // banner shown at the top of every public page
  announcementOn?: boolean;
  announcementLink?: string;
  arenaMembershipFee: number; // what an arena pays each month to be listed
  requireArenaMembership: boolean; // hide arenas whose membership isn't paid
  socialLinks: { facebook?: string; instagram?: string; twitter?: string };
  createdAt: Date;
  updatedAt: Date;
}

const ArenaSettingsSchema = new Schema<IArenaSettings>(
  {
    arenaName: { type: String, required: true, default: "Backyard Cricket Club" },
    logoUrl: { type: String },
    address: { type: String },
    phone: { type: String },
    whatsapp: { type: String },
    email: { type: String },
    currency: { type: String, default: "PKR" },
    taxPercent: { type: Number, default: 0 },
    openingTime: { type: String, default: "08:00" },
    closingTime: { type: String, default: "23:00" },
    bookingRules: { type: String },
    cancellationPolicy: { type: String },
    advancePaymentPercent: { type: Number, default: 30 },
    paymentInstructions: { type: String },
    holdMinutes: { type: Number, default: 30 },
    playRegistrationFee: { type: Number, default: 500 },
    tagline: { type: String },
    announcement: { type: String },
    announcementOn: { type: Boolean, default: false },
    announcementLink: { type: String },
    arenaMembershipFee: { type: Number, default: 10000 },
    requireArenaMembership: { type: Boolean, default: false },
    socialLinks: {
      facebook: { type: String },
      instagram: { type: String },
      twitter: { type: String },
    },
  },
  { timestamps: true }
);

export default models.ArenaSettings || model<IArenaSettings>("ArenaSettings", ArenaSettingsSchema);
