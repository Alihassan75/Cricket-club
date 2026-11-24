import { Schema, models, model, Types } from "mongoose";

export type MaintenanceStatus = "Scheduled" | "In Progress" | "Completed";
export type MaintenanceTargetType = "ground" | "equipment";

export interface IMaintenance {
  _id: string;
  targetType: MaintenanceTargetType;
  ground?: Types.ObjectId;
  equipment?: Types.ObjectId;
  maintenanceType: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  cost: number;
  status: MaintenanceStatus;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceSchema = new Schema<IMaintenance>(
  {
    targetType: { type: String, enum: ["ground", "equipment"], required: true },
    ground: { type: Schema.Types.ObjectId, ref: "Ground" },
    equipment: { type: Schema.Types.ObjectId, ref: "Equipment" },
    maintenanceType: { type: String, required: true },
    description: { type: String },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    cost: { type: Number, default: 0 },
    status: { type: String, enum: ["Scheduled", "In Progress", "Completed"], default: "Scheduled" },
  },
  { timestamps: true }
);

export default models.Maintenance || model<IMaintenance>("Maintenance", MaintenanceSchema);
