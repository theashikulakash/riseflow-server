import express from "express";
import Report from "../models/Report.js";
import Campaign from "../models/Campaign.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// POST /api/reports - supporter: report a campaign as suspicious/fraudulent
router.post("/", requireAuth, requireRole("supporter"), async (req, res) => {
  const { campaign_id, reason } = req.body;
  const campaign = await Campaign.findById(campaign_id);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });

  const report = await Report.create({
    campaign_id: campaign._id,
    campaign_title: campaign.campaign_title,
    reporter_name: req.user.name,
    reporter_email: req.user.email,
    reason,
  });
  res.status(201).json(report);
});

// GET /api/reports - admin: all reports
router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const items = await Report.find({}).sort({ date: -1 });
  res.json(items);
});

// PATCH /api/reports/:id/resolve - admin
router.patch("/:id/resolve", requireAuth, requireRole("admin"), async (req, res) => {
  const report = await Report.findByIdAndUpdate(req.params.id, { status: "resolved" }, { new: true });
  res.json(report);
});

export default router;
