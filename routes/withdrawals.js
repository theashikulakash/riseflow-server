import express from "express";
import Withdrawal from "../models/Withdrawal.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { notify } from "../utils/notify.js";

const router = express.Router();

const CREDITS_PER_DOLLAR = 20;
const MIN_WITHDRAWAL_CREDITS = 200;

// POST /api/withdrawals - creator requests a withdrawal
router.post("/", requireAuth, requireRole("creator"), async (req, res) => {
  const { withdrawal_credit, payment_system, account_number } = req.body;

  if (!withdrawal_credit || withdrawal_credit < MIN_WITHDRAWAL_CREDITS) {
    return res.status(400).json({
      message: `Minimum withdrawal is ${MIN_WITHDRAWAL_CREDITS} credits ($10)`,
    });
  }

  const withdrawal = await Withdrawal.create({
    creator_email: req.user.email,
    creator_name: req.user.name,
    withdrawal_credit,
    withdrawal_amount: withdrawal_credit / CREDITS_PER_DOLLAR,
    payment_system,
    account_number,
    status: "pending",
  });

  res.status(201).json(withdrawal);
});

// GET /api/withdrawals/mine - creator: payment history
router.get("/mine", requireAuth, requireRole("creator"), async (req, res) => {
  const items = await Withdrawal.find({ creator_email: req.user.email }).sort({
    withdraw_date: -1,
  });
  res.json(items);
});

// GET /api/withdrawals/pending - admin: pending withdrawal requests
router.get("/pending", requireAuth, requireRole("admin"), async (req, res) => {
  const items = await Withdrawal.find({ status: "pending" }).sort({ withdraw_date: 1 });
  res.json(items);
});

// PATCH /api/withdrawals/:id/pay - admin: mark as paid, decrease creator's raised credits
router.patch("/:id/pay", requireAuth, requireRole("admin"), async (req, res) => {
  const withdrawal = await Withdrawal.findById(req.params.id);
  if (!withdrawal) return res.status(404).json({ message: "Withdrawal not found" });

  withdrawal.status = "approved";
  await withdrawal.save();

  const Campaign = (await import("../models/Campaign.js")).default;
  // Decrease raised credits across the creator's campaigns, largest first,
  // until the withdrawn amount has been deducted.
  let remaining = withdrawal.withdrawal_credit;
  const campaigns = await Campaign.find({ creator_email: withdrawal.creator_email }).sort({
    amount_raised: -1,
  });
  for (const c of campaigns) {
    if (remaining <= 0) break;
    const deduct = Math.min(c.amount_raised, remaining);
    c.amount_raised -= deduct;
    remaining -= deduct;
    await c.save();
  }

  await notify({
    message: `Your withdrawal request of ${withdrawal.withdrawal_credit} credits ($${withdrawal.withdrawal_amount}) was paid by the admin.`,
    toEmail: withdrawal.creator_email,
    actionRoute: "/dashboard/payment-history",
  });

  res.json(withdrawal);
});

export default router;
