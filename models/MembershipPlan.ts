import { Schema, models, model } from "mongoose";

export interface IMembershipPlan {
  _id: string;
  packageName: string;
  durationMonths: number;
  price: number;
  discountPercent: number;
  bookingHoursPerMonth: number;
  benefits: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MembershipPlanSchema = new Schema<IMembershipPlan>(
  {
    packageName: { type: String, required: true, unique: true, trim: true },
    durationMonths: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true },
    discountPercent: { type: Number, required: true, default: 0 },
    bookingHoursPerMonth: { type: Number, required: true },
    benefits: [{ type: String }],
  },
  { timestamps: true }
);

export default models.MembershipPlan || model<IMembershipPlan>("MembershipPlan", MembershipPlanSchema);
