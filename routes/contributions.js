import express from "express";
import mongoose from "mongoose";
import Contribution from "../models/Contribution.js";
import Campaign from "../models/Campaign.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { notify } from "../utils/notify.js";
import { getUsersCollection } from "./users.js";

const router = express.Router();
const users = getUsersCollection;

// POST /api/contributions - supporter: contribute to a campaign
router.post("/", requireAuth, requireRole("supporter"), async (req, res) => {
  const { campaign_id, Contribution_amount, message } = req.body;

  const campaign = await Campaign.findById(campaign_id);
  if (!campaign || campaign.status !== "approved") {
    return res.status(404).json({ message: "Campaign not available" });
  }
  if (Contribution_amount < campaign.minimum_Contribution) {
    return res.status(400).json({
      message: `Minimum contribution is ${campaign.minimum_Contribution} credits`,
    });
  }

  const me = await users().findOne({ email: req.user.email });
  if (!me || me.credits < Contribution_amount) {
    return res.status(400).json({ message: "Insufficient credits" });
  }

  // Hold the credits (deduct now, refund on reject) so a supporter can't
  // over-commit credits across several pending contributions.
  await users().updateOne(
    { email: req.user.email },
    { $inc: { credits: -Contribution_amount } }
  );

  const contribution = await Contribution.create({
    campaign_id: campaign._id,
    campaign_title: campaign.campaign_title,
    Contribution_amount,
    Supporter_email: req.user.email,
    Supporter_name: req.user.name,
    creator_name: campaign.creator_name,
    creator_email: campaign.creator_email,
    message: message || "",
    status: "pending",
  });

  await notify({
    message: `${req.user.name} contributed ${Contribution_amount} credits to "${campaign.campaign_title}".`,
    toEmail: campaign.creator_email,
    actionRoute: "/dashboard/creator-home",
  });

  res.status(201).json(contribution);
});

// GET /api/contributions/mine - supporter: paginated list of own contributions
router.get("/mine", requireAuth, requireRole("supporter"), async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const [items, total] = await Promise.all([
    Contribution.find({ Supporter_email: req.user.email })
      .sort({ current_date: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Contribution.countDocuments({ Supporter_email: req.user.email }),
  ]);

  res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
});

// GET /api/contributions/mine/approved - supporter home: approved contributions table
router.get("/mine/approved", requireAuth, requireRole("supporter"), async (req, res) => {
  const items = await Contribution.find({
    Supporter_email: req.user.email,
    status: "approved",
  }).sort({ current_date: -1 });
  res.json(items);
});

// GET /api/contributions/mine/stats - supporter home page stats
router.get("/mine/stats", requireAuth, requireRole("supporter"), async (req, res) => {
  const all = await Contribution.find({ Supporter_email: req.user.email });
  const totalContributions = all.length;
  const totalPending = all.filter((c) => c.status === "pending").length;
  const totalAmount = all
    .filter((c) => c.status === "approved")
    .reduce((sum, c) => sum + c.Contribution_amount, 0);
  res.json({ totalContributions, totalPending, totalAmount });
});

// GET /api/contributions/review - creator: pending contributions to their campaigns
router.get("/review", requireAuth, requireRole("creator"), async (req, res) => {
  const items = await Contribution.find({
    creator_email: req.user.email,
    status: "pending",
  }).sort({ current_date: 1 });
  res.json(items);
});

// PATCH /api/contributions/:id/approve - creator
router.patch("/:id/approve", requireAuth, requireRole("creator"), async (req, res) => {
  const contribution = await Contribution.findOne({
    _id: req.params.id,
    creator_email: req.user.email,
  });
  if (!contribution) return res.status(404).json({ message: "Contribution not found" });

  contribution.status = "approved";
  await contribution.save();

  await Campaign.findByIdAndUpdate(contribution.campaign_id, {
    $inc: { amount_raised: contribution.Contribution_amount },
  });

  await notify({
    message: `Your contribution of ${contribution.Contribution_amount} credits to ${contribution.campaign_title} was approved by ${req.user.name}`,
    toEmail: contribution.Supporter_email,
    actionRoute: "/dashboard/supporter-home",
  });

  res.json(contribution);
});

// PATCH /api/contributions/:id/reject - creator
router.patch("/:id/reject", requireAuth, requireRole("creator"), async (req, res) => {
  const contribution = await Contribution.findOne({
    _id: req.params.id,
    creator_email: req.user.email,
  });
  if (!contribution) return res.status(404).json({ message: "Contribution not found" });

  contribution.status = "rejected";
  await contribution.save();

  // Refund the held credits back to the supporter.
  await users().updateOne(
    { email: contribution.Supporter_email },
    { $inc: { credits: contribution.Contribution_amount } }
  );

  await notify({
    message: `Your contribution of ${contribution.Contribution_amount} credits to ${contribution.campaign_title} was rejected by ${req.user.name}. Credits refunded.`,
    toEmail: contribution.Supporter_email,
    actionRoute: "/dashboard/supporter-home",
  });

  res.json(contribution);
});

export default router;
