import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    toEmail: { type: String, required: true, index: true },
    actionRoute: { type: String, default: "/dashboard" },
    read: { type: Boolean, default: false },
    time: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export default mongoose.model("Notification", notificationSchema);
