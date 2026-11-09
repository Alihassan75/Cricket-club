import { Schema, models, model, Types } from "mongoose";

export type EntryStatus = "pending" | "approved" | "rejected";
export const ACTIVE_ENTRY_STATUSES: EntryStatus[] = ["pending", "approved"]; // these take up a place in the tournament

export interface ITournamentEntry {
  _id: string;
  tournament: Types.ObjectId;
  customer?: Types.ObjectId;
  user: Types.ObjectId;
  teamName: string;
  teamNameKey: string; // lower-case, single-spaced — used to stop two teams sharing a name
  captainName: string;
  captainPhone: string;
  viceCaptainName: string;
  viceCaptainPhone: string;
  members: string[]; // other players (besides captain and vice captain)
  notes?: string;
  status: EntryStatus;
  adminNote?: string;
  feePaid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TournamentEntrySchema = new Schema<ITournamentEntry>(
  {
    tournament: { type: Schema.Types.ObjectId, ref: "Tournament", required: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer" },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    teamName: { type: String, required: true, trim: true },
    teamNameKey: { type: String, required: true },
    captainName: { type: String, required: true, trim: true },
    captainPhone: { type: String, required: true },
    viceCaptainName: { type: String, required: true, trim: true },
    viceCaptainPhone: { type: String, required: true },
    members: [{ type: String, trim: true }],
    notes: { type: String, trim: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    adminNote: { type: String, trim: true },
    feePaid: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TournamentEntrySchema.index({ tournament: 1, status: 1 });
TournamentEntrySchema.index({ user: 1, tournament: 1 });

export default models.TournamentEntry || model<ITournamentEntry>("TournamentEntry", TournamentEntrySchema);
