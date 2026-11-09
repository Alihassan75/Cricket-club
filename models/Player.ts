import { Schema, models, model, Types } from "mongoose";

export type PlayerRole = "Batsman" | "Bowler" | "All-rounder" | "Wicket Keeper";

export interface IPlayer {
  _id: string;
  team: Types.ObjectId;
  name: string;
  photo?: string;
  age?: number;
  phone?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  role: PlayerRole;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSchema = new Schema<IPlayer>(
  {
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    name: { type: String, required: true, trim: true },
    photo: { type: String },
    age: { type: Number },
    phone: { type: String },
    battingStyle: { type: String },
    bowlingStyle: { type: String },
    role: {
      type: String,
      enum: ["Batsman", "Bowler", "All-rounder", "Wicket Keeper"],
      required: true,
    },
  },
  { timestamps: true }
);

PlayerSchema.index({ team: 1 });

export default models.Player || model<IPlayer>("Player", PlayerSchema);
