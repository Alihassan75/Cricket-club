import Notification, { NotificationType } from "@/models/Notification";

/**
 * Creates an in-app notification. Pass `recipientUserId` to target a specific
 * portal user (e.g. the customer whose booking was confirmed); omit it for an
 * arena-wide notice staff see (e.g. "Ground A is now under maintenance").
 */
export async function notify(
  type: NotificationType,
  title: string,
  message: string,
  recipientUserId?: string
) {
  await Notification.create({
    type,
    title,
    message,
    recipient: recipientUserId,
  });
}
