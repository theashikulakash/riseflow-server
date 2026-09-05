import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true },
    campaign_title: { type: String, required: true },

    reporter_name: { type: String, required: true },
    reporter_email: { type: String, required: true },

    reason: { type: String, required: true },
    status: { type: String, enum: ["pending", "resolved"], default: "pending" },
  },
  { timestamps: { createdAt: "date", updatedAt: true } }
);

export default mongoose.model("Report", reportSchema);
