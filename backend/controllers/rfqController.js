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

// ─── GET /api/categories ──────────────────────────────────────────────────────
const getCategories = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM categories ORDER BY name ASC");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching categories:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch categories." });
  }
};

// ─── POST /api/rfq — Create requirement (any authenticated user) ──────────────
const createRFQ = async (req, res) => {
  try {
    const {
      name, description, service_date,
      category_id,
      bid_start_time,
      bid_close_time,
      forced_close_time,
      // Legacy fields (minutes-from-now) kept for backward compat
      start_minutes_from_now,
      close_minutes_from_now,
      forced_close_minutes_from_now,
      trigger_window,
      extension_duration,
      trigger_type,
    } = req.body;

    const created_by = req.user.id;

    if (!name) {
      return res.status(400).json({ success: false, message: "Requirement name is required." });
    }

    const nowResult = await pool.query("SELECT NOW() as now");
    const dbNow = new Date(nowResult.rows[0].now);

    let startTime, closeTime, forcedTime;

    // Support explicit ISO timestamps (v3 form) OR minutes-from-now (legacy)
    if (bid_start_time && bid_close_time && forced_close_time) {
      startTime  = new Date(bid_start_time);
      closeTime  = new Date(bid_close_time);
      forcedTime = new Date(forced_close_time);
    } else {
      if (close_minutes_from_now === undefined || forced_close_minutes_from_now === undefined) {
        return res.status(400).json({
          success: false,
          message: "Either provide bid_start_time/bid_close_time/forced_close_time OR close_minutes_from_now/forced_close_minutes_from_now.",
        });
      }
      const startMin  = Number(start_minutes_from_now) || 0;
      const closeMin  = Number(close_minutes_from_now);
      const forcedMin = Number(forced_close_minutes_from_now);

      if (closeMin <= startMin) {
        return res.status(400).json({ success: false, message: "Close time must be after start time." });
      }
      if (forcedMin <= closeMin) {
        return res.status(400).json({ success: false, message: "Forced close time must be after close time." });
      }

      startTime  = new Date(dbNow.getTime() + startMin  * 60000);
      closeTime  = new Date(dbNow.getTime() + closeMin  * 60000);
      forcedTime = new Date(dbNow.getTime() + forcedMin * 60000);
    }

    // Validate order
    if (closeTime <= startTime) {
      return res.status(400).json({ success: false, message: "Close time must be after start time." });
    }
    if (forcedTime <= closeTime) {
      return res.status(400).json({ success: false, message: "Forced close time must be after close time." });
    }

    const validTriggerTypes = ["ANY_BID", "ANY_RANK_CHANGE", "L1_CHANGE"];
    const resolvedTriggerType = validTriggerTypes.includes(trigger_type) ? trigger_type : "ANY_BID";

    const { rows } = await pool.query(
      `INSERT INTO rfq
         (name, description, created_by, category_id, bid_start_time, bid_close_time,
          forced_close_time, service_date, trigger_window, extension_duration, trigger_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        name.trim(),
        description || null,
        created_by,
        category_id || null,
        startTime,
        closeTime,
        forcedTime,
        service_date || null,
        trigger_window     ? Number(trigger_window)     : 5,
        extension_duration ? Number(extension_duration) : 5,
        resolvedTriggerType,
      ]
    );

    res.status(201).json({ success: true, message: "Requirement created successfully.", data: rows[0] });
  } catch (error) {
    console.error("Error creating requirement:", error.message);
    res.status(500).json({ success: false, message: "Failed to create requirement.", error: error.message });
  }
};

// ─── GET /api/rfqs — All requirements (paginated) ────────────────────────────
const getRFQs = async (req, res) => {
  try {
    const { search, category_id } = req.query;

    // ── Pagination ────────────────────────────────────────────────────────────
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const params  = [];
    const filters = [];
    let idx = 1;

    if (search) {
      params.push(`%${search}%`);
      filters.push(`(r.name ILIKE $${idx} OR r.description ILIKE $${idx})`);
      idx++;
    }
    if (category_id) {
      params.push(Number(category_id));
      filters.push(`r.category_id = $${idx++}`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    // Count total for pagination metadata
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM rfq r ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Add LIMIT / OFFSET params
    const queryParams = [...params, limit, offset];
    const limitIdx  = idx;
    const offsetIdx = idx + 1;

    const query = `
      SELECT r.id, r.name, r.description, r.created_by,
             r.bid_start_time, r.bid_close_time, r.forced_close_time,
             r.service_date, r.category_id, r.created_at, NOW() as db_now,
             u.name as posted_by_name,
             c.name as category_name,
             MIN(b.bid_amount) as current_lowest_bid,
             COUNT(b.id) as total_bids
      FROM rfq r
      LEFT JOIN users u      ON r.created_by  = u.id
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN bids b       ON r.id = b.rfq_id
      ${whereClause}
      GROUP BY r.id, u.name, c.name
      ORDER BY r.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const result = await pool.query(query, queryParams);
    const dbNow  = result.rows.length > 0 ? new Date(result.rows[0].db_now) : new Date();

    const rfqs = result.rows.map((row) => ({
      ...row,
      current_lowest_bid: row.current_lowest_bid ? parseFloat(row.current_lowest_bid) : null,
      total_bids:         parseInt(row.total_bids),
      status:             computeStatus(dbNow, row),
    }));

    res.json({
      success: true,
      data:    rfqs,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        has_next:    page < Math.ceil(total / limit),
        has_prev:    page > 1,
      },
    });
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
              r.service_date, r.category_id, r.created_at, NOW() as db_now,
              c.name as category_name,
              MIN(b.bid_amount) as current_lowest_bid,
              COUNT(b.id) as total_bids
       FROM rfq r
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN bids b ON r.id = b.rfq_id
       WHERE r.created_by = $1
       GROUP BY r.id, c.name
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    const dbNow = result.rows.length > 0 ? new Date(result.rows[0].db_now) : new Date();
    const rfqs  = result.rows.map((row) => ({
      ...row,
      current_lowest_bid: row.current_lowest_bid ? parseFloat(row.current_lowest_bid) : null,
      total_bids:         parseInt(row.total_bids),
      status:             computeStatus(dbNow, row),
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
              u.name as posted_by_name, u.id as posted_by_id,
              c.name as category_name
       FROM rfq r
       LEFT JOIN users u      ON r.created_by  = u.id
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.id = $1`,
      [id]
    );

    if (rfqResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Requirement not found." });
    }

    const rfq    = rfqResult.rows[0];
    const dbNow  = new Date(rfq.db_now);
    const status = computeStatus(dbNow, rfq);

    // Fetch quotes (bids) sorted by lowest amount → L1, L2, L3…
    const bidsResult = await pool.query(
      `SELECT b.id, b.bid_amount, b.validity, b.created_at, b.user_id,
              b.carrier_name, b.freight_charges, b.origin_charges,
              b.destination_charges, b.transit_time,
              u.name as bidder_name
       FROM bids b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.rfq_id = $1
       ORDER BY b.bid_amount ASC, b.created_at ASC`,
      [id]
    );

    const rankings = bidsResult.rows.map((bid, index) => ({
      rank:                `L${index + 1}`,
      bid_id:              bid.id,
      user_id:             bid.user_id,
      bid_amount:          parseFloat(bid.bid_amount),
      bidder_name:         bid.bidder_name,
      validity:            bid.validity,
      carrier_name:        bid.carrier_name,
      freight_charges:     bid.freight_charges     ? parseFloat(bid.freight_charges)     : null,
      origin_charges:      bid.origin_charges      ? parseFloat(bid.origin_charges)      : null,
      destination_charges: bid.destination_charges ? parseFloat(bid.destination_charges) : null,
      transit_time:        bid.transit_time,
      placed_at:           bid.created_at,
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

    // Notify real-time viewers
    if (req.io) {
      req.io.to(`rfq_${id}`).emit("rfq_force_closed", { rfq_id: parseInt(id), closed_at: dbNow });
    }

    res.json({ success: true, message: "Requirement force-closed successfully." });
  } catch (error) {
    console.error("Error force-closing requirement:", error.message);
    res.status(500).json({ success: false, message: "Failed to force-close requirement.", error: error.message });
  }
};

module.exports = { createRFQ, getRFQs, getMyRFQs, getRFQById, deleteRFQ, forceCloseRFQ, getCategories };
