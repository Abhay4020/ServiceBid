const { pool } = require("../config/db");

// ─── GET /api/admin/stats ────────────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const [usersResult, requirementsResult, quotesResult, activeResult] = await Promise.all([
      pool.query("SELECT COUNT(*) as count FROM users WHERE is_active = TRUE"),
      pool.query("SELECT COUNT(*) as count FROM rfq"),
      pool.query("SELECT COUNT(*) as count FROM bids"),
      pool.query("SELECT COUNT(*) as count FROM rfq WHERE bid_start_time <= NOW() AND bid_close_time > NOW()"),
    ]);

    // Recent audit activity
    const recentActivity = await pool.query(
      `SELECT a.*, r.name as requirement_name
       FROM rfq_audit a
       LEFT JOIN rfq r ON a.rfq_id = r.id
       ORDER BY a.changed_at DESC
       LIMIT 10`
    );

    // Top quoters
    const topQuoters = await pool.query(
      `SELECT u.name, u.email, COUNT(b.id) as quote_count
       FROM bids b
       JOIN users u ON b.user_id = u.id
       GROUP BY u.id, u.name, u.email
       ORDER BY quote_count DESC
       LIMIT 5`
    );

    // Top posters
    const topPosters = await pool.query(
      `SELECT u.name, u.email, COUNT(r.id) as post_count
       FROM rfq r
       JOIN users u ON r.created_by = u.id
       GROUP BY u.id, u.name, u.email
       ORDER BY post_count DESC
       LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        total_users:           parseInt(usersResult.rows[0].count),
        total_requirements:    parseInt(requirementsResult.rows[0].count),
        total_quotes:          parseInt(quotesResult.rows[0].count),
        active_requirements:   parseInt(activeResult.rows[0].count),
        recent_activity:       recentActivity.rows,
        top_quoters:           topQuoters.rows,
        top_posters:           topPosters.rows,
      },
    });
  } catch (err) {
    console.error("Error fetching admin stats:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch stats." });
  }
};

module.exports = { getStats };
