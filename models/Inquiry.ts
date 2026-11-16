import { Schema, models, model, Types } from "mongoose";

export type InquiryStatus = "new" | "contacted" | "booked" | "closed";
export const INQUIRY_STATUSES: InquiryStatus[] = ["new", "contacted", "booked", "closed"];
export const INQUIRY_SOURCES = ["Instagram", "Facebook", "TikTok", "YouTube", "Friend", "Other"] as const;

/** A "Play with us" request from the public form (people who found us on social media). */
export interface IInquiry {
  _id: string;
  name: string;
  phone: string;
  email: string;
  preferredDate?: string; // YYYY-MM-DD
  preferredTime: string;
  players?: number;
  source?: string;
  message?: string;
  registrationFee?: number; // fee shown to the player when they sent the request (kept as a record)
  feePaid?: boolean;
  paymentProofUrl?: string; // screenshot of the payment sent with the request
  paymentMethod?: string;
  paymentReference?: string;
  status: InquiryStatus;
  note?: string; // internal note from the club
  handledBy?: Types.ObjectId;
  handledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InquirySchema = new Schema<IInquiry>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    preferredDate: { type: String },
    preferredTime: { type: String, required: true, trim: true },
    players: { type: Number },
    source: { type: String },
    message: { type: String, trim: true },
    registrationFee: { type: Number, default: 0 },
    feePaid: { type: Boolean, default: false },
    paymentProofUrl: { type: String },
    paymentMethod: { type: String },
    paymentReference: { type: String, trim: true },
    status: { type: String, enum: INQUIRY_STATUSES, default: "new" },
    note: { type: String, trim: true },
    handledBy: { type: Schema.Types.ObjectId, ref: "User" },
    handledAt: { type: Date },
  },
  { timestamps: true }
);

InquirySchema.index({ status: 1, createdAt: -1 });
InquirySchema.index({ phone: 1, createdAt: -1 });

export default models.Inquiry || model<IInquiry>("Inquiry", InquirySchema);
