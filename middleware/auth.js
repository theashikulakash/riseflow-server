import { auth } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";

/**
 * requireAuth - verifies the better-auth session cookie sent by the client
 * and attaches the logged-in user to req.user. This replaces manually
 * decoding a JWT: better-auth's own getSession() call validates the
 * session against the database.
 */
export const requireAuth = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user) {
      return res.status(401).json({ message: "Unauthorized: please log in" });
    }

    req.user = session.user; // { id, email, name, role, credits, ... }
    next();
  } catch (err) {
    console.error("requireAuth error:", err.message);
    res.status(401).json({ message: "Unauthorized" });
  }
};

/**
 * requireRole - role-based authorization middleware.
 * Usage: requireRole("admin") or requireRole("admin", "creator")
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }
    next();
  };
};
