import express from "express";
import Campaign from "../models/Campaign.js";
import Contribution from "../models/Contribution.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { notify } from "../utils/notify.js";

const router = express.Router();

// GET /api/campaigns - public: all approved campaigns, deadline not passed
// Supports ?search=&category=&status=
router.get("/", async (req, res) => {
  const { search, category } = req.query;
  const query = { status: "approved", deadline: { $gte: new Date() } };
  if (category) query.category = category;
  if (search) query.campaign_title = { $regex: search, $options: "i" };

  const campaigns = await Campaign.find(query).sort({ createdAt: -1 });
  res.json(campaigns);
});

// GET /api/campaigns/top-funded - homepage: top 6 by amount raised
router.get("/top-funded", async (req, res) => {
  const campaigns = await Campaign.find({ status: "approved" })
    .sort({ amount_raised: -1 })
    .limit(6);
  res.json(campaigns);
});

// GET /api/campaigns/:id - single campaign details
router.get("/:id", async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });
  res.json(campaign);
});

// POST /api/campaigns - creator: add new campaign (status starts "pending")
router.post("/", requireAuth, requireRole("creator"), async (req, res) => {
  const campaign = await Campaign.create({
    ...req.body,
    amount_raised: 0,
    status: "pending",
    creator_name: req.user.name,
    creator_email: req.user.email,
  });
  res.status(201).json(campaign);
});

// GET /api/campaigns/mine/list - creator: campaigns they created, newest deadline first
router.get("/mine/list", requireAuth, requireRole("creator"), async (req, res) => {
  const campaigns = await Campaign.find({ creator_email: req.user.email }).sort({
    deadline: -1,
  });
  res.json(campaigns);
});

// GET /api/campaigns/mine/stats - creator home page stats
router.get("/mine/stats", requireAuth, requireRole("creator"), async (req, res) => {
  const campaigns = await Campaign.find({ creator_email: req.user.email });
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => new Date(c.deadline) > new Date()).length;
  const totalRaised = campaigns.reduce((sum, c) => sum + (c.amount_raised || 0), 0);
  res.json({ totalCampaigns, activeCampaigns, totalRaised });
});

// PATCH /api/campaigns/:id - creator: update title/story/reward_info only
router.patch("/:id", requireAuth, requireRole("creator"), async (req, res) => {
  const campaign = await Campaign.findOne({ _id: req.params.id, creator_email: req.user.email });
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });

  const { campaign_title, campaign_story, reward_info } = req.body;
  if (campaign_title) campaign.campaign_title = campaign_title;
  if (campaign_story) campaign.campaign_story = campaign_story;
  if (reward_info) campaign.reward_info = reward_info;
  await campaign.save();

  res.json(campaign);
});

// DELETE /api/campaigns/:id - creator: delete campaign + refund approved supporters
router.delete("/:id", requireAuth, requireRole("creator"), async (req, res) => {
  const campaign = await Campaign.findOne({ _id: req.params.id, creator_email: req.user.email });
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });

  const approved = await Contribution.find({ campaign_id: campaign._id, status: "approved" });

  const { getUsersCollection } = await import("./users.js");
  const users = getUsersCollection();
  const mongoose = (await import("mongoose")).default;

  for (const c of approved) {
    await users().updateOne(
      { email: c.Supporter_email },
      { $inc: { credits: c.Contribution_amount } }
    );
    await notify({
      message: `Your campaign "${campaign.campaign_title}" was cancelled — ${c.Contribution_amount} credits were refunded to you.`,
      toEmail: c.Supporter_email,
      actionRoute: "/dashboard/supporter-home",
    });
  }

  await Contribution.deleteMany({ campaign_id: campaign._id });
  await campaign.deleteOne();

  res.json({ message: "Campaign deleted and supporters refunded" });
});

// ---- Admin moderation ----

// GET /api/campaigns/admin/pending - admin: campaigns awaiting approval
router.get("/admin/pending", requireAuth, requireRole("admin"), async (req, res) => {
  const campaigns = await Campaign.find({ status: "pending" }).sort({ createdAt: 1 });
  res.json(campaigns);
});

// GET /api/campaigns/admin/all - admin: manage-campaigns table
router.get("/admin/all", requireAuth, requireRole("admin"), async (req, res) => {
  const campaigns = await Campaign.find({}).sort({ createdAt: -1 });
  res.json(campaigns);
});

// PATCH /api/campaigns/:id/approve - admin
router.patch("/:id/approve", requireAuth, requireRole("admin"), async (req, res) => {
  const campaign = await Campaign.findByIdAndUpdate(
    req.params.id,
    { status: "approved" },
    { new: true }
  );
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });

  await notify({
    message: `Your campaign "${campaign.campaign_title}" was approved and is now live.`,
    toEmail: campaign.creator_email,
    actionRoute: "/dashboard/my-campaigns",
  });

  res.json(campaign);
});

// PATCH /api/campaigns/:id/reject - admin
router.patch("/:id/reject", requireAuth, requireRole("admin"), async (req, res) => {
  const campaign = await Campaign.findByIdAndUpdate(
    req.params.id,
    { status: "rejected" },
    { new: true }
  );
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });

  await notify({
    message: `Your campaign "${campaign.campaign_title}" was rejected by the admin.`,
    toEmail: campaign.creator_email,
    actionRoute: "/dashboard/my-campaigns",
  });

  res.json(campaign);
});

// DELETE /api/campaigns/:id/admin - admin: force delete any campaign
router.delete("/:id/admin", requireAuth, requireRole("admin"), async (req, res) => {
  await Campaign.findByIdAndDelete(req.params.id);
  await Contribution.deleteMany({ campaign_id: req.params.id });
  res.json({ message: "Campaign removed" });
});

// PATCH /api/campaigns/:id/suspend - admin: from Reports section
router.patch("/:id/suspend", requireAuth, requireRole("admin"), async (req, res) => {
  const campaign = await Campaign.findByIdAndUpdate(
    req.params.id,
    { status: "suspended" },
    { new: true }
  );
  res.json(campaign);
});

export default router;
