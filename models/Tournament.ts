import { Schema, models, model, Types } from "mongoose";

export type TournamentFormat = "Knockout" | "League" | "Round Robin";
export type TournamentStatus = "Upcoming" | "Registration Open" | "Ongoing" | "Completed";

export interface ITournament {
  _id: string;
  arena?: Types.ObjectId;
  name: string;
  logoUrl?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  numberOfTeams: number;
  entryFee: number;
  prizeMoney: number;
  format: TournamentFormat;
  rules?: string;
  coverImage?: string;
  status: TournamentStatus;
  registeredTeams: Types.ObjectId[];
  winner?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TournamentSchema = new Schema<ITournament>(
  {
    arena: { type: Schema.Types.ObjectId, ref: "Arena", index: true },
    name: { type: String, required: true, trim: true },
    logoUrl: { type: String },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    numberOfTeams: { type: Number, required: true },
    entryFee: { type: Number, default: 0 },
    prizeMoney: { type: Number, default: 0 },
    format: { type: String, enum: ["Knockout", "League", "Round Robin"], default: "League" },
    rules: { type: String },
    coverImage: { type: String },
    status: {
      type: String,
      enum: ["Upcoming", "Registration Open", "Ongoing", "Completed"],
      default: "Registration Open",
    },
    registeredTeams: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    winner: { type: Schema.Types.ObjectId, ref: "Team" },
  },
  { timestamps: true }
);

TournamentSchema.index({ arena: 1, startDate: -1 });
TournamentSchema.index({ arena: 1, status: 1, startDate: 1 });

export default models.Tournament || model<ITournament>("Tournament", TournamentSchema);
