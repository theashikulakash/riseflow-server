import mongoose from "mongoose";

const contributionSchema = new mongoose.Schema(
  {
    campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true },
    campaign_title: { type: String, required: true },
    Contribution_amount: { type: Number, required: true },

    Supporter_email: { type: String, required: true, index: true },
    Supporter_name: { type: String, required: true },

    creator_name: { type: String, required: true },
    creator_email: { type: String, required: true, index: true },

    message: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: { createdAt: "current_date", updatedAt: true } }
);

export default mongoose.model("Contribution", contributionSchema);
