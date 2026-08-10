const express = require("express");
const router = express.Router();
const { getStats } = require("../controllers/adminController");
const { authenticate, requireAdmin } = require("../middleware/authMiddleware");

// Admin dashboard stats
router.get("/admin/stats", authenticate, requireAdmin, getStats);

module.exports = router;
