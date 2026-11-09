import mongoose, { Schema, models, model } from "mongoose";

export type UserRole = "super_admin" | "arena_manager" | "staff" | "customer";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  isEmailVerified: boolean;
  otpCodeHash?: string;
  otpPurpose?: "verify_email" | "reset_password";
  otpExpiresAt?: Date;
  otpAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["super_admin", "arena_manager", "staff", "customer"],
      default: "customer",
    },
    isEmailVerified: { type: Boolean, default: false },
    otpCodeHash: { type: String },
    otpPurpose: { type: String, enum: ["verify_email", "reset_password"] },
    otpExpiresAt: { type: Date },
    otpAttempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Prevent OverwriteModelError on Next.js hot-reload
export default models.User || model<IUser>("User", UserSchema);
