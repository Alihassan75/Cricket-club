import { Schema, models, model, Types } from "mongoose";

export interface IEquipment {
  _id: string;
  name: string;
  category: string;
  quantity: number;
  availableQuantity: number;
  damagedQuantity: number;
  purchaseDate: string; // YYYY-MM-DD
  price: number;
  condition: "New" | "Good" | "Fair" | "Poor";
  createdAt: Date;
  updatedAt: Date;
}

const EquipmentSchema = new Schema<IEquipment>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    availableQuantity: { type: Number, required: true, min: 0 },
    damagedQuantity: { type: Number, default: 0 },
    purchaseDate: { type: String, required: true },
    price: { type: Number, required: true },
    condition: { type: String, enum: ["New", "Good", "Fair", "Poor"], default: "New" },
  },
  { timestamps: true }
);

export default models.Equipment || model<IEquipment>("Equipment", EquipmentSchema);

export interface IEquipmentIssue {
  _id: string;
  equipment: Types.ObjectId;
  issuedToName: string; // customer or team name
  quantity: number;
  issueDate: string;
  returnDate?: string;
  returned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EquipmentIssueSchema = new Schema<IEquipmentIssue>(
  {
    equipment: { type: Schema.Types.ObjectId, ref: "Equipment", required: true },
    issuedToName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    issueDate: { type: String, required: true },
    returnDate: { type: String },
    returned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const EquipmentIssue =
  models.EquipmentIssue || model<IEquipmentIssue>("EquipmentIssue", EquipmentIssueSchema);
