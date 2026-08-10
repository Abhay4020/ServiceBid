const express = require("express");
const router  = express.Router();
const { createRFQ, getRFQs, getMyRFQs, getRFQById, deleteRFQ, forceCloseRFQ } = require("../controllers/rfqController");
const { authenticate, requireAdmin } = require("../middleware/authMiddleware");

// Any authenticated user can create a requirement
router.post("/rfq",                authenticate,              createRFQ);

// Get all requirements (any authenticated user)
router.get("/rfqs",                authenticate,              getRFQs);

// Get my requirements (created by me)
router.get("/rfqs/mine",           authenticate,              getMyRFQs);

// Get single requirement detail
router.get("/rfq/:id",             authenticate,              getRFQById);

// Admin: delete a requirement
router.delete("/rfq/:id",          authenticate, requireAdmin, deleteRFQ);

// Admin: force-close a requirement
router.put("/rfq/:id/force-close", authenticate, requireAdmin, forceCloseRFQ);

module.exports = router;
