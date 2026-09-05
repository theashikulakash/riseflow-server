import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    campaign_title: { type: String, required: true },
    campaign_story: { type: String, required: true },
    category: { type: String, required: true },
    funding_goal: { type: Number, required: true },
    minimum_Contribution: { type: Number, required: true },
    deadline: { type: Date, required: true },
    reward_info: { type: String, required: true },
    campaign_image_url: { type: String, required: true },

    amount_raised: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },

    creator_name: { type: String, required: true },
    creator_email: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model("Campaign", campaignSchema);
