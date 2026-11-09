import { Schema, models, model } from "mongoose";

export const FACILITIES = [
  "Flood lights",
  "Nets",
  "Changing room",
  "Parking",
  "Washroom",
  "Drinking water",
  "Seating area",
  "Scoreboard",
  "Bowling machine",
  "Air conditioning",
] as const;

export interface ICustomSlot {
  label?: string;
  start: string; // "14:00"
  end: string; // "16:00"
  price: number; // flat price for the whole slot
}

export interface IGround {
  _id: string;
  name: string;
  groundNumber: string;
  description?: string;
  surface: "indoor" | "outdoor";
  size?: string;
  capacity?: number;
  location?: string;
  images: string[];
  facilities: string[];
  pricePerHour: number;
  weekendPricePerHour?: number;
  peakHourPricePerHour?: number;
  peakHourStart?: string; // "18:00"
  peakHourEnd?: string; // "22:00"
  customSlots?: ICustomSlot[]; // fixed bookable slots with their own prices (optional)
  openingTime: string; // "08:00"
  closingTime: string; // "23:00"
  status: "active" | "disabled" | "maintenance";
  createdAt: Date;
  updatedAt: Date;
}

const CustomSlotSchema = new Schema<ICustomSlot>(
  {
    label: { type: String, trim: true },
    start: { type: String, required: true },
    end: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const GroundSchema = new Schema<IGround>(
  {
    name: { type: String, required: true, trim: true },
    groundNumber: { type: String, required: true, trim: true },
    description: { type: String },
    surface: { type: String, enum: ["indoor", "outdoor"], required: true },
    size: { type: String },
    capacity: { type: Number },
    location: { type: String },
    images: { type: [String], default: [] },
    facilities: { type: [String], default: [] },
    pricePerHour: { type: Number, required: true },
    weekendPricePerHour: { type: Number },
    peakHourPricePerHour: { type: Number },
    peakHourStart: { type: String, default: "18:00" },
    peakHourEnd: { type: String, default: "22:00" },
    customSlots: { type: [CustomSlotSchema], default: [] },
    openingTime: { type: String, required: true, default: "08:00" },
    closingTime: { type: String, required: true, default: "23:00" },
    status: { type: String, enum: ["active", "disabled", "maintenance"], default: "active" },
  },
  { timestamps: true }
);

export default models.Ground || model<IGround>("Ground", GroundSchema);
