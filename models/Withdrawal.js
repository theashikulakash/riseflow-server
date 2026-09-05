import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
  {
    creator_email: { type: String, required: true, index: true },
    creator_name: { type: String, required: true },

    withdrawal_credit: { type: Number, required: true },
    withdrawal_amount: { type: Number, required: true }, // in dollars

    payment_system: { type: String, required: true }, // stripe | bkash | rocket | nagad
    account_number: { type: String, required: true },

    withdraw_date: { type: Date, default: Date.now },
    status: { type: String, enum: ["pending", "approved"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("Withdrawal", withdrawalSchema);
