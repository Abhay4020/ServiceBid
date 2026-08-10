const { pool } = require("../config/db");

// ─── POST /api/bid — Place a quote ───────────────────────────────────────────
const placeBid = async (req, res) => {
  try {
    const { rfq_id, bid_amount, validity } = req.body;
    const user_id = req.user.id;

    // Validate input
    if (!rfq_id || bid_amount === null || bid_amount === undefined) {
      return res.status(400).json({ success: false, message: "rfq_id and bid_amount are required." });
    }
    const parsedBidAmount = parseFloat(bid_amount);
    if (isNaN(parsedBidAmount) || parsedBidAmount <= 0) {
      return res.status(400).json({ success: false, message: "bid_amount must be a positive number." });
    }

    // Fetch the requirement
    const fetchResult = await pool.query("SELECT * FROM rfq WHERE id = $1", [rfq_id]);
    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Requirement not found." });
    }
    const rfq = fetchResult.rows[0];

    // Block self-quoting
    if (rfq.created_by === user_id) {
      return res.status(403).json({ success: false, message: "You cannot quote on your own requirement." });
    }

    // Get current DB time
    const nowResult = await pool.query("SELECT NOW() as current_time");
    const now = new Date(nowResult.rows[0].current_time);

    const bidStartTime  = new Date(rfq.bid_start_time);
    const bidCloseTime  = new Date(rfq.bid_close_time);
    const forcedCloseTime = new Date(rfq.forced_close_time);

    // Validate timing
    if (now >= forcedCloseTime) {
      return res.status(400).json({ success: false, message: "This requirement is force-closed. No more quotes allowed." });
    }
    if (now < bidStartTime) {
      return res.status(400).json({ success: false, message: "Quoting has not started yet." });
    }
    if (now >= bidCloseTime) {
      return res.status(400).json({ success: false, message: "Quoting has closed." });
    }

    // Fetch existing quotes for ranking
    const existingBidsResult = await pool.query(
      "SELECT id, bid_amount FROM bids WHERE rfq_id = $1 ORDER BY bid_amount ASC, created_at ASC",
      [rfq_id]
    );
    const existingBids = existingBidsResult.rows;
    const currentLowestBid = existingBids.length > 0 ? parseFloat(existingBids[0].bid_amount) : null;
    const isNewL1 = currentLowestBid === null || parsedBidAmount < currentLowestBid;

    // Insert quote
    const insertResult = await pool.query(
      `INSERT INTO bids (rfq_id, user_id, bid_amount, validity, created_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [rfq_id, user_id, parsedBidAmount, validity || null, now]
    );
    const newBid = insertResult.rows[0];

    // Audit trail
    const bidderName = req.user.name || "Unknown";
    await pool.query(
      `INSERT INTO rfq_audit (rfq_id, action, old_bid_close_time, new_bid_close_time, changed_by, changed_at)
       VALUES ($1, $2, NULL, NULL, $3, NOW())`,
      [rfq_id, `Quote placed: ₹${parsedBidAmount} by ${bidderName}${isNewL1 ? " (New L1)" : ""}`, bidderName]
    );

    // ── Extension logic: extend by 5 min if bid arrives within last 5 min ──
    const triggerWindow    = rfq.trigger_window    || 5;
    const extensionDuration = rfq.extension_duration || 5;
    const triggerWindowMs  = triggerWindow * 60000;
    const triggerStartTime = new Date(bidCloseTime.getTime() - triggerWindowMs);
    const withinTriggerWindow = now >= triggerStartTime;

    let shouldExtend = withinTriggerWindow; // trigger_type is always ANY_BID
    let updatedRFQ   = rfq;

    if (shouldExtend) {
      let newBidCloseTime = new Date(bidCloseTime.getTime() + extensionDuration * 60000);
      if (newBidCloseTime > forcedCloseTime) {
        newBidCloseTime = new Date(forcedCloseTime.getTime());
      }
      const updateResult = await pool.query(
        "UPDATE rfq SET bid_close_time = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
        [newBidCloseTime, rfq_id]
      );
      updatedRFQ = updateResult.rows[0];

      await pool.query(
        `INSERT INTO rfq_audit (rfq_id, action, old_bid_close_time, new_bid_close_time, changed_by, changed_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [rfq_id, `Deadline extended by ${extensionDuration} min (quote received in last ${triggerWindow} min)`,
         bidCloseTime, newBidCloseTime, "system"]
      );
    }

    // Updated rankings
    const rankingsResult = await pool.query(
      `SELECT b.id, b.bid_amount, b.validity, b.created_at, b.user_id,
              u.name as bidder_name
       FROM bids b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.rfq_id = $1
       ORDER BY b.bid_amount ASC, b.created_at ASC`,
      [rfq_id]
    );

    const rankings = rankingsResult.rows.map((bid, index) => ({
      rank:        `L${index + 1}`,
      bid_id:      bid.id,
      user_id:     bid.user_id,
      bid_amount:  parseFloat(bid.bid_amount),
      bidder_name: bid.bidder_name,
      validity:    bid.validity,
      placed_at:   bid.created_at,
    }));

    const newBidRank = rankings.find((r) => r.bid_id === newBid.id);

    return res.status(200).json({
      success: true,
      message: shouldExtend ? "Quote placed and deadline extended by 5 minutes" : "Quote placed successfully",
      data: {
        bid: {
          id:         newBid.id,
          bid_amount: parsedBidAmount,
          rank:       newBidRank ? newBidRank.rank : "L1",
          is_l1:      isNewL1,
        },
        extension: shouldExtend
          ? {
              extended:       true,
              old_close_time: bidCloseTime,
              new_close_time: updatedRFQ.bid_close_time,
            }
          : { extended: false },
        rankings,
      },
    });
  } catch (error) {
    console.error("Error placing quote:", error.message);
    res.status(500).json({ success: false, message: "Failed to place quote.", error: error.message });
  }
};

// ─── GET /api/bids/mine — My quotes ──────────────────────────────────────────
const getMyBids = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.rfq_id, b.bid_amount, b.validity, b.created_at,
              r.name as requirement_name,
              r.bid_start_time, r.bid_close_time, r.forced_close_time,
              NOW() as db_now,
              (SELECT COUNT(*) + 1
               FROM bids b2
               WHERE b2.rfq_id = b.rfq_id
                 AND (b2.bid_amount < b.bid_amount
                      OR (b2.bid_amount = b.bid_amount AND b2.created_at < b.created_at))
              ) as rank_position
       FROM bids b
       JOIN rfq r ON b.rfq_id = r.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    const dbNow = result.rows.length > 0 ? new Date(result.rows[0].db_now) : new Date();

    const bids = result.rows.map((bid) => {
      const forced = new Date(bid.forced_close_time);
      const close  = new Date(bid.bid_close_time);
      const start  = new Date(bid.bid_start_time);
      let req_status;
      if (dbNow >= forced)  req_status = "Force Closed";
      else if (dbNow >= close) req_status = "Closed";
      else if (dbNow >= start) req_status = "Active";
      else req_status = "Upcoming";

      return {
        ...bid,
        bid_amount:          parseFloat(bid.bid_amount),
        rank:                `L${bid.rank_position}`,
        requirement_status:  req_status,
      };
    });

    res.json({ success: true, data: bids });
  } catch (error) {
    console.error("Error fetching my quotes:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch your quotes.", error: error.message });
  }
};

module.exports = { placeBid, getMyBids };
