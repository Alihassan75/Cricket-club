import { Schema, models, model, Types } from "mongoose";

export const ALBUMS = ["Matches", "Tournaments", "Practice", "Events", "Ground", "Team"] as const;

export interface IMedia {
  _id: string;
  arena?: Types.ObjectId;
  type: "image" | "video";
  source: "upload" | "youtube";
  url: string; // file URL, or YouTube watch URL
  thumbnailUrl?: string;
  publicId?: string; // Cloudinary id, used for reference
  title?: string;
  album: string;
  tournament?: Types.ObjectId;
  featured: boolean;
  isDemo?: boolean; // sample content that can be removed in one click
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    arena: { type: Schema.Types.ObjectId, ref: "Arena", index: true },
    type: { type: String, enum: ["image", "video"], required: true },
    source: { type: String, enum: ["upload", "youtube"], default: "upload" },
    url: { type: String, required: true },
    thumbnailUrl: { type: String },
    publicId: { type: String },
    title: { type: String, trim: true },
    album: { type: String, default: "Matches" },
    tournament: { type: Schema.Types.ObjectId, ref: "Tournament" },
    featured: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MediaSchema.index({ album: 1, createdAt: -1 });

export default models.Media || model<IMedia>("Media", MediaSchema);
