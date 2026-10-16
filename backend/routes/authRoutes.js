const express = require("express");
const router = express.Router();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const {
  login, register, getMe,
  getAllUsers, createUser, updateUser, deleteUser,
  googleCallback,
} = require("../controllers/authController");
const { authenticate, requireAdmin } = require("../middleware/authMiddleware");

// ── Google OAuth Strategy ─────────────────────────────────────────────────────
// Replace <GOOGLE_AUTH_URL_HERE> with your actual Google OAuth credentials.
// Set these in .env:
//   GOOGLE_CLIENT_ID=<your-client-id>
//   GOOGLE_CLIENT_SECRET=<your-client-secret>
//   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
//
// Then uncomment the block below:
//
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL ||
          "http://localhost:5000/api/auth/google/callback",
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const result = await googleCallback(profile);
          done(null, result);
        } catch (err) {
          done(err);
        }
      }
    )
  );
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));
}

// Google OAuth routes(uncomment when credentials are ready):

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login?error=google" }),
  (req, res) => {
    const { token, user } = req.user;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    // Redirect with JWT so the frontend can store it
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
  }
);

// ── Public auth routes ────────────────────────────────────────────────────────
router.post("/auth/login", login);
router.post("/auth/register", register);

// ── Authenticated user ────────────────────────────────────────────────────────
router.get("/auth/me", authenticate, getMe);

// ── Admin-only user management ────────────────────────────────────────────────
router.get("/users", authenticate, requireAdmin, getAllUsers);
router.post("/users", authenticate, requireAdmin, createUser);
router.put("/users/:id", authenticate, requireAdmin, updateUser);
router.delete("/users/:id", authenticate, requireAdmin, deleteUser);

module.exports = router;
