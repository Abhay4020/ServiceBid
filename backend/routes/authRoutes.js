const express = require("express");
const router  = express.Router();
const {
  login, register, getMe,
  getAllUsers, createUser, updateUser, deleteUser,
} = require("../controllers/authController");
const { authenticate, requireAdmin } = require("../middleware/authMiddleware");

// Public
router.post("/auth/login",    login);
router.post("/auth/register", register);

// Authenticated user
router.get("/auth/me", authenticate, getMe);

// Admin-only user management
router.get("/users",        authenticate, requireAdmin, getAllUsers);
router.post("/users",       authenticate, requireAdmin, createUser);
router.put("/users/:id",    authenticate, requireAdmin, updateUser);
router.delete("/users/:id", authenticate, requireAdmin, deleteUser);

module.exports = router;
