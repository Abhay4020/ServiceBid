require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function seed() {
  console.log("🌱 Seeding ServiceBid database...\n");

  try {
    // -----------------------------
    // 1. Create users
    // -----------------------------
    const users = [
      { name: "Platform Admin", email: "admin@servicebid.com", password: "admin123", role: "admin" },
      { name: "Abhay Koundal", email: "abhay@example.com", password: "password123", role: "user" },
      { name: "Rahul Sharma", email: "rahul@example.com", password: "password123", role: "user" },
      { name: "Aman Verma", email: "aman@example.com", password: "password123", role: "user" }
    ];

    for (const user of users) {
      const existing = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [user.email]
      );

      if (existing.rows.length === 0) {
        const hash = await bcrypt.hash(user.password, 10);

        await pool.query(
          `INSERT INTO users (name, email, password, role)
           VALUES ($1, $2, $3, $4)`,
          [user.name, user.email, hash, user.role]
        );

        console.log(`✅ Created user: ${user.email}`);
      } else {
        console.log(`ℹ️ User already exists: ${user.email}`);
      }
    }

    // Fetch user IDs
    const userRows = await pool.query(
      "SELECT id, name, email FROM users ORDER BY id ASC"
    );

    const admin = userRows.rows.find(u => u.email === "admin@servicebid.com");
    const abhay = userRows.rows.find(u => u.email === "abhay@example.com");
    const rahul = userRows.rows.find(u => u.email === "rahul@example.com");
    const aman = userRows.rows.find(u => u.email === "aman@example.com");

    // -----------------------------
    // 2. Clear old demo data
    // -----------------------------
    await pool.query("DELETE FROM rfq_audit");
    await pool.query("DELETE FROM bids");
    await pool.query("DELETE FROM rfq");

    console.log("\n🧹 Cleared old demo data.\n");

    // Current time
    const now = new Date();

    // -----------------------------
    // 3. Requirement 1 (OPEN)
    // -----------------------------
    const rfq1 = await pool.query(
      `INSERT INTO rfq
       (name, description, created_by, service_date,
        bid_start_time, bid_close_time, forced_close_time,
        trigger_window, extension_duration)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        "Need 50 Catering Staff",
        "Need professional catering staff for a wedding event in Delhi.",
        abhay.id,
        new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        now,
        new Date(now.getTime() + 24 * 60 * 60 * 1000),
        new Date(now.getTime() + 48 * 60 * 60 * 1000),
        5,
        5
      ]
    );

    const req1 = rfq1.rows[0];

    await pool.query(
      `INSERT INTO bids (rfq_id, user_id, bid_amount, validity)
       VALUES ($1,$2,$3,$4)`,
      [req1.id, rahul.id, 25000, "7 days"]
    );

    await pool.query(
      `INSERT INTO bids (rfq_id, user_id, bid_amount, validity)
       VALUES ($1,$2,$3,$4)`,
      [req1.id, aman.id, 22000, "7 days"]
    );

    await pool.query(
      `INSERT INTO rfq_audit (rfq_id, action, changed_by)
       VALUES ($1,$2,$3)`,
      [req1.id, "Requirement created", abhay.name]
    );

    console.log(`✅ Requirement created: ${req1.name}`);

    // -----------------------------
    // 4. Requirement 2 (OPEN)
    // -----------------------------
    const rfq2 = await pool.query(
      `INSERT INTO rfq
       (name, description, created_by, service_date,
        bid_start_time, bid_close_time, forced_close_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        "Wedding Photography",
        "Need a photographer for one-day wedding coverage in Chandigarh.",
        rahul.id,
        new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        now,
        new Date(now.getTime() + 36 * 60 * 60 * 1000),
        new Date(now.getTime() + 72 * 60 * 60 * 1000)
      ]
    );

    const req2 = rfq2.rows[0];

    await pool.query(
      `INSERT INTO bids (rfq_id, user_id, bid_amount, validity)
       VALUES ($1,$2,$3,$4)`,
      [req2.id, abhay.id, 18000, "5 days"]
    );

    await pool.query(
      `INSERT INTO rfq_audit (rfq_id, action, changed_by)
       VALUES ($1,$2,$3)`,
      [req2.id, "Requirement created", rahul.name]
    );

    console.log(`✅ Requirement created: ${req2.name}`);

    // -----------------------------
    // 5. Requirement 3 (CLOSED)
    // -----------------------------
    const rfq3 = await pool.query(
      `INSERT INTO rfq
       (name, description, created_by, service_date,
        bid_start_time, bid_close_time, forced_close_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        "House Painting Service",
        "Need complete 3BHK house painting service in Jaipur.",
        aman.id,
        new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        new Date(now.getTime() - 48 * 60 * 60 * 1000),
        new Date(now.getTime() - 24 * 60 * 60 * 1000),
        new Date(now.getTime() - 24 * 60 * 60 * 1000)
      ]
    );

    const req3 = rfq3.rows[0];

    await pool.query(
      `INSERT INTO bids (rfq_id, user_id, bid_amount, validity)
       VALUES ($1,$2,$3,$4)`,
      [req3.id, abhay.id, 45000, "10 days"]
    );

    await pool.query(
      `INSERT INTO bids (rfq_id, user_id, bid_amount, validity)
       VALUES ($1,$2,$3,$4)`,
      [req3.id, rahul.id, 42000, "10 days"]
    );

    await pool.query(
      `INSERT INTO rfq_audit (rfq_id, action, changed_by)
       VALUES ($1,$2,$3)`,
      [req3.id, "Auction closed automatically", "system"]
    );

    console.log(`✅ Requirement created: ${req3.name}`);

    console.log("\n🎉 ServiceBid demo data seeded successfully!");

    console.log("\nDemo accounts:");
    console.log("Admin  -> admin@servicebid.com / admin123");
    console.log("User 1 -> abhay@example.com / password123");
    console.log("User 2 -> rahul@example.com / password123");
    console.log("User 3 -> aman@example.com / password123");

  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    await pool.end();
  }
}

seed();