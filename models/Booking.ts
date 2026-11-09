import { Schema, models, model, Types } from "mongoose";

export type BookingStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled" | "No Show";
export type PaymentStatus = "Paid" | "Partial" | "Pending" | "Refunded";

export type PaymentMethod = "JazzCash" | "Easypaisa" | "Bank transfer";
export const PAYMENT_METHODS: PaymentMethod[] = ["JazzCash", "Easypaisa", "Bank transfer"];
export type ProofStatus = "none" | "submitted" | "approved" | "rejected";

// Statuses that still hold the time slot (i.e. count toward double-booking checks).
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["Pending", "Confirmed", "Completed"];

export interface IBooking {
  _id: string;
  ground: Types.ObjectId;
  customer?: Types.ObjectId;
  customerName: string;
  phone: string;
  team?: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "18:00"
  endTime: string; // "20:00"
  durationMinutes: number;
  subtotal: number;
  discount: number;
  total: number;
  advancePayment: number;
  remainingPayment: number;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  notes?: string;
  holdExpiresAt?: Date; // self-service bookings are released if not paid by then
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentProofUrl?: string;
  proofStatus?: ProofStatus;
  proofNote?: string;
  proofUploadedAt?: Date;
  cancelReason?: string;
  refundedAmount?: number; // money returned to the customer (kept for records)
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    ground: { type: Schema.Types.ObjectId, ref: "Ground", required: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    team: { type: String, trim: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    advancePayment: { type: Number, default: 0 },
    remainingPayment: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Partial", "Pending", "Refunded"],
      default: "Pending",
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Cancelled", "No Show"],
      default: "Pending",
    },
    notes: { type: String },
    holdExpiresAt: { type: Date },
    paymentMethod: { type: String, enum: ["JazzCash", "Easypaisa", "Bank transfer"] },
    paymentReference: { type: String, trim: true },
    paymentProofUrl: { type: String },
    proofStatus: { type: String, enum: ["none", "submitted", "approved", "rejected"], default: "none" },
    proofNote: { type: String },
    proofUploadedAt: { type: Date },
    cancelReason: { type: String },
    refundedAmount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Speeds up the overlap query we run on every booking creation.
BookingSchema.index({ ground: 1, date: 1 });
// Speeds up a customer's booking-history lookup.
BookingSchema.index({ customer: 1, date: -1 });
// Lets the "release unpaid slots" sweep find expired holds quickly.
BookingSchema.index({ status: 1, holdExpiresAt: 1 });

export default models.Booking || model<IBooking>("Booking", BookingSchema);
