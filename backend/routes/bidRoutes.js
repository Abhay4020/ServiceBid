const express = require("express");
const router  = express.Router();
const { placeBid, getMyBids } = require("../controllers/bidController");
const { authenticate } = require("../middleware/authMiddleware");

// Any authenticated user can place a quote (self-quote blocked in controller)
router.post("/bid",       authenticate, placeBid);

// Get quotes placed by the current user
router.get("/bids/mine",  authenticate, getMyBids);

module.exports = router;
