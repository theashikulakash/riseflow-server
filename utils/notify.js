import Notification from "../models/Notification.js";

/**
 * Creates a notification document. Called whenever an action needs to
 * inform another user (contribution approved/rejected, campaign
 * approved/rejected, withdrawal approved, new contribution received).
 */
export const notify = async ({ message, toEmail, actionRoute }) => {
  try {
    await Notification.create({
      message,
      toEmail,
      actionRoute: actionRoute || "/dashboard",
      time: new Date(),
    });
  } catch (err) {
    console.error("notify() failed:", err.message);
  }
};
