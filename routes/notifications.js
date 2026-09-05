import express from "express";
import Notification from "../models/Notification.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// GET /api/notifications - logged-in user's notifications, newest first
router.get("/", requireAuth, async (req, res) => {
  const items = await Notification.find({ toEmail: req.user.email }).sort({ time: -1 }).limit(30);
  res.json(items);
});

// PATCH /api/notifications/read-all - mark all as read
router.patch("/read-all", requireAuth, async (req, res) => {
  await Notification.updateMany({ toEmail: req.user.email }, { $set: { read: true } });
  res.json({ message: "Marked as read" });
});

export default router;
