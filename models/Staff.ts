import { Schema, models, model } from "mongoose";

export type StaffRole = "Manager" | "Receptionist" | "Ground Staff" | "Cleaner" | "Security" | "Umpire";

export interface IStaff {
  _id: string;
  name: string;
  photo?: string;
  phone: string;
  email?: string;
  role: StaffRole;
  salary: number;
  joiningDate: string; // YYYY-MM-DD
  workingShift?: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema = new Schema<IStaff>(
  {
    name: { type: String, required: true, trim: true },
    photo: { type: String },
    phone: { type: String, required: true },
    email: { type: String },
    role: {
      type: String,
      enum: ["Manager", "Receptionist", "Ground Staff", "Cleaner", "Security", "Umpire"],
      required: true,
    },
    salary: { type: Number, required: true },
    joiningDate: { type: String, required: true },
    workingShift: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export default models.Staff || model<IStaff>("Staff", StaffSchema);
