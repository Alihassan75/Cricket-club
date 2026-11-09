import { Schema, models, model, Types } from "mongoose";

export type MatchType = "Friendly" | "League" | "Tournament" | "Practice";
export type MatchStatus = "Scheduled" | "Live" | "Completed" | "Cancelled";

export interface IInningsScore {
  runs: number;
  wickets: number;
  overs: number; // completed overs
  balls: number; // balls into the current over, 0-5
  extras: number;
}

export interface IMatch {
  _id: string;
  teamA: Types.ObjectId;
  teamB: Types.ObjectId;
  ground: Types.ObjectId;
  tournament?: Types.ObjectId;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  overs: number; // allotted overs for the match
  matchType: MatchType;
  umpire?: string;
  status: MatchStatus;
  battingFirst?: "teamA" | "teamB"; // who's currently/was batting first
  scoreA: IInningsScore;
  scoreB: IInningsScore;
  winner?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InningsScoreSchema = new Schema<IInningsScore>(
  {
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    extras: { type: Number, default: 0 },
  },
  { _id: false }
);

const MatchSchema = new Schema<IMatch>(
  {
    teamA: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    teamB: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    ground: { type: Schema.Types.ObjectId, ref: "Ground", required: true },
    tournament: { type: Schema.Types.ObjectId, ref: "Tournament" },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    overs: { type: Number, required: true, default: 20 },
    matchType: {
      type: String,
      enum: ["Friendly", "League", "Tournament", "Practice"],
      default: "Friendly",
    },
    umpire: { type: String },
    status: {
      type: String,
      enum: ["Scheduled", "Live", "Completed", "Cancelled"],
      default: "Scheduled",
    },
    battingFirst: { type: String, enum: ["teamA", "teamB"] },
    scoreA: { type: InningsScoreSchema, default: () => ({}) },
    scoreB: { type: InningsScoreSchema, default: () => ({}) },
    winner: { type: Schema.Types.ObjectId, ref: "Team" },
  },
  { timestamps: true }
);

MatchSchema.index({ date: 1 });
MatchSchema.index({ tournament: 1 });

export default models.Match || model<IMatch>("Match", MatchSchema);
