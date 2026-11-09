import { Schema, models, model, Types } from "mongoose";

export type PaymentMethod = "Cash" | "Bank Transfer" | "Card" | "JazzCash" | "EasyPaisa";
export type PaymentStatus = "Paid" | "Partial" | "Pending" | "Refunded";

export interface IPayment {
  _id: string;
  booking: Types.ObjectId;
  customer?: Types.ObjectId;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paymentDate: string; // YYYY-MM-DD
  notes?: string;
  recordedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer" },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ["Cash", "Bank Transfer", "Card", "JazzCash", "EasyPaisa"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Paid", "Partial", "Pending", "Refunded"],
      default: "Paid",
    },
    paymentDate: { type: String, required: true },
    notes: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

PaymentSchema.index({ booking: 1 });
PaymentSchema.index({ paymentDate: 1 });

export default models.Payment || model<IPayment>("Payment", PaymentSchema);
