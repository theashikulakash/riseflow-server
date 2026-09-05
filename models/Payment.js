import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user_email: { type: String, required: true, index: true },
    user_name: { type: String, required: true },

    credits_purchased: { type: Number, required: true },
    amount_paid: { type: Number, required: true }, // in dollars

    payment_method: { type: String, default: "stripe" }, // stripe | dummy
    transaction_id: { type: String, required: true },

    status: { type: String, enum: ["pending", "succeeded", "failed"], default: "succeeded" },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
