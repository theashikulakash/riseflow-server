import express from "express";
import cors from "cors";
import "dotenv/config";
import { toNodeHandler } from "better-auth/node";

import { auth } from "./lib/auth.js";
import { connectDB } from "./config/db.js";

import campaignRoutes from "./routes/campaigns.js";
import contributionRoutes from "./routes/contributions.js";
import withdrawalRoutes from "./routes/withdrawals.js";
import userRoutes from "./routes/users.js";
import paymentRoutes from "./routes/payments.js";
import notificationRoutes from "./routes/notifications.js";
import reportRoutes from "./routes/reports.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// better-auth's own handler must be mounted BEFORE express.json(),
// it parses its own request body for /api/auth/* routes.
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());

// Feature routes
app.use("/api/campaigns", campaignRoutes);
app.use("/api/contributions", contributionRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);

app.get("/", (req, res) => {
  res.send("Crowdfunding Platform API is running 🚀");
});

const start = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`✅ Server listening on port ${PORT}`));
};

start();
