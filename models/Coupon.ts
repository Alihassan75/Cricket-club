import { Schema, models, model } from "mongoose";

export type CouponType = "percentage" | "fixed";

export interface ICoupon {
  _id: string;
  code: string;
  type: CouponType;
  value: number; // percent (0-100) or fixed PKR amount, depending on type
  startDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  usageLimit: number;
  usedCount: number;
  status: "active" | "disabled";
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["percentage", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 },
    startDate: { type: String, required: true },
    expiryDate: { type: String, required: true },
    usageLimit: { type: Number, required: true, default: 100 },
    usedCount: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
  },
  { timestamps: true }
);

export default models.Coupon || model<ICoupon>("Coupon", CouponSchema);
