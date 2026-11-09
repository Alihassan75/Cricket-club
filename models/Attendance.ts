import { Schema, models, model, Types } from "mongoose";

export type AttendanceStatus = "Present" | "Absent" | "Leave" | "Half Day";

export interface IAttendance {
  _id: string;
  staff: Types.ObjectId;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:mm
  checkOut?: string; // HH:mm
  workingHours: number;
  status: AttendanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    staff: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    date: { type: String, required: true },
    checkIn: { type: String },
    checkOut: { type: String },
    workingHours: { type: Number, default: 0 },
    status: { type: String, enum: ["Present", "Absent", "Leave", "Half Day"], default: "Present" },
  },
  { timestamps: true }
);

AttendanceSchema.index({ staff: 1, date: 1 }, { unique: true });

export default models.Attendance || model<IAttendance>("Attendance", AttendanceSchema);
