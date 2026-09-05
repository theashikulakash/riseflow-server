/**
 * Promotes an existing user to the "admin" role.
 *
 * Registration only ever creates "supporter" or "creator" accounts (by
 * design — nobody should be able to sign up as admin from the public
 * form). To get your first admin account:
 *
 *   1. Register normally on the site with the email you want to be admin.
 *   2. Run:  node scripts/makeAdmin.js you@example.com
 *   3. Log out and back in (or just refresh) to pick up the new role.
 */
import mongoose from "mongoose";
import "dotenv/config";

const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/makeAdmin.js <email>");
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await mongoose.connection
    .collection("user")
    .updateOne({ email }, { $set: { role: "admin" } });

  if (result.matchedCount === 0) {
    console.error(`No user found with email ${email}. Register that account first.`);
  } else {
    console.log(`✅ ${email} is now an admin.`);
  }
  await mongoose.disconnect();
};

run();
