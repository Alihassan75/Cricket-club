import { Schema, models, model } from "mongoose";

export interface IArena {
  _id: string;
  name: string; // "Pasha Arena"
  slug: string; // url: /arenas/pasha-arena
  previousSlugs?: string[]; // old web addresses (after a rename) — they redirect to the current one
  tagline?: string;
  description?: string;
  coverImage?: string;
  logoUrl?: string;
  city?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  openingTime?: string;
  closingTime?: string;
  facilities: string[];
  socialLinks: { facebook?: string; instagram?: string; twitter?: string };
  paymentInstructions?: string; // where players send money for THIS arena
  bookingRules?: string;
  cancellationPolicy?: string;
  membershipPaidUntil?: Date; // the arena is listed on the website until this date
  membershipPayments: { _id?: string; amount: number; months: number; method?: string; reference?: string; note?: string; paidAt: Date; prevPaidUntil?: Date; paidUntil: Date }[];
  status: "active" | "hidden"; // hidden arenas are not shown on the website
  createdAt: Date;
  updatedAt: Date;
}

const ArenaSchema = new Schema<IArena>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    previousSlugs: { type: [String], default: [], index: true },
    tagline: { type: String, trim: true },
    description: { type: String, trim: true },
    coverImage: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    city: { type: String, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true },
    openingTime: { type: String },
    closingTime: { type: String },
    facilities: { type: [String], default: [] },
    socialLinks: {
      facebook: { type: String },
      instagram: { type: String },
      twitter: { type: String },
    },
    paymentInstructions: { type: String, trim: true },
    bookingRules: { type: String, trim: true },
    cancellationPolicy: { type: String, trim: true },
    membershipPaidUntil: { type: Date },
    membershipPayments: {
      type: [{ amount: Number, months: Number, method: String, reference: String, note: String, paidAt: Date, prevPaidUntil: Date, paidUntil: Date }],
      default: [],
    },
    status: { type: String, enum: ["active", "hidden"], default: "active" },
  },
  { timestamps: true }
);

ArenaSchema.index({ status: 1, name: 1 });

export default models.Arena || model<IArena>("Arena", ArenaSchema);
