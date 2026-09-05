import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import "dotenv/config";

const clientURL = (process.env.CLIENT_URL || "https://riseflow-ten.vercel.app").replace(/\/+$/, "");
const authURL = (process.env.BETTER_AUTH_URL || "https://riseflow-server.vercel.app").replace(/\/+$/, "");

// better-auth talks to the raw MongoDB driver (not mongoose) for its own
// user/session/account collections. We reuse the same database as mongoose,
// so `db.collection("user")` below is the same collection your other
// routes will read `role` / `credits` from.
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db();

export const auth = betterAuth({
  database: mongodbAdapter(db),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: authURL,
  trustedOrigins: [clientURL],

  account: {
    storeStateStrategy: "database",
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },

  // Extra fields on the better-auth "user" document. This is where the
  // platform's role + credit system lives, so every user (whether they
  // sign up with email/password or Google) ends up with these fields.
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "supporter", // supporter | creator | admin
        input: true,
      },
      credits: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false,
      },
      photoURL: {
        type: "string",
        required: false,
        input: true,
      },
      creditsGranted: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },

  // Add the sign-up bonus before Better Auth persists the user. This keeps
  // the bonus in the same insert as the user record.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const bonus = user.role === "creator" ? 20 : 50;
          return { data: { credits: bonus, creditsGranted: true } };
        },
      },
    },
  },

  advanced: {
    crossSubDomainCookies: { enabled: false },
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
});
