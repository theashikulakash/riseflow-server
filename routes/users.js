import express from "express";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// better-auth owns the "user" collection (created via the raw MongoDB
// driver). We read/write it directly here for admin operations and for
// crediting/debiting a user's balance from other route files.
const users = () => mongoose.connection.collection("user");

// GET /api/users/me - current logged-in user's full profile (role, credits)
router.get("/me", requireAuth, async (req, res) => {
  const userId = new ObjectId(req.user.id);
  const me = await users().findOne({ _id: userId });

  if (!me) {
    return res.status(404).json({ message: "User profile not found" });
  }

  // Keep older or OAuth-created records compatible with the dashboard.
  const role = ["admin", "creator", "supporter"].includes(me.role) ? me.role : "supporter";
  const credits = Number.isFinite(me.credits) ? me.credits : 0;

  if (me.role !== role || me.credits !== credits) {
    await users().updateOne({ _id: userId }, { $set: { role, credits } });
  }

  res.json({ ...me, role, credits });
});

// GET /api/users - admin: list all users
router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const all = await users()
    .find({}, { projection: { name: 1, email: 1, image: 1, role: 1, credits: 1 } })
    .toArray();
  res.json(all);
});

// PATCH /api/users/:id/role - admin: change a user's role
router.patch("/:id/role", requireAuth, requireRole("admin"), async (req, res) => {
  const { role } = req.body;
  if (!["admin", "creator", "supporter"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  await users().updateOne({ _id: new ObjectId(req.params.id) }, { $set: { role } });
  res.json({ message: "Role updated" });
});

// DELETE /api/users/:id - admin: remove a user
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await users().deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ message: "User removed" });
});

// GET /api/users/stats/admin - admin home page stats
router.get("/stats/admin", requireAuth, requireRole("admin"), async (req, res) => {
  const [supporters, creators, creditAgg, paymentsCount] = await Promise.all([
    users().countDocuments({ role: "supporter" }),
    users().countDocuments({ role: "creator" }),
    users()
      .aggregate([{ $group: { _id: null, total: { $sum: "$credits" } } }])
      .toArray(),
    mongoose.connection.collection("payments").countDocuments({}),
  ]);
  res.json({
    totalSupporters: supporters,
    totalCreators: creators,
    totalCredits: creditAgg[0]?.total || 0,
    totalPayments: paymentsCount,
  });
});

export default router;
export { users as getUsersCollection };
