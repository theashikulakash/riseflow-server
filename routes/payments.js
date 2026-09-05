import express from "express";
import Stripe from "stripe";
import Payment from "../models/Payment.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getUsersCollection } from "./users.js";

const router = express.Router();
const users = getUsersCollection;

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const CREDIT_PACKAGES = [
  { credits: 100, price: 10 },
  { credits: 300, price: 25 },
  { credits: 800, price: 60 },
  { credits: 1500, price: 110 },
];

// GET /api/payments/packages - public: list credit packages
router.get("/packages", (req, res) => res.json(CREDIT_PACKAGES));

// POST /api/payments/create-intent - supporter: create a Stripe PaymentIntent
router.post("/create-intent", requireAuth, requireRole("supporter"), async (req, res) => {
  const { credits } = req.body;
  const pkg = CREDIT_PACKAGES.find((p) => p.credits === credits);
  if (!pkg) return res.status(400).json({ message: "Invalid package" });

  if (!stripe) {
    // No Stripe key configured — tell the client to use the dummy flow.
    return res.json({ dummy: true, package: pkg });
  }

  const intent = await stripe.paymentIntents.create({
    amount: pkg.price * 100, // cents
    currency: "usd",
    metadata: { userEmail: req.user.email, credits: pkg.credits },
  });

  res.json({ clientSecret: intent.client_secret, package: pkg });
});

// POST /api/payments/confirm - supporter: record a successful payment & top up credits
// Works for both real Stripe confirmations (pass transaction_id) and the dummy flow.
router.post("/confirm", requireAuth, requireRole("supporter"), async (req, res) => {
  const { credits, amount_paid, transaction_id } = req.body;
  const pkg = CREDIT_PACKAGES.find((p) => p.credits === credits);
  if (!pkg) return res.status(400).json({ message: "Invalid package" });

  const payment = await Payment.create({
    user_email: req.user.email,
    user_name: req.user.name,
    credits_purchased: pkg.credits,
    amount_paid: amount_paid || pkg.price,
    payment_method: transaction_id ? "stripe" : "dummy",
    transaction_id: transaction_id || `dummy_${Date.now()}`,
    status: "succeeded",
  });

  await users().updateOne(
    { email: req.user.email },
    { $inc: { credits: pkg.credits } }
  );

  res.status(201).json(payment);
});

// GET /api/payments/mine - supporter: payment history
router.get("/mine", requireAuth, requireRole("supporter"), async (req, res) => {
  const items = await Payment.find({ user_email: req.user.email }).sort({ createdAt: -1 });
  res.json(items);
});

export default router;
