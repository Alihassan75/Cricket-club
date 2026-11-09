import { Schema, models, model, Types } from "mongoose";

export interface ITeam {
  _id: string;
  name: string;
  logoUrl?: string;
  captainName: string;
  viceCaptainName?: string;
  phone: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    logoUrl: { type: String },
    captainName: { type: String, required: true },
    viceCaptainName: { type: String },
    phone: { type: String, required: true },
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    matchesLost: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default models.Team || model<ITeam>("Team", TeamSchema);
