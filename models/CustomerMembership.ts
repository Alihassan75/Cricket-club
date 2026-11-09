import { Schema, models, model, Types } from "mongoose";

export interface ICustomerMembership {
  _id: string;
  customer: Types.ObjectId;
  plan: Types.ObjectId;
  startDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  hoursAllotted: number;
  usedHours: number;
  status: "pending" | "active" | "expired" | "cancelled";
  paymentMethod?: string;
  paymentReference?: string;
  paymentProofUrl?: string; // screenshot of the membership payment
  proofUploadedAt?: Date;
  declineNote?: string; // why a request was turned down (shown to the customer)
  createdAt: Date;
  updatedAt: Date;
}

const CustomerMembershipSchema = new Schema<ICustomerMembership>(
  {
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    plan: { type: Schema.Types.ObjectId, ref: "MembershipPlan", required: true },
    startDate: { type: String, required: true },
    expiryDate: { type: String, required: true },
    hoursAllotted: { type: Number, required: true },
    usedHours: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "active", "expired", "cancelled"], default: "active" },
    paymentMethod: { type: String, enum: ["JazzCash", "Easypaisa", "Bank transfer"] },
    paymentReference: { type: String, trim: true },
    paymentProofUrl: { type: String },
    proofUploadedAt: { type: Date },
    declineNote: { type: String, trim: true },
  },
  { timestamps: true }
);

CustomerMembershipSchema.index({ customer: 1 });

export default models.CustomerMembership ||
  model<ICustomerMembership>("CustomerMembership", CustomerMembershipSchema);
