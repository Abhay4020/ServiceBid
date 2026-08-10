const { pool } = require("../config/db");

// ─── Helper: compute status from timestamps ──────────────────────────────────
const computeStatus = (dbNow, row) => {
  const bidStart    = new Date(row.bid_start_time);
  const bidClose    = new Date(row.bid_close_time);
  const forcedClose = new Date(row.forced_close_time);
  if (dbNow >= forcedClose) return "Force Closed";
  if (dbNow >= bidClose)    return "Closed";
  if (dbNow >= bidStart)    return "Active";
  return "Upcoming";
};

// ─── POST /api/rfq — Create requirement (any authenticated user) ──────────────
const createRFQ = async (req, res) => {
  try {
    const {
      name, description, service_date,
      start_minutes_from_now,
      close_minutes_from_now,
      forced_close_minutes_from_now,
    } = req.body;

    const created_by = req.user.id;

    if (!name) {
      return res.status(400).json({ success: false, message: "Requirement name is required." });
    }
    if (close_minutes_from_now === undefined || forced_close_minutes_from_now === undefined) {
      return res.status(400).json({
        success: false,
        message: "close_minutes_from_now and forced_close_minutes_from_now are required.",
      });
    }

    const nowResult = await pool.query("SELECT NOW() as now");
    const dbNow = new Date(nowResult.rows[0].now);

    const startMin  = Number(start_minutes_from_now)  || 0;
    const closeMin  = Number(close_minutes_from_now);
    const forcedMin = Number(forced_close_minutes_from_now);

    if (closeMin <= startMin) {
      return res.status(400).json({ success: false, message: "Close time must be after start time." });
    }
    if (forcedMin <= closeMin) {
      return res.status(400).json({ success: false, message: "Forced close time must be after close time." });
    }

    const startTime  = new Date(dbNow.getTime() + startMin  * 60000);
    const closeTime  = new Date(dbNow.getTime() + closeMin  * 60000);
    const forcedTime = new Date(dbNow.getTime() + forcedMin * 60000);

    const { rows } = await pool.query(
      `INSERT INTO rfq (name, description, created_by, bid_start_time, bid_close_time, forced_close_time, service_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name.trim(), description || null, created_by, startTime, closeTime, forcedTime, service_date || null]
    );

    res.status(201).json({ success: true, message: "Requirement created successfully.", data: rows[0] });
  } catch (error) {
    console.error("Error creating requirement:", error.message);
    res.status(500).json({ success: false, message: "Failed to create requirement.", error: error.message });
  }
};

// ─── GET /api/rfqs — All requirements ────────────────────────────────────────
const getRFQs = async (req, res) => {
  try {
    const { search } = req.query;
    let whereClause = "";
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause = `WHERE (r.name ILIKE $1 OR r.description ILIKE $1)`;
    }

    const query = `
      SELECT r.id, r.name, r.description, r.created_by,
             r.bid_start_time, r.bid_close_time, r.forced_close_time,
             r.service_date, r.created_at, NOW() as db_now,
             u.name as posted_by_name,
             MIN(b.bid_amount) as current_lowest_bid,
             COUNT(b.id) as total_bids
      FROM rfq r
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN bids b ON r.id = b.rfq_id
      ${whereClause}
      GROUP BY r.id, u.name
      ORDER BY r.created_at DESC
    `;

    const result = await pool.query(query, params);
    const dbNow = result.rows.length > 0 ? new Date(result.rows[0].db_now) : new Date();

    const rfqs = result.rows.map((row) => ({
      ...row,
      current_lowest_bid: row.current_lowest_bid ? parseFloat(row.current_lowest_bid) : null,
      total_bids: parseInt(row.total_bids),
      status: computeStatus(dbNow, row),
    }));

    res.json({ success: true, data: rfqs });
  } catch (error) {
    console.error("Error fetching requirements:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch requirements.", error: error.message });
  }
};

// ─── GET /api/rfqs/mine — My requirements (created by me) ────────────────────
const getMyRFQs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.name, r.description, r.created_by,
              r.bid_start_time, r.bid_close_time, r.forced_close_time,
              r.service_date, r.created_at, NOW() as db_now,
              MIN(b.bid_amount) as current_lowest_bid,
              COUNT(b.id) as total_bids
       FROM rfq r
       LEFT JOIN bids b ON r.id = b.rfq_id
       WHERE r.created_by = $1
       GROUP BY r.id
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    const dbNow = result.rows.length > 0 ? new Date(result.rows[0].db_now) : new Date();
    const rfqs = result.rows.map((row) => ({
      ...row,
      current_lowest_bid: row.current_lowest_bid ? parseFloat(row.current_lowest_bid) : null,
      total_bids: parseInt(row.total_bids),
      status: computeStatus(dbNow, row),
    }));

    res.json({ success: true, data: rfqs });
  } catch (error) {
    console.error("Error fetching my requirements:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch your requirements.", error: error.message });
  }
};

// ─── GET /api/rfq/:id — Single requirement with quotes & audit ────────────────
const getRFQById = async (req, res) => {
  try {
    const { id } = req.params;

    const rfqResult = await pool.query(
      `SELECT r.*, NOW() as db_now,
              u.name as posted_by_name, u.id as posted_by_id
       FROM rfq r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (rfqResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Requirement not found." });
    }

    const rfq   = rfqResult.rows[0];
    const dbNow = new Date(rfq.db_now);
    const status = computeStatus(dbNow, rfq);

    // Fetch quotes (bids) sorted by lowest amount → L1, L2, L3...
    const bidsResult = await pool.query(
      `SELECT b.id, b.bid_amount, b.validity, b.created_at, b.user_id,
              u.name as bidder_name
       FROM bids b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.rfq_id = $1
       ORDER BY b.bid_amount ASC, b.created_at ASC`,
      [id]
    );

    const rankings = bidsResult.rows.map((bid, index) => ({
      rank:       `L${index + 1}`,
      bid_id:     bid.id,
      user_id:    bid.user_id,
      bid_amount: parseFloat(bid.bid_amount),
      bidder_name: bid.bidder_name,
      validity:   bid.validity,
      placed_at:  bid.created_at,
    }));

    const auditResult = await pool.query(
      "SELECT * FROM rfq_audit WHERE rfq_id = $1 ORDER BY changed_at DESC",
      [id]
    );

    res.json({
      success: true,
      data: {
        rfq: { ...rfq, status },
        rankings,
        activity_log: auditResult.rows.map((log) => ({
          action:         log.action,
          old_close_time: log.old_bid_close_time,
          new_close_time: log.new_bid_close_time,
          changed_by:     log.changed_by,
          changed_at:     log.changed_at,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching requirement:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch requirement.", error: error.message });
  }
};

// ─── DELETE /api/rfq/:id (admin only) ────────────────────────────────────────
const deleteRFQ = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM rfq WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Requirement not found." });
    }
    res.json({ success: true, message: "Requirement deleted successfully." });
  } catch (error) {
    console.error("Error deleting requirement:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete requirement.", error: error.message });
  }
};

// ─── PUT /api/rfq/:id/force-close (admin only) ───────────────────────────────
const forceCloseRFQ = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch current close time for audit
    const rfqResult = await pool.query("SELECT bid_close_time FROM rfq WHERE id = $1", [id]);
    if (rfqResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Requirement not found." });
    }

    const oldCloseTime = rfqResult.rows[0].bid_close_time;
    const nowResult    = await pool.query("SELECT NOW() as now");
    const dbNow        = nowResult.rows[0].now;

    await pool.query(
      "UPDATE rfq SET bid_close_time = $1, forced_close_time = $1, updated_at = NOW() WHERE id = $2",
      [dbNow, id]
    );

    await pool.query(
      `INSERT INTO rfq_audit (rfq_id, action, old_bid_close_time, new_bid_close_time, changed_by, changed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, "Force closed by admin", oldCloseTime, dbNow, req.user.name || "admin"]
    );

    res.json({ success: true, message: "Requirement force-closed successfully." });
  } catch (error) {
    console.error("Error force-closing requirement:", error.message);
    res.status(500).json({ success: false, message: "Failed to force-close requirement.", error: error.message });
  }
};

module.exports = { createRFQ, getRFQs, getMyRFQs, getRFQById, deleteRFQ, forceCloseRFQ };
