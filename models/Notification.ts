import { Schema, models, model, Types } from "mongoose";

export type NotificationType =
  | "booking_confirmed"
  | "booking_cancelled"
  | "upcoming_booking"
  | "pending_payment"
  | "membership_expiry"
  | "tournament_match"
  | "maintenance"
  | "inquiry"
  | "tournament_entry"
  | "membership_request"
  | "membership_allowed";

export interface INotification {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  // Optional recipient — a portal user. Notifications with no recipient are
  // arena-wide (shown to all staff), e.g. "Ground under maintenance".
  recipient?: Types.ObjectId;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      enum: [
        "booking_confirmed",
        "booking_cancelled",
        "upcoming_booking",
        "pending_payment",
        "membership_expiry",
        "tournament_match",
        "maintenance",
        "inquiry",
        "tournament_entry",
        "membership_request",
        "membership_allowed",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, createdAt: -1 });

export default models.Notification || model<INotification>("Notification", NotificationSchema);
