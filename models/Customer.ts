import { Schema, models, model, Types } from "mongoose";

export type MembershipStatus = "none" | "active" | "expired";

export interface ICustomer {
  _id: string;
  user?: Types.ObjectId; // linked portal login, if this customer has one
  arenas?: Types.ObjectId[]; // arenas that added this customer by hand (bookings also link a customer to an arena)
  fullName: string;
  profileImage?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  totalBookings: number;
  totalSpending: number;
  membershipStatus: MembershipStatus;
  favoriteTimeSlot?: string; // e.g. "18:00"
  notes?: string;
  createdAt: Date; // = "date joined"
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    arenas: { type: [Schema.Types.ObjectId], ref: "Arena", default: [] },
    fullName: { type: String, required: true, trim: true },
    profileImage: { type: String },
    phone: { type: String, required: true, unique: true, trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String },
    totalBookings: { type: Number, default: 0 },
    totalSpending: { type: Number, default: 0 },
    membershipStatus: { type: String, enum: ["none", "active", "expired"], default: "none" },
    favoriteTimeSlot: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

CustomerSchema.index({ fullName: "text", phone: "text", email: "text" });

export default models.Customer || model<ICustomer>("Customer", CustomerSchema);
