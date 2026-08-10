require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { testConnection } = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const rfqRoutes  = require("./routes/rfqRoutes");
const bidRoutes  = require("./routes/bidRoutes");
const adminRoutes = require("./routes/adminRoutes");
const healthRoutes = require("./routes/healthRoutes");

const app = express();

// Read allowed origins from env (comma-separated)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim().replace(/\r/g, ""))
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());

const PORT = process.env.PORT || 5000;

// Routes
app.use("/api", authRoutes);
app.use("/api", rfqRoutes);
app.use("/api", bidRoutes);
app.use("/api", adminRoutes);
app.use("/api", healthRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
});

testConnection();

app.listen(PORT, () => {
  console.log(`ServiceBid backend running on port ${PORT}`);
});

module.exports = app;
